# Phase 1 Report — Foundation & Architecture (plus core MVP slices)

> Report compiled 2026-11-19 by Agent 1-d (Documentation & DevOps) from session evidence
> (repository contents, git history, and the orchestrator’s verification record), using
> the Lead Architect phase-report format from the master product spec (§18).
>
> **Scope note:** this MVP session delivered **Phase 1** *plus* core slices of Phase 2
> (auth), Phase 3 (directory/verification), Phase 4 (booking), Phase 5 (doctor
> dashboard), and Phase 11 (admin). They are reported together because the MVP was
> delivered as one vertical slice; deferred scope is enumerated explicitly below.

---

**PHASE:** 1 — Foundation & Architecture (+ core MVP slices of Phases 2, 3, 4, 5, 11)

**OBJECTIVES:**
- Select a provisional brand (≥20 candidates, domain-availability-verified) and define branding.
- Establish the technical foundation: repo, stack, environment management, database
  architecture, API standards, CI pipeline, architecture documentation.
- Deliver a working, free-first MVP of the doctor discovery & booking platform:
  verified doctor search, instant & approval booking, doctor dashboard, admin
  verification console — single Next.js app (SPA + `/api/v1` modular monolith).
- Keep operating cost at $0 (free-first policy) and document all deviations from the
  master spec’s ideal architecture honestly.

**COMPLETED FEATURES:**
- **Brand:** “Find Medi Doctor” (Med + briq/bridge — bridging patients and doctors) chosen from
  21 evaluated candidates after authoritative RDAP checks against the Verisign registry
  (rdap.verisign.com, checked 2026-11-19): 20 candidates’ .com domains taken;
  **findmedidoctor.com available** (not yet purchased). Logo/wordmark implemented
  (bridge arch + medical cross). Full evaluation table: [architecture.md §5](../architecture.md#5-brand-evaluation-rdap-verified).
- **Architecture:** single Next.js 16 App Router app — single-route SPA at `/` (public
  site, patient area, doctor dashboard, admin console) + versioned REST API as Route
  Handlers under `/api/v1/*` (modular monolith). Decision record incl. NestJS/monorepo
  tradeoffs: [architecture.md](../architecture.md).
- **Auth (Phase 2 slice):** patient & doctor registration, login/logout, `me`; scrypt
  password hashing; opaque DB-backed session tokens in httpOnly cookies; RBAC
  (PATIENT/DOCTOR/ADMIN); in-memory login rate limiting; account-enumeration-protected
  login. Not included: email verification, password recovery (deferred).
- **Directory & verification (Phase 3 slice):** doctor search with filters
  (q/specialty/city/language/video/verified/maxFee/availableToday + pagination + sort),
  doctor profile detail, slots endpoint, reviews; specialty & meta endpoints; admin
  verification queue with APPROVE/REJECT/MORE_INFO decisions, all audited; verification
  never automatic.
- **Booking engine (Phase 4 slice):** weekly availability rules per doctor (Asia/Dhaka,
  30-min slots), instant vs approval booking modes, guest bookings with `MB-XXXXXX`
  reference codes, cancel/reschedule, doctor approve/reject/complete, appointment
  history; **DB-level double-booking guard** `@@unique([doctorId, slotStart])` with
  P2002 → `409 SLOT_TAKEN` handling; full status state machine.
- **Doctor dashboard (Phase 5 slice):** stats overview, pending requests queue, upcoming
  appointments, weekly availability manager (GET/PUT), profile editor (PATCH).
- **Admin console (Phase 11 slice):** platform stats, verification queue & decisions,
  doctor directory, audit-log viewer.
- **Design system:** Tailwind CSS 4 + shadcn/ui + lucide-react; sky-blue primary /
  soft-green accent / light-gray neutrals; Geist + **Noto Sans Bengali** fonts;
  mobile-first responsive shell with header/nav/footer, mobile sheet menu, **“Demo MVP”
  badge**, and persistent **999 emergency guidance**.
- **Environment & secrets:** `.env.example` (no real values), `.gitignore` covering
  `.env*`, DB files, logs; documented secrets policy.
- **CI:** GitHub Actions quality gate (bun install → prisma generate → lint →
  `tsc --noEmit`), no build step, concurrency-cancelled — see
  [.github/workflows/ci.yml](../../.github/workflows/ci.yml).
- **Documentation set:** README, architecture, database, api, security, costs (this
  file included), CONTRIBUTING, placeholder app READMEs.
- **Seed data:** fictional demo dataset — 12 doctors (9 verified / 2 pending / 1
  more-info), 4 hospitals, 10 specialties, admin + 4 patients, 4 demo appointments,
  6 reviews — all clearly fictional and labeled.

**DATABASE STATUS:**
- Prisma + **SQLite** (dev); schema designed PostgreSQL-portable (production path:
  Supabase Postgres). 10 models: User, Session, Specialty, Hospital, DoctorProfile,
  DoctorSpecialty, AvailabilityRule, Appointment, Review, AuditLog, Country.
- Correctness constraints in place: `Appointment @@unique([doctorId, slotStart])`
  (double-booking guard), `referenceCode` unique, `Review @@unique([doctorId, patientId])`,
  `AvailabilityRule @@unique([doctorId, dayOfWeek, startMinute])`, plus a full index
  inventory ([database.md §6](../database.md#6-index-inventory)).
- Timestamps stored UTC; scheduling domain in Dhaka minutes-from-midnight (fixed +6,
  no DST). Full ERD & state machines documented.
- Known debts: money fields are **Float** (must become Decimal on the Postgres move);
  `db:push` used in dev (migration history only starts with `db:migrate`); SQLite has no
  native enums (app-layer validation via constants.ts instead).

**API STATUS:**
- `/api/v1` surface implemented: auth (register/login/logout/me), doctors (list w/
  filters, [slug], [slug]/slots, [slug]/reviews), specialties, meta, appointments
  (list/owner-or-guest-lookup, create, cancel, reschedule, approve, reject, complete),
  doctor (dashboard, availability GET/PUT, profile PATCH), admin (stats, verifications
  queue, verification decision, doctors, audit-logs).
- Uniform envelope `{ ok, data }` / `{ ok, error: { message, code } }`; zod input
  validation; documented error codes (incl. `SLOT_TAKEN` 409), RBAC matrix, rate limits,
  and curl golden path: [api.md](../api.md).
- Not implemented (per phase plan): hospitals endpoints (Phase 6), payments (Phase 7),
  video/consultations (Phase 8), notifications (Phase 9), OpenAPI/Swagger generation
  (hand-written reference instead).

**UI STATUS:**
- Single-route SPA shell (`src/app/page.tsx`): header with brand, role-aware nav,
  verification badge, account dropdown, mobile sheet menu with emergency notice;
  footer with platform links, safety statement, and demo-data disclaimer.
- Views: home, search, doctor profile, booking, my appointments, doctor dashboard,
  admin console, auth — mobile-first responsive, Bengali font support.
- Seeded demo environment labeled “Demo MVP” in the UI; doctor profiles carry
  verification status visibly; unverified doctors are clearly identified.
- Not implemented: hospital dashboard (Phase 6), i18n framework (Phase 10 — only font
  support + Bengali specialty names exist), Flutter apps (placeholder directories only).

**TEST RESULTS:**
- **Automated tests: NOT PRESENT.** No unit/integration/e2e test suites exist in the
  repository at this time (the master spec’s Phase 12 test requirements are deferred).
  This is the largest quality gap and is reflected in the verdict.
- Verification performed in this MVP session was **manual but comprehensive**:
  - `bun run lint` — passing on the final codebase (0 errors).
  - `bunx tsc --noEmit` — passing on the final codebase (0 errors).
  - API end-to-end (curl): all three role logins; wrong-password enumeration
    protection; instant + approval booking; **concurrency race test — 5 parallel
    booking requests on the same slot produced exactly 1 CONFIRMED booking and 4
    rejections (DB-level `@@unique([doctorId, slotStart])` guard)**; approve /
    reject-with-reason; cancel; reschedule; guest phone+code lookup; patient and
    doctor registration; duplicate-email 409; RBAC denials (patient→admin 403,
    guest→doctor 401); search filters (specialty, city, video, verified, maxFee,
    keyword, availableToday); unverified-doctor booking blocked.
  - Browser end-to-end (headless agent-browser): home/search/profile rendering;
    guest booking through slot picker → confirmation with reference code; guest
    lookup; patient login + appointments view; doctor login → dashboard → request
    approval (toast + live count update) → upcoming tab → availability editor;
    admin login → verification queue → doctor verification → doctors table →
    audit log; full doctor registration through the UI (auto-login, dashboard
    redirect, pending banner, new doctor visible in the admin queue).
  - Responsive checks at 390×844 and 1440×900: mobile menu, no meaningful
    horizontal overflow, sticky footer verified on short pages (sticks to viewport
    bottom) and long pages (pushed below content).
- **Defect found and fixed during E2E:** `dhakaDayOfWeek()` computed the weekday
  from the Dhaka-midnight UTC instant (previous day 18:00Z), shifting every
  doctor's schedule one weekday off. Fixed to parse the date string directly;
  regression-verified against seeded schedules (Saturday chamber now lists
  Saturday slots; Friday-only closure days correctly show none).
- CI quality gate (lint + `tsc --noEmit`) configured to run on every push/PR; note that
  `next.config.ts` sets `ignoreBuildErrors: true` (scaffold default) — the CI typecheck
  is the compensating control until it is re-enabled.

**SECURITY AUDIT:**
- Implemented: scrypt password hashing (16-byte salt, 64-byte key, timing-safe compare);
  opaque DB-backed sessions (httpOnly, sameSite=lax, secure-in-prod, 7-day TTL, immediate
  revocation); server-side RBAC + ownership checks; account-enumeration-safe login;
  in-memory login rate limiting; zod validation on all inputs; DB-level booking
  concurrency guard with P2002 handling; audit logging of privileged actions; medical
  safety rules (no diagnosis/prescriptions, 999 guidance, no fake verification).
- Known limitations documented with mitigation plans — [security.md §9](../security.md#9-known-mvp-limitations-security-relevant-honest):
  in-memory rate limiting (per-instance), no HTTPS termination locally, no email
  verification, seeded demo credentials (dev-only), Float money type, guest phone+code
  lookup tradeoff, unhashed session tokens at rest, no automated security scanning in CI.
- No secrets or tokens are committed (`.env` ignored; `.env.example` carries no values).

**DEPLOYMENT STATUS:**
- **Local development environment only.** No staging, no production, no domain.
  `findmedidoctor.com` verified available 2026-11-19 but not purchased. Free-first cost
  posture: **no paid service in use** — [costs.md](../costs.md).
- Deployment path documented (Supabase Postgres → Vercel; commercial-use caveat on
  Vercel Hobby noted).

**KNOWN ISSUES:**
1. No automated test suite (highest priority debt; Phase 12 requirement).
2. Money fields are Float (SQLite MVP) — Decimal migration required with Postgres.
3. In-memory login rate limiter is per-instance and resets on restart.
4. No email verification / password recovery flows.
5. Session tokens stored unhashed in the DB.
6. `package.json` still carries scaffold metadata (name `nextjs_tailwind_shadcn_ts`)
   and unused scaffold dependencies (e.g., next-auth, next-intl) — cleanup pending.
7. `next.config.ts` has `ignoreBuildErrors: true` and `reactStrictMode: false`
   (scaffold defaults) — CI typecheck compensates; both should be tightened before launch.
8. ESLint config disables several strict rules (scaffold default) — lint passes but is
   permissive.
9. `.gitignore` excludes `/tests/` and `/examples/` — the ignore pattern must be
   revisited when a real test suite lands.
10. No SEO-friendly per-doctor URLs (SPA views; future enhancement per spec).
11. Slot engine assumes fixed UTC+6 (no DST) — requires a timezone library before
    DST-observing markets.

**UNRESOLVED RISKS:**
- **Trademark clearance not performed** — “Find Medi Doctor” is provisional; professional search
  (Bangladesh + international classes) is a pending business task before launch.
- **findmedidoctor.com may be registered by others** before purchase (verified available
  2026-11-19; ~$10–12/yr).
- **Video consultation cost risk** (Phase 8): metered SFU/TURN is the largest potential
  recurring cost — recommendation: defer until funded.
- **Vercel Hobby non-commercial terms** could force a paid tier at first real deployment.
- **Concurrent-booking hardening** beyond the DB guard (idempotency keys, holds) is
  designed but not implemented — required before payments (Phase 7).
- **Legal/compliance review** (GDPR/HIPAA where applicable, Bangladesh data-protection
  and telemedicine rules) not started; no compliance claims are made.

**RELEASE GATE (Phase 1 criteria):**
- Architecture approved and documented — ✅ ([architecture.md](../architecture.md),
  deviations from the ideal stack justified).
- No committed secrets — ✅ (verified: `.env` ignored, no tokens in repo).
- All applications initialize — ✅ with caveats: the web app initializes (dev server,
  seeded demo DB); the planned Flutter apps are **placeholders with no code** (documented,
  not faked); there is no separate backend service to initialize (by design).
- API and database contracts documented — ✅ ([api.md](../api.md),
  [database.md](../database.md)).
- Automated tests passing — ❌ **no automated tests exist yet** (gate criterion from the
  phase cycle “write automated tests / run tests” is not met; manual verification only).

**VERDICT: PASS WITH LIMITATIONS**

The delivered MVP works end-to-end for its implemented scope (verified manually), the
correctness-critical booking guard is enforced at the database level, and the
foundation (architecture, contracts, CI, documentation, free-first cost posture) is in
place. The verdict is **not** a full PASS because: automated tests are absent (manual
verification only), several production-readiness features are deferred (see below), and
known security debts remain open. Gate approval is requested for the implemented scope
with the limitation list below acknowledged.

**Implemented vs. deferred at MVP:**

| Area | Status |
| --- | --- |
| Brand + design system + SPA shell | ✅ Implemented |
| Credentials auth + RBAC + sessions | ✅ Implemented (email verification & password reset deferred) |
| Doctor directory, filters, profiles, slots, reviews | ✅ Implemented |
| Admin verification workflow + audit logs | ✅ Implemented (doctor verification only; hospital verification deferred) |
| Booking engine (instant/approval/guest, cancel/reschedule, DB concurrency guard) | ✅ Implemented |
| Doctor dashboard (stats, availability, queue) | ✅ Implemented |
| Admin console (stats, verifications, doctors, audit logs) | ✅ Implemented |
| Hospital & clinic management (Phase 6) | ⛔ Deferred — Hospital is a reference entity only |
| Payments & revenue (Phase 7) | ⛔ Deferred — provider-abstraction-ready design |
| Video consultation (Phase 8) | ⛔ Deferred — `supportsVideo` flag & VIDEO booking type only, no call system |
| Notifications channels (Phase 9) | ⛔ Deferred — in-app status changes only |
| Localization i18n (Phase 10) | ⛔ Deferred — Bengali font & specialty names only |
| Flutter mobile apps | ⛔ Deferred — placeholder directories, no code |
| Automated test suites (Phase 12) | ⛔ Deferred — manual verification only |
| Staging/production deployment (Phase 12) | ⛔ Deferred — local dev environment only |

---

## Acceptance Criteria Checklist (master spec §20)

Legend: ✅ done (manually verified in this session) · 🟡 partial · ⛔ deferred/not implemented

| # | Criterion | Status |
| ---: | --- | --- | --- |
| 1 | Patient can register and log in | ✅ |
| 2 | Doctor can register | ✅ (starts PENDING verification) |
| 3 | Doctor verification works | ✅ (admin decision workflow, audited) |
| 4 | Verified doctors appear in public search | ✅ |
| 5 | Patients can search by specialty | ✅ |
| 6 | Patients can filter by location | ✅ (city filter) |
| 7 | Doctor profiles display correct information | ✅ |
| 8 | Doctors can configure schedules | ✅ (weekly availability manager) |
| 9 | Patients can instantly book available slots | ✅ |
| 10 | Patients can request doctor-approved appointments | ✅ |
| 11 | Doctors can approve or reject requests | ✅ |
| 12 | Double booking is prevented at database level | ✅ (`@@unique([doctorId, slotStart])`; concurrency not yet covered by an automated 100-attempt test) |
| 13 | Patients can view appointment history | ✅ |
| 14 | Doctors can manage appointments | ✅ (approve/reject/complete/cancel) |
| 15 | Hospitals can manage multiple doctors | ⛔ Phase 6 deferred |
| 16 | Admin can verify doctors and hospitals | 🟡 doctors ✅; hospital verification ⛔ |
| 17 | Payment sandbox integration works | ⛔ Phase 7 deferred |
| 18 | Payment webhooks are securely validated | ⛔ Phase 7 deferred |
| 19 | Video consultation works between authorized participants | ⛔ Phase 8 deferred (flag only) |
| 20 | Notifications work for critical booking events | ⛔ Phase 9 deferred (in-app status only) |
| 21 | Patient data is protected | 🟡 RBAC/ownership enforced & audited; MVP limitations documented (guest lookup tradeoff, session-token hashing, rate-limiter scope) |
| 22 | Role permissions are tested | 🟡 verified manually; no automated role tests |
| 23 | Audit logs are functional | ✅ |
| 24 | Mobile applications build successfully | ⛔ Flutter apps not started (placeholders documented) |
| 25 | Web dashboards work on desktop and mobile | ✅ (responsive SPA, manually checked) |
| 26 | Staging deployment is successful | ⛔ Phase 12 deferred |
| 27 | Backup restoration is tested | ⛔ deferred (local SQLite file only) |
| 28 | Production release requirements are reviewed | 🟡 reviewed in this report; formal sign-off pending |

**Next actions (recommended order):**
1. Add automated tests (booking concurrency first — 100 simultaneous attempts on one slot,
   role/authorization matrix, slot engine timezone cases) and stop git-ignoring `/tests/`.
2. Rename `package.json` metadata to `medbriq`; prune unused scaffold dependencies.
3. Re-enable strict `next build` type checking; tighten ESLint rules.
4. Business tasks in parallel: purchase findmedidoctor.com, professional trademark search.
5. Phase 6 (hospital dashboard) or Phase 7 (payment abstraction + sandbox) as the next
   vertical slice, per business priority.
