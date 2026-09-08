/*
 * local.js - Controls the local two-player game (Red vs Yellow on one screen).
 *
 * Responsibilities:
 *   - Wire up the menu and the local/online view switching.
 *   - Maintain board state and alternate turns between the two human players.
 *   - Animate each drop (the token falls behind the board) before committing.
 *
 * Note: the AI opponent was removed; this file is pure local PvP.
 */

(function () {
  const Board = window.Board;

  // ----- View references -----
  const menuView = document.getElementById("menu-view");
  const localView = document.getElementById("local-view");
  const onlineView = document.getElementById("online-view");
  const statusEl = document.getElementById("local-status");

  // ----- Reload resilience (local mode) -----
  // The in-progress local game is saved to localStorage after every move and
  // restored on page load, so an accidental reload (e.g. mobile
  // pull-to-refresh) never loses the match. A sessionStorage marker records
  // that the LOCAL view was the last screen, so we only auto-resume after a
  // same-tab reload — not when the page is opened fresh later on.
  const STATE_KEY = "connect4-local-state";
  const VIEW_KEY = "connect4-view";

  // ----- Local game state -----
  let board = null;
  let current = Board.RED;
  let startingColor = Board.RED; // color chosen by the "Play as" picker
  let gameOver = false;
  let accepting = false; // whether a click is currently allowed
  let pendingDrop = null; // { row, col } of the move currently animating
  let ui = null;

  const pickRedBtn = document.querySelector('#local-view [data-action="pick-red"]');
  const pickYellowBtn = document.querySelector('#local-view [data-action="pick-yellow"]');

  function updateColorPicker() {
    pickRedBtn.classList.toggle("active", startingColor === Board.RED);
    pickYellowBtn.classList.toggle("active", startingColor === Board.YELLOW);
  }

  // ----- Local game state persistence -----
  function saveLocalState() {
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({
          board,
          current,
          startingColor,
          gameOver,
          lastMove: pendingDrop,
        })
      );
    } catch (err) {
      /* storage unavailable — game still playable, just not persisted */
    }
  }

  function clearLocalState() {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch (err) {}
  }

  // Returns a valid, unfinished saved game or null.
  function loadLocalState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const validBoard =
        s &&
        Array.isArray(s.board) &&
        s.board.length === Board.ROWS &&
        s.board.every((row) => Array.isArray(row) && row.length === Board.COLS);
      if (!validBoard || s.gameOver) return null;
      if (s.current !== Board.RED && s.current !== Board.YELLOW) return null;
      return s;
    } catch (err) {
      return null;
    }
  }

  // Rebuild a saved local game (board, turn, color pick, last-move marker).
  function resumeLocalGame() {
    const s = loadLocalState();
    if (!s) {
      clearLocalState(); // stale/corrupt save — discard it
      return;
    }

    board = s.board.map((row) => row.slice());
    current = s.current;
    startingColor = s.startingColor === Board.YELLOW ? Board.YELLOW : Board.RED;
    gameOver = false;
    pendingDrop = s.lastMove || null;

    if (!ui) {
      ui = UI.create({
        boardEl: document.getElementById("local-board"),
        onDrop: handleDrop,
      });
    }

    showView(localView); // also re-marks the session as "in local view"
    updateColorPicker();
    ui.setInteractive(true);
    ui.render(board, current);
    if (pendingDrop) ui.setLastMove(pendingDrop.row, pendingDrop.col);
    updateStatus();
    accepting = true;
  }

  function showView(view) {
    menuView.classList.add("hidden");
    localView.classList.add("hidden");
    onlineView.classList.add("hidden");
    view.classList.remove("hidden");
    // Remember whether a local game is on screen (survives a same-tab reload).
    try {
      if (view === localView) sessionStorage.setItem(VIEW_KEY, "local");
      else sessionStorage.removeItem(VIEW_KEY);
    } catch (err) {
      /* storage unavailable — auto-resume just won't happen */
    }
  }

  function playerName(player) {
    return player === Board.RED ? "Red" : "Yellow";
  }

  function startLocalGame() {
    board = Board.createBoard();
    gameOver = false;
    current = startingColor;
    pendingDrop = null;

    if (!ui) {
      ui = UI.create({
        boardEl: document.getElementById("local-board"),
        onDrop: handleDrop,
      });
    }

    showView(localView); // show FIRST so cell measurements are correct

    ui.setInteractive(true);
    ui.render(board, current);
    updateStatus();
    accepting = true;
    saveLocalState();
  }

  function updateStatus() {
    if (gameOver) return;
    statusEl.textContent = `${playerName(current)}'s turn`;
  }

  function handleDrop(col) {
    if (gameOver || !accepting) return;
    if (!Board.isValidColumn(board, col)) return;

    // Remember where this piece will land (for the "last move" highlight).
    pendingDrop = { row: Board.getDropRow(board, col), col };

    // Animate the token falling, then commit the move when it lands.
    accepting = false;
    ui.setInteractive(false);
    ui.animateDrop(col, current, () => commitMove(col));
  }

  function commitMove(col) {
    Board.dropPiece(board, col, current);
    afterMove();
  }

  function afterMove() {
    // Always redraw first so the just-dropped (winning) token is visible.
    ui.render(board, current);

    const winner = Board.getWinner(board);
    if (winner) {
      gameOver = true;
      ui.setInteractive(false);
      ui.showWin(Board.getWinningLine(board, winner));
      ui.setLastMove(pendingDrop.row, pendingDrop.col);
      statusEl.textContent = `${playerName(winner)} wins! 🎉`;
      clearLocalState(); // finished game: next visit starts fresh
      return;
    }
    if (Board.isFull(board)) {
      gameOver = true;
      ui.setInteractive(false);
      ui.setLastMove(pendingDrop.row, pendingDrop.col);
      statusEl.textContent = "It's a draw!";
      clearLocalState(); // finished game: next visit starts fresh
      return;
    }

    current = Board.other(current);
    ui.render(board, current);
    ui.setLastMove(pendingDrop.row, pendingDrop.col);
    updateStatus();
    ui.setInteractive(true);
    accepting = true;
    saveLocalState(); // progress survives an accidental reload
  }

  // ----- Menu / button wiring -----
  document.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const action = el.dataset.action;
      if (action === "open-local") startLocalGame();
      else if (action === "open-online") window.Multiplayer.openOnline();
      else if (action === "back-menu") {
        showView(menuView);
        window.Multiplayer.leaveIfPresent();
        clearLocalState(); // leaving to the menu abandons the local game
      } else if (action === "restart") {
        startLocalGame();
      } else if (action === "pick-red") {
        startingColor = Board.RED;
        updateColorPicker();
        startLocalGame();
      } else if (action === "pick-yellow") {
        startingColor = Board.YELLOW;
        updateColorPicker();
        startLocalGame();
      }
    });
  });

  // After a same-tab reload (e.g. mobile pull-to-refresh), resume the saved
  // local game if the user was last in the local view.
  try {
    if (sessionStorage.getItem(VIEW_KEY) === "local") resumeLocalGame();
  } catch (err) {}

  // Expose a tiny API so multiplayer.js can hide the menu if needed.
  window.Local = { showView, menuView, localView };
})();
