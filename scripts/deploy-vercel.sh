#!/usr/bin/env bash
# Find Medi Doctor — production deployment guard for Vercel.
#
# Usage:
#   scripts/deploy-vercel.sh            # verify env vars exist, then deploy
#   scripts/deploy-vercel.sh --dry-run  # verify only, do not deploy
#
# This script REFUSES to deploy a demo configuration. It checks that every
# variable the production preflight requires actually exists in the Vercel
# project (names only — values are never read or printed), then deploys.
#
# What it deliberately does NOT do:
#   - set DATABASE_URL to a /tmp SQLite path (that was the old demo script and
#     is how fake doctors end up on a live site)
#   - read or echo any secret value
#
# Requirements:
#   - vercel CLI (`npm i -g vercel`), authenticated
#   - the Vercel project linked (vercel link) or VERCEL_PROJECT_ID exported

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

cd "$(dirname "$0")/.."

# ── Variables that MUST exist in the Vercel project ──────────────────────
# (names only — the script never handles their values)
REQUIRED=(
  FIREBASE_SERVICE_ACCOUNT
  FIREBASE_DATABASE_ID
  DATABASE_URL
  SMS_PROVIDER
  SMS_SENDER_ID
  VVS_SIGNING_SECRET
  APP_BASE_URL
)

echo "==> Vercel CLI version:"
vercel --version

echo "==> Reading production environment variable NAMES from Vercel ..."
# `vercel env ls production` prints a table whose first column is the name.
ENV_NAMES="$(vercel env ls production 2>/dev/null | awk 'NR>1 {print $1}' | sort -u || true)"

if [[ -z "${ENV_NAMES}" ]]; then
  echo "ERROR: could not list Vercel environment variables." >&2
  echo "       Is the project linked (vercel link) and are you authenticated?" >&2
  exit 1
fi

MISSING=()
for name in "${REQUIRED[@]}"; do
  if ! grep -qx "${name}" <<<"${ENV_NAMES}"; then
    MISSING+=("${name}")
  fi
done

echo "==> Production environment check:"
if (( ${#MISSING[@]} > 0 )); then
  echo "    MISSING in Vercel (production):"
  for name in "${MISSING[@]}"; do
    echo "      - ${name}"
  done
  echo ""
  echo "    Set them with:  vercel env add <NAME> production"
  echo "    Values are in docs/PRODUCTION-RUNBOOK.md §3.2"
  echo ""
  echo "    Refusing to deploy — a production build without these would serve"
  echo "    demo data or fail on the first write."
  exit 1
fi
echo "    all required variables present"

# ── Guard against the demo configuration ────────────────────────────────
if grep -qx "NEXT_PUBLIC_DEMO_MODE" <<<"${ENV_NAMES}"; then
  echo ""
  echo "    ! NEXT_PUBLIC_DEMO_MODE is set. Make sure its value is 'false'"
  echo "      (or remove the variable) — the app will render demo labels otherwise."
fi

# ── Local preflight ─────────────────────────────────────────────────────
if [[ -f .env.production ]] || [[ -f .env.local ]]; then
  echo ""
  echo "==> Running the local production preflight (reads .env.production) ..."
  ALLOW_PRODUCTION_CHECKS=1 bun run check:prod || {
    echo ""
    echo "    Local preflight found error-level problems. Fix them, then retry."
    exit 1
  }
else
  echo ""
  echo "==> No local .env.production — skipping the local preflight."
  echo "    (The Vercel-side variables were verified by name above.)"
fi

if (( DRY_RUN == 1 )); then
  echo ""
  echo "==> Dry run — environment verified, not deploying."
  exit 0
fi

echo ""
echo "==> Deploying to production ..."
URL="$(vercel deploy --prod --yes)"

echo ""
echo "============================================================"
echo "  LIVE URL: ${URL}"
echo "============================================================"
echo ""
echo "Post-deploy checks (docs/PRODUCTION-RUNBOOK.md §6):"
echo "  - / renders, doctor list is empty or REAL (no fictional names)"
echo "  - email + password login over HTTPS"
echo "  - Google button renders (not the 'not configured' dialog)"
echo "  - registering a doctor lands in Admin → Verification as PENDING"
echo "  - Vercel runtime logs show no 500s"
