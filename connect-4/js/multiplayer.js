/*
 * multiplayer.js - Online (multiplayer) client using long-polling.
 *
 * Transport (no external libraries), served by the shared arcade server:
 *   - GET  /connect-4/api/state?room=CODE&since=TS  -> long-poll; the server HOLDS the
 *     response until the board changes (or a timeout) then returns the state.
 *   - POST /connect-4/api/create                     -> create a room, join as Red.
 *   - POST /connect-4/api/join   {room}              -> join an existing room as Yellow.
 *   - POST /connect-4/api/move   {room, player, col} -> submit a move.
 *
 * The client just loops the long-poll to stay in sync with the opponent.
 */

(function () {
  const Board = window.Board;

  // All games are served by one root server; each game's API is namespaced.
  const API = "/connect-4/api";

  const onlineView = document.getElementById("online-view");
  const lobby = document.getElementById("online-lobby");
  const onlineGame = document.getElementById("online-game");
  const roomIdEl = document.getElementById("online-room-id");
  const statusEl = document.getElementById("online-status");
  const roomInput = document.getElementById("room-code");
  const leaveBtn = document.querySelector('#online-view [data-action="online-leave"]');

  let room = null; // room code
  let me = null; // Board.RED (1) or Board.YELLOW (2)
  let since = 0; // last update timestamp we have seen
  let polling = false;
  let ui = null;
  let lastSeenMove = null; // last move we have already shown (avoids re-animating)
  let boardState = null; // latest board we know about (for computing drop row)
  let roomIsPrivate = false; // is the current room private?
  let selectedType = "public"; // lobby selection: "public" | "private"
  let lobbyTimer = null; // interval that refreshes the public-room list

  function openOnline() {
    reset();
    lobby.classList.remove("hidden");
    onlineGame.classList.add("hidden");
    window.Local.showView(onlineView);
    startLobbyRefresh();
  }

  function reset() {
    polling = false;
    room = null;
    me = null;
    since = 0;
    lastSeenMove = null;
    boardState = null;
    roomIsPrivate = false;
    stopLobbyRefresh();
  }

  function playerName(player) {
    return player === Board.RED ? "Red" : "Yellow";
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    return res.json();
  }

  async function createRoom() {
    const data = await postJson(API + "/create", { private: selectedType === "private" });
    if (data.error) {
      alert(data.error);
      return;
    }
    enterGame(data.room, data.player, data.isPrivate);
  }

  async function joinRoom(code) {
    const roomCode = (code || roomInput.value || "").trim().toUpperCase();
    if (!roomCode) {
      alert("Enter a room code.");
      return;
    }
    const data = await postJson(API + "/join", { room: roomCode });
    if (data.error) {
      alert(data.error);
      return;
    }
    enterGame(data.room, data.player, false);
  }

  function enterGame(roomCode, player, isPrivate) {
    room = roomCode;
    me = player;
    roomIsPrivate = !!isPrivate;
    since = 0;
    roomIdEl.textContent = room + (roomIsPrivate ? " (private)" : "");
    lobby.classList.add("hidden");
    onlineGame.classList.remove("hidden");
    leaveBtn.classList.remove("hidden"); // only show once actually in a room
    stopLobbyRefresh();

    if (!ui) {
      ui = UI.create({
        boardEl: document.getElementById("online-board"),
        onDrop: handleDrop,
      });
    }

    startPolling();
  }

  function handleDrop(col) {
    if (!room) return;
    if (!Board.isValidColumn(boardState || [], col)) return;

    // Animate OUR own drop falling, then send the move (same as local mode).
    const row = Board.getDropRow(boardState, col);
    ui.setInteractive(false);
    ui.animateDrop(col, me, () => {
      // Mark this move as already shown so the incoming poll won't re-animate.
      lastSeenMove = { row, col };
      postJson(API + "/move", { room, player: me, col }).catch(() => {});
    });
  }

  function startPolling() {
    polling = true;
    pollLoop();
  }

  async function pollLoop() {
    while (polling) {
      try {
        const url = `${API}/state?room=${encodeURIComponent(room)}&since=${since}`;
        const res = await fetch(url);
        if (!res.ok) break; // room gone, stop.
        const state = await res.json();
        if (!polling) break;
        applyState(state);
        since = state.lastUpdate;
      } catch (e) {
        // Network hiccup: wait a moment then retry.
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  function applyState(state) {
    const board = state.board;
    const turn = state.turn;
    const winner = state.winner;
    boardState = board;
    const lastMove = state.lastMove;

    // A brand-new move (different from what we already showed)? Animate the
    // chip falling for the player who just moved (the previous turn holder).
    const isNewMove =
      lastMove && (!lastSeenMove || lastMove.row !== lastSeenMove.row || lastMove.col !== lastSeenMove.col);

    if (isNewMove) {
      lastSeenMove = { row: lastMove.row, col: lastMove.col };
      const mover = Board.other(turn); // turn has already flipped to the next player
      // Render the board WITHOUT the new piece, drop the chip, then show it.
      const preBoard = board.map((r) => r.slice());
      preBoard[lastMove.row][lastMove.col] = Board.EMPTY;
      ui.render(preBoard, turn);
      ui.animateDrop(lastMove.col, mover, () => {
        ui.render(board, turn);
        ui.setLastMove(lastMove.row, lastMove.col);
        finishState(state, winner, turn);
      });
      return;
    }

    // No new move: just reflect the current state.
    ui.render(board, turn);
    ui.setLastMove(lastMove ? lastMove.row : null, lastMove ? lastMove.col : null);
    finishState(state, winner, turn);
  }

  // Shared status/interactive handling for the online game.
  function finishState(state, winner, turn) {
    if (winner) {
      ui.setInteractive(false);
      ui.showWin(Board.getWinningLine(state.board, winner));
      const won = winner === me;
      statusEl.textContent = won ? `${playerName(winner)} wins! 🎉 (you)` : `${playerName(winner)} wins!`;
      return;
    }

    if (state.players.length < 2) {
      ui.setInteractive(false);
      statusEl.textContent = "Waiting for an opponent to join…";
      return;
    }

    const myTurn = turn === me;
    ui.setInteractive(myTurn);
    if (myTurn) {
      statusEl.textContent = `Your turn (${playerName(me)})`;
    } else {
      statusEl.textContent = `Opponent's turn (${playerName(turn)})`;
    }
  }

  function leaveIfPresent() {
    polling = false;
    reset();
    leaveBtn.classList.add("hidden");
  }

  function leaveRoom() {
    polling = false;
    reset();
    lobby.classList.remove("hidden");
    onlineGame.classList.add("hidden");
    leaveBtn.classList.add("hidden");
    window.Local.showView(onlineView);
    startLobbyRefresh();
  }

  // ----- Public-room lobby list -----
  function startLobbyRefresh() {
    stopLobbyRefresh();
    lobbyTimer = setInterval(refreshRooms, 4000);
    refreshRooms();
  }

  function stopLobbyRefresh() {
    if (lobbyTimer) {
      clearInterval(lobbyTimer);
      lobbyTimer = null;
    }
  }

  async function refreshRooms() {
    if (!onlineGame.classList.contains("hidden")) return; // only while in lobby
    try {
      const res = await fetch(API + "/rooms");
      const data = await res.json();
      renderRoomList(data.rooms || []);
    } catch (e) {
      /* lobby list just stays as-is on a hiccup */
    }
  }

  function renderRoomList(rooms) {
    const listEl = document.getElementById("public-rooms");
    const emptyEl = document.getElementById("public-rooms-empty");
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";
    if (!rooms.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";
    rooms.forEach((r) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "btn btn-ghost room-item";
      btn.textContent = `Room ${r.room} · ${r.players}/2`;
      btn.addEventListener("click", () => joinRoom(r.room));
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  // Wire up online-specific buttons.
  document.querySelectorAll('[data-action^="online-"]').forEach((el) => {
    el.addEventListener("click", () => {
      const action = el.dataset.action;
      if (action === "online-create") createRoom();
      else if (action === "online-join") joinRoom();
      else if (action === "online-leave") leaveRoom();
    });
  });

  // Public / Private segmented toggle on the create card.
  document.querySelectorAll("[data-room-type]").forEach((el) => {
    el.addEventListener("click", () => {
      selectedType = el.dataset.roomType;
      document.querySelectorAll("[data-room-type]").forEach((b) => {
        b.setAttribute("aria-pressed", b === el ? "true" : "false");
      });
    });
  });

  window.Multiplayer = { openOnline, leaveIfPresent, leaveRoom };
})();
