# Medbriq — Architecture

> Audience: engineering team. This document explains the system as built for the MVP, the
> deliberate deviations from the master product spec’s ideal stack, and the scaling path.

## 1. System Overview

Medbriq MVP is a **single Next.js 16 application** containing a single-route SPA (public site +
patient area + doctor dashboard + admin console) and a versioned REST API implemented as
Next.js Route Handlers — a **modular monolith**.

```
                        ┌────────────────────────────────────────────────┐
                        │                 Browser (client)               │
                        │  single-route SPA at "/" (src/app/page.tsx)    │
                        │  ┌──────────────────────────────────────────┐  │
                        │  │ Views: home · search · doctor · booking  │  │
                        │  │ appointments · doctor-dashboard · admin  │  │
                        │  │ auth                                     │  │
                        │  │ Zustand store: view, user, filters       │  │
                        │  │ Tailwind 4 + shadcn/ui + lucide-react    │  │
                        │  └──────────────────────────────────────────┘  │
                        └───────────────▲────────────────────────────────┘
                                        │  fetch() JSON  (cookie session)
                                        │  { ok, data } / { ok, error:{message,code} }
                        ┌───────────────▼────────────────────────────────┐
                        │           Next.js 16 (App Router)              │
                        │  ┌──────────────────────────────────────────┐  │
                        │  │ /api/v1/* Route Handlers (modular        │  │
                        │  │ monolith): auth · doctors · specialties  │  │
                        │  │ meta · appointments · doctor · admin     │  │
                        │  ├──────────────────────────────────────────┤  │
                        │  │ src/lib — domain libraries:              │  │
                        │  │  auth.ts   scrypt + opaque session tokens │  │
                        │  │  slots.ts  slot engine (30-min, Dhaka)    │  │
                        │  │  time.ts   UTC storage, Asia/Dhaka display│  │
                        │  │  api.ts    response envelope helpers      │  │
                        │  │  constants.ts roles/statuses (source of   │  │
                        │  │             truth; SQLite has no enums)   │  │
                        │  └──────────────────────────────────────────┘  │
                        └───────────────▲────────────────────────────────┘
                                        │ Prisma ORM
                        ┌───────────────▼────────────────────────────────┐
                        │  SQLite (dev, file: ./db/custom.db)            │
                        │  → PostgreSQL / Supabase (production path)     │
                        │  Key invariant: @@unique([doctorId,slotStart]) │
                        │  = DB-level double-booking guard               │
                        └────────────────────────────────────────────────┘

   Planned (NOT implemented): Flutter clients (apps/patient-mobile, apps/doctor-mobile)
   consuming the same /api/v1 contract; Postgres; NestJS extraction; Redis; SFU video.
```

Deployment today: **local development only** (dev environment, fictional seed data,
labeled “Demo MVP” in the UI). No staging/production environment exists yet (Phase 12).

## 2. Key Architectural Decisions

### 2.1 One deployable app instead of the spec’s monorepo ideal

The master product spec’s ideal architecture is a monorepo with six separate apps
(`patient-mobile`, `doctor-mobile`, `public-web`, `doctor-dashboard`, `hospital-dashboard`,
`admin-dashboard`) and a **separate NestJS backend service**. The MVP deliberately deviates:

**Decision:** a single Next.js app — one SPA route (`/`) serving all web personas, plus
NestJS-replacing API Route Handlers under `/api/v1/*`.

**Rationale (free-first policy, master spec §13):**
- Zero extra hosting: one Vercel-deployable unit instead of a web app **plus** a Node
  backend that needs its own always-on host (free tiers for long-running Node servers are
  scarce and unreliable).
- Fewer moving parts for an MVP: no API-gateway/CORS/auth duplication, one CI job,
  one deploy, shared TypeScript types between UI and API (`src/lib/types.ts`).
- The master spec itself authorizes this: “Avoid unnecessary microservices” and
  “Adjust the structure if there is a documented technical reason.”

**Tradeoffs (honest):**
- All personas share one deployment unit; a frontend regression can affect the admin console.
  Mitigation: views are isolated components; CI gates lint + typecheck.
- Route Handlers lack NestJS’s structured modules/DI/OpenAPI generation. The contract is
  documented by hand in [api.md](api.md) instead of generated Swagger (a Phase 12 gap).
- Horizontal scaling of the API means scaling the whole app; the in-memory login rate
  limiter is per-instance (see [security.md](security.md)).
- Single SQLite file cannot scale horizontally — accepted for dev; the schema is
  PostgreSQL-portable (see [database.md](database.md)).

**Migration path (when scale demands):** the API surface is already versioned (`/api/v1`)
and envelope-standardized, so a NestJS extraction is a mechanical port of handlers into
controllers/services; the SPA then points `API_BASE_URL` at the new service. Trigger this
only when there is a concrete need (e.g., non-Node consumers at scale, independent backend
scaling, team boundaries).

### 2.2 Single-route SPA on "/"

Instead of multiple pages/routes, `src/app/page.tsx` is an app shell that renders one active
view from a Zustand store (`src/lib/store.ts`):

```
useAppStore: {
  view: { name: home|search|doctor|booking|appointments|doctor-dashboard|admin|auth, slug? },
  user: SessionUser | null,          // resolved once via GET /api/v1/auth/me
  searchFilters: SearchFilters,
  authReturnView,                    // post-login redirect target
}
```

**Why:** one codebase for all personas, no route-level auth splitting needed at MVP size,
instant view switching, simple navigation model.

**Tradeoffs:** no SEO-friendly URLs per doctor (a future requirement from the spec — moving
doctor profiles to real routes `/doctors/[slug]` is a planned enhancement), and the
browser Back button does not navigate views (acceptable for the demo MVP).

### 2.3 Server data access

No client-side data-fetching library at MVP: views use `fetch()` + local component state
against `/api/v1`. The Zustand store holds only *navigation/session* state, not server
cache. If data requirements grow, introduce TanStack Query (already a dependency of the
scaffold) rather than pushing server data into the global store.

## 3. Multi-Agent Development Workflow

This MVP session was built by a pod of specialized agents working in isolated scopes,
mirroring the specialist catalog in the master spec (§5). Coordination rules from the spec
apply: agents read documentation before editing, never overwrite each other’s files, APIs
are documented before frontend integration, and no agent claims unverified results.

| Agent | Scope in this repo | Primary outputs |
| --- | --- | --- |
| **1-a — Backend / API engineer** | `src/app/api/v1/**` route handlers, booking/approval flows, validation | REST v1 endpoints per [api.md](api.md) |
| **1-b — Frontend engineer** | `src/components/views/**`, view components inside the SPA shell | Patient, doctor, and admin views |
| **1-c — Data & domain engineer** | `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/{slots,time,constants,types,db}.ts` | Schema, slot engine, Dhaka time utilities, seed data |
| **1-d — Documentation & DevOps** (this agent) | `README.md`, `docs/**`, `CONTRIBUTING.md`, `.github/workflows/ci.yml`, `apps/*/README.md` | Documentation set + CI pipeline (no application code) |

Shared contracts (schema, constants, DTO types, API envelope) are the integration points;
they were fixed first so backend and frontend could proceed in parallel against
[api.md](api.md) and `src/lib/types.ts`.

## 4. Timezone Policy

- **Storage:** all appointment timestamps (`slotStart`, `slotEnd`) are stored **in UTC**.
- **Scheduling domain:** weekly `AvailabilityRule` windows are *minutes-from-midnight in
  the clinic’s local timezone* — Asia/Dhaka (**UTC+6**) for the initial market.
- **No DST:** Bangladesh has not observed daylight saving time since 2009, so the MVP uses
  a fixed `+6h` offset (`src/lib/time.ts`) with no timezone library. This is a documented
  limitation: expanding to DST-observing countries requires moving slot generation to a
  proper timezone library — see [database.md §7](database.md#7-time-handling) and the phase
  report risks.
- **Display:** all human labels are formatted in Asia/Dhaka (`Intl.DateTimeFormat` with
  `timeZone: "Asia/Dhaka"`).

## 5. Brand Evaluation (RDAP-verified)

Brand selection followed the master spec (§2): ≥20 candidate names evaluated for
pronunciation, memorability, international suitability, and `.com` availability.
Availability was checked against the **authoritative Verisign registry RDAP service**
(`https://rdap.verisign.com/com/v1/domain/<name>`; HTTP 404 = available), on
**2026-11-19**.

| # | Candidate | .com status (RDAP, 2026-11-19) |
| ---: | --- | --- |
| 1 | medorbis.com | ❌ taken |
| 2 | sanovia.com | ❌ taken |
| 3 | healora.com | ❌ taken |
| 4 | medsetu.com | ❌ taken |
| 5 | curiva.com | ❌ taken |
| 6 | medivo.com | ❌ taken |
| 7 | docuva.com | ❌ taken |
| 8 | vitabridge.com | ❌ taken |
| 9 | clinora.com | ❌ taken |
| 10 | arogia.com | ❌ taken |
| 11 | mednest.com | ❌ taken |
| 12 | healbridge.com | ❌ taken |
| 13 | docsphere.com | ❌ taken |
| 14 | sustho.com | ❌ taken |
| 15 | nirog.com | ❌ taken |
| 16 | sehatu.com | ❌ taken |
| 17 | shastho.com | ❌ taken |
| 18 | swastho.com | ❌ taken |
| 19 | curevia.com | ❌ taken |
| 20 | healova.com | ❌ taken |
| **21** | **medbriq.com** | ✅ **available → chosen** |

**Chosen: Medbriq** — *Med* + *briq* (from *bridge*): “bridging patients and doctors.”

Rationale:
- Short, easy to pronounce internationally, no implied medical outcome (per spec §2 rules).
- The bridge metaphor matches the product’s essence (connection/discovery), reflected in
  the logo (bridge arch + medical cross, `src/components/brand.tsx`).
- Distinctive/coined → lower collision risk than descriptive names; `.com` available.
- Several strong candidates with South-Asian health roots (nirog, sehatu, shastho,
  swastho — Bengali/Hindi/Urdu “health”) were all taken; Medbriq keeps a neutral,
  international character suitable for the worldwide roadmap.

**Caveats (honest):**
- **medbriq.com has NOT been purchased yet** — it was verified available on 2026-11-19;
  availability can change at any time. Purchase (~$10–12/yr) is a pending business task
  (see [costs.md](costs.md)).
- **No formal trademark search has been performed.** Professional trademark clearance
  (Bangladesh + target international classes) is a **pending business task** before any
  public launch. “Medbriq” is the *provisional* brand per the master spec.

## 6. Future Scaling Path

Ordered by expected trigger; none of these are implemented today:

1. **PostgreSQL (Supabase free tier)** — swap `provider = "sqlite"` → `"postgresql"` in
   `prisma/schema.prisma` + `DATABASE_URL`; run migrations. Schema is written to be
   portable; **money fields must change `Float` → `Decimal`** at that point (see
   [database.md §4](database.md#4-float-to-decimal-migration)).
2. **Hosting (Vercel Hobby → Pro)** — the app is a standard Next.js deployment unit;
   environment variables move to the platform’s secret store. Note Hobby tier is
   non-commercial — review before real traffic (see [costs.md](costs.md)).
3. **NestJS backend extraction** — when independent backend scaling or non-Node consumers
   appear; `/api/v1` contract stays stable, SPA switches `API_BASE_URL`.
4. **Redis** — for cross-instance rate limiting, session caches, and notification queues;
   only when multi-instance or Phase 9 notifications demand it (master spec: “Redis only
   when required and affordable”).
5. **Video consultation (WebRTC + SFU)** — Phase 8. Signaling server + STUN/TURN or a
   managed SFU with a free dev tier. **This is the single biggest cost risk** — TURN relay
   and SFU minutes are metered; the recommendation is to defer until there is a funded
   budget (see [costs.md](costs.md)).
6. **Flutter clients** — `apps/patient-mobile` and `apps/doctor-mobile` (placeholder
   directories today) will consume the same `/api/v1` contract; cookie sessions will be
   supplemented with bearer-token sessions for mobile (documented API-first so mobile
   never scrapes HTML).
7. **Search infrastructure** — SQLite `LIKE`/Postgres `ILIKE` filtering is sufficient at
   MVP scale; PostgreSQL full-text search is the spec’s chosen next step before any
   external search engine.

## 7. Related Documents

- [database.md](database.md) — ERD, constraints, state machines, seeding, indexes
- [api.md](api.md) — REST v1 reference
- [security.md](security.md) — auth design, RBAC, concurrency, known limitations
- [costs.md](costs.md) — free-first cost policy
- [phases/phase-1-report.md](phases/phase-1-report.md) — phase report & acceptance criteria
