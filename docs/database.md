# Medbriq — Database

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). Runtime: **SQLite**
(dev, free-first MVP); the schema is designed to be **PostgreSQL-portable** (production
path: Supabase Postgres — see [architecture.md](architecture.md#6-future-scaling-path)).

> SQLite does not support native Prisma enums, so status/role columns are plain strings
> validated at the application layer. The single source of truth for allowed values is
> [`src/lib/constants.ts`](../src/lib/constants.ts) — keep it in sync with the schema
> comments.

## 1. Entity-Relationship Diagram

```
                              ┌──────────────┐
                              │   Country    │  code BD, currency BDT, phoneCode +880
                              └──────────────┘
                                    (standalone reference table)

  ┌───────────────┐ 1        1 ┌──────────────────┐ 1        * ┌────────────────┐
  │     User      │────────────│   DoctorProfile  │────────────│ DoctorSpecialty│
  │───────────────│            │──────────────────│            │ (join table)   │
  │ id (cuid)     │            │ id               │            │ PK(doctorId,   │
  │ email UNIQUE  │            │ userId UNIQUE    │            │    specialtyId)│
  │ passwordHash  │            │ slug UNIQUE      │            └───────┬────────┘
  │ name, phone   │            │ bio, experience  │                    │ *
  │ role          │            │ consultationFee  │            ┌───────▼────────┐
  │ status        │            │ followUpFee      │         *  │   Specialty    │
  └───┬───────┬───┘            │ videoConsultFee  │────────────│ name, nameBn   │
      │ 1     │ 1              │ regNumber (BMDC) │            │ slug UNIQUE    │
      │       │                │ verificationStatus│           └────────────────┘
      │       │                │ verifiedAt       │
      │       │                │ city, country    │  *                   1
      │       │                │ chamberAddress   │──────────────┌───────────────┐
      │       │                │ languages        │              │   Hospital    │
      │       │                │ supportsVideo    │              │ slug UNIQUE   │
      │       │                │ requiresApproval │              │ city (indexed)│
      │       │                └───┬──────────┬───┘              └───────────────┘
      │       │                    │ 1        │ 1
      │       │        ┌───────────▼──┐   ┌───▼──────────────┐
      │       │        │AvailabilityR.│   │    Appointment   │◄──────────────────┐
      │       │        │──────────────│   │──────────────────│                   │
      │       │        │ dayOfWeek    │   │ referenceCode    │                   │
      │       │        │ startMinute  │   │  UNIQUE (MB-XXX) │                   │
      │       │        │ endMinute    │   │ slotStart/slotEnd│                   │
      │       │        │ isActive     │   │  (UTC)           │                   │
      │       │        │ UNIQUE(doctor│   │ status           │                   │
      │       │        │  Id,dayOfWeek│   │ bookingMode      │                   │
      │       │        │  ,startMinute)│  │ type, fee,       │                   │
      │       │        └──────────────┘   │  currency        │                   │
      │       │                           │ patientName/Phone│                   │
      │ 1     │ *                         │ patientAge/Gender│                   │
  ┌──▼─────┐ │  (PatientAppointments)     │ notes, doctorNote│                   │
  │Session │ └────────────────────────────│ patientId? ──────┼──→ User (patient) │
  │────────│                              └──────────────────┘                   │
  │ token  │                              UNIQUE(doctorId, slotStart)            │
  │ UNIQUE │                              ← DOUBLE-BOOKING GUARD                 │
  │ userId │                                                                   │
  │expiresAt│                          ┌──────────────┐        ┌──────────────┐ │
  └────────┘                           │    Review    │        │   AuditLog   │ │
                                       │──────────────│        │──────────────│ │
   User 1—* Session (cascade)          │ rating 1..5  │        │ actorId? ────┼─┘
   User 1—* Review (patient side)      │ comment      │        │ action       │
   DoctorProfile 1—* Review (cascade)  │ UNIQUE       │        │ entity/Id    │
   User 1—* AuditLog (actor, optional) │ (doctorId,   │        │ meta (JSON)  │
   User 1—* Appointment (patient, opt) │  patientId)  │        │ createdAt    │
                                       └──────────────┘        └──────────────┘
```

## 2. Models, Field Semantics, and Constraints

### User
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `id` | String (cuid) | PK |
| `email` | String | **UNIQUE** — login identifier |
| `passwordHash` | String | `salt:hash` — scrypt, 16-byte hex salt, 64-byte key (see [security.md](security.md)) |
| `name`, `phone?` | String | Display name; phone optional at registration |
| `role` | String | `PATIENT` \| `DOCTOR` \| `ADMIN` (default `PATIENT`) |
| `status` | String | `ACTIVE` \| `SUSPENDED` — suspended users fail session resolution |
| `createdAt` / `updatedAt` | DateTime | Audit timestamps |

Relations: `doctorProfile?` (1:1), `sessions[]`, `appointments[]` (as patient),
`reviews[]`, `auditLogs[]` (as actor).

### Session
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `token` | String | **UNIQUE** — opaque random UUID v4 (not a JWT) |
| `userId` | String | FK → User, **cascade delete** (deleting a user kills their sessions) |
| `expiresAt` | DateTime | 7-day TTL; expired sessions are rejected and lazily deleted |

`@@index([userId])`.

### Specialty
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `name` | String | **UNIQUE** — English name |
| `nameBn?` | String | Bengali name (e.g. কার্ডিওলজি) for the local market |
| `slug` | String | **UNIQUE** + indexed — used in URLs and API filters |
| `icon?` | String | lucide-react icon name |

### Hospital
Reference entity at MVP (no hospital dashboard/verification yet — Phase 6 deferred).
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `slug` | String | **UNIQUE** |
| `city` | String | indexed — powers city filters |
| `name`, `address?`, `phone?`, `about?` | String | Public info |

### DoctorProfile
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `userId` | String | **UNIQUE** FK → User (1:1), cascade delete |
| `slug` | String | **UNIQUE** — public profile identifier used by the API |
| `bio?`, `photoUrl?` | String | Public marketing content |
| `experienceYears` | Int | default 0 |
| `consultationFee` | Float | BDT — ⚠ Float, see [Float→Decimal](#4-float-to-decimal-migration) |
| `followUpFee` | Float | default 0 |
| `videoConsultFee?` | Float | null = no video pricing |
| `regNumber?` | String | e.g. BMDC registration number (Bangladesh) |
| `verificationStatus` | String | `PENDING` \| `UNDER_REVIEW` \| `VERIFIED` \| `REJECTED` \| `MORE_INFO` (default `PENDING`) — indexed |
| `verificationNote?` | String | Admin note to the doctor (e.g. reason for MORE_INFO) |
| `verifiedAt?` | DateTime | Set when verified; null otherwise |
| `city` | String | indexed — location filter |
| `country` | String | default `"Bangladesh"` — country-extensibility hook |
| `chamberAddress?` | String | Where the doctor practices |
| `languages?` | String | Comma-separated ISO codes, e.g. `"bn,en"` |
| `supportsVideo` | Boolean | default false — **flag only; video calls are NOT implemented (Phase 8)** |
| `requiresApproval` | Boolean | default true — true ⇒ bookings need doctor approval; false ⇒ **instant booking** |
| `hospitalId?` | String | FK → Hospital (affiliation) |

Indexes: `@@index([city])`, `@@index([verificationStatus])` + uniques on `userId`, `slug`.

### DoctorSpecialty (join)
Composite PK `@@id([doctorId, specialtyId])`, cascade deletes on both sides,
`@@index([specialtyId])` (specialty → doctors lookup).

### AvailabilityRule
Weekly recurring availability. **Times are minutes-from-midnight in the clinic’s local
timezone (Asia/Dhaka, UTC+6)**; `dayOfWeek`: 0 = Sunday … 6 = Saturday.

| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `doctorId` | String | FK → DoctorProfile, cascade delete |
| `dayOfWeek` | Int | 0–6 |
| `startMinute` / `endMinute` | Int | e.g. 1020–1260 = 5:00 PM–9:00 PM; slots are generated in 30-min steps inside each window |
| `isActive` | Boolean | default true — soft-disable a window |

Constraints: `@@unique([doctorId, dayOfWeek, startMinute])` (no duplicate windows),
`@@index([doctorId])`.

### Appointment
The correctness-critical table.

| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `referenceCode` | String | **UNIQUE** — guest-friendly code `MB-XXXXXX` (6 chars from an unambiguous alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`); used with phone for guest lookup |
| `doctorId` | String | FK → DoctorProfile |
| `patientId?` | String | FK → User — **null for guest bookings** |
| `patientName`, `patientPhone` | String | Always present (guest-compatible snapshot) |
| `patientAge?`, `patientGender?` | Int / String | `MALE` \| `FEMALE` \| `OTHER` |
| `notes?` | String | Patient’s note for the doctor |
| `slotStart` / `slotEnd` | DateTime | **UTC instants**, 30-minute slot |
| `type` | String | `IN_PERSON` \| `VIDEO` (default `IN_PERSON`) — VIDEO is a *booking flag*; no call system exists yet |
| `status` | String | See [state machine](#31-appointment-state-machine) |
| `bookingMode` | String | `INSTANT` \| `APPROVAL` — snapshot of the doctor’s mode at booking time |
| `fee` | Float | Snapshot of the agreed fee at booking time — ⚠ Float |
| `currency` | String | default `"BDT"` |
| `doctorNote?` | String | Rejection / cancellation reason from the doctor |

**⭐ `@@unique([doctorId, slotStart])` — the database-level double-booking guard.**
One doctor can hold at most **one** appointment per exact slot start, no matter how many
concurrent requests race. The booking flow treats a Prisma `P2002` unique-violation on
this constraint as `SLOT_TAKEN` (HTTP 409). **Frontend “slot taken” flags are advisory
only; this constraint is the enforcement** (master spec: “Never rely on frontend checks
alone to prevent duplicate bookings”).

Indexes: `@@index([patientId])`, `@@index([doctorId, status])`, `@@index([slotStart])`.

### Review
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `rating` | Int | 1–5 |
| `comment?` | String | Free text |
| `doctorId` / `patientId` | String | FKs; **`@@unique([doctorId, patientId])` — one review per patient per doctor** |
| `doctorId` | String | indexed |

Reviews are tied to registered patients only (guests cannot review).

### AuditLog
| Field | Type | Semantics / constraints |
| --- | --- | --- |
| `actorId?` | String | FK → User, optional (system/seed events) |
| `action` | String | e.g. `DOCTOR_VERIFIED`, `APPOINTMENT_CONFIRMED` |
| `entity` / `entityId?` | String | e.g. `DoctorProfile` / profile id — indexed pair |
| `meta?` | String | JSON string with action details |

Indexes: `@@index([entity, entityId])`, `@@index([createdAt])`.

### Country
Country-extensibility reference table (MVP seeds `BD` only).
`code` ISO 3166-1 alpha-2 **UNIQUE**, `name`, `currency` (e.g. `BDT`), `phoneCode`
(e.g. `+880`), `isActive`.

## 3. State Machines

### 3.1 Appointment state machine

```
                      booking created (doctor.requiresApproval = false)
                    ┌───────────────────────────────────────────┐
                    ▼                                           │
              ┌──────────┐        doctor approves               │
   create ───▶│ CONFIRMED│◀───────────────────────────┐         │
   (instant)  └────┬────┘                             │         │
                    │            ┌─────────────────────┴───┐     │
                    │            │  PENDING_APPROVAL       │◀────┘ create (approval mode)
                    │            └──┬──────┬──────┬─────────┘
                    │               │      │      │
   doctor rejects ──┼───────────────┼──────┼──────┼──▶ REJECTED (terminal)
   doctor cancels ──┼──▶ CANCELLED_BY_DOCTOR (terminal, with reason)
                    │
   patient cancels ─┼──▶ CANCELLED_BY_PATIENT (terminal)
                    │
   slot time passes ┼──▶ EXPIRED (terminal; stale PENDING_APPROVAL/CONFIRMED past slot)
                    │
   doctor completes ┴──▶ COMPLETED (terminal; only from CONFIRMED)
```

Statuses (from `src/lib/constants.ts`): `PENDING_APPROVAL`, `CONFIRMED`, `REJECTED`,
`CANCELLED_BY_PATIENT`, `CANCELLED_BY_DOCTOR`, `COMPLETED`, `EXPIRED`.

Rules enforced by the application layer:
- `INSTANT` bookings are created directly as `CONFIRMED`; `APPROVAL` bookings start as
  `PENDING_APPROVAL`.
- Only the owning doctor may `approve` / `reject` / `complete`; only the owning patient
  (session or verified guest) or the doctor may cancel (resulting status records *who*
  cancelled).
- **Slot occupancy** (“blocking”) statuses are `PENDING_APPROVAL`, `CONFIRMED`, and
  `COMPLETED` — a slot occupied by any of these cannot be booked again (independent of
  the unique constraint, which is the final race-safe backstop).

### 3.2 Doctor verification state machine

```
             submit / register
                   │
                   ▼
              ┌─────────┐   admin begins review    ┌──────────────┐
              │ PENDING │─────────────────────────▶│ UNDER_REVIEW │
              └────┬────┘                          └──────┬───────┘
                   │ admin decision                       │ admin decision
                   ▼                                      ▼
        ┌────────────────────┬──────────────┬───────────────────┐
        │      VERIFIED      │   REJECTED   │    MORE_INFO      │
        │ (sets verifiedAt,  │ (terminal at │ (doctor re-submits│
        │  writes AuditLog)  │  MVP)        │  → PENDING again) │
        └────────────────────┴──────────────┴───────────────────┘
```

Rules:
- Only ADMIN decisions change `verificationStatus`; every decision writes an `AuditLog`
  row (auditable per master spec Phase 3 gate).
- **Verification is never automatic** — documents/data submission never marks a doctor
  verified by itself.
- Public search exposes doctors of all statuses but clearly labels verification state;
  the `verified` filter lets patients see verified doctors only.

## 4. Float to Decimal Migration

**Known limitation:** SQLite + Prisma MVP stores money (`consultationFee`, `followUpFee`,
`videoConsultFee`, `Appointment.fee`) as `Float` (IEEE-754 double) — not decimal-safe.

Before real payments (Phase 7) or the PostgreSQL migration:
1. Change the provider to `postgresql` and switch the four money fields to
   `Decimal @db.Decimal(10, 2)`.
2. Backfill/re-validate: run a one-time script checking each fee for float artifacts and
   rounding to 2 decimal places.
3. Keep `currency` paired with every amount (already present: `Appointment.currency`,
   default `BDT`).

This is tracked as a known issue in the [phase report](phases/phase-1-report.md).

## 5. Seeding Policy

`prisma/seed.ts` is **destructive** (wipes all tables) and seeds **fictional demo data
only**:

- 1 country (Bangladesh), **10 specialties**, **4 fictional hospitals** (Greenview,
  Lakeview, Padma City, Uttara Central — all labeled “fictional demo data”),
  **12 fictional doctors** (9 VERIFIED, 2 PENDING, 1 MORE_INFO — BMDC numbers marked
  `(demo)`), 1 admin + 4 demo patients, 4 demo appointments (`MB-DEMO01…04` covering
  pending/confirmed, instant/approval, guest/logged-in, in-person/video-flag), 6 demo
  reviews (marked “(demo review)”).
- Seed-generated future appointment dates are computed relative to *today in Dhaka* so the
  demo always shows bookable upcoming slots.
- The UI labels the environment **“Demo MVP”** (header badge + footer note) and the footer
  states that doctor profiles are sample data, not real people.

**Policy:** never seed real people, real licenses, or real medical claims; never run the
seeder against anything but the local demo database. Run: `bun prisma/seed.ts` after
`bun run db:push`.

## 6. Index Inventory

| Table | Index / constraint | Purpose |
| --- | --- | --- |
| User | `email` UNIQUE | Login lookup |
| Session | `token` UNIQUE | Session resolution (every request) |
| Session | `@@index([userId])` | User → sessions (revoke all) |
| Specialty | `name` UNIQUE, `slug` UNIQUE + index | Uniqueness, slug lookups |
| Hospital | `slug` UNIQUE; `@@index([city])` | Slug lookups; city filter |
| DoctorProfile | `userId` UNIQUE; `slug` UNIQUE | 1:1 user link; public slug |
| DoctorProfile | `@@index([city])` | Location search filter |
| DoctorProfile | `@@index([verificationStatus])` | Admin verification queue |
| DoctorSpecialty | `@@id([doctorId, specialtyId])`; `@@index([specialtyId])` | Join uniqueness; specialty → doctors |
| AvailabilityRule | `@@unique([doctorId, dayOfWeek, startMinute])` | No duplicate weekly windows |
| AvailabilityRule | `@@index([doctorId])` | Slot generation per doctor |
| Appointment | **`@@unique([doctorId, slotStart])`** | **Double-booking guard (correctness)** |
| Appointment | `referenceCode` UNIQUE | Guest lookup |
| Appointment | `@@index([patientId])` | Patient history |
| Appointment | `@@index([doctorId, status])` | Doctor dashboard queues |
| Appointment | `@@index([slotStart])` | Date-range scans / expiry sweeps |
| Review | `@@unique([doctorId, patientId])` | One review per patient per doctor |
| Review | `@@index([doctorId])` | Doctor rating aggregation |
| AuditLog | `@@index([entity, entityId])` | Entity history |
| AuditLog | `@@index([createdAt])` | Chronological admin log |
| Country | `code` UNIQUE | Country reference |

## 7. Time Handling

See the timezone policy in [architecture.md §4](architecture.md#4-timezone-policy). In
short: store UTC, schedule in Dhaka minutes-from-midnight, display via
`Intl.DateTimeFormat("…", { timeZone: "Asia/Dhaka" })`, fixed +6 offset (no DST in
Bangladesh since 2009). DST-observing countries will require a timezone-library rewrite
of `src/lib/time.ts` — a documented, accepted MVP limitation.
