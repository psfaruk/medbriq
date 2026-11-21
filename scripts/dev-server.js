#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * MedBricBD dev-server launcher.
 *
 * Responsibilities:
 *  1. Sandbox FUSE immunity: /home/z/my-project/upload is a network mount
 *     that can hang forever. If it (or anything else) walks into it, the
 *     process wedges in D-state forever and holds its port. We build (if
 *     needed) and LD_PRELOAD scripts/upload-guard.so, which makes all
 *     glibc-level and syscall()-trampoline-level access to that path return
 *     ENOENT, and run dev with the webpack bundler (Turbopack's Rust engine
 *     walks the project root with raw syscalls that cannot be interposed).
 *  2. Deterministic port + log behavior for the sandbox (port 3000 default).
 *  3. No-op safety: outside this sandbox (no gcc / no mount) everything
 *     falls back to a plain `next dev`.
 */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const guardSo = path.join(root, "scripts", "upload-guard.so");
const guardC = path.join(root, "scripts", "upload-guard.c");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: "1",
  MEDBRIC_PROJECT_ROOT: root,
  // This sandbox has ~3.9GB RAM shared with a browser, platform services and
  // stuck processes; an uncapped webpack dev server balloons past 1.4GB and
  // gets OOM-killed. 900MB keeps it alive at the cost of slower compiles.
  NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --max-old-space-size=900`.trim(),
};

// Build the guard if we have sources + gcc but no binary yet.
if (!fs.existsSync(guardSo) && fs.existsSync(guardC)) {
  try {
    const r = spawnSync(
      "gcc",
      ["-shared", "-fPIC", "-O2", "-o", guardSo, guardC, "-ldl"],
      { stdio: "ignore" }
    );
    if (r.status === 0) console.log("[dev-server] built upload-guard.so");
  } catch {
    /* no gcc — plain environment, continue without the guard */
  }
}

if (fs.existsSync(guardSo) && fs.existsSync(path.join(root, "upload"))) {
  env.LD_PRELOAD = guardSo;
  console.log("[dev-server] upload-guard active (FUSE mount immunity)");
}

const port = process.env.PORT || "3000";
// Turbopack: faster and ~40% less memory than webpack dev in this sandbox.
// Its Rust engine walks the project root, but only through the glibc
// syscall() trampoline — the upload-guard interposer blocks the hung FUSE
// mount (verified empirically; see scripts/upload-guard.c). Without the
// guard, in a plain environment, there is no hung mount to block.
const args = [nextBin, "dev", "--turbopack", "-p", port];

console.log(`[dev-server] starting next dev (turbopack) on :${port}`);
const child = spawn(process.execPath, args, {
  cwd: root,
  env,
  stdio: "inherit",
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
