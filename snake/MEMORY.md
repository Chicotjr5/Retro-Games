# MEMORY.md — Snake Project

## Project summary
A personal project to build the classic Snake game using pure HTML, CSS, and
vanilla JS (no framework, no external dependencies). It lives in the same
"tiny arcade of web games" hub as the Connect 4 and 2048 games.

The game follows the same **pixel-art dark theme** as Connect 4 / 2048 so all
three games feel like one cohesive product.

## Tech decisions
- Pure HTML + CSS + vanilla JS. No build step, no npm packages.
- Logic and rendering are both in a single `js/app.js` (the game is fully
  client-side, no server needed).
- The game persists the **best score** in `localStorage` (key
  `snake-best-score`) using the same pattern as 2048's best score.
- Controls are keyboard (**arrow keys** and **WASD**) plus touch swipe on
  mobile.
- Space / P toggles **pause**; a Pause button in the game bar does the same.
- The project is served from the same static hub as Connect 4 / 2048 (Node
  static server in `/`, handles `/snake/` subfolder).

## File structure
```
snake/index.html       Score bar + board + overlay markup + header/footer
snake/css/styles.css   Pixel-art UI, snake/food cells, animations (matches 2048)
snake/js/app.js        Game logic (grid, movement, food, scoring, input, render)
snake/resume-session.sh  Resume the OpenCode session for this project
snake/MEMORY.md        This file
```

## Game rules implemented
- 20x20 grid; snake starts as 3 segments moving right from the center.
- Snake moves on a timer (`setInterval`); each food eaten adds 1 point and
  grows the snake by one segment.
- Speed **increases per food** (base 153ms/step — 15% faster than the
    original 180ms, -4ms per food, floor 70ms).
- Food spawns on a random empty cell each time one is eaten.
- Hitting a wall **or** biting yourself ends the game.
- Game-over overlay shows the final score with a "Try again" button.
- Score + best score shown above the board; best persists in `localStorage`.
- Reversing direction is blocked (can't drive into your own neck); a small
  input queue (~2 moves) makes rapid successive keys feel responsive without
  allowing 180° flips. The snake's vacating tail cell is a legal target.

## UI / theme notes
- Uses the exact same pixel-art variables as connect-4 / 2048 (`--bg`,
  `--panel`, `--panel-2`, `--font-pixel` "Press Start 2P", `--font-term`
  "VT323", `--pixel-shadow`, `--board-frame`, `--cell-empty`, etc.).
- The board face is navy `var(--panel)` with a dark frame and a CRT scanline
  overlay (`.board-wrap::after`), identical to the other boards.
- 20x20 grid uses `repeat(20, minmax(0, 1fr))` so every cell is exactly the
  same size regardless of content (avoids the tile-stretching bug 2048 hit).
- Snake segments use the same solid `inset` bevel formula as connect-4 chips
  (green; head is a brighter shade so the direction reads at a glance).
- Food is a little circular red chip that pops in with `steps()` easing.
- Game-over / pause overlays cover the board (pixel font black shadow).
- Responsive: board, score bar and buttons scale down on small screens.

## How to access
- URL: `https://equipo10.tail7a2703.ts.net:10000/snake/`
- The game is a sub-menu entry from the main hub page (`/`) next to
  Connect 4 and 2048.
- Local static server in the repo root serves the whole `/games` folder.

## Change log
- 2026-09-01: Initial Snake game created.
  - Added `snake/index.html`, `snake/css/styles.css`, `snake/js/app.js`,
    `snake/resume-session.sh`, `snake/MEMORY.md`.
  - Controls: arrow keys + WASD, input queue with reversal blocking, plus
    touch swipe on mobile. Space/P + button toggles pause.
  - Score + best score (persisted in localStorage key `snake-best-score`).
  - Speed ramps up as you eat; wall/self collision = game over with
    "Try again".
  - Pixel-art theme matching the Connect 4 / 2048 games.
  - Added a Snake game card + signature chips (head + body + food) to the
    main hub `index.html` and matching CSS in the shared `/css/style.css`.
- 2026-09-01: Registered Snake in the root static server.
  - Root `server.js` lists games in its `games` array; Snake is a
    static-only game (no multiplayer API) like 2048.
  - Added it via `registerStaticGame("snake", path.join(__dirname, "snake"))`.
  - Restarted the node arcade server (no hot reload — editing `server.js`
    alone isn't enough; the running process must be restarted).
  - Verified `/`, `/connect-4/`, `/2048/`, `/snake/`, `/snake/css/styles.css`,
    `/snake/js/app.js` all return 200 on localhost:3000 and via the public
    URL.
- 2026-09-01: Cache-busting on assets.
  - `snake/index.html` links `css/styles.css?v=20260901` and
    `js/app.js?v=20260901`; the root server sends `Cache-Control: no-cache`
    for html/css/js (same arcade-wide policy). Bump `v` on future asset
    changes if needed.
- 2026-09-02: Bug fixes — vanishing snake + stale apples.
  - Vanishing snake: `step()` assigned the queued direction *name* (string)
    to `dir` instead of its `DIRS` vector, so the head moved to NaN coords
    and `render()` threw after clearing the old classes. Fixed with
    `dir = DIRS[queued.shift()]`.
  - Stale apples: `newGame()` nulled `foodEl` before `render()`, so
    `placeFoodRender()` never cleared the previous cell's `.food` class.
    Removed the `foodEl = null;` line.
  - Cache-buster bumped to `?v=20260901c` (js).
- 2026-09-02: Speed tuning — 15% faster start.
  - `BASE_SPEED` 180 -> 153 ms/step; `SPEED_STEP` 6 -> 5 ms per food.
  - Floor stays at `MIN_SPEED` 70 ms (reached after ~17 apples).
  - Cache-buster bumped to `?v=20260901d` (js).
- 2026-09-02: Speed ramp softened.
  - `SPEED_STEP` 5 -> 4 ms per food (floor at 70 ms now after ~21 apples).
  - Cache-buster bumped to `?v=20260901e` (js).
- 2026-09-01: Bug fix — stale apples stacked up across restarts.
  - Symptom: pressing "New Game" spawned a new apple but the old one stayed,
    so restarting repeatedly filled the board with leftover apples.
  - Cause: `newGame()` reset `foodEl` to `null`, and `render()` only removed
    the `.food` class from the previous apple when a different food cell was
    current. With `foodEl` nulled, it never knew which cell to clear.
  - Fix: extracted `placeFoodRender()` — it always removes `.food` from the
    previously rendered apple (`foodEl`) before re-adding it for the current
    `food`. Since `newGame()` calls `render()`, every restart wipes the old
    apple. The old `el !== foodEl` guard that had skipped cleanup is gone.
- 2026-09-01: Mobile controls aligned with 2048.
  - `css/styles.css`: `.board` gained `touch-action: none` (board swipes are
    game input only — never scroll or pull-to-refresh), same as the 2048
    board. Body keeps `touch-action: manipulation`.
  - `js/app.js`: swipe handling matches 2048 exactly — `touchstart` records
    `e.touches[0]` coords with `{ passive: true }`, `touchend` reads
    `changedTouches`, ignores sub-`minSwipeDistance` moves (raised 24 -> 30),
    and queues the dominant-axis direction.
  - Cache-busters bumped to `?v=20260901b` (css + js).