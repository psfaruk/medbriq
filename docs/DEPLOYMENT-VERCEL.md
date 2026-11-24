# Deploying Find Medi Doctor to Vercel — Why It Fails Today & The Fix

This document explains exactly why "direct deploy to Vercel" fails for this
repository right now, and the two supported paths to get a working live URL.

---

## 1. Why the current repo does not deploy cleanly

| # | Blocker | Detail |
|---|---------|--------|
| 1 | **No `DATABASE_URL` for production** | Locally the app uses SQLite via Prisma (default `prisma/db/custom.db`). Vercel's serverless filesystem is read-only (except `/tmp`), so SQLite cannot persist writes. On first write (register, login, OTP, booking) the API returns 500 and auth "does not work". |
| 2 | **Database is never created on Vercel** | The tables are created locally by `bun run db:push` + `bun prisma/seed.ts`. Vercel never runs these, so even read-only pages show empty data (0 doctors, 0 specialties). |
| 3 | **`GOOGLE_CLIENT_ID` not set** | Google Sign-In is implemented (GIS button + server-side token verification) but is hidden behind the `googleEnabled` config. Without the env var, the button shows the "Enable Google sign-in" helper dialog instead of logging in. |
| 4 | **OTP has no SMS provider** | In dev, OTP codes are printed to the server log **and returned in the API response** (`devOtpMode: true`). On a public deployment this is fine for demos but must be replaced with a real SMS gateway (e.g. an SSL Wireless / Twilio / Meta Business API provider) before real patients use it. |

> Note: a TypeScript error (`NO_SHOW` missing from the appointments status map)
> was found and fixed during review. `next.config.ts` currently sets
> `typescript.ignoreBuildErrors: true`, so type errors did not block builds —
> but the database/env issues above are the real deploy blockers.

---

## 2. Recommended path — Vercel + Neon Postgres (free tier is enough for a demo)

### Step 1 — Create the database
1. Sign up at https://neon.tech (free tier).
2. Create a project (e.g. `findmedidoctor`) and copy the **connection string**
   (`postgresql://...`).

### Step 2 — Push the schema and seed demo data (from your machine)
```bash
# one-time: point Prisma at Neon
export DATABASE_URL="postgresql://...your-neon-url..."

bun install
bun run db:push          # creates all tables
bun prisma/seed.ts       # optional: demo doctors/hospitals/specialties
```

### Step 3 — Import the repo into Vercel
1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Next.js** (defaults are fine; Bun is auto-detected from
   `bun.lock`).

### Step 4 — Set environment variables (Vercel → Project → Settings → Environment Variables)
| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` (Neon URL, **pooled** connection) | Required |
| `GOOGLE_CLIENT_ID` | your OAuth Web Client ID | Optional — enables Google Sign-In |
| `OTP_SMS_PROVIDER` / SMS keys | provider-specific | Optional — see `src/lib/sms.ts` |

### Step 5 — Enable Google Sign-In (optional but recommended)
1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth Client
   ID** (Web application).
2. Authorized JavaScript origins:
   - `http://localhost:3000` (local dev)
   - `https://your-app.vercel.app` (and any custom domain)
3. Copy the Client ID into the `GOOGLE_CLIENT_ID` env var and redeploy.
   The official Google button appears automatically — no code changes needed.

### Step 6 — Deploy & verify
```text
Deploy. Then check:
  ✓ /            → homepage shows doctors/specialties (not zeros)
  ✓ Sign in      → email/password works (session cookie over HTTPS)
  ✓ Phone OTP    → code arrives via SMS provider (or dev mode if unset)
  ✓ Google       → official GIS button renders and signs in
  ✓ Booking      → slot picker + price preview (new vs returning fee) works
```

---

## 3. Alternative path — Firestore (already implemented)

The codebase contains a complete dual-store abstraction
(`src/lib/data/index.ts`):

- `FIREBASE_SERVICE_ACCOUNT` set (valid JSON) → **FirestoreStore** (production
  path used previously)
- otherwise → **PrismaStore** (local SQLite)

To deploy on Firestore instead of Neon: set `FIREBASE_SERVICE_ACCOUNT` (the
full JSON, minified to one line) and `FIREBASE_DATABASE_ID` in Vercel, then run
`bun scripts/firestore-seed.ts` once from your machine to seed demo data.

---

## 4. Before real patients use it (production checklist)

- [ ] Replace dev OTP mode with a real SMS gateway; never return the code in
      API responses in production.
- [ ] Rotate any credentials that were shared in chat (GitHub PAT, Vercel
      token, Firebase service-account keys) and move them to env vars.
- [ ] Review the human-approval gates in `docs/ARCHITECTURE_CORRECTIONS.md`
      before enabling any regulated clinical service.
- [ ] Backup policy + data-residency review for Bangladesh (see
      `docs/compliance` notes) — Neon/Firebase regions should be chosen
      deliberately.
