# MEMORY.md — Connect 4 Project

## Project summary
A personal project to learn **Astro** by first building a plain HTML/CSS/JS
prototype of a Connect 4 web game (no framework, no external dependencies).

The game supports two modes (the AI opponent was removed on 2026-08-27):
1. **Two players (local)** — red vs yellow on the same screen.
2. **Play online** — real-time sync between two browsers via a Node server
   using **long-poll** (no WebSocket library).

Chips are the classic **red and yellow**. UI is clean/classic, single page.

## Tech decisions
- Pure HTML + CSS + vanilla JS. No build step, no npm packages.
- Multiplayer backend uses only Node built-in modules (`http`, `fs`, `path`,
  `crypto`, `url`) to honor "no external dependencies".
- Multiplayer uses **long-polling** (chosen over SSE/raw-WebSocket): the server
  holds `GET /api/state` responses until the board changes, then flushes them.
  Client also `POST`s moves. This gives a real-time feel with zero deps.
- Server binds `0.0.0.0:3000` (port 3000 was confirmed free; 8080 is taken by
  another service). Accessible via the server's Tailscale IP.

## File structure
```
server.js            Node built-in server: static files + long-poll rooms
index.html           Menu + local view + online view
css/style.css        Clean classic UI, red/yellow chips
js/board.js          Shared rules: 7x6 board, win/line detection (no DOM)
js/ui.js             Shared board rendering (clickable cells + hover ghost + fall animation)
js/local.js          Local PvP controller & menu wiring
js/multiplayer.js    Online client (long-poll GET + POST moves)
MEMORY.md            This file
```

## How the AI used to "play alone" (REMOVED 2026-08-27)
The AI (`js/ai.js`) was deleted. It previously exposed `getBestMove(board,
aiPlayer, difficulty)` — a pure minimax + alpha-beta function (depth 2/4/6 for
easy/medium/hard, easy with 35% random). Kept here for reference if the feature
is ever re-added.

## How Astro will be used in the future
Goal: migrate this prototype into an **Astro** project to learn the framework,
while keeping game logic intact.
- Move `js/board.js` into `src/lib/` as a plain TS/JS module (it is already
  DOM-free and reusable). `js/ai.js` was deleted, so it is no longer migrated.
  (they are already DOM-free and reusable).
- Replace `index.html` with `src/pages/index.astro` and split UI into Astro
  components (`<Board />`, `<Menu />`, `<DifficultySelect />`).
- Replace the standalone `server.js` static serving with Astro, but keep the
  multiplayer room logic as **Astro API endpoints** (`src/pages/api/state.ts`,
  `src/pages/api/move.ts`, `src/pages/api/create.ts`, `src/pages/api/join.ts`)
  using the same long-poll pattern (Astro endpoints support streaming/hold).
- Optionally upgrade transport to SSE/WebSocket once inside Astro if desired.
- The long-poll contract (`/api/state`, `/api/move`, `/api/create`, `/api/join`)
  is intentionally framework-agnostic so the client barely changes.

## Change log
- 2026-08-27: Initial prototype created.
  - Added board rules (board.js) with win + winning-line detection.
  - Added minimax AI with difficulty (ai.js).
  - Added shared UI renderer (ui.js).
  - Added local PvAI + PvP controller (local.js).
  - Added online long-poll client (multiplayer.js).
  - Added zero-dependency Node server with static hosting + rooms (server.js).
  - Chose port 3000 (8080 occupied). No git initialized (per request).
- 2026-08-27: Bug fix — menu did nothing.
  - Root cause: `board.js`/`ai.js`/`ui.js` declared their objects with `const`,
    which in classic `<script>` tags does NOT attach to `window`. Every other
    file read `window.Board`/`window.AI`/`window.UI` (undefined) so click
    handlers threw. Fix: added `window.Board`, `window.AI`, `window.UI` exports.
- 2026-08-27: Dark theme + responsive layout.
  - Switched CSS to a dark theme (deep navy bg, blue board, red/yellow chips).
  - Menu cards stacked one-per-row (bigger, responsive). Container/board widened.
- 2026-08-27: Winning tile not visible + falling animation.
  - Bug: `afterMove()` called `showWin()` (outline only) without re-rendering, so
    the just-dropped winning piece was never drawn. Fix: always `ui.render()`
    before highlighting.
  - Added click-to-drop on board cells and a falling-token animation
    (`ui.animateDrop`): a token spawns above the board and transitions down into
    its landing slot; the move is committed on `transitionend`.
  - Switched input gating to a local `accepting` flag in local.js.
- 2026-08-27: Removed top drop buttons; board is the only control.
  - Deleted the `.drop-row` buttons above the board (HTML + CSS + ui.js builder).
  - The board is now fully interactive: click any hole to drop into that column.
  - Hovering a column shows a faint "ghost" preview token at the landing cell
    (`.token.ghost`, no transition) so the player sees where the piece will land.
  - Bug fix: `accepting` started `false` and was only set `true` after a move, so
    the FIRST click on a fresh game was ignored (nothing happened). Fix: set
    `accepting = true` at game start for the first human turn (false only when
    the AI moves first).
  - Added `win` outline + always-on render so the final winning tile is shown.
- 2026-08-27: Piece now falls BEHIND the board.
  - Root cause of "shows in front": the falling token was appended on top of the
    cells (z-index 5). Restructured the board into two layers:
      * BACK layer (`.board-back`, z-index 1): settled pieces + falling/ghost
        tokens.
      * FRONT layer (`.cell`, z-index 2): a blue panel whose center is
        transparent (a hole) and outer ring is blue (`radial-gradient`). The blue
        ring hides the token where there is no hole, so a falling piece is only
        visible through the holes — like a real Connect 4 board.
    `ui.render` now colors back-layer `.piece` elements instead of cells; `showWin`
    outlines the back-layer pieces. Empty holes reveal the blue board behind.
  - Slowed the fall animation by ~15%: transition `top` 0.32s -> 0.37s.
- 2026-08-27: Restored classic board look (revision of the behind-board change).
  - The previous two-layer attempt made holes look blue/odd. Tuned the front
    mask so the board reads like the OLD style: gap 0 tiles the blue mask into a
    solid blue board with circular holes; the back layer uses a dark fill
    (`--cell-empty`) so empty holes look dark (cavity) and pieces are solid
    red/yellow. Visually identical to the original single-layer board, but the
    falling token still lives in the back layer (z-index 1) so it drops BEHIND
    the blue material and is only seen through the holes.
  - Removed the soft inset shadow on `.token` (the "blur" on the falling piece)
    so the drop reads crisp.
- 2026-08-27: Win highlight + 50% slower fall + AI removed.
  - Win highlight was invisible because it was drawn on the back-layer pieces,
    which are hidden by the front board face except at their center. Fix: the
    winning line now blinks (disappear/appear) via a `winblink` keyframe (opacity
    1 <-> 0.12) on BOTH the back-layer `.piece.win` AND a white ring on the front
    `.cell.win::after` (drawn on top, so it is actually visible).
  - Slowed the fall again by 50%: transition `top` 0.37s -> 0.55s.
  - DELETED the AI opponent entirely: removed `js/ai.js`, the "Play vs AI" menu
    card, the difficulty/first-player controls in `index.html`, the AI script tag,
    and all AI logic in `local.js` (it is now local PvP only). `window.AI` no
    longer exists.
- 2026-08-27: Win ring removed + menu redesign + restart highlight bug fix.
  - Removed the white ring around winning cells (`.cell.win::after`). The win
    "disappear/appear" effect is now ONLY the blink on the pieces (`.piece.win`
    `winblink` keyframe).
  - Menu redesigned: two big cards with white centered titles (`#fff`) and light
    descriptions, larger padding/min-height for prominence.
  - Bug fix: after a win + restart the highlight persisted because `ui.render`
    never cleared the front cells' `win` class. `render` now also
    `cells[r][c].classList.remove("win")`, so a restarted game starts clean.
- 2026-08-27: Solid board color + more classic/retro dark look.
  - The board face is now a SOLID color (`var(--board-bg)`), no gradient, with a
    classic darker-blue frame (`--board-frame`). Body background made solid dark.
  - Retro accents kept the dark theme: uppercase + letter-spaced title/menu
    titles with a subtle drop shadow (arcade feel). Layout/style otherwise kept.
- 2026-08-27: Menu cards fill the full window height.
  - Made `.container` a flex column and `#menu-view`/`.menu-grid` flex:1 with
    `grid-auto-rows: 1fr`, so the two menu cards split the viewport height
    evenly (each occupies half the screen).
- 2026-08-27: No scroll at full size + smaller title + Leave room on the right.
  - Body is now `height: 100dvh; overflow: hidden` with no bottom padding, so the
    page fills the screen with no scrollbar.
  - Title (`.title`) reduced (`clamp(26px,5vw,38px)`) and header padding trimmed.
  - Removed the fixed `.menu-card` min-height (was forcing overflow on short
    windows); cards now size via `grid-auto-rows: 1fr`.
  - `#online-view [data-action="online-leave"]` gets `margin-left: auto` so the
    "Leave room" button sits on the far right.
- 2026-08-27: White border on the LAST played piece (not the winning line).
  - Clarified with user: the white border marks the most recent move so both
    players can see it, not the winning line.
  - Added `ui.setLastMove(row, col)` which outlines that specific chip
    (`.piece.last { border: 3px solid #fff }`). Pieces are now sized to 84% of
    the cell (centered) so the border is visible through the board's hole; the
    falling token matches (84%, centered) via `placeToken`.
  - Local: `pendingDrop` tracks the landed cell; `afterMove` calls `setLastMove`.
  - Online: the server now stores `room.lastMove` and includes it in `/api/state`;
    `applyState` calls `setLastMove` so both players see the last piece.
  - The winning-line "disappear/appear" blink (`.piece.win`) is unchanged.
- 2026-08-27: Falling-chip animation added to ONLINE mode.
  - Local mode already animated drops via `ui.animateDrop`. Online mode only
    rendered moves instantly. Now:
      * OUR move: `handleDrop` animates the chip falling, then POSTs the move;
        `lastSeenMove` is set so the returning poll doesn't re-animate.
      * OPPONENT move: `applyState` detects a new `lastMove` (server now sends
        `room.lastMove` in `/api/state`), renders the board WITHOUT that piece,
        animates the drop for the mover, then renders the full board.
  - Server: `room.lastMove` is stored on each move and included in `publicState`.
  - Client tracks `lastSeenMove` / `boardState` to avoid double-animating and to
    compute the drop row. `finishState` factored out for shared status handling.
- 2026-08-27: Fixed chips being off-center in their holes (constant bottom-right
  drift). Root cause: settled pieces lived in a SEPARATE `.board-back` grid that
  had to line up perfectly with the cell grid. Fix: pieces are now absolutely
  positioned via `ui.layoutPieces()` using each cell's `offsetLeft/offsetTop`
  (same coordinates the falling token already used), so every chip is guaranteed
  concentric with its hole. Added a `resize` listener to re-layout. `.board-back`
  is now just the dark cavity background (no grid). Piece uses `box-sizing:
  border-box` so the white "last move" border stays visible inside the hole.

## How to run
```
cd /opt/proyectos/connect-4
node server.js
```
- Local: open `http://localhost:3000`
- From another PC on the same Tailscale network: open
  `http://<SERVER_TAILSCALE_IP>:3000`
- Online play: one player clicks "New room" and chooses Public (appears in the
  lobby list for anyone) or Private (share the code); the other joins via the
  list (public) or by entering the code under "Join with code".

## Change log (chronological, newest last)
- Pixel-art theme added + classic theme preserved as a toggle.
  - New `css/style.css` is a pixel-art theme: "Press Start 2P" + "VT323" Google
    Fonts (Graceful monospace fallback if offline), square corners, 3-4px solid
    black borders, hard offset shadows (`4px 4px 0 #000`, no blur), chunky
    press-down button effect, and beveled chips (`inset` box-shadow pixel shading).
    Alignment-critical values kept identical to the old theme (`.board` `padding:
    16px`, `border: 6px`, `.board-back` inset 16, circular pieces) so the
    JS-positioned chips stay centered.
  - The PREVIOUS UI is saved untouched as `css/style-classic.css` (an exact copy).
  - A theme switcher (fixed top-right button + `localStorage` key `c4-theme`)
    toggles the `<link id="theme-style">` between `css/style.css` (pixel) and
    `css/style-classic.css` (classic). Default is pixel; choice persists. Game
    logic unchanged — only visuals. Fonts load from Google Fonts CDN (needs
    internet for the pixel look; falls back to monospace offline, still works).
- Local mode "Play as" color picker: a Red/Yellow segmented control in the local
  `.game-bar` chooses which color moves first. Selecting it sets `startingColor`
  in `js/local.js`, restarts the board, and highlights the chosen color. Default
  Red. Markup in `index.html`, CSS `.color-pick`/`.btn-pick` in `css/style.css`.
- NOTE: body is now `min-height: 100dvh` (not `height:100dvh; overflow:hidden`)
  so the scrollbar returns when content is taller than the viewport.
- Pixel theme tweaks + theme-toggle overlap fixes (all in the pixel theme
  `css/style.css` / `index.html`, game logic untouched):
  - Menu option titles ("Two players (local)" / "Play online") enlarged to
    `clamp(16px, 5vw, 34px)` in "Press Start 2P" so they read closer to the
    classic theme's size.
  - Theme toggle button originally `position: fixed` top-right overlapped the
    centered title on mobile. Fixed by moving it into the header's normal flow:
    title + subtitle wrapped in a centered `.header-text` div, header is a
    centered flex column, so the button sits BELOW the title — never overlapping,
    on both PC and mobile. (Earlier in-flow-row and absolute-top-right attempts
    were rejected: row layout de-centered the title on PC; absolute overlapped it.)
- Bug fix: chips go out of place when switching theme mid-game.
  - Root cause: `.board-wrap` border was `1px` (classic) vs `4px` (pixel). With
    `box-sizing: border-box` + `.board { width:100%; max-width:730px }`, on
    viewports narrower than ~760px the pixel board is ~6px narrower, shifting
    cells; `layoutPieces()` only ran on resize/visibilitychange, never on theme
    swap, so chips kept stale px coordinates.
  - Fix: equalized `.board-wrap` border to `4px` in BOTH themes
    (`css/style-classic.css` 1px -> 4px; pixel already 4px) so board geometry is
    identical at every width. Also the theme toggle now dispatches a `themechange`
    window event, and `js/ui.js` listens for it (guarded by `boardEl.offsetWidth >
    0`) to re-run `onViewportChange()` (re-lays-out chips AND re-shows the hover
    ghost) — a safety net for any residual rounding.
  - Alternate if the thicker classic frame is disliked: set BOTH themes'
    `.board-wrap` border to `1px` instead (shrink the pixel one). User chose 4px
    first.
- Classic UI removed — pixel theme is now the ONLY theme.
  - Deleted `css/style-classic.css`. Removed the theme-toggle button, its
    `localStorage`/`themechange` script, and the `themechange` listener in
    `js/ui.js`. `index.html` header reverted to a plain title + subtitle (no
    toggle). `css/style.css` keeps the single pixel-art theme; the now-unused
    `.theme-toggle` CSS rule was removed. The `themechange` safety-net relayout is
    gone (no theme to switch to); `resize`/`visibilitychange` relayout remains.
  - `css/style.css` is the sole stylesheet (`<link rel="stylesheet" href="css/style.css">`).
- Online rooms: Public vs Private.
  - Server: `makeRoom()` now stores `isPrivate` (default false). `POST /api/create`
    accepts `{ private: true }` and returns `isPrivate`. New `GET /api/rooms`
    lists open PUBLIC rooms (not private, not full, not finished); also prunes
    abandoned rooms (no active pollers for >60s) so the list stays fresh. Private
    rooms are NEVER listed; only joinable via the exact code (existing
    `POST /api/join` already works by code). Once a public room reaches 2 players
    it drops off the list automatically.
  - Client (`js/multiplayer.js`): the Create card now has a Public/Private
    segmented toggle (`[data-room-type]`, aria-pressed) defaulting to Public; the
    choice is sent as `{ private: selectedType === "private" }`. The lobby shows a
    live "Public rooms" list (`#public-rooms`) refreshed every 4s via
    `GET /api/rooms` (only while in the lobby); clicking a room joins it as Yellow.
    `joinRoom(code)` accepts an optional code (list items pass it) and still reads
    the input for manual entry. `enterGame` records `roomIsPrivate` and shows
    `Room CODE (private)` in the room bar. Lobby refresh starts in `openOnline`/
    `leaveRoom` and stops on `enterGame`/reset.
  - Markup (`index.html`): Create card gained the `.seg` toggle + a `.hint`; added
    a "Public rooms" `.lobby-card` with `<ul id="public-rooms">` + empty hint; Join
    card unchanged. CSS: added `.seg`, `.seg-btn`, `.hint`, `.room-list`,
    `.room-item` (pixel-styled to match the theme).
  - Flow: create Public → your room appears in everyone's list; a friend clicks it
    to join. Create Private → not listed; share the code and they join by code.
- 2026-08-31: Return to hub via the title; removed the "Other games" button.
  - `index.html`: deleted the `.bottom-link` block ("Other games" link) from the
    menu view.
  - The header title is now a link to the main page:
    `<h1 class="title"><a class="title-link" href="/">Connect&nbsp;4</a></h1>`.
  - `css/style.css`: added `.title-link { color: inherit; text-decoration: none; }`
    so the link looks exactly like the title did.
  - Same change applied to the 2048 page (matching its own MEMORY.md entry) so
    both games behave identically.
- 2026-08-31: CRT scanline overlay on the board (visual only).
  - `css/style.css`: `.board-wrap` gained `position: relative` and a
    `.board-wrap::after` overlay — repeating 1px dark lines (~7% opacity,
    3px period), `pointer-events: none`, z-index 1000. Gives the board a retro
    CRT feel identical to the 2048 board's overlay (added there the same day).
  - No markup/logic changes; chips, tokens and clicks behave exactly as before.
- 2026-08-31: Cache fix so code changes reach every device immediately.
  - Symptom (seen on the 2048 side, fix applied arcade-wide): mobile browsers
    served stale JS/CSS because static responses had no cache headers at all.
  - Root `server.js` `serveStatic()` now sends `Cache-Control: no-cache` for
    `.html` / `.css` / `.js`, so browsers revalidate on every request.
  - `index.html` asset URLs got cache-busting query strings:
    `css/style.css?v=20260831` and `?v=20260831` on all four scripts
    (board/ui/local/multiplayer). All verified 200 through the public URL.
  - No game logic changes.
- 2026-08-31: Local mode survives an accidental reload (state persistence).
  - Problem: a reload mid-game (e.g. mobile pull-to-refresh) reset the local
    match to an empty board — same issue 2048 already solved for itself.
  - `js/local.js`:
      * The in-progress game is saved to `localStorage` key
        `connect4-local-state` (board, `current`, `startingColor`,
        `gameOver`, last move = `pendingDrop`) after `startLocalGame` and
        after every committed move (`afterMove`).
      * A `sessionStorage` marker `connect4-view` is set to `"local"` by
        `showView(localView)` and removed for any other view, so auto-resume
        ONLY happens after a same-tab reload — not when the page is opened
        fresh later. Online view clearing the marker is safe: multiplayer.js
        calls `window.Local.showView(onlineView)`.
      * On load, if the marker is `"local"`, `resumeLocalGame()` restores
        board/turn/color pick/last-move marker, re-creates the `ui` if
        needed, re-renders and re-enables input. Corrupt/oversized/finished
        saves are rejected by `loadLocalState()` (validates ROWS/COLS and
        colors) and cleared.
      * `afterMove` clears the save on win/draw (next visit starts fresh);
        the menu's "back-menu" action also clears it (leaving abandons the
        game). `startLocalGame` resets `pendingDrop = null`.
  - `css/style.css`: `overscroll-behavior-y: none` on `html, body` to kill
    pull-to-refresh (page scroll still works).
  - `index.html`: cache-busters bumped to `?v=20260831b` (css + all 4 js).
    Verified 200 through the public URL; local.js serves the new code.


