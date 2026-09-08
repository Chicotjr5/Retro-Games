# MEMORY.md — 2048 Project

## Project summary
A personal project to build the classic 2048 game using pure HTML, CSS, and
vanilla JS (no framework, no external dependencies). It lives in the same
"tiny arcade of web games" hub as the Connect 4 game.

The game follows the same **pixel-art dark theme** as Connect 4 so both games
feel like one cohesive product.

## Tech decisions
- Pure HTML + CSS + vanilla JS. No build step, no npm packages.
- Logic and rendering are both in a single `js/app.js` (the game is fully
  client-side, no server needed).
- The game persists the **best score** in `localStorage` (key `2048-best-score`).
- Controls are keyboard (**arrow keys** and **WASD**) plus touch swipe for
  mobile.
- The project is served from the same static hub as Connect 4 (Node static
  server in `/`, already handles `/2048/` subfolders).

## File structure
```
2048/index.html       Menu/scores/board markup + header/footer
2048/css/styles.css   Pixel-art UI, tile colors, animations (matches connect-4)
2048/css/styles-legacy.css  Snapshot of the pre-restyle look (board scanlines era)
2048/js/app.js        Game logic (state, slide/merge, scoring, input, render)
2048/resume-session.sh  Resume the OpenCode session for this project
2048/MEMORY.md        This file
```

## Game rules implemented
- 4x4 grid; starts with two random tiles (90% a `2`, 10% a `4`).
- Slide all tiles in a direction; identical adjacent tiles merge (2+2 -> 4, etc.)
  and each merge adds to the score.
- A random tile spawns after each successful move.
- Win at 2048 (optional "Keep going" to continue past it).
- Game over when no empty cells and no adjacent equal tiles remain.

## UI / theme notes
- Uses the exact same pixel-art variables as connect-4 (`--bg`, `--panel`,
  `--panel-2`, `--font-pixel` "Press Start 2P", `--font-term` "VT323",
  `--pixel-shadow`, etc.).
- Tile colors follow a gradient from dark to bright across values 2..2048+.
- New tiles pop in (`tile-appear`), merges pop (`tile-pop`), and the 2048 tile
  glows (`tile-glow`).
- Game-over / win overlay covers the board with a "Try again" / "Keep going".
- Responsive: board and scores scale down for small screens (<520px).

## How to access
- URL: `https://equipo10.tail7a2703.ts.net:10000/2048/`
- The game is a sub-menu entry from the main hub page (`/`) next to Connect 4.
- Local static server in the repo root serves the whole `/web` folder.

## Change log
- 2026-08-31: Initial 2048 game created.
  - Added `2048/index.html`, `2048/css/styles.css`, `2048/js/app.js`.
  - Controls: arrow keys + WASD, plus touch swipe on mobile.
  - Score + best score (persisted in localStorage).
  - Win (2048) with optional "Keep going", and game-over detection.
  - Pixel-art theme matching the Connect 4 game.
  - Added a 2048 game card + "signature tiles" (2/4/8 chips) to the main hub
    `index.html` and matching CSS in the shared `/css/style.css`.
- 2026-08-31: Registered 2048 in the root static server.
  - Root `server.js` only served games listed in its `games` array (connect-4
    had a module with a multiplayer API). 2048 is a static-only game.
  - Added a `registerStaticGame(name, root)` helper that returns a
    no-op multiplayer controller, and registered `2048` with it.
  - Verified: `/`, `/connect-4/`, `/2048/`, `/2048/css/styles.css`,
    `/2048/js/app.js` all return 200.
- 2026-08-31: Wired up the "New Game" button in `2048/js/app.js` (it was in the
  markup but not yet attached to a click handler).
- 2026-08-31: Fixed 2048 not being accessible at the public URL.
  - Root cause: the arcade server (`node server.js`) was still running an OLD
    process started (08:20) BEFORE 2048 was registered in `server.js`. Editing
    the files alone wasn't enough — Node had to be restarted to pick up the new
    registration, so /2048/ kept returning "Not found".
  - Infrastructure confirmed: Tailscale Funnel proxies
    `https://equipo10.tail7a2703.ts.net:10000/` -> `http://127.0.0.1:3000`, so the
    arcade must run on port 3000. The old process held 3000.
  - Fix: stopped the stale server process and started a fresh one
    (`setsid nohup node server.js` from `/opt/proyectos/web`, the same pattern as
    `connect-4/start.sh`). Confirmed 200 for `/`, `/connect-4/`, `/2048/`,
    `/2048/css/styles.css`, `/2048/js/app.js` on localhost:3000, and 200 for the
    public URL `https://equipo10.tail7a2703.ts.net:10000/2048/`.
  - Lesson: after editing `server.js`, the running node server MUST be restarted
    (there is no hot reload).
- 2026-08-31: Fixed mobile pull-to-refresh reloading the page.
  - Symptom: on mobile, swiping down reloaded the page — including when the
    finger was OFF the board (the whole page reloaded). Only swiping on the board
    correctly moved the tiles.
  - Cause: the page had no pull-to-refresh / overscroll prevention, and the touch
    handlers used `passive: true`, which forbids `preventDefault()` (so swipes
    always bubbled up to the browser and triggered refresh).
  - Fix (in `2048/js/app.js` + `2048/css/styles.css`):
    * Added a non-passive `document` `touchmove` listener that
      `preventDefault()`s single-finger moves, disabling pull-to-refresh/rubber
      band on the whole page (this is a non-scrolling game page, so that's
      desirable).
    * Removed `passive: true` from the board's `touchend` handler.
    * Added `overscroll-behavior-y: none` and `touch-action: manipulation` to
      `body` in the CSS for an extra layer of protection.
- 2026-08-31: Added a merge highlight effect.
  - Symptom: when two tiles combined you couldn't tell which ones had merged.
  - Fix (`2048/js/app.js` + `2048/css/styles.css`):
    * `slideRow()` now returns `mergedIdx` — the indexes in the result row where
      a merge happened.
    * The directional move functions map those into absolute grid coords and
      collect them into a `mergedCells` Set (reverse directions `right`/`down`
      map `k -> SIZE-1-k`).
    * `render()` adds a `tile-merged` class to exactly those tiles.
    * CSS: a distinct `tile-merge` keyframe — a bigger scale-up to 1.25 plus a
      bright white expanding glow ring — so merges are instantly visible. The old
      subtle `tile-pop` was replaced by this stronger effect.
- 2026-08-31: Changed the color of the "2" tile + faster movement.
  - `2048/css/styles.css`: `--tile-2` changed from dark navy `#333c57` to a light
    parchment/cream `#e8e4dc` with dark text `--tile-2-text: #1a1c2c` — clearly
    distinct from the blue of the 4 tile and the rest of the palette.
  - `2048/js/app.js`: reduced the movement lock timeout (`animating` reset) from
    `150ms` to `80ms`, so consecutive moves feel snappier.
- 2026-08-31: Replaced the full tile background palette.
  - `2048/css/styles.css` tile backgrounds now follow a blue -> yellow -> red
    progression:
    2 `#6bb2e5`, 4 `#2089d5`, 8 `#1c557d`, 16 `#fbed56`, 32 `#ffea00`,
    64 `#8e830b`, 128 `#cab000`, 256 `#cc2844`, 512 `#78212f`, 1024 `#f50c00`,
    2048 `#c20e05`. (`--tile-super` unchanged.)
- 2026-08-31: Updated tile palette again (brighter warm progression).
  - New backgrounds: 2 `#6bb2e5`, 4 `#2089d5`, 8 `#1c557d` (unchanged),
    16 `#ffd93d`, 32 `#ffc300`, 64 `#ff9900`, 128 `#ff6b00` (bright yellow/orange
    series, dark text), 256 `#f53d2e`, 512 `#d91e18`, 1024 `#a80f0a`, 2048
    `#6e0b05` (deepening red series, white text).
- 2026-08-31: Created `2048/resume-session.sh`.
  - Shell script to resume the OpenCode session for the 2048 project.
  - Uses `opencode -c` to continue the last session. Placeholder for exact
    session ID added as a comment.
- 2026-08-31: Return to hub via the title; removed the "Other games" button.
  - `2048/index.html`: deleted the `.bottom-link` block ("Other games" button).
  - The header title is now a link to the main page:
    `<h1 class="title"><a class="title-link" href="/">2048</a></h1>`.
  - `2048/css/styles.css`: added `.title-link { color: inherit;
    text-decoration: none; }` so the link looks exactly like the title did.
  - Same change applied to the connect-4 page (its `index.html` + `css/style.css`)
    so both games behave identically.
- 2026-08-31: Board restyled to match connect-4's retro look + CRT scanlines.
  - Old stylesheet saved untouched as `2048/css/styles-legacy.css` (same backup
    pattern as connect-4's historical `style-classic.css`).
  - `2048/css/styles.css` changes:
    * New vars: `--board-frame: #11131f`, `--cell-empty: #11131f`, and a
      `--tile-N-dark` solid shade for every tile value (2..2048 + super).
    * `.board`: face is now navy `var(--panel)` (was gray `--panel-2`), frame is
      `6px solid var(--board-frame)` (dark navy like connect-4, not black),
      plus `image-rendering: pixelated`.
    * Base `.tile` (empty cells) is now a dark cavity (`--cell-empty`) with a
      black border — mirrors the holes of the connect-4 board.
    * Filled tiles use the exact connect-4 chip bevel formula:
      `inset -5px -5px 0 var(--tile-N-dark), inset 4px 4px 0 rgba(255,255,255,0.25)`
      (solid shades instead of the old translucent rgba bevels).
    * `tile-merge` keyframe switched to `filter: drop-shadow` for the glow so
      each merged tile keeps its own correct solid bevel during the animation;
      `tile-glow` updated to the solid bevel values.
    * Added a CRT scanline overlay: `.board-wrap::after` (repeating 1px dark
      lines at ~7% opacity, `pointer-events: none`, z-index 1000).
  - `connect-4/css/style.css`: `.board-wrap` gained `position: relative` and the
    same `.board-wrap::after` scanline overlay (board/game logic untouched).
  - Hub `/css/style.css`: the 2048 card's mini-tiles (`.chip-tile.chip-2/4/8`)
    updated from the old palette to the current one (2 `#6bb2e5` dark text,
    4 `#2089d5`, 8 `#1c557d`) with solid bevels matching the game tiles.
- 2026-08-31: Added two difficulty modes: Normal (4x4) and Baby (5x5).
  - `2048/js/app.js`:
    * Replaced the fixed `SIZE = 4` with a dynamic `size` driven by a `MODES`
      config: `normal -> { size: 4, storage: "2048-best-score" }`,
      `baby -> { size: 5, storage: "2048-best-score-baby" }`. All loops
      (grid creation, moves, canMove/hasWon, render) now use `size`.
    * `setMode(name)` switches mode, loads that mode's best score, refreshes the
      button highlight and starts a fresh game (clicking the active mode is a
      no-op). `updateModeButtons()` toggles the `.active` class.
    * Best scores are now PER MODE (separate localStorage keys), so Baby and
      Normal records don't overwrite each other. The legacy key
      `2048-best-score` stays as Normal's key (no data migration needed).
  - `2048/index.html`: added a `.mode-pick` segmented control in the game bar
    (`Normal` / `Baby` buttons with `data-mode`, `aria-label` on the group,
    following the connect-4 `.btn-pick` pattern). The controls hint moved out of
    `.game-bar` into its own centered `.controls-hint` line below it.
  - `2048/css/styles.css`:
    * `.mode-pick` (flex row) + `.btn-pick` styles (pixel font, panel-2 bg,
      pressed effect, `.active` = accent blue) matching connect-4's picker.
    * `.board-5 { grid-template-columns: repeat(5, 1fr) }` and
      `.board-5 .tile { font-size: clamp(9px, 2.4vw, 20px) }` so 4-digit values
      fit the smaller 5x5 tiles.
    * `.controls-hint` centered below the game bar; mobile media query got
      smaller `.btn-pick` sizing.
  - Verified: 5x5 merge logic (`[2,2,4,4,0] left -> [4,8,0,0,0]`), syntax OK,
    and all new markup/JS/CSS served at the public URL.
- 2026-08-31: Mobile scroll vs pull-to-refresh fix + game state persistence.
  - Symptom: on phones the page could NOT be scrolled down (to see the game
    bar / hints below the board), and a downward swipe could reload the page,
    wiping all progress.
  - Root cause: the previous fix added a global `document` `touchmove`
    `preventDefault()`, which blocked scrolling on the WHOLE page; and
    `overscroll-behavior-y: none` was set only on `body`, but when content
    overflows, `html` is the real scrolling element, so pull-to-refresh could
    still engage in some browsers.
  - Fix in `2048/css/styles.css`:
    * `overscroll-behavior-y: none` now on BOTH `html` and `body` — pull-to-
      refresh is dead, but normal scrolling keeps working.
    * `.board { touch-action: none }` — swipes on the board are game input
      only; the browser never interprets them as scroll or refresh.
    * Body keeps `touch-action: manipulation` (no double-tap zoom).
  - Fix in `2048/js/app.js`:
    * Removed the global `touchmove` `preventDefault()` listener entirely.
    * Board swipe handlers unchanged (arrows/WASD/swipe still move tiles).
  - NEW — game state persistence (progress is never lost, even if the page
    reloads anyway):
    * After every move the full state (`grid`, `score`, `won`, `keepPlaying`)
      is saved to localStorage under `2048-state-<mode>` (one key per
      difficulty mode).
    * On page load the game RESUMES from the saved state if it exists and is
      not finished; finished games (game over) are cleared and start fresh.
    * Switching Normal/Baby now resumes that mode's saved game instead of
      wiping it; only "New Game" / "Try again" explicitly discard progress.
    * Corrupt/foreign state is validated (grid dimensions per mode) and
      discarded safely via try/catch.
  - Verified: syntax OK, save/restore round-trip + wrong-size grid rejection
    tested in Node, and the new JS/CSS confirmed served at the public URL.
- 2026-08-31: Faster/retro animations + Minecraft-style merge particles.
  - Speed-ups in `2048/css/styles.css` (all with `steps()` easing for chunky
    retro motion):
    * Tile press transition: `0.12s steps(2)` -> `0.08s steps(2)`.
    * New-tile `tile-appear`: `0.2s steps(3)` -> `0.12s steps(2)`.
    * Merge `tile-merge`: `0.3s steps(3)` -> `0.18s steps(3)`.
    * Win/game-over overlay `fade-in`: `0.3s steps(3)` -> `0.15s steps(2)`.
  - Minecraft block-break particle burst (the request: "smaller squares of the
    same color as the new number"):
    * JS (`2048/js/app.js`): new `spawnMergeParticles(row, col, value)`, called
      from `render()` for every tile marked `tile-merged`. Spawns 10 small
      square divs (4-10px, random size like Minecraft debris) inside
      `.board-wrap` (so board re-renders don't kill them), colored with the
      tile's ACTUAL background (`getComputedStyle(tileEl).backgroundColor` =
      the new value's color). Each particle gets random `--dx`/`--dy1`/`--dy2`
      vars: burst outward with an upward bias, then gravity pulls it below its
      apex. Removed on `animationend`.
    * CSS: `.particle` (2px black border, pixelated, z-index 1001 above the
      scanline overlay, pointer-events none) + `@keyframes particle-burst`
      (translate apex at 55% -> fall + shrink + fade at 100%, `0.45s steps(5)`)
      — the steps() jumps make the burst read like block-break debris.
  - Verified: served JS passes `node --check` and contains the spawner; served
    CSS has `particle-burst` and the faster timings.
- 2026-08-31: Fixed mobile devices not showing new changes (stale cache).
  - Symptom: after deploying the particles/animations, phones kept showing the
    old version while the server verifiably served the new code.
  - Root cause: static responses had NO cache headers (`Cache-Control`,
    `ETag`, `Last-Modified`), so mobile browsers heuristically cached JS/CSS
    and replayed stale files.
  - Fix (applied to ALL games, per user choice):
    * Root `server.js` `serveStatic()` now sends `Cache-Control: no-cache` for
      `.html`, `.css` and `.js` (browsers revalidate every request; assets are
      tiny). Verified header present via the public URL.
    * Cache-busting query strings in the HTML: `2048/index.html` links
      `css/styles.css?v=20260831` and `js/app.js?v=20260831`; `connect-4/`
      got the same `?v=20260831` on its stylesheet + 4 scripts. Bump `v` on
      future asset changes if ever needed (headers alone should suffice now).
  - All versioned URLs verified 200; 2048 HTML confirmed referencing the
    versioned assets.
- 2026-08-31: Tile ("box") animations made a little smoother.
  - The retro `steps()` animations were softened by increasing the step count
    (more frames = less jumpy, pixel feel kept) and slightly longer durations:
    * Slide: `transform 0.08s steps(2)` -> `0.12s steps(4)`.
    * Appear (`tile-new`): `tile-appear 0.12s steps(2)` -> `0.16s steps(4)`.
    * Merge (`tile-merged`): `tile-merge 0.18s steps(3)` -> `0.22s steps(5)`.
  - `js/app.js`: input-gating timeout synced 80ms -> 120ms to match the new
    slide duration (prevents mid-animation input conflicts).
  - Particles, glow and overlay fade untouched. Cache-busters bumped to
    `?v=20260831c` (styles.css + app.js); both verified 200 via the public URL.
- 2026-08-31: Bug fix — 5x5 board "unraveled" at 1024 (cells grew to 4x4 size).
  - Root cause: grid tracks were plain `1fr`, whose automatic minimum is the
    content's min-content size. The wide pixel-font "1024" (4 chars) did not
    fit the smaller Baby-mode cells, so the column track expanded to the text
    width — cells became ~4x4-sized, rows followed via the board's
    aspect-ratio, and the whole grid broke out of shape. Only triggered at
    4-digit values, hence never seen at 512 or in Normal mode.
  - Fix (squares are now guaranteed constant size in both modes):
    * `css/styles.css`: `.board` and `.board-5` tracks now
      `repeat(n, minmax(0, 1fr))` for BOTH columns and rows — minmax(0, 1fr)
      removes the content-based minimum, so tile text can never resize cells.
    * Fonts now scale to the cell instead of the viewport: `.tile` became
      `container-type: inline-size`, and new digit-count rules `.tile.d1`–
      `.tile.d4` use `min(clamp(...), Ncqw)` (60/40/29/22 cqw) so any number
      always fits its tile (Press Start 2P advance is 1em/char). Removed the
      old `.board-5 .tile` viewport font override (digit classes handle it).
  - `js/app.js`: `render()` adds a `d1`–`d4` class per tile value length.
  - Cache-busters bumped to `?v=20260831d` (styles.css + app.js); both
    verified 200 via the public URL with the new rules/code present.
- 2026-08-31: 5x5 board enlarged + numbers can no longer overflow their cells.
  - User report (mobile): numbers with 3+ digits spill out of their tiles, and
    the 5x5 board/cells feel too small. Real numbers: on a 360px phone the
    nested chrome (wrap padding 18 + borders, board border 6 + padding 12,
    12px gaps) left only ~40px cells, too small for 3-4 digit pixel text.
  - `css/styles.css`:
    * Baby mode board panel is now LARGER: `.board-wrap:has(.board-5)`
      max-width 500 -> 560px, padding 18 -> 14px (the `.board-5` class lives
      on the inner `.board`, reached with `:has()`).
    * Baby mode board slimmer chrome: gap 12 -> 8px, padding 12 -> 10px,
      border 6 -> 5px. Net effect: 5x5 cells grow from ~40px to ~46px on a
      360px phone and from ~74px to ~92px on desktop.
    * Digit-count fonts tightened so text can never exceed the tile even with
      the font's >1em advance + 2px shadow (n chars ≈ n × cqw × 1.1):
      d1 55cqw, d2 36cqw, d3 24cqw (clamp min 11px), d4 18cqw (clamp min 9px).
  - Geometry is still locked by the minmax(0,1fr) tracks, so sizes stay
    uniform. Cache-buster bumped to `?v=20260831e` (CSS only, JS unchanged
    at `d`); verified 200 via the public URL with the new rules present.
- 2026-08-31: 5x5 board made 15% bigger.
  - `.board-wrap:has(.board-5)` max-width 560 -> 644px (+15%). Desktop 5x5
    cells grow from ~92px to ~109px. Phone size unchanged (viewport-limited).
  - Cache-buster bumped to `?v=20260831f` (CSS only); verified 200 live.
