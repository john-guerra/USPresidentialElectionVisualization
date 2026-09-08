#!/usr/bin/env node
// Compile index.jade -> index.html.
//
// index.html is the file the site actually serves; index.jade is its source.
// Before this script existed the two were hand-synced and drifted, which is
// how <body> ended up empty and the whole page rendered outside it. Never
// edit index.html directly: edit index.jade and run `npm run build`.

import { renderFile } from "pug";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "index.jade");
const OUT = join(root, "index.html");

const html = renderFile(SRC, { pretty: "  " });
writeFileSync(OUT, html.trimStart().replace(/\s+$/, "") + "\n");

console.log("built index.html from index.jade");
