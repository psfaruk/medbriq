#!/usr/bin/env bash
# Find Medi Doctor — one-shot Vercel deployment (demo mode: bundled SQLite in /tmp)
#
# Usage:
#   VERCEL_TOKEN=xxxx scripts/deploy-vercel.sh
#   scripts/deploy-vercel.sh <token>
#
# What it does:
#   1. Links (or creates) the Vercel project named "findmedidoctor"
#   2. Sets DATABASE_URL=file:/tmp/fmd.db for production
#      (serverless SQLite bootstrap — src/lib/ensure-db.ts copies the bundled
#      prisma/seed.db on cold start, so the demo works with zero setup)
#   3. Deploys to production and prints the live URL
#
# Notes:
#   - Demo-mode writes (registrations, bookings) persist only while a
#     serverless instance stays warm; cold starts reset to seeded demo data.
#     For a persistent production DB see docs/DEPLOYMENT-VERCEL.md (Neon path).
#   - Requires: vercel CLI (npm i -g vercel), a token from
#     https://vercel.com/account/settings/tokens

set -euo pipefail

TOKEN="${VERCEL_TOKEN:-${1:-}}"
if [ -z "$TOKEN" ]; then
  echo "ERROR: no token. Usage: VERCEL_TOKEN=xxx scripts/deploy-vercel.sh" >&2
  exit 1
fi

PROJECT_NAME="findmedidoctor"
cd "$(dirname "$0")/.."

echo "==> Vercel CLI version:"
vercel --version

echo "==> Linking project '$PROJECT_NAME' (creates it if it does not exist)..."
# Try to link to an existing project first; fall back to creating a new one.
if vercel link --project "$PROJECT_NAME" --yes --token "$TOKEN" 2>/dev/null; then
  echo "    linked to existing project"
else
  echo "    no existing project, creating a new one..."
  vercel project add "$PROJECT_NAME" --token "$TOKEN" || true
  vercel link --project "$PROJECT_NAME" --yes --token "$TOKEN"
fi

echo "==> Ensuring DATABASE_URL is set for production (demo SQLite in /tmp)..."
if vercel env ls production --token "$TOKEN" 2>/dev/null | grep -q "^DATABASE_URL"; then
  echo "    DATABASE_URL already set"
else
  printf 'file:/tmp/fmd.db' | vercel env add DATABASE_URL production --token "$TOKEN"
  echo "    DATABASE_URL=file:/tmp/fmd.db added"
fi

echo "==> Deploying to production..."
URL="$(vercel deploy --prod --yes --token "$TOKEN")"

echo ""
echo "============================================================"
echo "  LIVE URL: $URL"
echo "============================================================"
echo ""
echo "Optional follow-up (correct sitemap/og URLs):"
echo "  printf '$URL' | vercel env add APP_BASE_URL production --token \$VERCEL_TOKEN"
echo "  vercel deploy --prod --yes --token \$VERCEL_TOKEN"
