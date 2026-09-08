/* Snake — pure vanilla JS, no dependencies.
 * Matches the shared pixel-art arcade theme (connect-4 / 2048).
 */
(function () {
  "use strict";

  var SIZE = 20;
  var BASE_SPEED = 153; // ms per step, at start
  var MIN_SPEED = 70; // ms per step, fastest
  var SPEED_STEP = 4; // ms faster per food eaten
  var BEST_KEY = "snake-best-score";

  var DIRS = {
    up: { r: -1, c: 0 },
    down: { r: 1, c: 0 },
    left: { r: 0, c: -1 },
    right: { r: 0, c: 1 },
  };
  var OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };
  var KEY_DIRS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    W: "up",
    S: "down",
    A: "left",
    D: "right",
  };

  var boardEl = document.getElementById("board");
  var scoreEl = document.getElementById("current-score");
  var bestEl = document.getElementById("best-score");
  var overlay = document.getElementById("game-message");
  var messageText = document.getElementById("message-text");
  var retryBtn = document.getElementById("retry-btn");
  var pauseBtn = document.getElementById("pause-btn");
  var newGameBtn = document.getElementById("new-game-btn");

  var cells = [];
  var snake = [];
  var dir = DIRS.right;
  var queued = [];
  var food = null;
  var foodEl = null;
  var prevSnake = [];
  var score = 0;
  var best = 0;
  var speed = BASE_SPEED;
  var timer = null;
  var paused = false;
  var gameOver = false;

  function buildGrid() {
    boardEl.innerHTML = "";
    cells = [];
    for (var r = 0; r < SIZE; r++) {
      var rowEls = [];
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement("div");
        cell.className = "cell";
        boardEl.appendChild(cell);
        rowEls.push(cell);
      }
      cells.push(rowEls);
    }
  }

  function bestScore() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (e) {
      /* storage unavailable (private mode) — best just won't persist */
    }
  }

  function resetSnake() {
    var mid = Math.floor(SIZE / 2);
    snake = [
      { r: mid, c: mid + 1 },
      { r: mid, c: mid },
      { r: mid, c: mid - 1 },
    ];
    dir = DIRS.right;
    queued = [];
  }

  function randomInt(n) {
    return Math.floor(Math.random() * n);
  }

  function placeFood() {
    var occupied = {};
    snake.forEach(function (seg) {
      occupied[seg.r * SIZE + seg.c] = true;
    });
    var free = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (!occupied[r * SIZE + c]) free.push({ r: r, c: c });
      }
    }
    if (free.length === 0) return; // board completely full — win
    food = free[randomInt(free.length)];
  }

  function placeFoodRender() {
    // Clear the previously placed apple first so restarts never leave
    // stale apples on the board.
    if (foodEl) foodEl.classList.remove("food");
    foodEl = null;
    if (food) {
      foodEl = cells[food.r][food.c];
      foodEl.classList.add("food");
    }
  }

  function render() {
    prevSnake.forEach(function (el) {
      el.classList.remove("snake", "snake-head", "snake-body");
    });
    prevSnake = [];
    snake.forEach(function (seg, i) {
      var el = cells[seg.r][seg.c];
      el.classList.add("snake", i === 0 ? "snake-head" : "snake-body");
      prevSnake.push(el);
    });
    placeFoodRender();
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  function step() {
    if (paused || gameOver) return;

    if (queued.length) dir = DIRS[queued.shift()];

    var head = snake[0];
    var d = dir;
    var nr = head.r + d.r;
    var nc = head.c + d.c;

    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) {
      endGame();
      return;
    }

    var eats = food && nr === food.r && nc === food.c;

    // The tail will vacate when we don't eat, so it's a legal target cell.
    var body = eats ? snake : snake.slice(0, snake.length - 1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].r === nr && body[i].c === nc) {
        endGame();
        return;
      }
    }

    snake.unshift({ r: nr, c: nc });
    if (eats) {
      score += 1;
      updateScore();
      if (score > best) {
        best = score;
        bestEl.textContent = String(best);
        saveBest();
      }
      placeFood();
      var newSpeed = BASE_SPEED - score * SPEED_STEP;
      if (newSpeed < MIN_SPEED) newSpeed = MIN_SPEED;
      if (newSpeed !== speed) {
        speed = newSpeed;
        startTimer();
      }
    } else {
      snake.pop();
    }

    render();
  }

  function endGame() {
    gameOver = true;
    stopTimer();
    messageText.textContent = "Game Over — " + score + " pts";
    retryBtn.textContent = "Try again";
    overlay.classList.add("active");
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(step, speed);
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function showPausedOverlay() {
    messageText.textContent = "Paused";
    retryBtn.textContent = "Resume";
    overlay.classList.add("active");
  }

  function togglePause() {
    if (gameOver) return;
    if (paused) {
      paused = false;
      overlay.classList.remove("active");
      pauseBtn.textContent = "Pause";
      startTimer();
    } else {
      paused = true;
      stopTimer();
      pauseBtn.textContent = "Resume";
      showPausedOverlay();
    }
  }

  function newGame() {
    stopTimer();
    gameOver = false;
    paused = false;
    overlay.classList.remove("active");
    pauseBtn.textContent = "Pause";
    score = 0;
    speed = BASE_SPEED;
    queued = [];
    updateScore();
    resetSnake();
    placeFood();
    render();
    startTimer();
  }

  function queueDir(name) {
    // Can't reverse into the current (or last queued) direction.
    if (!queued.length && name === OPPOSITE[dirKey(dir)]) return;
    if (queued.length && name === OPPOSITE[queued[queued.length - 1]]) return;
    if (queued.length >= 2) queued.shift();
    queued.push(name);
  }

  function dirKey(d) {
    if (d === DIRS.up) return "up";
    if (d === DIRS.down) return "down";
    if (d === DIRS.left) return "left";
    return "right";
  }

  function onKey(e) {
    if (e.key in KEY_DIRS) {
      e.preventDefault();
      if (!paused && !gameOver) queueDir(KEY_DIRS[e.key]);
    } else if (e.key === " " || e.key === "p" || e.key === "P") {
      e.preventDefault();
      togglePause();
    }
  }

  var touchStart = { x: 0, y: 0 };
  var minSwipeDistance = 30;

  function onTouchStart(e) {
    touchStart.x = e.touches[0].clientX;
    touchStart.y = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    var dx = e.changedTouches[0].clientX - touchStart.x;
    var dy = e.changedTouches[0].clientY - touchStart.y;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < minSwipeDistance) return;
    if (paused || gameOver) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      queueDir(dx > 0 ? "right" : "left");
    } else {
      queueDir(dy > 0 ? "down" : "up");
    }
  }

  retryBtn.addEventListener("click", function () {
    if (paused) togglePause();
    else newGame();
  });

  pauseBtn.addEventListener("click", togglePause);
  newGameBtn.addEventListener("click", newGame);

  document.addEventListener("keydown", onKey);
  boardEl.addEventListener("touchstart", onTouchStart, { passive: true });
  boardEl.addEventListener("touchend", onTouchEnd, { passive: true });

  best = bestScore();
  updateScore();
  buildGrid();
  newGame();
})();