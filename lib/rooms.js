/*
 * lib/rooms.js - Shared long-polling room engine for 2-player games.
 *
 * Each game registers a controller through createRooms({ createGame, applyMove }):
 *   - createGame()  returns a fresh game state (e.g. { board, turn, winner, lastMove }).
 *   - applyMove(state, col, player) validates + mutates the state and returns
 *     { error } or { ok: true }. The engine flips the turn when there is no winner.
 *
 * Player numbers: first player = 1, second player = 2 (matches Connect 4).
 */

const crypto = require("crypto");

const POLL_TIMEOUT = 20000; // ms a state request is held before answering.
const FIRST_PLAYER = 1;
const SECOND_PLAYER = 2;

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function createRooms({ createGame, applyMove }) {
  const rooms = new Map(); // roomCode -> room object

  function newRoomCode() {
    let code;
    do {
      code = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
    } while (rooms.has(code));
    return code;
  }

  function makeRoom() {
    const game = createGame();
    return {
      id: null,
      players: [], // assigned player numbers (1 = first, 2 = second)
      lastUpdate: Date.now(),
      waiters: [], // pending long-poll responses { since, res }
      isPrivate: false,
      ...game,
    };
  }

  // Copy the game-specific state keys the clients read.
  function gameFields(room) {
    const out = {};
    for (const key of ["board", "turn", "winner", "lastMove"]) {
      if (room[key] !== undefined) out[key] = room[key];
    }
    return out;
  }

  function publicState(room) {
    return {
      room: room.id,
      ...gameFields(room),
      players: room.players,
      lastUpdate: room.lastUpdate,
    };
  }

  // Resolve all long-poll waiters whose `since` is behind the latest change.
  function flushWaiters(room) {
    const ready = room.waiters;
    room.waiters = [];
    for (const w of ready) {
      clearTimeout(w.timer);
      sendJson(w.res, 200, publicState(room));
    }
  }

  async function handleCreate(req, res) {
    const body = await readBody(req);
    const room = makeRoom();
    room.id = newRoomCode();
    room.isPrivate = body && body.private === true;
    room.players.push(FIRST_PLAYER);
    rooms.set(room.id, room);
    sendJson(res, 200, { room: room.id, player: FIRST_PLAYER, isPrivate: room.isPrivate });
  }

  // List public, open (not full, not finished) rooms for the lobby.
  // Also prunes abandoned rooms (no active pollers for a while).
  function handleList(req, res) {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (room.waiters.length === 0 && now - room.lastUpdate > 60000) {
        rooms.delete(code);
      }
    }
    const list = [];
    for (const room of rooms.values()) {
      if (room.isPrivate) continue;
      if (room.winner) continue;
      if (room.players.length >= 2) continue;
      list.push({ room: room.id, players: room.players.length });
    }
    sendJson(res, 200, { rooms: list });
  }

  async function handleJoin(req, res) {
    const body = await readBody(req);
    const code = (body.room || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return sendJson(res, 404, { error: "Room not found." });
    if (room.players.length >= 2) return sendJson(res, 409, { error: "Room is full." });
    if (room.players.includes(SECOND_PLAYER)) return sendJson(res, 409, { error: "Already joined." });
    room.players.push(SECOND_PLAYER);
    room.lastUpdate = Date.now();
    flushWaiters(room);
    sendJson(res, 200, { room: room.id, player: SECOND_PLAYER });
  }

  async function handleMove(req, res) {
    const body = await readBody(req);
    const code = (body.room || "").toUpperCase();
    const room = rooms.get(code);
    if (!room) return sendJson(res, 404, { error: "Room not found." });
    if (room.players.length < 2) return sendJson(res, 400, { error: "Waiting for opponent." });
    const result = applyMove(room, Number(body.col), Number(body.player));
    if (result.error) return sendJson(res, 400, { error: result.error });
    room.lastUpdate = Date.now();
    flushWaiters(room);
    sendJson(res, 200, { ok: true });
  }

  function handleState(req, res, url) {
    const code = (url.searchParams.get("room") || "").toUpperCase();
    const since = parseInt(url.searchParams.get("since") || "0", 10);
    const room = rooms.get(code);
    if (!room) return sendJson(res, 404, { error: "Room not found." });

    // If something changed since `since`, answer immediately.
    if (room.lastUpdate > since) {
      return sendJson(res, 200, publicState(room));
    }

    // Otherwise hold the response until a change happens (long-poll).
    const waiter = { since, res };
    waiter.timer = setTimeout(() => {
      room.waiters = room.waiters.filter((w) => w !== waiter);
      if (!res.headersSent) sendJson(res, 200, publicState(room));
    }, POLL_TIMEOUT);
    room.waiters.push(waiter);
  }

  // Routes (relative to the game's /<name>/api prefix).
  async function handle(relPath, method, req, res, url) {
    if (method === "POST" && relPath === "/create") {
      await handleCreate(req, res);
      return true;
    }
    if (method === "GET" && relPath === "/rooms") {
      handleList(req, res);
      return true;
    }
    if (method === "POST" && relPath === "/join") {
      await handleJoin(req, res);
      return true;
    }
    if (method === "POST" && relPath === "/move") {
      await handleMove(req, res);
      return true;
    }
    if (method === "GET" && relPath === "/state") {
      handleState(req, res, url);
      return true;
    }
    return false;
  }

  return { handle };
}

module.exports = { createRooms };