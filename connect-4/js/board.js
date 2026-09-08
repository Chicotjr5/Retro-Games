/*
 * board.js - Shared Connect 4 game logic.
 * Pure functions, no DOM access. Used by the AI, local play and multiplayer.
 *
 * Board representation:
 *   - 2D array board[row][col], row 0 is the TOP of the board.
 *   - Cell value: 0 = empty, 1 = red player, 2 = yellow player.
 *   - COLS columns, ROWS rows.
 */

const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const RED = 1;
const YELLOW = 2;

function createBoard() {
  // Build an empty ROWS x COLS matrix filled with EMPTY.
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    board.push(new Array(COLS).fill(EMPTY));
  }
  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function other(player) {
  return player === RED ? YELLOW : RED;
}

// Return the lowest empty row for a column, or -1 if the column is full.
function getDropRow(board, col) {
  if (col < 0 || col >= COLS) return -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === EMPTY) return r;
  }
  return -1;
}

function isValidColumn(board, col) {
  return getDropRow(board, col) !== -1;
}

function getValidColumns(board) {
  const valid = [];
  for (let c = 0; c < COLS; c++) {
    if (isValidColumn(board, c)) valid.push(c);
  }
  return valid;
}

// Drop a piece for `player` in `col`. Returns the row where it landed, or -1 if illegal.
function dropPiece(board, col, player) {
  const row = getDropRow(board, col);
  if (row === -1) return -1;
  board[row][col] = player;
  return row;
}

// Check whether `player` has at least one winning line of 4.
function checkWin(board, player) {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      ) {
        return true;
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if (
        board[r][c] === player &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      ) {
        return true;
      }
    }
  }
  // Diagonal (down-right)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      ) {
        return true;
      }
    }
  }
  // Diagonal (up-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        board[r][c] === player &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      ) {
        return true;
      }
    }
  }
  return false;
}

// Return the array of {row, col} cells forming a winning line for `player`,
// or null if there is no win. Used to highlight the winning pieces.
function getWinningLine(board, player) {
  const lines = [];

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const line = [
        { row: r, col: c },
        { row: r, col: c + 1 },
        { row: r, col: c + 2 },
        { row: r, col: c + 3 },
      ];
      if (line.every((p) => board[p.row][p.col] === player)) return line;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const line = [
        { row: r, col: c },
        { row: r + 1, col: c },
        { row: r + 2, col: c },
        { row: r + 3, col: c },
      ];
      if (line.every((p) => board[p.row][p.col] === player)) return line;
    }
  }
  // Diagonal (down-right)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const line = [
        { row: r, col: c },
        { row: r + 1, col: c + 1 },
        { row: r + 2, col: c + 2 },
        { row: r + 3, col: c + 3 },
      ];
      if (line.every((p) => board[p.row][p.col] === player)) return line;
    }
  }
  // Diagonal (up-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const line = [
        { row: r, col: c },
        { row: r - 1, col: c + 1 },
        { row: r - 2, col: c + 2 },
        { row: r - 3, col: c + 3 },
      ];
      if (line.every((p) => board[p.row][p.col] === player)) return line;
    }
  }
  return null;
}

function isFull(board) {
  return getValidColumns(board).length === 0;
}

function isGameOver(board) {
  return checkWin(board, RED) || checkWin(board, YELLOW) || isFull(board);
}

function getWinner(board) {
  if (checkWin(board, RED)) return RED;
  if (checkWin(board, YELLOW)) return YELLOW;
  return 0;
}

const Board = {
  ROWS,
  COLS,
  EMPTY,
  RED,
  YELLOW,
  createBoard,
  cloneBoard,
  other,
  getDropRow,
  isValidColumn,
  getValidColumns,
  dropPiece,
  checkWin,
  isFull,
  isGameOver,
  getWinner,
  getWinningLine,
};

// Expose globally so the other (separate) <script> files can use it.
window.Board = Board;
