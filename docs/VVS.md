# Verified Visit System (VVS)

Two-part printable A4 appointment forms + QR-based digital visit
verification for Find Medi Doctor. The **digital record is the source of truth**;
the paper form is a chamber convenience (final recommendation #1).

## Workflow

1. Patient books (existing v1 engine, untouched) → appointment CONFIRMED.
2. Patient opens the appointment → **two-part A4 form** (print or PDF).
   Both parts (PATIENT COPY upper, DOCTOR COPY lower, perforation between)
   carry the SAME appointment reference, QR and manual code.
3. At the chamber the doctor (or Mode C staff) **checks in** the patient,
   **scans the QR** (or enters reference + manual code), reviews the booking
   details and **marks the visit completed**.
4. Backend validates ownership (assigned doctor / authorized staff), chamber
   authorization, status and the credential, then — in one flow — completes
   the appointment through the SAME store method the legacy v1 "complete"
   uses (fee-eligibility visit row included) and creates the immutable
   `CompletedVisit` + receipt number.
5. Under **Mode B** the patient confirms in their app or with a one-time
   6-digit code (delivered only to the patient's notification). Both doctor
   and patient see the state; either can spot a wrong record, and the
   patient can file a **dispute**.
6. Admins resolve disputes: **dismiss** (visit stands) or **correct**
   (visit preserved + marked CORRECTED, appointment reverted to CONFIRMED so
   the doctor re-completes properly). Nothing is silently deleted.

## Data model (prisma/schema.prisma)

| Table | Purpose |
|---|---|
| `AppointmentVerification` | One credential per appointment: serial number, QR token + manual code (sha256 hashes + AES-256-GCM ciphertext for re-download), status ACTIVE/USED/REVOKED, check-in time, policy snapshot |
| `AppointmentDocument` | Append-only issuance log (PRINT/PDF, language, actor) |
| `CompletedVisit` | The permanent visit record: fee/doctor/chamber snapshot frozen at completion, receipt number, verification method, confirmation state, correction state |
| `PatientVisitConfirmation` | Mode B one-time code (hashed, 24 h expiry, max 5 attempts, single use) |
| `VisitDispute` | Patient dispute + admin resolution (audited) |

VVS tables intentionally carry **no FK to `Appointment`**: appointments live
in whichever store the booking engine uses (`getStore()` — Prisma locally,
Firestore in the frozen production path), so VVS rows reference the stable
logical id and keep their own receipt snapshots.

## Security properties

- QR payload = `MBVVS1|<MB-ref>|<24-char token>|<HMAC-SHA256 sig>`. Signature
  key: `VVS_SIGNING_SECRET` (env; a stable derived fallback exists for dev —
  production MUST set a real secret). No patient data in the payload.
- Tokens/manual codes stored as sha256 hashes; raw values sealed with
  AES-256-GCM so **re-downloads return the same credential** (a lost form
  can be reprinted without creating a new appointment or invalidating
  earlier prints).
- Serial numbers are chamber-scoped ranks (recommendation #3) and are never
  secrets.
- Completion is **idempotent** (unique appointmentId), single-use
  (credential burned to USED), ownership-checked (assigned doctor; Mode C
  adds affiliated-hospital staff with audit), chamber-checked, and
  time-checked (never a future slot; reference-only completion requires the
  slot to have started).
- Rate limits: public verify 10/min/IP, verify 30/min/user, document
  downloads 20/min/user, confirmation code 5 attempts.
- Every action appends to `AuditLog` (VVS_* actions), including failures.
- `GET /api/v2/vvs/status` and receipts are only visible to the patient
  owner, assigned doctor, authorized staff or admin.

## API surface (/api/v2/vvs)

```
GET  settings · status/:id · receipt/:id · doctor/today · doctor/visits
     patient/visits · disputes
POST document · verify · check-in/:id · complete/:id
     patient-confirmation/:id · dispute · disputes/:id/resolve
     settings · public-verify
```

## Known residual risks (honest limitations)

- VVS does NOT make fraud impossible: a doctor who saw the patient's form
  (or is the assigned doctor using reference completion after identity
  checks) can complete a visit the patient disputes — that is what the
  dispute workflow and audit trail are for.
- A stolen printed form can be presented at the chamber; the doctor's
  identity check (name/phone/age on the form vs. the person) is the control.
- Camera-less verification falls back to the manual code — the same code is
  printed on both halves, so possession of either copy suffices.
- Offline mode is NOT supported: verification requires the backend. The UI
  never claims server-side verification succeeded without the server.
- Production on Vercel requires a persistent `DATABASE_URL` (see the P0-2
  data-layer note in DEPLOYMENT-VERCEL.md) — the Vercel /tmp SQLite file
  loses VVS records on cold start.
- Country-specific record retention & privacy rules must be finalized
  before production (the Doctor Copy's retention follows the institution's
  approved policy).
