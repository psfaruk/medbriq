# Find Medi Doctor — Devil's Advocate Architecture Corrections: Review & Disposition

**Status:** REVIEWED & ADOPTED — implementation plan corrected accordingly
**Date:** 2026-02 (supersedes the original 12-phase rollout plan)
**Reviewer:** Platform architecture review (Devil's Advocate session)
**Scope:** All engineering workstreams. **No regulated clinical service may ship before the gates defined here.**

---

## 0. Executive summary

The original 12-phase plan assumed a global healthcare deployment with telehealth,
payments, and multi-platform clients built by ten parallel agents. The Devil's
Advocate review rejects those assumptions. The corrected plan:

1. Introduces **Phase 0 — Market Validation & Regulatory Feasibility** as a hard
   gate before any patient-facing launch.
2. Re-scopes the MVP to **verified doctor discovery + reliable physical
   appointment booking** (the two modules with the clearest legal footing in
   Bangladesh).
3. Splits Doctor Discovery, Appointment Marketplace, and Telehealth into
   **independent modules with feature flags and eligibility controls**.
4. Replaces ten overlapping agents with **four coordinated engineering
   workstreams**.
5. Defers payments custody, split settlement, platform wallets, and telehealth
   until legal/regulatory approval is explicitly granted (corrections #13, #14, #18).

The first feature delivered under the corrected plan is the **Doctor-wise New &
Returning Patient Fee System** (see `docs/FEE_SYSTEM.md`), because fee
classification is a prerequisite for correct booking pricing. It is implemented
with the module boundaries, feature flags, separated status machines, and
snapshot-based pricing that the corrections demand.

---

## 1. Point-by-point disposition

### #1 — Global deployment is not legally permitted everywhere → **ACCEPTED**

- **Correction:** Do not assume global healthcare deployment is legally permitted in every country.
- **Disposition:** The original architecture docs described Find Medi Doctor as a "Global
  Doctor Discovery & Healthcare Platform." That framing is retired.
- **Action taken:**
  - Initial market is **Bangladesh only**. The `Country` model remains (BD active),
    but no other country is enabled and no cross-border flows are exposed.
  - Every doctor profile carries `country` (default `Bangladesh`); discovery is
    scoped to enabled countries in the data layer.
  - Expansion requires a per-country feasibility checklist (licensing, data
    residency, language, payments) signed off before the country flag flips.

### #2 — Separate Discovery / Marketplace / Telehealth modules → **ACCEPTED**

- **Correction:** Separate Doctor Discovery, Appointment Marketplace, and Telehealth Clinical Services into independent modules with separate feature flags and eligibility controls.
- **Disposition:** Implemented as module flags in `src/lib/modules.ts`:
  | Module | Flag | State | Rationale |
  |---|---|---|---|
  | Doctor Discovery | `doctorDiscovery` | **ENABLED** (BD only) | Directory/search of BMDC-registered doctors; lowest regulatory risk |
  | Appointment Marketplace (physical booking) | `appointmentBooking` | **ENABLED** (BD, Prisma-backed store only) | Booking for in-person chamber visits |
  | Telehealth Clinical Services | `telehealth` | **DISABLED — Phase 0 gate** | Requires DGHS/BMDC telemedicine compliance (see §2) |
  | Online payments / custody | `payments` | **DISABLED** | Requires legal + PSP approval (correction #13) |
- **Eligibility controls:** module flags are evaluated server-side per request;
  disabled modules return `503 MODULE_DISABLED` with the gate reason — never a
  silent 404. A disabled module's API surface, UI entry points, and background
  jobs are all gated from the single flag definition.

### #3 — Bangladesh-specific legal feasibility before telemedicine → **ACCEPTED**

- **Correction:** Conduct Bangladesh-specific legal and regulatory feasibility research before enabling telemedicine.
- **Disposition:** Telehealth module stays disabled. The Phase 0 research
  checklist (§2 below) must be completed and signed off by a qualified advisor
  before the `telehealth` flag can be enabled. No telehealth UI, no video
  consultation booking, no remote prescription features ship until then.
  (`Appointment.type=VIDEO` remains disabled via the module flag even though the
  data model supports it.)

### #4 — Review DGHS/BMDC guidelines, licensing, residency, cross-border rules → **ACCEPTED (research plan)**

- **Correction:** Review the DGHS National Telehealth Guidelines, BMDC Telemedicine Guidelines, licensing requirements, data residency requirements, and cross-border consultation restrictions.
- **Disposition:** A structured research dossier is opened as a Phase 0
  deliverable. Known instruments to review (with counsel; items marked ⚠ are
  unverified placeholders pending legal review — the engineering team does not
  treat this list as legal advice):
  1. **DGHS National Telehealth Guidelines** (operating model for telehealth
     services in Bangladesh; issued in the COVID-19 period ⚠ verify current
     revision).
  2. **BM&DC / BMDC telemedicine practice guidance** and the BM&DC registration
     verification pathway (already used by our doctor verification flow via
     `regNumber`).
  3. **Licensing requirements** for a platform intermediary vs. a healthcare
     provider — determines whether Find Medi Doctor may schedule clinical consultations
     at all, or only chamber bookings.
  4. **Data residency:** Bangladesh has no single comprehensive data-protection
     statute in force equivalent to the EU GDPR at the time of writing ⚠
     (the draft Personal Data Protection Act and the Digital Security Act 2018
     must be reviewed by counsel). Until the review completes, **no Bangladeshi
     patient data may be stored outside Bangladesh unless explicitly permitted**
     (see #5).
  5. **Cross-border consultation restrictions:** whether a doctor registered in
     Bangladesh may consult a patient located abroad (and vice versa) — affects
     every future "global" feature.
- **Deliverable:** `docs/regulatory/phase-0-research.md` (to be authored with
  counsel). Telehealth flag cannot flip without it.

### #5 — Country-specific data residency → **ACCEPTED**

- **Correction:** Do not store Bangladeshi medical or patient data in a foreign region unless the applicable requirements explicitly permit it.
- **Disposition:** This materially changes the hosting design:
  - The prior plan's default production path stored **all** data (including
    patient visit history) in a Firebase project in a foreign region. That path
    is **frozen pending the #4 review**.
  - The fee/booking module (which contains patient visit history — sensitive
    health-adjacent data) is implemented **only on the Prisma-backed store**.
    In Firestore mode the fee module methods throw
    `FeeModuleUnavailableError` and the booking API returns
    `503 MODULE_DISABLED` with the residency-gate reason (correction #2's
    eligibility control applied to data residency).
  - Production residency target: PostgreSQL hosted in a region that satisfies
    the Phase 0 legal review (Bangladesh-hosted or counsel-approved
    alternative), with documented backup locations.
  - `docs/costs.md` and `docs/database.md` are updated to reflect that the
    free-tier/foreign-region path is a **dev/demo path only**, not a production
    path.

### #6 — Free tiers are not production-grade for healthcare → **ACCEPTED**

- **Correction:** Do not assume Vercel Hobby or free-tier managed databases are suitable for commercial healthcare production. Check terms, data processing, backup, residency, and security requirements.
- **Disposition:**
  - The sandbox/demo runs on the dev stack (SQLite + local Next.js). This is
    explicitly labeled **Demo MVP** in the UI.
  - The production hosting budget (correction #17) assumes **paid tiers with a
    signed Data Processing Agreement**, SLA-backed backups (PITR), audit
    logging, and SSO. Free-tier terms (non-commercial clauses, no DPA, no
    backup guarantees) disqualify them for production.
  - A go-live checklist item exists: "paid tier + DPA confirmed" — tracked in
    `docs/costs.md`.

### #7 — MVP = verified discovery + reliable physical booking → **ACCEPTED**

- **Correction:** Build the initial MVP around verified doctor discovery and reliable physical appointment booking.
- **Disposition:** This is now the MVP definition. Delivered scope:
  - Verified doctor discovery (BMDC reg number, admin verification workflow,
    verification badges — existing).
  - Physical chamber appointment booking with slot engine, approval modes,
    status machine — existing.
  - **New:** doctor-wise New/Returning patient fee classification integrated
    into booking (the feature spec in `docs/FEE_SYSTEM.md`) — pricing is part
    of "reliable booking."
- Out of MVP: telehealth, payments custody, wallets, cross-border, mobile apps.

### #8 — One patient app + responsive web dashboards → **ACCEPTED**

- **Correction:** Use one Patient Flutter application and responsive web dashboards initially. Avoid unnecessary duplicate applications.
- **Disposition:** The `apps/patient-mobile` and `apps/doctor-mobile`
  placeholders are consolidated: **one patient-facing experience**. For this
  milestone the patient experience is the responsive web app (single `/` route,
  mobile-first). A doctor-facing responsive web dashboard exists
  (`doctor-dashboard` view). Native mobile shells are deferred until the web
  flows are validated; the plan keeps **at most one patient app** when that
  time comes — no duplicate per-role apps.

### #9 — Redis optional until justified → **ACCEPTED**

- **Correction:** Keep Redis optional until actual technical requirements justify it.
- **Disposition:** No Redis. Caching is in-process memory only; slot
  availability is computed from the database on demand with unique-constraint
  guards. Revisit only with measured contention evidence.

### #10 — Booking on transactions, constraints, idempotency, concurrency tests → **ACCEPTED**

- **Correction:** Build booking using database transactions, database constraints, idempotency, and concurrency tests.
- **Disposition (implemented in this milestone):**
  - **Database constraint:** `@@unique([doctorId, slotStart])` remains the
    authoritative double-booking guard.
  - **Idempotency:** `Appointment.idempotencyKey` (unique, nullable) —
    duplicate submits with the same key replay the original appointment
    instead of creating a second one.
  - **Transactions:** fee snapshotting is revalidated at write time; on the
    Prisma store, appointment completion + visit-history recording run in a
    single interactive transaction (`completeAppointment`).
  - **Concurrency tests:** the verification harness
    (`scripts/verify-fee-system.ts`) fires concurrent booking requests for the
    same slot and asserts exactly one wins.
  - **Portability note:** production target is PostgreSQL (row-level locks,
    `SERIALIZABLE` where needed); SQLite's single-writer model provides
    serialization locally. Documented in `docs/FEE_SYSTEM.md`.

### #11 — Doctor→location relations, location schedules, exceptions, capacity, timezone-aware availability → **PARTIALLY ACCEPTED (phased)**

- **Correction:** Implement doctor-to-location relationships, location-specific schedules, exceptions, capacity, and timezone-aware availability.
- **Disposition:** The current model keeps a single chamber per doctor
  (`chamberAddress`, `hospital` affiliation) with weekly availability rules in
  **Asia/Dhaka local minutes** (timezone-aware, UTC+6, no DST — correct for
  Bangladesh). Multi-chamber support (doctor→many locations, per-location
  schedules, exceptions/blocks, per-slot capacity) is a designed-but-deferred
  workstream; the fee system already treats "any chamber of the same doctor" as
  one history scope (per the fee spec), so multi-chamber won't fragment patient
  classification when it lands. Full scheduling upgrade is tracked as
  Workstream 3 (see §3).

### #12 — Separate booking / payment / consultation / refund status → **ACCEPTED**

- **Correction:** Separate booking status, payment status, consultation status, and refund status.
- **Disposition (implemented):** `Appointment` now carries four independent
  status fields (see `docs/FEE_SYSTEM.md` §Status model):
  | Field | Values |
  |---|---|
  | `status` (booking lifecycle) | `PENDING_APPROVAL · CONFIRMED · REJECTED · CANCELLED_BY_PATIENT · CANCELLED_BY_DOCTOR · COMPLETED · NO_SHOW · EXPIRED` |
  | `paymentStatus` | `NOT_REQUIRED · PENDING · PAID · REFUNDED` |
  | `consultationStatus` | `NOT_STARTED · COMPLETED · NOT_HELD` |
  | `refundStatus` | `NONE · REQUESTED · PROCESSED` |
  - `NO_SHOW` is added to the booking status machine (needed by the fee
    eligibility rules).
  - With payments module disabled, `paymentStatus` is `NOT_REQUIRED`
    (pay-at-chamber) at booking; the fields exist so the payment workstream
    never has to migrate the status machine again.

### #13 — No payment custody / split settlement / wallet without approval → **ACCEPTED**

- **Correction:** Do not implement payment custody, split settlement, or platform wallet functionality without appropriate legal and payment-provider approval.
- **Disposition:** No custody, no escrow, no wallet, no split settlement code.
  The existing "platform commission" figures in dashboards are **simulated
  reporting arithmetic only** (labeled as such); no funds ever flow through the
  platform. Bangladesh Bank / PSP approval requirements are a Phase 0 research
  item before any real payment integration.

### #14 — Managed video infrastructure for the first telehealth pilot → **ACCEPTED (deferred with the module)**

- **Correction:** Use managed video infrastructure for the first authorized telehealth pilot.
- **Disposition:** Recorded as a hard design constraint for the eventual pilot:
  no self-hosted SFU/WebRTC mesh in v1; the pilot must use a HIPAA/ISO-27001
  -class managed provider with recording-consent flows and Bangladesh data
  residency terms reviewed under #5. No code exists for this yet (module
  disabled).

### #15 — Four coordinated workstreams instead of ten agents → **ACCEPTED**

- **Correction:** Start with four coordinated engineering workstreams instead of ten agents making overlapping changes.
- **Disposition:** The reorganization is in §3. Workstream leads own their
  surface; cross-workstream changes go through the shared contracts
  (`src/lib/data/types.ts`, `docs/api.md`).

### #16 — Phase 0: Market Validation & Regulatory Feasibility → **ACCEPTED**

- **Correction:** Introduce a Phase 0 before Phase 1.
- **Disposition:** Phase 0 is defined (§2) and gates all regulated launches.
  Engineering proceeds in parallel only on non-regulated surfaces (discovery,
  booking reliability, fee system) which are explicitly permitted MVP scope.

### #17 — Cost monitoring, backup testing, DR, production budget → **ACCEPTED (runbook started)**

- **Correction:** Implement cost monitoring, backup testing, disaster recovery, and a production hosting budget.
- **Disposition:** `docs/costs.md` carries the production budget skeleton
  (paid app hosting + managed PostgreSQL with PITR + object storage + SMS/OTP +
  error monitoring, monthly BDT/USD estimates). Backup/DR drills and budget
  alerts are launch-checklist items; the checklist lives in
  `docs/OPERATIONS.md` (started with this correction).

### #18 — Human approval gates → **ACCEPTED**

- **Correction:** Require human approval before enabling any regulated clinical service or launching production.
- **Disposition:** Two hard gates are now defined:
  1. **Regulated-service gate:** flipping `telehealth` (or `payments`) from
     disabled→enabled requires (a) the Phase 0 research dossier, (b) counsel
     sign-off, (c) a recorded human approval (audit-logged
     `MODULE_ENABLED` action naming the approver). The flag file
     (`src/lib/modules.ts`) documents this contract.
  2. **Production-launch gate:** the go-live checklist in
     `docs/OPERATIONS.md` (paid tier + DPA, backups tested, monitoring,
     residency decision, verification workflow staffed) requires a recorded
     human sign-off before the production deploy is considered "live."

---

## 2. Phase 0 — Market Validation & Regulatory Feasibility (gate)

**Objective:** establish, with evidence, what Find Medi Doctor may legally operate in
Bangladesh before any regulated feature ships.

Work items (owner: founding team + counsel; engineering supports with data):

1. **Regulatory dossier** — DGHS National Telehealth Guidelines, BMDC
   telemedicine guidance, intermediary-vs-provider licensing analysis (#4).
2. **Data protection & residency opinion** — applicable Bangladeshi law ⚠,
   storage-region decision, cross-border transfer position (#5).
3. **Payments feasibility** — Bangladesh Bank / PSP requirements for
   aggregation vs. custody; bKash/Nagad/SSLCommerz integration prerequisites
   (#13).
4. **Market validation** — doctor-side interviews (chamber booking pain,
   fee-structure expectations incl. new/returning fees), patient-side
   interviews (discovery trust, payment expectations), pricing sensitivity.
5. **Verification workflow staffing** — BMDC credential verification SLA
   (who checks, how fast, what evidence is retained).
6. **Go/no-go memo** — signed human approval for the MVP launch scope (#18).

**Exit criteria:** dossier complete; residency decision recorded; go/no-go
signed. Only then may the production launch checklist run.

---

## 3. Corrected delivery organization — four coordinated workstreams

| # | Workstream | Owns | Current milestone deliverables |
|---|---|---|---|
| 1 | **Core Platform & Discovery** | auth (phone OTP, Google, credentials), users, doctor profiles, verification workflow, search, specialties, hospitals | Hardening + verification SLA; fee structure surfaced on doctor cards/profiles |
| 2 | **Booking Engine & Fees** | slot engine, appointment status machine, doctor-wise fee system, patient classification, pricing snapshots, visit history | **Doctor-wise New & Returning Patient Fee System** (this milestone — `docs/FEE_SYSTEM.md`), idempotency, `NO_SHOW`, separated status fields |
| 3 | **Scheduling & Locations** | doctor→location model, per-location schedules, exceptions, capacity, multi-chamber | Design doc + phased schema (depends on #11 disposition) |
| 4 | **Compliance & Infrastructure** | module flags & eligibility controls, data residency, backups/DR, cost monitoring, audit trail, launch checklist | `src/lib/modules.ts`, this document, `docs/OPERATIONS.md`, `docs/costs.md` updates |

Cross-cutting rule: **no workstream enables a module flag on its own** (#18).

---

## 4. What this means for the already-built platform

The discovery/booking/auth foundation built under the original plan remains —
it matches the corrected MVP scope (#7). Changes made by this correction:

1. `src/lib/modules.ts` (new) — module flag registry + eligibility control.
2. Booking + fee system bound to the Prisma-backed store only (residency gate).
3. `NO_SHOW` + payment/consultation/refund status fields on appointments (#12).
4. Firestore production path frozen (dev/demo only) until Phase 0 residency
   decision (#5, #6).
5. `apps/doctor-mobile` consolidated away; one patient experience (#8).
6. This document + `docs/FEE_SYSTEM.md` + `docs/OPERATIONS.md` as the
   governance baseline.

---

## 5. Standing rules (extracted from the review)

1. A module disabled by flag stays fully disabled — API, UI, jobs — and
   answers with the gate reason.
2. No Bangladeshi patient data leaves the approved region without a recorded
   residency decision.
3. No funds flow through the platform. Ever, until #13 approvals exist.
4. Prices are computed, validated, and snapshotted server-side; the client is
   never trusted (#10, fee spec).
5. Every status transition that affects money or eligibility writes an audit
   log entry.
6. Human approval is a release artifact, not a conversation.
