/*
 * server.js - Arcade server (root).
 *
 * One server for the whole games collection:
 *   - serves the hub page (this folder's index.html + css/)
 *   - serves every game folder's static files under /<game>/
 *   - serves every game's multiplayer API under /<game>/api/*
 *     (long-polling via lib/rooms.js)
 *
 * No external dependencies: uses only `http`, `fs`, `path`, `url`.
 *
 * API surface per game:
 *   POST /<game>/api/create                -> { room, player }   (creator is player 1)
 *   POST /<game>/api/join   { room }       -> { room, player }   (joiner is player 2)
 *   POST /<game>/api/move   { room, player, col }
 *   GET  /<game>/api/state?room=CODE&since=TS  (long-poll: holds until change/timeout)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Register a new game by adding its module to this list. Each module exports:
// { name, root, createController() } — see connect-4/server.js.
//
// Static-only games (no multiplayer API) are added via registerStaticGame(name, root).
function registerStaticGame(name, root) {
  return { name, root, createController: () => ({ handle: async () => false }) };
}

const games = [
  require("./connect-4/server.js"),
  registerStaticGame("2048", path.join(__dirname, "2048")),
  registerStaticGame("snake", path.join(__dirname, "snake")),
].map((g) => ({
  ...g,
  controller: g.createController(),
}));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function serveStatic(res, rootDir, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  // Prevent path traversal.
  const filePath = path.normalize(path.join(rootDir, rel));
  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    // Text assets must revalidate on every request so code changes reach all
    // devices immediately (mobile caches otherwise serve stale files).
    if (ext === ".html" || ext === ".css" || ext === ".js") {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // -- Game APIs: /<game>/api/<route> --
  for (const g of games) {
    const prefix = "/" + g.name + "/api";
    if (pathname.startsWith(prefix + "/")) {
      const handled = await g.controller.handle(pathname.slice(prefix.length), req.method, req, res, url);
      if (handled) return;
      return sendJson(res, 404, { error: "Unknown API route." });
    }
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    return res.end("Method not allowed");
  }

  // Hub page at the root.
  if (pathname === "/") return serveStatic(res, ROOT, "/index.html");

  // Game static assets: /<game>/...
  for (const g of games) {
    const prefix = "/" + g.name;
    if (pathname === prefix + "/" || pathname.startsWith(prefix + "/")) {
      return serveStatic(res, g.root, pathname.slice(prefix.length));
    }
  }

  // Other root assets (hub css/js).
  return serveStatic(res, ROOT, pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Arcade running at http://0.0.0.0:${PORT}`);
  console.log(`  Hub        : /`);
  for (const g of games) console.log(`  ${g.name} : /${g.name}/`);
});