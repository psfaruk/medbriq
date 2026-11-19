# Medbriq — Security Documentation

> Honest security documentation for the MVP. What is implemented, how it works, what is
> knowingly deferred, and what must happen before production. Companion documents:
> [api.md](api.md) · [database.md](database.md) · [architecture.md](architecture.md).

## 1. Authentication Design

Implementation: [`src/lib/auth.ts`](../src/lib/auth.ts) (server-only).

### 1.1 Password storage
- **Algorithm:** scrypt via Node’s built-in `crypto.scryptSync` (no external dependency).
- **Parameters:** Node.js defaults (N=16384, r=8, p=1), **16-byte random salt** per
  password (hex), **64-byte** derived key, stored as `salt:hash`.
- **Verification:** recomputed candidate compared with `timingSafeEqual` (constant-time);
  length mismatch short-circuits safely.
- Passwords never appear in logs or API responses.

### 1.2 Sessions
- **Opaque tokens, not JWTs:** the session token is a random UUID v4 (`randomUUID()`).
  There is no signing key to leak and no claim content for an attacker to forge.
- **Server-side state:** every token has a row in the `Session` table (`token` UNIQUE,
  `userId`, `expiresAt`). **Every request re-validates the session against the database**,
  which makes logout and revocation *immediate* — no token remains valid after its row is
  deleted.
- **Cookie:** name `medbriq_session`; **httpOnly** (no JS access, mitigates XSS token
  theft); **sameSite=lax** (mitigates cross-site POST CSRF for the cookie); `secure`
  (HTTPS-only) when `NODE_ENV=production`; `path=/`; 7-day max-age.
- **Expiry:** sessions expire after 7 days; expired sessions are rejected and lazily
  deleted. Suspended (`status = SUSPENDED`) users fail session resolution immediately.
- **Known weakness (honest):** session tokens are stored *as-is* in the database (not
  hashed at rest). An attacker with raw DB read access could hijack live sessions.
  Improvement for production: store `sha256(token)` and compare hashes.

### 1.3 Login abuse protection
- `register` / `login` are protected by a **simple in-memory rate limiter** — exceeding
  the window returns `429 RATE_LIMITED` (see [api.md §6](api.md#6-rate-limits)).
- **Limitation:** per-instance and reset on restart; must move to a shared store
  (e.g., Redis) before any multi-instance deployment.

## 2. Authorization (RBAC)

- Roles: `PATIENT`, `DOCTOR`, `ADMIN` (`src/lib/constants.ts`).
- **Server-side enforcement** in every route handler via `requireUser(...roles)` — the
  client never decides authorization. The full endpoint/role matrix is in
  [api.md §4](api.md#4-rbac-matrix).
- **Ownership checks** beyond role: doctors can only manage appointments for *their own*
  profile; patients only see/cancel *their own* bookings; guests must supply both the
  booking phone **and** the reference code (`MB-XXXXXX`).
- Verification fields (`verificationStatus`, `verifiedAt`) are admin-only — doctors
  cannot self-verify (see [database.md §3.2](database.md#32-doctor-verification-state-machine)).

## 3. Account Enumeration Protection

- `login` returns the identical `401 INVALID_CREDENTIALS` for an unknown email and a
  wrong password, with the same timing profile, so attackers cannot distinguish
  “account exists”.
- Registration uses a specific `409 EMAIL_TAKEN` — a deliberate tradeoff: registration
  UX requires duplicate-email feedback. This reveals *which emails have accounts*;
  accepted at MVP because email is not a sensitive identifier in this context and the
  rate limiter throttles enumeration attempts. (A production hardening option is
  async email verification without existence disclosure.)

## 4. Booking Concurrency (the correctness-critical part)

Master-spec requirement: *no duplicate confirmed appointment for a single-capacity slot
under concurrent requests; never rely on frontend checks alone.*

Defense in depth as implemented:

1. **Database-level guarantee — `@@unique([doctorId, slotStart])` on `Appointment`.**
   Whatever the request interleaving, the database admits at most one appointment per
   doctor per exact slot start. This is the enforcement of record.
2. **P2002 handling:** the booking flow catches Prisma’s unique-constraint violation
   error (`P2002`) on this index and returns a clean `409 SLOT_TAKEN` — never a 500.
3. **Application-level pre-checks (advisory only):** `validateBookableSlot()` recomputes
   the slot from the doctor’s weekly availability and rejects taken/past slots before
   the insert (fast-fail for the common case).
4. **Blocking statuses:** a slot is considered occupied by `PENDING_APPROVAL`,
   `CONFIRMED`, or `COMPLETED` appointments — rejected/cancelled/expired appointments
   free the slot again.
5. **Transactional writes:** appointment state transitions (approve/reject/cancel/
   reschedule/complete) validate the current status and write within a transaction so
   concurrent transitions cannot double-apply.
6. **Reschedule** re-runs the full validation + constraint race for the new slot.

What is **not** implemented at MVP (honest): idempotency keys for duplicate request
submission (a double-click race between the browser and the guard resolves to one
success + one `SLOT_TAKEN` — safe, but the client should also disable the button), and
temporary holds with timeouts (Phase 7 payment flow requirement).

## 5. Input Validation

- **Zod schemas** validate every request body/query at the API boundary; failures return
  `400 VALIDATION_ERROR` with a descriptive message. Unvalidated `any` payloads are never
  trusted.
- Enum-ish strings (roles, statuses, types, genders) are validated against the constant
  unions in `src/lib/constants.ts` (SQLite has no native enums).
- Dates/slots: `date` must be `YYYY-MM-DD`; `slotStart` must exactly match a slot
  computed by the slot engine (`SLOT_INVALID` otherwise) — clients cannot invent
  arbitrary times.
- TypeScript `strict` mode + CI `tsc --noEmit` gate type-level mistakes at the boundary.

## 6. Audit Logging

- Privileged and state-changing actions write rows to `AuditLog`
  (`actorId`, `action`, `entity`, `entityId`, `meta` JSON): doctor verification
  decisions, appointment confirmations/rejections/cancellations/completions, seeded
  verifications, etc.
- Admins can inspect the trail via `GET /api/v1/admin/audit-logs`
  (see [api.md §3.6](api.md#36-admin-admin-role)).
- Limitation: audit writes are best-effort in the same request; a dedicated append-only
  store / log shipping is a production-phase task.

## 7. Secrets Policy

- **`.env` is git-ignored** (see [.gitignore](../.gitignore)); `.env.example` documents
  required variables *without* real values. Current template needs only `DATABASE_URL`,
  `NODE_ENV`, `APP_BASE_URL`.
- **No secrets, tokens, or credentials belong in the repository** — including in code,
  tests, docs, CI files, and commit history. Demo seed credentials are the only
  intentional exception (dev-only, clearly labeled, fictional).
- **If a credential leaks:** rotate it immediately (change the secret at the provider,
  invalidate affected sessions by deleting `Session` rows / forcing password reset),
  then remove the leak from history if feasible (force-push rewrite + coordination).
  Report the incident to the maintainers.
- Production deployments must inject secrets via the platform’s secret store — never via
  committed files.

## 8. Medical Safety Rules (from the master spec, §12)

Medbriq is a **healthcare discovery and communication service — not a diagnostic
system**. The following rules are product invariants:

1. **No diagnosis** — the platform never provides medical advice or AI diagnosis.
2. **No prescriptions** — no medicine prescription creation, authorized or otherwise.
3. **Emergency guidance stays visible** — Bangladesh emergency number **999** is shown
   in the UI (mobile menu and footer); content directs users to call 999 in emergencies.
4. **No fake verification** — verification status comes only from admin decisions backed
   by audit logs; unverified doctors are clearly labeled; verification is never granted
   automatically just because a profile was submitted.
5. **No fabricated data** — all seeded doctors/hospitals/reviews are fictional and
   labeled “demo”; real deployments must never seed fake doctors or reviews.
6. **Patient data protection** — appointment data (names, phones, notes) is exposed only
   to the owning patient, the consulting doctor, and admins (see RBAC); medical notes are
   never included in public endpoints.
7. If AI-assisted features are added later, their limitations must be transparent and
   they must never replace professional medical judgment.

## 9. Known MVP Limitations (security-relevant, honest)

| # | Limitation | Impact | Mitigation plan |
| --- | --- | --- | --- |
| 1 | **In-memory rate limiting** is per-instance and resets on restart | Weak brute-force protection if scaled out or restarted under attack | Redis-backed limiter before multi-instance deploy |
| 2 | **No HTTPS termination locally** — dev serves plain HTTP | Cookies (incl. `secure=false` in dev) observable on the wire | Production must sit behind TLS (Vercel/Caddy); `secure` flag already keyed to `NODE_ENV=production` |
| 3 | **No email verification / password recovery** yet | Accounts with unverified emails; no self-service reset | Add email provider (see [costs.md](costs.md)) + verify-email/reset flows (Phase 2 remainder) |
| 4 | **Demo credentials seeded** (`admin@medbriq.dev` etc.) | Full admin access in any environment that runs the seed | Never deploy the seed outside local dev; production bootstrap creates a unique admin |
| 5 | **Money as `Float`** (SQLite MVP) | Rounding artifacts possible in fee math | Migrate to `Decimal` with the PostgreSQL move — [database.md §4](database.md#4-float-to-decimal-migration) |
| 6 | **Guest booking = phone + reference code lookup** | Anyone knowing a guest’s phone *and* code can view/cancel that booking; codes are 6 chars (unambiguous alphabet ≈ 32⁶ ≈ 10⁹ combinations) | Acceptable MVP tradeoff to allow accountless booking; hardening options: rate-limit lookups (done), longer codes, or require account for sensitive actions |
| 7 | **Session tokens stored unhashed** in DB | DB read leak → session hijack | Hash tokens at rest (see §1.2) |
| 8 | **No automated security test suite** (OWASP scan, dependency audit, secret scan in CI) | Regressions detected only manually | Add `bun audit`, secret scanning, and dependency review to CI (Phase 12) |
| 9 | **Single instance / single SQLite file** | No horizontal scaling; backup story is manual file copy | Supabase Postgres + automated backups at production |
| 10 | **`next.config.ts` ignores TypeScript build errors** (`ignoreBuildErrors: true`, scaffold default) | Type errors would not fail `next build` | CI compensates with a hard `tsc --noEmit` gate; re-enable strict build before launch |

## 10. Reporting Vulnerabilities

Please report suspected vulnerabilities **privately** to the repository maintainers —
do not open public issues containing exploit details, payloads, or screenshots of
sensitive data. Include reproduction steps and affected versions. We will acknowledge,
triage, and fix before any public disclosure.
