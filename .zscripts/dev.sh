#!/usr/bin/env bash
# Sandbox boot entry: keep the dev server immune to the hung FUSE mount at
# ./upload (see scripts/dev-server.js for the full story).
cd /home/z/my-project
exec bun run dev
