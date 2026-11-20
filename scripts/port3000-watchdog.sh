#!/usr/bin/env bash
# port3000-watchdog.sh — bridge until the wedged port-3000 holder dies.
#
# Background: a next-server process wedged in D-state (hung FUSE I/O) holds
# port 3000 with a pending SIGKILL. It will be reaped the moment its blocked
# syscall returns (or on sandbox restart). This watchdog polls the port and,
# the instant it frees, starts the real dev server on 3000 (via the immune
# launcher) and replaces the temporary instance on 3108.
cd /home/z/my-project
while true; do
  if ! ss -ltn 2>/dev/null | grep -q ':3000 '; then
    echo "$(date -u +%FT%TZ) port 3000 free — starting dev server" >> /tmp/port3000-watchdog.log
    pkill -f "dev-server.js" 2>/dev/null
    pkill -f "next dev --turbopack" 2>/dev/null
    sleep 2
    PORT=3000 nohup bun run dev > /tmp/dev-3000.log 2>&1 &
    echo "$(date -u +%FT%TZ) dev server started on 3000" >> /tmp/port3000-watchdog.log
    exit 0
  fi
  sleep 15
done
