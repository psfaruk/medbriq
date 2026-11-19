# Medbriq

**Medbriq** (Med + **briq**, from *bridge*) is a global doctor discovery & healthcare platform that **bridges patients and doctors**: find verified doctors, book appointments instantly or by doctor approval, and manage the whole booking lifecycle — for patients, doctors, and platform administrators.

- **Initial market:** Bangladesh (Asia/Dhaka, UTC+6, BDT, national emergency number **999**)
- **Architecture:** country-extensible by design (see [docs/architecture.md](docs/architecture.md))
- **Status:** Demo MVP — see the honest phase report in [docs/phases/phase-1-report.md](docs/phases/phase-1-report.md)

> **Live demo:** there is **no public deployment yet**. The current environment is a local/dev
> demo with **fictional seed data** (12 demo doctors, 4 demo hospitals, 10 specialties). The UI
> is clearly labeled **“Demo MVP”** — no real doctors, patients, licenses, or medical claims are
> represented. Run it locally with the Quick Start below.

---

## Features

### Patient (public site + patient area)
- Doctor search with filters: keyword, specialty, city, language, video-consult support, verified-only, max fee, available today
- Doctor profile pages: verification status, qualifications/experience, fees, chamber & hospital, spoken languages, weekly schedule, reviews
- Slot calendar derived from each doctor’s weekly availability (30-minute slots, Asia/Dhaka)
- **Instant booking** (doctor allows it) and **doctor-approval booking** requests
- **Guest bookings** without an account, tracked by a reference code (`MB-XXXXXX`) + phone lookup
- Appointment history, cancellation, and rescheduling
- Account registration / login / logout

### Doctor (dashboard)
- Dashboard overview: today’s appointments, pending requests, upcoming confirmed, completed total, rating
- Weekly availability manager (per-weekday time windows)
- Profile editor (bio, fees, chamber address, languages, video support, booking mode)
- Appointment queue management: approve / reject (with reason) / complete / cancel

### Admin (console)
- Platform statistics (users, doctors, verified/pending, appointments)
- Doctor verification queue with decisions (approve / reject / request more info) — audited
- Doctor directory, audit log viewer

### Platform guarantees
- **Database-level double-booking prevention** — one doctor, one appointment per exact slot start (unique constraint, not just a frontend check)
- Verifiable booking lifecycle: `PENDING_APPROVAL → CONFIRMED / REJECTED / CANCELLED_BY_PATIENT / CANCELLED_BY_DOCTOR / COMPLETED / EXPIRED`
- Role-based access control (PATIENT / DOCTOR / ADMIN) with server-side authorization
- Audit logging of privileged actions (verification decisions, appointment transitions)
- Emergency guidance (**999**) kept visible in the UI; the platform never provides medical advice, diagnosis, or prescriptions

Not implemented at MVP (honest scope): payments (Phase 7 — provider-abstraction ready), video consultation calls (Phase 8 — only a support flag), notification channels (Phase 9), i18n localization (Phase 10), hospital dashboard (Phase 6), Flutter mobile apps, staging/production deployment (Phase 12).

---

## Quick Start (local development)

Prerequisites: [Bun](https://bun.sh) ≥ 1.1, Node.js ≥ 20 (Bun manages it fine), Git.

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env
# (defaults point DATABASE_URL at a local SQLite file — fine for development)

# 3. Create the database schema
bun run db:push

# 4. Seed fictional demo data (12 doctors, 4 hospitals, 10 specialties)
bun prisma/seed.ts

# 5. Start the dev server → http://localhost:3000
bun run dev
```

Other useful commands:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server on port 3000 (logs also tee'd to `dev.log`) |
| `bun run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `bun run db:push` | Push Prisma schema to the database (dev shortcut) |
| `bun run db:generate` | (Re)generate the Prisma client |
| `bun run db:migrate` | Create/apply a dev migration |
| `bun run db:reset` | Reset database and re-apply migrations |
| `bun prisma/seed.ts` | Wipe & reseed demo data (destructive — demo DB only) |

## Demo Credentials

> ⚠️ **DEV ONLY — DO NOT DEPLOY ANYWHERE PUBLIC.** These accounts are seeded by
> `prisma/seed.ts` for the local demo environment. All names, hospitals, licenses, and
> reviews are **fictional**.

| Role | Email | Password | Identity |
| --- | --- | --- | --- |
| Admin | `admin@medbriq.dev` | `Admin@Medbriq123` | Platform Admin |
| Doctor | `doctor@medbriq.dev` | `Doctor@123` | Dr. Ayesha Rahman (verified) |
| Patient | `patient@medbriq.dev` | `Patient@123` | Rahim Uddin |

Additional seeded (fictional) doctors share the password `Doctor@123`; extra demo patients
(`patient2@`, `patient3@`…) share `Patient@123`. All seeded doctor registration numbers are
marked `(demo)`.

---

## Tech Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | One deployable app: public site + patient area + doctor dashboard + admin console as a single-route SPA at `/` |
| Language | TypeScript 5 (strict mode) | Shared DTO types in `src/lib/types.ts` |
| API | Next.js Route Handlers under `/api/v1/*` | Modular monolith (see [docs/architecture.md](docs/architecture.md) for the NestJS tradeoff discussion) |
| ORM / DB | Prisma + SQLite (dev) | Schema designed PostgreSQL-portable; production path = Supabase Postgres free tier |
| Auth | Custom credentials auth | scrypt password hashing (Node `crypto`), opaque session tokens in DB, httpOnly cookies, RBAC |
| UI | Tailwind CSS 4 + shadcn/ui + lucide-react | Sky-blue primary / soft-green accent, mobile-first responsive |
| Fonts | Geist + Noto Sans Bengali | Bengali script support for the initial market |
| State | Zustand (SPA navigation/session) | Server data via `fetch` + local state |
| Validation | Zod | Request body validation in API routes |
| Runtime / CI | Bun + GitHub Actions | Minimal quality gate — see [.github/workflows/ci.yml](.github/workflows/ci.yml) |

## Repository Structure

```
medbriq/
├── .github/workflows/ci.yml      # CI: install → prisma generate → lint → tsc
├── apps/
│   ├── patient-mobile/           # PLANNED Flutter patient app (placeholder, no code yet)
│   └── doctor-mobile/            # PLANNED Flutter doctor app (placeholder, no code yet)
├── docs/
│   ├── api.md                    # REST v1 reference
│   ├── architecture.md           # System design, decisions, brand evaluation
│   ├── costs.md                  # Free-first cost policy (COSTS.md format)
│   ├── database.md               # ERD, models, constraints, state machines
│   ├── security.md               # Auth, RBAC, concurrency, limitations
│   └── phases/phase-1-report.md  # Phase report & acceptance-criteria checklist
├── prisma/
│   ├── schema.prisma             # Data model (SQLite now, Postgres-portable)
│   └── seed.ts                   # Fictional demo data seeder
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
| 2 | Authentication & users | ✅ Core MVP slice (credentials auth, RBAC, sessions) |
| 3 | Doctor directory & verification | ✅ Core MVP slice (search/filters, verification workflow, audit) |
| 4 | Appointment booking engine | ✅ Core MVP slice (slots, instant/approval, cancel/reschedule, DB-level concurrency guard) |
| 5 | Doctor dashboard | ✅ Core MVP slice (stats, availability, queue management) |
| 6 | Hospital & clinic management | ⛔ Not implemented (Hospital is a reference entity only) |
| 7 | Payments & revenue | ⛔ Not implemented (provider-abstraction-ready design) |
| 8 | Video consultation | ⛔ Not implemented (doctor *video support* flag only) |
| 9 | Notifications | ⛔ Not implemented (in-app status changes only) |
| 10 | Localization & compliance | ⛔ Not implemented (Bengali *font* support only, no i18n framework) |
| 11 | Admin, analytics & operations | ✅ Core MVP slice (stats, verification queue, audit logs) |
| 12 | Final testing, security & launch | ⛔ Not implemented (no automated test suite, no staging/prod deploy) |

Details, known issues, and the full acceptance-criteria checklist:
[docs/phases/phase-1-report.md](docs/phases/phase-1-report.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — branch strategy, conventional commits, PR rules,
code style, and the strict **no-secrets / fictional-demo-data-only** policies.

## License

Proprietary — **all rights reserved** (© 2026 Medbriq). No open-source license is granted
at this time; a formal `LICENSE` file will be added when the business decides the licensing
model.

## Security

- **Reporting vulnerabilities:** please report suspected vulnerabilities privately to the
  repository maintainers (do not open public issues with exploit details).
- **Secrets:** `.env` is git-ignored; no credentials, tokens, or keys belong in this
  repository. Never commit them. See [docs/security.md](docs/security.md) for the full
  security documentation and the honest list of MVP limitations.

---

*Medbriq is a discovery & booking platform. It does not provide medical advice, diagnosis,
or prescriptions. In a medical emergency in Bangladesh, call **999** immediately.*
