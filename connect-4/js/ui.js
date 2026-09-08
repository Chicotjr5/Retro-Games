/*
 * ui.js - Shared board rendering for local and online games.
 *
 * Visual model (gives the "piece falls behind the board" effect):
 *   - The board has TWO layers:
 *       1) a BACK layer (.board-back) holding the settled pieces and the
 *          falling/ghost tokens (z-index 1);
 *       2) a FRONT layer of cells (.cell) that is a blue panel with
 *          transparent circular holes (z-index 2). The blue ring of each cell
 *          hides the token where there is no hole, so a falling piece is only
 *          visible through the holes — exactly like a real Connect 4 board.
 *
 * Interaction: click any hole to drop into that column; hovering previews the
 * landing cell. Moves animate as a token falling from above into place.
 *
 * Usage:
 *   const ui = UI.create({ boardEl, onDrop: (col) => { ... } });
 *   ui.render(board, currentPlayer);
 *   ui.setInteractive(true|false);
 *   ui.showWin(board, player);
 *   ui.animateDrop(col, player, onLanded);
 */

const UI = (function () {
  const Board = window.Board;

  function playerClass(player) {
    if (player === Board.RED) return "red";
    if (player === Board.YELLOW) return "yellow";
    return "";
  }

  function create(opts) {
    const { boardEl, onDrop } = opts;

    boardEl.innerHTML = "";
    boardEl.style.position = "relative";

    // Back layer: settled pieces + falling/ghost tokens (behind the cells).
    const back = document.createElement("div");
    back.className = "board-back";
    boardEl.appendChild(back);

    // Front layer: the blue mask with transparent holes (the clickable cells).
    const cells = [];
    const pieceEls = [];
    for (let r = 0; r < Board.ROWS; r++) {
      const rowCells = [];
      const rowPieces = [];
      for (let c = 0; c < Board.COLS; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;
        // Clicking any hole in a column drops into that column.
        cell.addEventListener("click", () => {
          if (interactive && onDrop) onDrop(c);
        });
        // Hovering previews where the token will land.
        cell.addEventListener("mouseenter", () => {
          pointerCol = c;
          showGhost(c);
        });
        boardEl.appendChild(cell);
        rowCells.push(cell);

        const piece = document.createElement("div");
        piece.className = "piece";
        boardEl.appendChild(piece);
        rowPieces.push(piece);
      }
      cells.push(rowCells);
      pieceEls.push(rowPieces);
    }
    boardEl.addEventListener("mouseleave", () => {
      pointerCol = null;
      hideGhost();
    });
    window.addEventListener("resize", onViewportChange);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) onViewportChange();
    });
    layoutPieces(); // position pieces immediately

    let interactive = true;
    let hoverPlayer = Board.RED;
    let lastBoard = Board.createBoard();
    let ghost = null;
    let lastPiece = null; // currently highlighted "last move" piece
    let pointerCol = null; // column currently under the pointer (re-show ghost on render/resize)

    function setHover(player) {
      hoverPlayer = player;
    }

    function setInteractive(value) {
      interactive = value;
      if (!interactive) hideGhost();
    }

    // Position a token element (ghost or falling) centered in the landing cell,
    // matching the 84% piece size used by the back layer.
    function placeToken(el, row, col) {
      const target = cells[row][col];
      const size = target.offsetWidth * 0.84;
      const ox = (target.offsetWidth - size) / 2;
      const oy = (target.offsetHeight - size) / 2;
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.left = target.offsetLeft + ox + "px";
      el.style.top = target.offsetTop + oy + "px";
      return target;
    }

    // Show a faint preview token at the landing cell of column `col`.
    function showGhost(col) {
      if (!interactive) return;
      const row = Board.getDropRow(lastBoard, col);
      if (row === -1) {
        hideGhost();
        return;
      }
      pointerCol = col;
      if (!ghost) {
        ghost = document.createElement("div");
        ghost.className = "token ghost";
        boardEl.appendChild(ghost);
      }
      ghost.style.display = "";
      ghost.className = "token ghost " + playerClass(hoverPlayer);
      placeToken(ghost, row, col);
    }

    function hideGhost() {
      if (ghost) ghost.style.display = "none";
    }

    // Re-layout on resize/restore so pieces AND the hover ghost stay aligned
    // with the holes even when the window size changes (or is minimized).
    function onViewportChange() {
      layoutPieces();
      if (pointerCol !== null) showGhost(pointerCol);
    }

    // Position a settled piece exactly at the center of its cell, using the
    // same cell coordinates the falling token uses — guarantees concentricity.
    function layoutPieces() {
      for (let r = 0; r < Board.ROWS; r++) {
        for (let c = 0; c < Board.COLS; c++) {
          const target = cells[r][c];
          const piece = pieceEls[r][c];
          const size = target.offsetWidth * 0.84;
          piece.style.width = size + "px";
          piece.style.height = size + "px";
          piece.style.left = target.offsetLeft + (target.offsetWidth - size) / 2 + "px";
          piece.style.top = target.offsetTop + (target.offsetHeight - size) / 2 + "px";
        }
      }
    }

    // Redraw the whole board from a board state.
    function render(board, currentPlayer) {
      if (currentPlayer) hoverPlayer = currentPlayer;
      lastBoard = board;
      for (let r = 0; r < Board.ROWS; r++) {
        for (let c = 0; c < Board.COLS; c++) {
          const owner = board[r][c];
          const piece = pieceEls[r][c];
          piece.className = "piece" + (owner ? " " + playerClass(owner) : "");
          // Clear any win highlight so a restart starts clean.
          cells[r][c].classList.remove("win");
        }
      }
      layoutPieces();
      hideGhost();
      // After a re-render (e.g. right after a drop) re-show the preview for the
      // column the pointer is still hovering, so it doesn't vanish on the same
      // column. showGhost() no-ops when not interactive or the column is full.
      if (pointerCol !== null) showGhost(pointerCol);
    }

    // Highlight a winning line: blink the pieces and ring the front cells.
    function showWin(line) {
      line.forEach(({ row, col }) => {
        pieceEls[row][col].classList.add("win");
        cells[row][col].classList.add("win");
      });
    }

    // Animate a token falling from above the board into its landing cell,
    // then call onLanded() (the caller commits the move to the data board).
    function animateDrop(col, player, onLanded) {
      const row = Board.getDropRow(lastBoard, col);
      if (row === -1) {
        onLanded();
        return;
      }
      const target = cells[row][col];
      const token = document.createElement("div");
      token.className = "token " + playerClass(player);
      placeToken(token, row, col);
      token.style.top = -parseFloat(token.style.height) - 2 + "px"; // start above board
      boardEl.appendChild(token);
      hideGhost();
      // Force layout, then trigger the transition on the next frame.
      requestAnimationFrame(() => {
        token.style.top = target.offsetTop + (target.offsetHeight - parseFloat(token.style.height)) / 2 + "px";
      });
      token.addEventListener(
        "transitionend",
        () => {
          token.remove();
          onLanded();
        },
        { once: true }
      );
    }

    // Outline the most recently played piece (white border on the chip).
    function setLastMove(row, col) {
      if (lastPiece) lastPiece.classList.remove("last");
      if (row == null || col == null) {
        lastPiece = null;
        return;
      }
      lastPiece = pieceEls[row][col];
      lastPiece.classList.add("last");
    }

    return {
      render,
      setInteractive,
      setHover,
      showWin,
      animateDrop,
      setLastMove,
    };
  }

  return { create };
})();

// Expose globally for local.js / multiplayer.js.
window.UI = UI;
