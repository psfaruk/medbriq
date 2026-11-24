# Find Medi Doctor

**Find Medi Doctor** (Med + **briq**, from *bridge*) is a global doctor discovery & healthcare platform that **bridges patients and doctors**: find verified doctors, book appointments instantly or by doctor approval, and manage the whole booking lifecycle — for patients, doctors, and platform administrators.

- **Initial market:** Bangladesh (Asia/Dhaka, UTC+6, BDT, national emergency number **999**)
- **Architecture:** country-extensible by design (see [docs/architecture.md](docs/architecture.md))
- **Status:** MVP — production runs on **Vercel + Firestore** (see [docs/DEPLOYMENT-VERCEL.md](docs/DEPLOYMENT-VERCEL.md)); local dev uses SQLite. **Demo data is opt-in** (see [Quick Start](#quick-start-local-development))

> **No demo mode by default:** the app no longer bootstraps a bundled demo
> database and ships no demo accounts. A fresh install starts **empty** —
> create the first admin with `bun run admin:create`, then let real doctors
> and patients register through the UI. If you explicitly want the fictional
> demo dataset (17 doctors, 8 hospitals, 10 specialties) to exercise the
> workflows end-to-end, run the seeder: `bun prisma/seed.ts` (DEV ONLY).

---

## Features

### Patient (public site + patient area)
- Doctor search with filters: keyword, specialty, city, language, video-consult support, verified-only, max fee, available today
- Doctor profile pages: verification status, qualifications/experience, fees, chamber & hospital, spoken languages, weekly schedule, reviews
- Slot calendar derived from each doctor’s weekly availability (30-minute slots, Asia/Dhaka)
- **Instant booking** (doctor allows it) and **doctor-approval booking** requests
- **Guest bookings** without an account, tracked by a reference code (`MB-XXXXXX`) + phone lookup
- Appointment history, cancellation, and rescheduling
- **Consultation notes** from the doctor on completed visits
- **Rate completed visits** (1–5 stars + comment; one review per doctor per patient)
- Account registration / login / logout

### Authentication (three methods)
- **Email + password** (scrypt, opaque DB sessions, RBAC)
- **Mobile number OTP login** — Bangladeshi numbers (`01XXXXXXXXX` / `+8801…`) normalized to E.164; 6-digit codes hashed (`sha256(phone:purpose:code)`), 5-minute TTL, single-use, 5-attempt lockout, 3-requests-per-10-minutes per phone. No SMS provider is wired yet — a **clearly labeled dev mode** returns the code in the API response/UI (`SMS_PROVIDER=console`); a real provider slots into `src/lib/sms.ts`.
- **Google Sign-In** — official Google Identity Services button; the ID token is verified server-side (audience / `email_verified` / `exp` via Google’s tokeninfo endpoint) and accounts are created or linked by verified email. Requires `GOOGLE_CLIENT_ID`; when unset the UI shows an honest “not configured” state.
- **Password reset via phone OTP** (enumeration-safe), **set/change password** for Google/phone accounts, self-service **profile & phone editing** (`PATCH /api/v1/auth/me`)

### Notifications (Phase 9 core slice)
- In-app notification center (bell + popover, unread badge, 30s polling)
- Events: appointment requested (to doctor), approved/rejected/cancelled/completed/rescheduled (to patient), instant-booking confirmation, new review (to doctor)
- Bodies carry **no medical content** — only names, dates and reference codes

### Doctor (dashboard)
- Dashboard overview: today’s appointments, pending requests, upcoming confirmed, completed total, rating, **estimated earnings** (simulated Phase-7 preview: completed revenue − 10% platform commission)
- Weekly availability manager (per-weekday time windows)
- Profile editor (bio, fees, chamber address, languages, video support, booking mode)
- Appointment queue management: approve / reject (with reason) / **complete with an optional consultation note** / cancel

### Admin (console)
- Platform statistics (users, doctors, verified/pending, appointments)
- Doctor verification queue with decisions (approve / reject / request more info) — audited
- **User management**: directory with search + role filter, provider/status columns, suspend/reactivate (guarded: admins cannot suspend themselves or other admins; audited)
- **Review moderation**: recent reviews across all doctors with removal (audited)
- Doctor directory, audit log viewer

### Public hospital directory (Phase 6 public slice)
- “Hospitals & clinics” section on the home page with city, address, phone and affiliated doctor counts; clicking filters doctor search by city

### Platform guarantees
- **Database-level double-booking prevention** — one doctor, one appointment per exact slot start (unique constraint, not just a frontend check)
- Verifiable booking lifecycle: `PENDING_APPROVAL → CONFIRMED / REJECTED / CANCELLED_BY_PATIENT / CANCELLED_BY_DOCTOR / COMPLETED / EXPIRED`
- Role-based access control (PATIENT / DOCTOR / ADMIN) with server-side authorization
- Audit logging of privileged actions (verification decisions, appointment transitions, suspensions, review moderation, password changes)
- Emergency guidance (**999**) kept visible in the UI; the platform never provides medical advice, diagnosis, or prescriptions

Not implemented at MVP (honest scope): real payment processing (Phase 7 — simulated earnings preview only), video consultation calls (Phase 8 — only a support flag), push/email/SMS notification channels (Phase 9 — in-app only), i18n localization (Phase 10 — Bengali font support only), hospital owner dashboards (Phase 6 — public directory only), Flutter mobile apps, staging/production deployment (Phase 12).

---

## Quick Start (local development)

Prerequisites: [Bun](https://bun.sh) ≥ 1.1, Node.js ≥ 20 (Bun manages it fine), Git.

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# (DATABASE_URL defaults to a SQLite file next to prisma/schema.prisma)

# 3. Create the database schema
bun run db:push

# 4a. REAL data mode — create the first admin (no demo accounts):
bun run admin:create admin@yourdomain.com 'Choose-4-Strong-Pass!'

#    …or 4b. DEMO data mode — fictional doctors/hospitals (DEV ONLY):
#    bun prisma/seed.ts

# 5. Start the dev server → http://localhost:3000
bun run dev
```

> **z.ai / GLM sandbox note:** Bun auto-loads `/home/z/my-project/.env`
> (provided by the sandbox) which **overrides** this project's `.env`
> `DATABASE_URL`. All tools then consistently use that root-level SQLite file.
> To pin your own location, launch explicitly:
> `DATABASE_URL=file:/abs/path.db bun run dev`.

Other useful commands:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server on port 3000 (Next.js + Turbopack) |
| `bun run admin:create` | Create/update the first ADMIN account (real-data bootstrap) |
| `bun run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `bun run typecheck` | TypeScript strict check (CI gate) |
| `bun run db:push` | Push Prisma schema to the database (dev shortcut) |
| `bun run db:generate` | (Re)generate the Prisma client |
| `bun run db:migrate` | Create/apply a dev migration |
| `bun run db:reset` | Reset database and re-apply migrations |
| `bun run check:prod` | Production preflight (data store, demo mode, SMS, secrets) |
| `bun prisma/seed.ts` | Wipe & reseed the fictional demo dataset (destructive — dev/demo DB only) |

## Demo Credentials (only after `bun prisma/seed.ts`)

> ⚠️ **DEV ONLY — DO NOT DEPLOY ANYWHERE PUBLIC.** These accounts are created
> ONLY by the optional demo seeder. All names, hospitals, licenses, and
> reviews are **fictional**. Without the seeder the database contains no
> accounts at all — bootstrap a real admin with `bun run admin:create`.

| Role | Email | Password | Identity |
| --- | --- | --- | --- |
| Admin | `admin@findmedidoctor.dev` | `Admin@Find Medi Doctor123` | Platform Admin |
| Doctor | `doctor@findmedidoctor.dev` | `Doctor@123` | Dr. Ayesha Rahman (verified) |
| Hospital | `hospital@medbriq.dev` | `Hospital@123` | Greenview General Hospital (verified) |
| Patient | `patient@findmedidoctor.dev` | `Patient@123` | Rahim Uddin |
| Patient | `patient2@findmedidoctor.dev` | `Patient@123` | Salma Khatun |
| Patient | `patient3@findmedidoctor.dev` | `Patient@123` | Abdul Karim |
| Patient | `google.demo@medbriq.dev` | `Google@Demo123` | Rifat Hasan (demo Google fallback) |

Additional seeded (fictional) doctors share the password `Doctor@123`.
All seeded doctor registration numbers are marked `(demo)`.

---

## Deployment (Vercel + Firestore)

The app ships with a **dual data-store layer** (`src/lib/data/`) and switches stores
automatically at runtime — no code changes between local dev and production:

- **`FIREBASE_SERVICE_ACCOUNT` not set** → **PrismaStore** + local SQLite (`DATABASE_URL`).
  This is the local development default; nothing Firebase-related is needed or initialized.
- **`FIREBASE_SERVICE_ACCOUNT` set** (compact JSON of a Firebase service-account key) →
  **FirestoreStore** via the firebase-admin SDK (server-side only). The database id comes
  from `FIREBASE_DATABASE_ID` (fallback `default`).

Deploying to Vercel:

1. Create a Firebase project (Spark/free tier is fine at demo scale), enable **Firestore**, and
   create a service-account key (compact the JSON to one line, e.g. with `jq -c .`).
2. Set the environment variables in Vercel:

   | Variable | Value |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT` | compact one-line JSON of the service-account key |
   | `FIREBASE_DATABASE_ID` | `default` (or your Firestore database id) |
   | `DATABASE_URL` | any dummy file path, e.g. `file:./dev.db` — Prisma is only used locally, but `prisma generate` in the build still expects it |

3. Optional — seed the demo data into Firestore (idempotent — skips when
   already seeded; `--force` wipes and re-seeds). Skip this for a real
   deployment: seed reference data (specialties) and create the admin
   instead (see [docs/PRODUCTION-RUNBOOK.md](docs/PRODUCTION-RUNBOOK.md) §4).

   ```bash
   FIREBASE_SERVICE_ACCOUNT="$(jq -c . service-account.json)" bun scripts/firestore-seed.ts
   ```

4. Deploy (`vercel` CLI or Git integration). The API now reads/writes Firestore with the
   same behavior as the local SQLite build, including the database-level double-booking guard
   (Firestore doc-id uniqueness — see [docs/database.md](docs/database.md)).

The demo logins from the table above work in both environments (the seeders share the same
account definitions and password hashing).

---

## Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | One deployable app: public site + patient area + doctor dashboard + admin console as a single-route SPA at `/` |
| Language | TypeScript 5 (strict mode) | Shared DTO types in `src/lib/types.ts` |
| API | Next.js Route Handlers under `/api/v1/*` | Modular monolith (see [docs/architecture.md](docs/architecture.md) for the NestJS tradeoff discussion) |
| ORM / DB | Prisma + SQLite (dev) · Firestore (production) | Dual data-store layer (`src/lib/data/`) — auto-selected at runtime, see [Deployment](#deployment-vercel--firestore) and [docs/database.md](docs/database.md) |
| Auth | Custom credentials auth | scrypt password hashing (Node `crypto`), opaque session tokens in DB, httpOnly cookies, RBAC |
| UI | Tailwind CSS 4 + shadcn/ui + lucide-react | Sky-blue primary / soft-green accent, mobile-first responsive |
| Fonts | Geist + Noto Sans Bengali | Bengali script support for the initial market |
| State | Zustand (SPA navigation/session) | Server data via `fetch` + local state |
| Validation | Zod | Request body validation in API routes |
| Runtime / CI | Bun + GitHub Actions | Minimal quality gate — see [.github/workflows/ci.yml](.github/workflows/ci.yml) |

## Repository Structure

```
find-medi-doctor/
├── .github/workflows/ci.yml      # CI: install → prisma generate → lint → tsc
├── apps/
│   ├── patient-mobile/           # PLANNED Flutter patient app (placeholder, no code yet)
│   └── doctor-mobile/            # PLANNED Flutter doctor app (placeholder, no code yet)
├── docs/
│   ├── api.md                    # REST v1 reference
│   ├── architecture.md           # System design, decisions, brand evaluation
│   ├── costs.md                  # Free-first cost policy (COSTS.md format)
│   ├── database.md               # ERD, models, constraints, state machines, Firestore store
│   ├── security.md               # Auth, RBAC, concurrency, limitations
│   └── phases/phase-1-report.md  # Phase report & acceptance-criteria checklist
├── prisma/
│   ├── schema.prisma             # Data model (SQLite now, Postgres-portable)
│   └── seed.ts                   # OPT-IN fictional demo data seeder (local SQLite)
├── scripts/
│   ├── create-admin.ts           # Real-data bootstrap: first ADMIN account
│   └── firestore-seed.ts         # OPT-IN fictional demo data seeder (Firestore)
├── src/
│   ├── app/
│   │   ├── api/v1/               # REST route handlers (versioned under /api/v1)
│   │   ├── layout.tsx            # Root layout, fonts, metadata
│   │   └── page.tsx              # SPA shell (renders the active view)
│   ├── components/
│   │   ├── brand.tsx             # Logo / wordmark / Demo badge
│   │   ├── ui/                   # shadcn/ui primitives
│   │   └── views/                # SPA views (home, search, booking, dashboards, …)
│   ├── hooks/                    # Shared React hooks
│   └── lib/                      # auth, api envelope, constants, db, slots, store, time, types
├── .env.example                  # Environment template (never commit .env)
├── CONTRIBUTING.md
└── README.md
```

## API

All endpoints are versioned under `/api/v1` and share a single response envelope
(`{ ok, data }` / `{ ok, error: { message, code } }`). Full reference — parameters, bodies,
status codes, error codes, RBAC matrix, and a curl golden path:
**[docs/api.md](docs/api.md)**.

## Roadmap

Development follows the 12-phase plan from the master product spec. Current status:

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation & architecture | ✅ Done (this MVP) |
| 2 | Authentication & users | ✅ Core slice extended — email+password, **phone OTP login**, **Google Sign-In**, password reset via OTP, profile/password settings (email verification still deferred — needs an email provider) |
| 3 | Doctor directory & verification | ✅ Core slice extended — search/filters, verification workflow, audit, **patient review writing** |
| 4 | Appointment booking engine | ✅ Core MVP slice (slots, instant/approval, cancel/reschedule, DB-level concurrency guard) |
| 5 | Doctor dashboard | ✅ Core slice extended — stats, availability, queue management, **consultation notes**, **estimated earnings** (simulated) |
| 6 | Hospital & clinic management | 🟡 Public directory slice (hospital cards + city-filter navigation); owner dashboards deferred |
| 7 | Payments & revenue | 🟡 Simulated earnings preview only (10% commission math); real payments deferred |
| 8 | Video consultation | ⛔ Not implemented (doctor *video support* flag only) |
| 9 | Notifications | 🟡 In-app notification center done (all booking events + reviews); push/email/SMS channels deferred |
| 10 | Localization & compliance | ⛔ Not implemented (Bengali *font* support only, no i18n framework) |
| 11 | Admin, analytics & operations | ✅ Core slice extended — stats, verification queue, **user management (suspend/reactivate)**, **review moderation**, audit logs |
| 12 | Final testing, security & launch | ⛔ Not implemented (no automated test suite, no staging/prod deploy) |

Details, known issues, and the full acceptance-criteria checklist:
[docs/phases/phase-1-report.md](docs/phases/phase-1-report.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — branch strategy, conventional commits, PR rules,
code style, and the strict **no-secrets / fictional-demo-data-only** policies.

## License

Proprietary — **all rights reserved** (© 2026 Find Medi Doctor). No open-source license is granted
at this time; a formal `LICENSE` file will be added when the business decides the licensing
model.

## Security

- **Reporting vulnerabilities:** please report suspected vulnerabilities privately to the
  repository maintainers (do not open public issues with exploit details).
- **Secrets:** `.env` is git-ignored; no credentials, tokens, or keys belong in this
  repository. Never commit them. See [docs/security.md](docs/security.md) for the full
  security documentation and the honest list of MVP limitations.

---

*Find Medi Doctor is a discovery & booking platform. It does not provide medical advice, diagnosis,
or prescriptions. In a medical emergency in Bangladesh, call **999** immediately.*
