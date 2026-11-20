# Doctor-wise New & Returning Patient Fee System — Design & Implementation

**Status:** IMPLEMENTED (v1, Prisma-backed store)
**Spec source:** Feature Specification — Doctor-wise New & Returning Patient Fee System (user-provided), constrained by `docs/ARCHITECTURE_CORRECTIONS.md`.
**Code map:** `prisma/schema.prisma` (models) · `src/lib/fees/*` (engine) · `src/lib/data/types.ts` + `prisma-store.ts` (persistence contract) · `src/app/api/v1/doctor/fee-settings/*`, `src/app/api/v1/booking/price-preview`, `src/app/api/v1/appointments` (API) · `scripts/verify-fee-system.ts` (verification harness).

---

## 1. Business rules

| Rule | Value / Behavior |
|---|---|
| New patient consultation fee | doctor-configurable, platform default **BDT 1000** |
| Returning patient consultation fee | doctor-configurable, platform default **BDT 600** |
| Returning validity | doctor-configurable duration + unit (**DAYS** or **MONTHS**); UI presets 1/2/3/6/12 months + custom entry |
| Follow-up fee | optional per doctor: enabled/disabled, own fee + own validity (unit DAYS or MONTHS) |
| Classification scope | **per doctor** — never global, never shared across doctors |
| Cross-chamber | a completed visit at **any chamber/location of the same doctor** counts (v1: single chamber; model is location-agnostic by design) |
| Cross-doctor | completed visits with **other doctors never affect** classification |

Validation constraints (server-side, both API and store layers):

- Fees are integers, `0 … 100000` BDT.
- `returningPatientFee ≤ newPatientFee` (returning is a discount by definition).
- If follow-up enabled: `followUpFee ≤ newPatientFee`.
- Returning validity: `1…365` days or `1…36` months. Follow-up validity: `1…90` days or `1…12` months.

## 2. Patient classification — exact semantics

### 2.1 Patient identity key

Classification is keyed on `(doctorId, patient)` where patient is matched by
**account id OR normalized phone** (`patientId == X OR patientPhone == P`).
Rationale: phone-OTP accounts are keyed by phone; guest bookings carry only a
phone; a patient who once booked as a guest and later signs in keeps their
history. Known limitation (documented, by design): two *different* phone
numbers for the same human are treated as two patients ("duplicate accounts"
scenario — tested and pinned in the harness; account merging is an identity-
workstream concern, not a pricing concern).

### 2.2 Qualifying visits (eligibility sources)

Only a **qualifying completed visit** establishes or renews returning-patient
eligibility. A visit qualifies iff, at completion time:

```
appointment.status            = COMPLETED
appointment.consultationStatus = COMPLETED
appointment.paymentStatus      ∈ { NOT_REQUIRED, PAID }   // "unpaid (where payment is required)" never qualifies
```

`CANCELLED_BY_PATIENT / CANCELLED_BY_DOCTOR / REJECTED / EXPIRED / NO_SHOW`
and never-completed appointments produce **no** visit record at all.
The check runs inside the completion transaction and is snapshotted on the
`DoctorPatientVisit` row (`qualifying`, `paymentStatusAtCompletion`), so later
payment-status changes never rewrite history retroactively.

### 2.3 Validity arithmetic — the expiry boundary (normative)

All dates are **Asia/Dhaka calendar dates** (UTC+6, no DST). Timestamps are
stored UTC and converted for arithmetic.

```
anchorDate   = dhakaDate(latestQualifyingVisit.completedAt)
expiryDate   = unit == DAYS   ? addDays(anchorDate, N)          // last eligible day, inclusive
             : /* MONTHS */     addMonthsClamped(anchorDate, N)  // last eligible day, inclusive
eligible(now) = dhakaDate(now) <= expiryDate
```

- **DAYS:** "7-day validity, visit Monday" → eligible **through next Monday**
  (the same weekday N days later), NEW on the following day.
- **MONTHS:** "6-month validity, visit 12 Feb" → eligible **through 12 Aug**
  (same day-of-month N months later), NEW on 13 Aug.
- **Month-end clamping:** anchor 31 Jan + 1 month → expiry **28 Feb** (29 Feb
  in leap years); anchor 30 Jan + 1 month → expiry 28 Feb. The clamped date is
  the *last eligible day*, so short months never steal a day from the patient.
- **Evaluation date** is the Dhaka calendar date of the pricing instant
  (`evaluatedAt`), so a 23:59 vs 00:01 Dhaka booking straddling midnight is
  classified by the *new* day. (Boundary pinned by tests.)

These rules are the single source of truth; the verification harness pins each
boundary explicitly.

### 2.4 Classification precedence

For a booking with doctor D by patient P, evaluated at time T:

1. Load `DoctorFeeSettings` for D (creating platform defaults on first read).
2. Find the latest qualifying visit V for (D, P). If none → **NEW**
   (`NO_PRIOR_COMPLETED_VISIT`).
3. anchorDate/expiryDate as §2.3 from V.
4. If follow-up is enabled for D and T's date ≤ follow-up expiry date →
   **FOLLOW_UP** (`WITHIN_FOLLOW_UP_WINDOW`).
5. Else if T's date ≤ returning expiry date → **RETURNING**
   (`WITHIN_RETURNING_VALIDITY`).
6. Else → **NEW** (`VALIDITY_EXPIRED`).

Fee = `newPatientFee | returningPatientFee | followUpFee` per type. The full
decision basis (rule, visit id, completedAt, anchorDate, expiryDate, evaluatedAt,
feeSettingsVersion, doctorId, patientId) is computed server-side and stored as
the **classification basis**.

## 3. Booking engine contract

1. **The backend decides patient type and fee.** Frontend-submitted fees/types
   are never trusted; at most the client may send an *expectation*
   (`expectedFee`, `expectedPatientType`) which the server compares against its
   own recomputation.
2. **Preview → Confirm:** `POST /api/v1/booking/price-preview` returns the full
   breakdown; `POST /api/v1/appointments` (confirm) recomputes classification
   **at write time**. If the recomputed price/type differs from the client's
   expectation, the server responds `409 PRICE_CHANGED` with the fresh
   breakdown instead of booking at a stale price.
3. **Snapshot on confirmation.** Every appointment stores:
   `patientType`, `fee`, `currency`, `feeSettingsVersion`, `pricingBasis` (JSON),
   `pricedAt`. Later fee-setting changes **never** mutate existing confirmed
   appointments (settings are versioned; history rows are immutable).
4. **Idempotency.** `idempotencyKey` (unique). A retried submit with the same
   key replays the original appointment (`idempotentReplay: true`) instead of
   double-booking.
5. **Concurrency.** The `@@unique([doctorId, slotStart])` constraint is the
   authoritative guard — concurrent requests for the same slot produce exactly
   one winner (`409 SLOT_TAKEN` for the loser). Verified by racing parallel
   requests in the harness.
6. **Duplicate patient bookings.** A patient cannot hold two active bookings
   for the same doctor+slot (slot guard). Same patient, same doctor, different
   slots: allowed (genuine repeat visits are legitimate); same-slot double
   submits without an idempotency key lose to the slot guard.

## 4. Status model (corrections doc #12)

Four independent axes on `Appointment`:

| Axis | Field | Values | Notes |
|---|---|---|---|
| Booking | `status` | `PENDING_APPROVAL · CONFIRMED · REJECTED · CANCELLED_BY_PATIENT · CANCELLED_BY_DOCTOR · COMPLETED · NO_SHOW · EXPIRED` | `NO_SHOW` added by this feature |
| Payment | `paymentStatus` | `NOT_REQUIRED · PENDING · PAID · REFUNDED` | `NOT_REQUIRED` while payments module is disabled (pay at chamber) |
| Consultation | `consultationStatus` | `NOT_STARTED · COMPLETED · NOT_HELD` | set with booking status on complete / no-show |
| Refund | `refundStatus` | `NONE · REQUESTED · PROCESSED` | dormant until payments module is approved (correction #13) |

Completion (`POST .../complete`) runs as ONE transaction: sets
`status=COMPLETED`, `consultationStatus=COMPLETED`, and upserts the
`DoctorPatientVisit` row with the qualifying flag (§2.2). No-show
(`POST .../no-show`) sets `status=NO_SHOW`, `consultationStatus=NOT_HELD` and
records **no** visit.

## 5. Data model

- `DoctorFeeSettings` — current config per doctor; `version` increments on every change.
- `DoctorFeeHistory` — immutable one-row-per-version audit of settings; written in the same transaction as the update.
- `DoctorPatientVisit` — `doctor_patient_history`: materialized per-(doctor,patient) visit rows; unique on `appointmentId`; indexed on `(doctorId, patientId, qualifying)` and `(doctorId, patientPhone, qualifying)`.
- `Appointment` — snapshot fields (§3.3) + status axes (§4) + `idempotencyKey`.

Keeping `DoctorProfile.consultationFee` in sync: updating fee settings also
writes `consultationFee = newPatientFee` and
`followUpFee = followUpEnabled ? followUpFee : 0` on the profile, so search,
cards and admin surfaces keep working unchanged. The authoritative pricing
source is always `DoctorFeeSettings`.

## 6. API surface

All endpoints are authenticated unless marked guest-eligible. Standard
envelope `{ ok, data | error }` (`src/lib/api.ts`).

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/v1/doctor/fee-settings` | DOCTOR | own settings (auto-created with defaults) |
| `PUT /api/v1/doctor/fee-settings` | DOCTOR | update (validates §1; bumps version; writes history + audit log) |
| `GET /api/v1/doctor/fee-settings/history` | DOCTOR | versioned history, newest first |
| `POST /api/v1/booking/price-preview` | guest-eligible | classification + price breakdown for `{doctorSlug, patientPhone}` |
| `POST /api/v1/appointments` | guest-eligible | booking with server-side classification, snapshot, idempotency, `409 PRICE_CHANGED` |
| `POST /api/v1/appointments/[id]/complete` | DOCTOR (owner) | complete + record visit (one transaction) |
| `POST /api/v1/appointments/[id]/no-show` | DOCTOR (owner) | no-show (no eligibility) |
| `GET /api/v1/doctor/patients/visits?phone=` | DOCTOR (owner) | one patient's visit history **with this doctor only** |

Authorization rules:

- Doctors read/write **only their own** fee settings and see visit history
  **only for their own** appointments (query is scoped by `doctorId` — another
  doctor's history is unreachable, not merely hidden in the UI).
- Patients see **only their own** appointments (`listAppointmentsByPatient` on
  the session user) and their own visit summary within those appointments.
- Every fee-setting change writes an audit log row (`FEE_SETTINGS_UPDATED`)
  with before/after.

## 7. Store gating (residency, corrections #5/#6/#18)

The fee module — and therefore booking — is **enabled only on the Prisma-backed
store**. In Firestore mode, fee store methods throw `FeeModuleUnavailableError`
and booking returns `503 MODULE_DISABLED`, because storing Bangladeshi patient
visit history in a foreign region requires the Phase 0 residency decision
first. This is the corrections doc's "eligibility control" applied literally:
the module cannot run in an unapproved region by accident.

## 8. Verification matrix (required tests → harness cases)

`scripts/verify-fee-system.ts` (run: `bun run verify:fees`) pins every scenario
from the specification. Each case creates isolated fixtures (its own doctor /
patients / visits), asserts, and cleans up.

| # | Required test | Harness case |
|---|---|---|
| 1 | first visit | no history → NEW @ newPatientFee |
| 2 | returning visit | completed visit inside validity → RETURNING @ returningPatientFee |
| 3 | expiry | completed visit past expiry → NEW |
| 4 | custom day duration | 7-DAY validity; day-7 = RETURNING, day-8 = NEW |
| 5 | calendar-month duration | 6-MONTH validity; same-date-next-months = RETURNING, +1 day = NEW |
| 6 | different doctors | visit with doctor A does not affect doctor B classification |
| 7 | multiple chambers | visits recorded across the doctor's locations all count (v1: same doctor scope) |
| 8 | cancelled appointments | cancelled visit → no eligibility |
| 9 | no-show appointments | no-show → no eligibility |
| 10 | completed visits | completion creates the qualifying visit (renews anchor) |
| 11 | fee changes after booking | confirmed appointment keeps fee + version snapshot after settings change |
| 12 | duplicate accounts | same phone different account → still RETURNING (phone match); different phone → NEW (documented limitation) |
| 13 | concurrent bookings | two parallel confirms, one slot → exactly one succeeds |
| 14 | timezone boundaries | 18:30Z completion (00:30 next day Dhaka) anchors on the Dhaka date; month-end clamping (31 Jan + 1 month → 28/29 Feb) |
| 15 | unpaid visits | completed-but-unpaid (payment required) → non-qualifying visit recorded |
| 16 | price revalidation | stale `expectedFee` → `409 PRICE_CHANGED`, no booking created |
| 17 | idempotency | same `idempotencyKey` retried → same appointment, no duplicate |
| 18 | fee history | settings updates append immutable versioned history rows |

Additionally, end-to-end booking through the running dev server is exercised
via Agent Browser (preview → confirm → complete → returning re-classification).

## 9. Out of scope (explicit)

- Online payment collection, custody, split settlement, wallets (correction #13 — blocked).
- Multi-location schedules with per-location capacity (workstream 3; classification already location-agnostic).
- Account merging / cross-phone identity resolution.
- Applying fees to VIDEO appointments (telehealth module disabled).
