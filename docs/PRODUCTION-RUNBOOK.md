# Production Runbook — Find Medi Doctor (medbriq)

The exact sequence to take the app from "demo" to a real production service.
Every step is something you click in a console or run as a command. Nothing
here requires pasting a secret into a chat.

---

## 0. Rotate everything that was exposed — do this first

Credentials that have ever been pasted into a chat, an issue, or a commit are
**compromised**. Rotation is the only fix; nothing else matters until it is done.

| Credential | What to do |
| --- | --- |
| Firebase service-account private key | Google Cloud Console → IAM & Admin → Service Accounts → `firebase-adminsdk-fbsvc@medifindbd.iam.gserviceaccount.com` → **Keys** → delete the exposed key → **Add key → JSON** to mint a replacement. |
| Vercel access token | vercel.com → Account Settings → Tokens → **Revoke**. Create a new one only if you still need CLI deploys. |

Then verify the old key is gone:

```bash
gcloud iam service-accounts keys list \
  --iam-account=firebase-adminsdk-fbsvc@medifindbd.iam.gserviceaccount.com
```

---

## 1. Firebase project (`medifindbd`)

### 1.1 Create the Firestore database

1. Firebase console → **Build → Firestore Database → Create database**.
2. **Location is a data-residency decision and cannot be changed later.** For
   Bangladesh traffic the usual choices are `asia-south1` (Mumbai) or
   `asia-southeast1` (Singapore). Pick deliberately.
3. Mode: **Production mode** (locked down). The rules below enforce deny-all
   regardless of which mode you pick.

### 1.2 Deploy security rules and indexes

Store a **fresh** service account as a repository secret — never in the repo:

```bash
base64 -w0 service-account.json \
  | gh secret set FIREBASE_SERVICE_ACCOUNT_B64 -R psfaruk/medbriq
```

Then push to `main`. The *Deploy Firebase rules & indexes* workflow runs
whenever `firestore.rules`, `firestore.indexes.json`, `storage.rules`,
`firebase.json` or `.firebaserc` change, and can also be triggered manually
from the Actions tab.

What it deploys:

| File | Effect |
| --- | --- |
| `firestore.rules` | **Deny all client access.** Every read/write goes through the Next.js API using the admin SDK, which bypasses rules by design. Even with the public web config in hand, a browser cannot touch Firestore. |
| `firestore.indexes.json` | The composite indexes the store's queries need. Without them, list endpoints return `FAILED_PRECONDITION` in production. |
| `storage.rules` | Deny all client access. Uploads are server-side only. |

Verify: Firestore → Rules should read `allow read, write: if false;`.

### 1.3 Authentication (Google Sign-In)

1. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
2. **Authentication → Settings → Authorized domains** → add your production
   domain (`<project>.vercel.app`, and your custom domain later).
3. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client
   ID → Web application**.
   - Authorized JavaScript origins: `http://localhost:3000` and `https://<your-domain>`
   - Copy the **Client ID** → `GOOGLE_CLIENT_ID`
4. In the same project, **Project settings → Your apps → Add a Web app** and copy
   the `firebaseConfig` object — those six values become the
   `NEXT_PUBLIC_FIREBASE_*` variables.

### 1.4 Push notifications (optional)

Project settings → Cloud Messaging → **Web Push certificates → Generate key
pair** → the public key becomes `NEXT_PUBLIC_FIREBASE_PUSH_VAPID_KEY`.

---

## 2. SMS (phone OTP)

Phone OTP is a first-class login path. In production `SMS_PROVIDER=console`
**refuses** to work (the code is not echoed back), so without a real provider
phone login is simply unavailable — not broken, hidden.

**Option A — SSL Wireless (Bangladesh-local, usually cheapest for BD numbers)**
```
SMS_PROVIDER=sslwireless
SSLWIRELESS_API_TOKEN=...      # smsplus.sslwireless.com
SSLWIRELESS_SID=...            # sender ID
SMS_SENDER_ID=...              # approved mask
```

**Option B — Twilio**
```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SMS_SENDER_ID=+15551234567
```

> ⚠️ **The SSL Wireless integration is written against the documented v3
> contract (`smsplus.sslwireless.com/api/v3/send-sms`) but has not been
> smoke-tested against a live account.** Send one real OTP before launch and
> confirm delivery. The code never pretends a message was sent — a failure
> returns `delivered: false` and the UI says so.

---

## 3. Vercel

### 3.1 Import

1. vercel.com → **Add New → Project** → import `psfaruk/medbriq`.
2. Framework preset: **Next.js** (auto-detected). Leave the build command
   alone — `vercel.json` already pins `next build --turbopack`.
3. Do **not** point `DATABASE_URL` at a real database. Production uses
   Firestore; `DATABASE_URL` is only there because `prisma generate` runs
   during the build.

### 3.2 Environment variables (Production)

Set under **Project → Settings → Environment Variables**:

| Variable | Value | Notes |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | compact one-line JSON of the **fresh** service account | `jq -c . service-account.json`. This is the switch that puts the app on Firestore. |
| `FIREBASE_DATABASE_ID` | `(default)` | Firestore database id. |
| `DATABASE_URL` | `file:./dev.db` | Build-time placeholder only. Never a real production DB. |
| `SMS_PROVIDER` | `sslwireless` or `twilio` | Without one, phone OTP is disabled in production. |
| `SMS_SENDER_ID` | approved sender / mask | Required by both providers. |
| `SSLWIRELESS_API_TOKEN` | provider value | Only when `SMS_PROVIDER=sslwireless`. |
| `SSLWIRELESS_SID` | provider value | Only when `SMS_PROVIDER=sslwireless`. |
| `TWILIO_ACCOUNT_SID` | provider value | Only when `SMS_PROVIDER=twilio`. |
| `TWILIO_AUTH_TOKEN` | provider value | Only when `SMS_PROVIDER=twilio`. |
| `GOOGLE_CLIENT_ID` | OAuth Web Client ID | Enables Google Sign-In. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | web app config | Public by design. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | web app config | Public by design. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `medifindbd` | Public by design. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | web app config | Public by design. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | web app config | Public by design. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | web app config | Public by design. |
| `NEXT_PUBLIC_FIREBASE_PUSH_VAPID_KEY` | Web Push public key | Optional. |
| `VVS_SIGNING_SECRET` | `openssl rand -hex 32` | HMAC + AES-256-GCM key for QR credentials. Must be ≥32 chars. |
| `APP_BASE_URL` | `https://<your-domain>` | Absolute links. |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Or omit entirely. **Never `true`.** |

> `NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**.
> Changing one requires a redeploy. The `NEXT_PUBLIC_FIREBASE_*` set is safe
> to expose (it is the standard Firebase web config) precisely because the
> Firestore rules deny all client access.

### 3.3 Deploy

```bash
scripts/deploy-vercel.sh --dry-run   # verify the variables exist by name
scripts/deploy-vercel.sh             # verify, then deploy
```

Or simply push to `main` — Vercel's Git integration deploys automatically.

---

## 4. Production data — do not seed the demo dataset

**Never run `scripts/firestore-seed.ts` against production.** It writes the
fictional demo doctors (Dr. Ayesha Rahman, the demo hospitals, the demo
reviews) into whatever database `FIREBASE_SERVICE_ACCOUNT` points at. Those
records are fiction and must never appear on a live healthcare platform.

Instead:

1. Seed **reference data only** — the specialties list. Either run the seeder
   once and then delete every document in `doctors`, `hospitals`, `reviews`,
   `appointments`, `users` and `audit_logs`, or request a
   `scripts/firestore-seed-reference.ts` that writes only `specialties`.
2. Create the first admin through a controlled path and change its password
   immediately. For the local/regional (Prisma-backed) store:
   `bun scripts/create-admin.ts admin@yourdomain.com '<strong-password>'`.
   On Firestore-only production, create the user document directly in the
   console (`role: "ADMIN"`, `status: "ACTIVE"`, scrypt `passwordHash`).
3. Let real doctors register through the UI — they land in the admin
   verification queue as `PENDING`, exactly as designed. Verification is never
   automatic.

---

## 5. Pre-deploy check

```bash
bun install
bun run check:prod
```

This validates the environment (data store, demo mode, SMS provider, Google
sign-in, Firebase web config, `VVS_SIGNING_SECRET` strength, base URL) and
prints a pass/fail table **without echoing any secret value**. It must pass
with zero errors before you point a domain at production.

---

## 6. Post-deploy verification

- [ ] `/` renders; the doctor list is empty or real — no fictional names
- [ ] Email + password login works over HTTPS (cookie is `Secure`)
- [ ] Google Sign-In button renders (not the "not configured" dialog)
- [ ] Phone OTP either works or is honestly hidden — never a blank field
- [ ] A guest can search doctors with filters
- [ ] Registering a doctor lands in Admin → Verification queue as `PENDING`
- [ ] Firestore console shows writes in `users` / `doctors`
- [ ] `GET /api/v1/bootstrap` returns `ok: true`
- [ ] Vercel runtime logs show no `500`s
- [ ] No demo labels anywhere on the site

---

## 7. Known gaps — honest, tracked, not forgotten

| Gap | Status |
| --- | --- |
| Automated tests | **None.** CI now gates lint + typecheck + build, but there are still no unit/integration tests. Highest-value first test: the 100-attempt concurrent booking race on one slot. |
| `telehealth` / `payments` modules | **Disabled** in `src/lib/modules.ts`. Gated on regulatory and payment-provider approval. Do not flip them without that sign-off. |
| Money fields are `Float` | Fine for whole-taka BDT amounts; migrate to integer paisa or `Decimal` before real payment processing. |
| Rate limiting | In-memory, per-instance. On serverless that is effectively per-cold-start. Acceptable at launch volume; move to a shared store before you expect abuse. |
| Session tokens | Stored unhashed. Hash at rest when the session model is next touched. |
| Email verification / email password reset | Not implemented. |
| Firestore composite indexes | Deployed from `firestore.indexes.json`. If a query fails with `FAILED_PRECONDITION`, the console prints a direct link to create the missing index — add it to the JSON so it is reproducible. |
