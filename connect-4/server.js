/*
 * server.js - Connect 4 game module for the shared arcade server.
 *
 * This no longer listens on its own port. The root server.js requires this
 * module and mounts:
 *   - static files from this folder  under /connect-4/
 *   - the multiplayer API             under /connect-4/api/
 * (both served through lib/rooms.js, the shared long-poll room engine).
 */

const { createRooms } = require("../lib/rooms.js");

// ---- Connect 4 rules (mirror of js/board.js, kept server-side) ----
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const RED = 1;
const YELLOW = 2;

function createBoard() {
  const b = [];
  for (let r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(EMPTY));
  return b;
}

function getDropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === EMPTY) return r;
  return -1;
}

function checkWin(board, player) {
  // Horizontal
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0, 1, 2, 3].every((i) => board[r][c + i] === player)) return true;
  // Vertical
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      if ([0, 1, 2, 3].every((i) => board[r + i][c] === player)) return true;
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0, 1, 2, 3].every((i) => board[r + i][c + i] === player)) return true;
  // Diagonal up-right
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0, 1, 2, 3].every((i) => board[r - i][c + i] === player)) return true;
  return false;
}

function createGame() {
  return { board: createBoard(), turn: RED, winner: 0, lastMove: null };
}

// Validate + apply a single move. Mutates `state`; engine flips the turn.
function applyMove(state, col, player) {
  if (state.winner) return { error: "Game over." };
  if (player !== state.turn) return { error: "Not your turn." };
  if (!Number.isInteger(col) || col < 0 || col >= COLS) {
    return { error: "Invalid column." };
  }
  const row = getDropRow(state.board, col);
  if (row === -1) return { error: "Column full." };

  state.board[row][col] = player;
  state.lastMove = { row, col };
  if (checkWin(state.board, player)) {
    state.winner = player;
  } else {
    state.turn = player === RED ? YELLOW : RED;
  }
  return { ok: true };
}

module.exports = {
  name: "connect-4",
  root: __dirname,
  createController: () => createRooms({ createGame, applyMove }),
};