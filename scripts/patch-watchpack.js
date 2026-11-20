#!/usr/bin/env node
/**
 * Idempotent patch for next/dist/compiled/watchpack/watchpack.js
 *
 * WHY: this sandbox keeps volatile, non-source files INSIDE the project tree:
 *   - upload/  : a network FUSE mount that can hang forever (D-state trap)
 *   - dev.log  : the dev server's own log (tee'd here by `bun run dev`)
 *   - db/      : the SQLite database + WAL journals (written on every query)
 * Watching any of these makes the webpack dev watcher rebuild in an infinite
 * loop (file write → rebuild → more writes), which also balloons memory
 * until the sandbox OOM-kills the server. Next's own ignore callbacks do not
 * cover all of these, so we hard-wire a guard into the DirectoryWatcher
 * constructor — the single point every recursive watcher normalizes its
 * ignore predicate through.
 *
 * Idempotent: re-running is a no-op. Non-fatal if the anchor moves.
 */
const fs = require("fs");
const path = require("path");

const TARGET = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "compiled",
  "watchpack",
  "watchpack.js"
);

const MARKER = "__MEDBRIC_WATCH_GUARD__";
const ANCHOR = "this.ignored=i.ignored||(()=>false);";
const OLD_MARKER = "__MEDBRIC_UPLOAD_GUARD__";
// The v1 patch wrapped the constructor this.ignored with an upload-only guard
// ending in the old marker comment. Detect and upgrade it.
const OLD_TAIL = "return (i.ignored||(()=>false))(p);});/*" + OLD_MARKER + "*/";
const NEW_TAIL = "return (i.ignored||(()=>false))(p);});/*" + MARKER + "*/";

const REPLACEMENT = `this.ignored=((p)=>{try{if(typeof p==="string"){const __root=(process.env.MEDBRIC_PROJECT_ROOT||process.cwd());if(p===__root+"/upload"||p.startsWith(__root+"/upload/"))return true;const __rel=p.startsWith(__root+"/")?p.slice(__root.length+1):null;if(__rel){const __top=__rel.split("/")[0];if(__top==="db"||__top==="upload"||__top==="tool-results"||__top==="docs"||__top==="screenshots")return true;}if(/\\.(log|db|db-journal|db-wal|db-shm)$/.test(p))return true;}}catch(e){}return (i.ignored||(()=>false))(p);});/*${MARKER}*/`;

function main() {
  if (!fs.existsSync(TARGET)) {
    console.error(`[patch-watchpack] target not found: ${TARGET}`);
    process.exit(1);
  }
  let src = fs.readFileSync(TARGET, "utf8");
  if (src.includes(MARKER)) {
    console.log("[patch-watchpack] already patched, skipping");
    return;
  }
  // Upgrade path: v1 (upload-only) → v2 (extended) — the v1 wrapper starts
  // with the same prefix but ends with the old marker; swap the guard body.
  if (src.includes(OLD_MARKER)) {
    const start = src.indexOf("this.ignored=((p)=>{try{");
    const end = src.indexOf(OLD_TAIL);
    if (start !== -1 && end !== -1 && end > start) {
      src = src.slice(0, start) + REPLACEMENT + src.slice(end + OLD_TAIL.length);
      fs.writeFileSync(TARGET, src);
      console.log("[patch-watchpack] upgraded v1 upload-guard to v2 extended guard");
      return;
    }
    console.error("[patch-watchpack] v1 marker present but wrapper not found; skipping");
    return;
  }
  const count = src.split(ANCHOR).length - 1;
  if (count === 0) {
    console.error(
      "[patch-watchpack] anchor not found (next internals changed); skipping non-fatally."
    );
    return;
  }
  src = src.split(ANCHOR).join(REPLACEMENT);
  fs.writeFileSync(TARGET, src);
  console.log(
    `[patch-watchpack] patched ${count} occurrence(s): upload/, db/, *.log, *.db*, tool-results/, docs/, screenshots/ hard-ignored by watchpack`
  );
}

main();
