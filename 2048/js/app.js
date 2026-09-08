/*
 * app.js - 2048 Game Logic
 * Pure vanilla JS, no dependencies.
 * Handles game state, movement, merging, scoring, and rendering.
 */

const Game = (function () {
  const WIN_VALUE = 2048;

  // Difficulty modes: Normal is the classic 4x4 board, Baby is an easier 5x5.
  // Each mode keeps its own best score in localStorage.
  const MODES = {
    normal: { size: 4, storage: "2048-best-score" },
    baby: { size: 5, storage: "2048-best-score-baby" },
  };

  let mode = "normal";
  let size = MODES[mode].size;

  let grid = [];
  let score = 0;
  let bestScore = 0;
  let gameOver = false;
  let won = false;
  let keepPlaying = false;
  let animating = false;

  // Cells that just merged this move (for the merge highlight effect),
  // keyed as "row,col".
  let mergedCells = new Set();

  // DOM elements
  let boardEl = null;
  let scoreEl = null;
  let bestScoreEl = null;
  let messageEl = null;
  let messageTextEl = null;
  let retryBtn = null;
  let keepPlayingBtn = null;

  function init() {
    boardEl = document.getElementById("board");
    scoreEl = document.getElementById("current-score");
    bestScoreEl = document.getElementById("best-score");
    messageEl = document.getElementById("game-message");
    messageTextEl = document.getElementById("message-text");
    retryBtn = document.getElementById("retry-btn");
    keepPlayingBtn = document.getElementById("keep-playing-btn");

    bestScore = loadBestScore();
    updateBestScoreDisplay();

    retryBtn.addEventListener("click", newGame);
    keepPlayingBtn.addEventListener("click", continueGame);

    const newGameBtn = document.getElementById("new-game-btn");
    newGameBtn.addEventListener("click", newGame);

    // Difficulty mode picker (Normal / Baby).
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    setupInput();
    startModeGame();
  }

  function newGame() {
    grid = createEmptyGrid();
    score = 0;
    gameOver = false;
    won = false;
    keepPlaying = false;
    animating = false;
    mergedCells = new Set();
    clearState();

    updateScoreDisplay();
    hideMessage();

    addRandomTile();
    addRandomTile();
    render();
    saveState();
  }

  function createEmptyGrid() {
    const g = [];
    for (let r = 0; r < size; r++) {
      g.push(new Array(size).fill(0));
    }
    return g;
  }

  function cloneGrid(g) {
    return g.map((row) => row.slice());
  }

  function getEmptyCells() {
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) {
          cells.push({ r, c });
        }
      }
    }
    return cells;
  }

  function addRandomTile() {
    const empty = getEmptyCells();
    if (empty.length === 0) return null;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    return cell;
  }

  // Move logic: slide and merge a single row to the left.
  // Returns the resulting row and the indexes (within the result row) where a
  // merge happened, so the caller can highlight those tiles.
  function slideRow(row) {
    let arr = row.filter((v) => v !== 0);
    const mergedIdx = [];
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        score += arr[i];
        arr.splice(i + 1, 1);
        mergedIdx.push(i);
      }
    }
    while (arr.length < size) {
      arr.push(0);
    }
    return { result: arr, changed: !arraysEqual(row, arr), mergedIdx };
  }

  function arraysEqual(a, b) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function moveLeft() {
    let moved = false;
    for (let r = 0; r < size; r++) {
      const { result, changed, mergedIdx } = slideRow(grid[r]);
      if (changed) {
        grid[r] = result;
        mergedIdx.forEach((c) => mergedCells.add(r + "," + c));
        moved = true;
      }
    }
    return moved;
  }

  function moveRight() {
    let moved = false;
    for (let r = 0; r < size; r++) {
      const reversed = grid[r].slice().reverse();
      const { result, mergedIdx } = slideRow(reversed);
      const final = result.reverse();
      if (!arraysEqual(grid[r], final)) {
        grid[r] = final;
        // In the final row, the merged index k maps to (size-1 - k).
        mergedIdx.forEach((k) => mergedCells.add(r + "," + (size - 1 - k)));
        moved = true;
      }
    }
    return moved;
  }

  function moveUp() {
    let moved = false;
    for (let c = 0; c < size; c++) {
      const col = [];
      for (let r = 0; r < size; r++) {
        col.push(grid[r][c]);
      }
      const { result, mergedIdx } = slideRow(col);
      for (let r = 0; r < size; r++) {
        if (grid[r][c] !== result[r]) {
          grid[r][c] = result[r];
          moved = true;
        }
      }
      mergedIdx.forEach((r) => mergedCells.add(r + "," + c));
    }
    return moved;
  }

  function moveDown() {
    let moved = false;
    for (let c = 0; c < size; c++) {
      const col = [];
      for (let r = size - 1; r >= 0; r--) {
        col.push(grid[r][c]);
      }
      const { result, mergedIdx } = slideRow(col);
      const final = result.reverse();
      for (let r = 0; r < size; r++) {
        if (grid[r][c] !== final[r]) {
          grid[r][c] = final[r];
          moved = true;
        }
      }
      // In the final column, the merged index k maps to (size-1 - k).
      mergedIdx.forEach((k) => mergedCells.add((size - 1 - k) + "," + c));
    }
    return moved;
  }

  function canMove() {
    // Check for empty cells
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) return true;
      }
    }
    // Check for adjacent equal cells
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid[r][c];
        if (c < size - 1 && grid[r][c + 1] === val) return true;
        if (r < size - 1 && grid[r + 1][c] === val) return true;
      }
    }
    return false;
  }

  function hasWon() {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === WIN_VALUE) return true;
      }
    }
    return false;
  }

  function move(direction) {
    if (gameOver || animating) return;

    const prevGrid = cloneGrid(grid);
    mergedCells = new Set();
    let moved = false;

    switch (direction) {
      case "left":
        moved = moveLeft();
        break;
      case "right":
        moved = moveRight();
        break;
      case "up":
        moved = moveUp();
        break;
      case "down":
        moved = moveDown();
        break;
    }

    if (moved) {
      animating = true;
      const newTile = addRandomTile();
      updateScoreDisplay();

      render(newTile);

      if (!keepPlaying && hasWon()) {
        won = true;
        showMessage("You win!");
      } else if (!canMove()) {
        gameOver = true;
        showMessage("Game over!");
        clearState(); // finished games are not restored
      }

      if (!gameOver) saveState();

      setTimeout(() => {
        animating = false;
      }, 120);
    }
  }

  function showMessage(text) {
    messageTextEl.textContent = text;
    messageEl.classList.add("active");
    if (won && !keepPlaying) {
      keepPlayingBtn.classList.remove("hidden");
    } else {
      keepPlayingBtn.classList.add("hidden");
    }
  }

  function hideMessage() {
    messageEl.classList.remove("active");
  }

  function continueGame() {
    keepPlaying = true;
    hideMessage();
    saveState();
  }

  function updateScoreDisplay() {
    scoreEl.textContent = score;
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
      updateBestScoreDisplay();
    }
  }

  function updateBestScoreDisplay() {
    bestScoreEl.textContent = bestScore;
  }

  function loadBestScore() {
    const saved = localStorage.getItem(MODES[mode].storage);
    return saved ? parseInt(saved, 10) : 0;
  }

  function saveBestScore() {
    localStorage.setItem(MODES[mode].storage, bestScore.toString());
  }

  // ----- Game state persistence -----
  // The in-progress game is saved after every move, so a reload (or an
  // accidental pull-to-refresh on mobile) never wipes the player's progress.
  function stateKey() {
    return "2048-state-" + mode;
  }

  function saveState() {
    const state = {
      grid: grid,
      score: score,
      won: won,
      keepPlaying: keepPlaying,
      gameOver: gameOver,
    };
    localStorage.setItem(stateKey(), JSON.stringify(state));
  }

  function clearState() {
    localStorage.removeItem(stateKey());
  }

  // Restore a saved game for the current mode. Returns true if a valid,
  // unfinished game was restored.
  function loadSavedState() {
    try {
      const raw = localStorage.getItem(stateKey());
      if (!raw) return false;
      const state = JSON.parse(raw);
      const validGrid =
        Array.isArray(state.grid) &&
        state.grid.length === size &&
        state.grid.every((row) => Array.isArray(row) && row.length === size);
      if (!validGrid || typeof state.score !== "number") return false;
      if (state.gameOver) return false; // finished games start fresh

      grid = state.grid;
      score = state.score;
      won = !!state.won;
      keepPlaying = !!state.keepPlaying;
      gameOver = false;
      animating = false;
      mergedCells = new Set();

      updateScoreDisplay();
      render();
      if (won && !keepPlaying) showMessage("You win!");
      return true;
    } catch (err) {
      return false;
    }
  }

  // Start (or resume) the game for the current mode: restores a saved game if
  // there is one, otherwise begins a fresh board.
  function startModeGame() {
    updateModeButtons();
    if (loadSavedState()) return;
    newGame();
  }

  // ----- Difficulty modes (Normal 4x4 / Baby 5x5) -----
  // Switching mode loads that mode's best score and resumes (or starts) that
  // mode's game. Clicking the active mode is a no-op.
  function setMode(name) {
    if (!MODES[name] || name === mode) return;
    mode = name;
    size = MODES[mode].size;
    bestScore = loadBestScore();
    updateBestScoreDisplay();
    startModeGame();
  }

  function updateModeButtons() {
    document.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });
  }

  function getTileClass(value) {
    if (value === 0) return "";
    if (value <= 2048) return "tile-" + value;
    return "tile-super";
  }

  // Minecraft-style burst: small squares in the merged tile's color fly out
  // of the tile, fall with gravity and vanish — like breaking a block.
  function spawnMergeParticles(row, col, value) {
    const tileEl = boardEl.children[row * size + col];
    if (!tileEl) return;
    const wrap = boardEl.parentElement; // .board-wrap (position: relative)
    const color = getComputedStyle(tileEl).backgroundColor; // new value's color

    // Tile center, in board-wrap coordinates (board has a 6px border, so add
    // clientLeft/clientTop to the tile's offsets).
    const cx =
      boardEl.offsetLeft + boardEl.clientLeft + tileEl.offsetLeft + tileEl.offsetWidth / 2;
    const cy =
      boardEl.offsetTop + boardEl.clientTop + tileEl.offsetTop + tileEl.offsetHeight / 2;

    const count = 10;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";

      // Random small square size, like Minecraft's chunky debris.
      const s = 4 + Math.random() * 6;
      p.style.width = s + "px";
      p.style.height = s + "px";
      p.style.background = color;
      p.style.left = cx - s / 2 + "px";
      p.style.top = cy - s / 2 + "px";

      // Random burst direction with an upward bias, then gravity pulls the
      // square below its apex before it fades out.
      const dist = 20 + Math.random() * 26;
      const ang = Math.random() * Math.PI * 2;
      const dx = Math.cos(ang) * dist;
      const dy1 = Math.sin(ang) * dist - 14;
      const dy2 = dy1 + 34 + Math.random() * 22;
      p.style.setProperty("--dx", dx.toFixed(0) + "px");
      p.style.setProperty("--dy1", dy1.toFixed(0) + "px");
      p.style.setProperty("--dy2", dy2.toFixed(0) + "px");

      p.addEventListener("animationend", () => p.remove());
      wrap.appendChild(p);
    }
  }

  function render(newTile) {
    // Baby mode uses a 5-column grid (CSS class adjusts columns + font size).
    boardEl.classList.toggle("board-5", size === 5);
    boardEl.innerHTML = "";

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = grid[r][c];
        const tile = document.createElement("div");
        tile.className = "tile";

        if (val !== 0) {
          tile.classList.add(getTileClass(val));
          // Digit-count class (d1..d4): CSS scales the font so any number
          // fits its cell (fixes the 5x5 board stretching at 1024+).
          tile.classList.add("d" + String(val).length);
          tile.textContent = val;

          // Mark new tile for animation
          if (newTile && newTile.r === r && newTile.c === c) {
            tile.classList.add("tile-new");
          }

          // Mark tiles that just merged this move + particle burst
          if (mergedCells.has(r + "," + c)) {
            tile.classList.add("tile-merged");
            spawnMergeParticles(r, c, val);
          }
        }

        boardEl.appendChild(tile);
      }
    }
  }

  function setupInput() {
    // Keyboard controls
    document.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          move("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          move("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          move("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          move("right");
          break;
      }
    });

    // NOTE: touch gestures are handled with CSS `touch-action: none` on the
    // board (board swipes never scroll or refresh the page), while the rest of
    // the page scrolls normally. No global touchmove blocking — that broke
    // scrolling on mobile.

    // Touch controls (swipes on the board move the tiles)
    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30;

    boardEl.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    boardEl.addEventListener("touchend", (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < minSwipeDistance) return;

      if (absDx > absDy) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    });
  }

  return { init };
})();

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", Game.init);
