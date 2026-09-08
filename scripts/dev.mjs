#!/usr/bin/env node
// Local dev server: builds index.html, rebuilds it whenever index.jade
// changes, and serves the project over http.
//
// It sends no-store on everything. That matters: Chrome caches js/*.js hard
// enough that a plain reload silently runs the previous version, which is a
// genuinely confusing way to lose half an hour.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8899;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

function build() {
  const r = spawnSync(process.execPath, [join(root, "scripts", "build.mjs")], {
    stdio: "inherit",
  });
  if (r.status !== 0) console.error("build failed");
}

build();

let rebuilding = false;
watch(join(root, "index.jade"), () => {
  if (rebuilding) return;
  rebuilding = true;
  setTimeout(() => {
    build();
    rebuilding = false;
  }, 50); // editors often fire twice
});

createServer(async (req, res) => {
  // Strip the query string (cache-busters) and refuse to escape the root.
  const rel = normalize(decodeURIComponent(req.url.split("?")[0])).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  let file = join(root, rel === "/" ? "index.html" : rel);

  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store, must-revalidate",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404");
  }
}).listen(port, () => {
  console.log(`serving ${root}`);
  console.log(`  http://localhost:${port}/`);
  console.log("watching index.jade");
});
