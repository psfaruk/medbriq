# Medbriq — REST API v1 Reference

Base URL (dev): `http://localhost:3000/api/v1`

> **Contract status:** this document is the authoritative contract for `/api/v1`.
> DTO shapes mirror [`src/lib/types.ts`](../src/lib/types.ts) and
> [`prisma/schema.prisma`](../prisma/schema.prisma). Endpoint handlers live in
> `src/app/api/v1/**`; implementation status per endpoint is tracked in the
> [phase report](phases/phase-1-report.md). If an implementation detail legitimately
> diverges from this document, **update this document in the same PR**.

## 1. Response Envelope

Every endpoint returns JSON with a single envelope:

```jsonc
// success
{ "ok": true, "data": { ... } }

// failure
{ "ok": false, "error": { "message": "human-readable", "code": "MACHINE_CODE" } }
```

- Success HTTP status is `200` (or `201` on creation).
- On failure, `code` is a stable machine code (see [§5 Error codes](#5-error-codes));
  when no specific code applies, the fallback is `HTTP_<status>` (e.g. `HTTP_400`).
- Unexpected server errors return `500` with `code: "INTERNAL_ERROR"` and are logged
  server-side (`[medbriq-api]` prefix).

## 2. Authentication

- **Mechanism:** cookie session. `POST /auth/login` (and `/auth/register`) set an
  **httpOnly** cookie `medbriq_session` containing an opaque token (random UUID) stored
  in the `Session` table. No JWTs; sessions are re-validated against the DB on every
  request, so logout/revocation is immediate. TTL: 7 days.
- **Roles (RBAC):** `PATIENT`, `DOCTOR`, `ADMIN` — see the [matrix](#4-rbac-matrix).
- **Guests:** doctor search, doctor profiles, slots, reviews, and **booking** are public;
  guest bookings are tracked by the returned `referenceCode` (`MB-XXXXXX`) + the phone
  number used at booking.
- Send the cookie with every authenticated request (browser `fetch` does this
  automatically with `credentials: "same-origin"`).

```bash
# login and keep the session cookie in a jar
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@medbriq.dev","password":"Patient@123"}'
```

## 3. Endpoints

### 3.1 Authentication

#### `POST /auth/register` — create an account (public)
Registers a patient or a doctor (doctors start `PENDING` verification and must be
approved by an admin before appearing as verified).

Body:
```jsonc
{
  "role": "PATIENT",              // "PATIENT" | "DOCTOR"
  "name": "Rahim Uddin",          // required
  "email": "rahim@example.com",   // required, unique
  "password": "…",                // required (min length enforced by zod validation)
  "phone": "+880…",               // optional
  // doctor-only fields (required when role=DOCTOR):
  "city": "Dhaka",
  "regNumber": "BMDC-A-123456",
  "specialtySlugs": ["medicine-diabetology"],
  "experienceYears": 5,
  "consultationFee": 800,
  "chamberAddress": "…"
}
```
Responses: `201` `{ user: SessionUser }` (also sets the session cookie) ·
`409 EMAIL_TAKEN` · `400 VALIDATION_ERROR` · `429 RATE_LIMITED` (abuse protection).

#### `POST /auth/login` — log in (public, rate-limited)
Body: `{ "email": "…", "password": "…" }`
Responses: `200` `{ user: SessionUser }` + cookie · `401 INVALID_CREDENTIALS`
(identical response for unknown email and wrong password — no account enumeration) ·
`429 RATE_LIMITED`.

#### `POST /auth/logout` — log out (any authenticated session)
Deletes the server-side session row and clears the cookie. Response: `200` `{ success: true }`.

#### `GET /auth/me` — current session
Responses: `200` `{ user: SessionUser }` · `401 UNAUTHORIZED` (no/invalid session — the
SPA treats this as “guest”).

#### `PATCH /auth/me` — update own profile (authenticated)
Body: `{ "name": "…", "phone": "+8801…" }` (both optional; `phone: null` or `""` clears it).
Responses: `200` `{ user: SessionUser }` · `400 VALIDATION_ERROR` (non-BD phone) ·
`409 PHONE_TAKEN`.

#### `POST /auth/password` — set or change password (authenticated)
Body: `{ "currentPassword": "…", "newPassword": "…" }`. `currentPassword` is required
when the account already has a password; Google/phone accounts without one may set a
password directly. Responses: `200` `{ changed: true }` · `401 INVALID_CREDENTIALS`.

**SessionUser** (shared shape):
```jsonc
{
  "id": "…", "name": "…", "email": "…",
  "role": "PATIENT",            // PATIENT | DOCTOR | ADMIN
  "doctorSlug": "dr-ayesha-rahman",  // null unless DOCTOR
  "verificationStatus": "VERIFIED",  // null unless DOCTOR
  "phone": "+8801712345678",          // null when unset
  "phoneVerified": true,              // true after an OTP flow
  "provider": "credentials",          // credentials | google | phone
  "avatarUrl": null                    // Google profile picture when present
}
```

#### `GET /auth/config` — available sign-in methods (public)
Response: `200` `{ googleEnabled, googleClientId, phoneOtpEnabled, devOtpMode }`.
`devOtpMode` is true while `SMS_PROVIDER=console` (no SMS provider wired) — OTP codes are
then returned in API responses and shown in the UI, clearly labeled as dev mode.

#### `POST /auth/otp/request` — request a login code (public, rate-limited)
Body: `{ "phone": "01XXXXXXXXX" }` — BD numbers are normalized to `+8801XXXXXXXXX`.
Responses: `202` `{ sent: true, expiresInSeconds: 300, devCode? }` (`devCode` only in
dev mode) · `400 VALIDATION_ERROR` · `429 RATE_LIMITED` (3 requests / 10 min / phone).

#### `POST /auth/otp/verify` — verify the code and sign in (public)
Body: `{ "phone": "…", "code": "123456", "name": "optional for new accounts" }`.
Creates a PATIENT account on first use (synthetic email `p_<phone>@phone.medbriq.dev`,
provider `phone`, `phoneVerified: true`). Responses: `200` `{ user: SessionUser,
isNewAccount }` · `400 INVALID_CODE` (message includes remaining attempts) ·
`429 TOO_MANY_ATTEMPTS` (5 attempts / code) · `403 ACCOUNT_SUSPENDED`.

#### `POST /auth/google` — Google Sign-In (public)
Body: `{ "credential": "<Google ID token from GIS>" }`. The token is verified server-side
(audience / `email_verified` / `exp`); accounts are created or linked by verified email.
Responses: `200` `{ user: SessionUser, isNewAccount }` · `503 GOOGLE_NOT_CONFIGURED` ·
`400 INVALID_GOOGLE_TOKEN`.

#### `POST /auth/forgot-password` — request a reset code (public, rate-limited)
Body: `{ "phone": "…" }`. Enumeration-safe: the response shape is identical whether or
not an account exists for the phone. Response: `202` (same shape as `/auth/otp/request`).

#### `POST /auth/reset-password` — reset via OTP (public)
Body: `{ "phone": "…", "code": "…", "newPassword": "…" }` (min 8 chars).
Responses: `200` `{ changed: true }` · `400 INVALID_CODE` · `429 TOO_MANY_ATTEMPTS`.

### 3.2 Doctors (public directory)

#### `GET /doctors` — search & filter (public)
Query parameters:

| Param | Type | Meaning |
| --- | --- | --- |
| `q` | string | free-text name/keyword search |
| `specialty` | string | specialty slug (e.g. `cardiology`) |
| `city` | string | e.g. `Dhaka`, `Chattogram` |
| `language` | string | language code (e.g. `bn`, `en`) |
| `video` | `true` | only doctors with `supportsVideo = true` (flag; calls not implemented) |
| `verified` | `true` | only `verificationStatus = VERIFIED` |
| `maxFee` | number | `consultationFee <= maxFee` |
| `availableToday` | `true` | only doctors with an active availability rule for today (Asia/Dhaka) |
| `page` | number | 1-based (default 1) |
| `pageSize` | number | default 12 |
| `sort` | string | `relevance` (default) \| `fee_asc` \| `fee_desc` \| `experience_desc` \| `rating_desc` |

Response `200`:
```jsonc
{ "doctors": [ DoctorCard … ], "total": 42, "page": 1, "pageSize": 12 }
```

**DoctorCard:**
```jsonc
{
  "id": "…", "slug": "dr-ayesha-rahman", "name": "Dr. Ayesha Rahman",
  "photoUrl": null, "city": "Dhaka",
  "verificationStatus": "VERIFIED", "experienceYears": 12,
  "consultationFee": 1000, "currency": "BDT",
  "supportsVideo": true, "requiresApproval": true,
  "specialties": [{ "name": "Medicine & Diabetology", "slug": "medicine-diabetology" }],
  "hospitalName": "Greenview General Hospital",
  "languages": ["bn", "en"],
  "ratingAvg": 4.5, "ratingCount": 2,
  "nextAvailableLabel": "Sat, 21 Nov · 5:00 PM"   // null when unknown
}
```

#### `GET /doctors/[slug]` — doctor detail (public)
Response `200`: `DoctorDetail` = DoctorCard plus `bio`, `followUpFee`, `videoConsultFee`,
`regNumber`, `chamberAddress`, `verifiedAt`, `country`, `hospital` object, and
`weeklySchedule: [{ dayOfWeek, startMinute, endMinute }]`.
Errors: `404 NOT_FOUND`.

#### `GET /doctors/[slug]/slots?date=YYYY-MM-DD` — bookable slots (public)
`date` is an **Asia/Dhaka** calendar date. Slots are 30 minutes, derived from the
doctor’s weekly `AvailabilityRule`s minus blocking appointments
(`PENDING_APPROVAL | CONFIRMED | COMPLETED`).
Response `200`:
```jsonc
{ "slots": [
  { "startIso": "2026-11-21T11:00:00.000Z", "endIso": "2026-11-21T11:30:00.000Z",
    "label": "5:00 PM", "taken": false, "past": false }
] }
```
Errors: `404 NOT_FOUND` (doctor) · `400 VALIDATION_ERROR` (bad date).

#### `GET /doctors/[slug]/reviews` — patient reviews (public)
Response `200`:
```jsonc
{ "reviews": [ { "id": "…", "rating": 5, "comment": "…", "createdAt": "…", "patientName": "Salma K." } ],
  "ratingAvg": 4.5, "ratingCount": 2 }
```

#### `POST /doctors/[slug]/reviews` — rate a completed visit (PATIENT only)
Body: `{ "rating": 5, "comment": "…" }` (`rating` 1–5 required; `comment` ≤1000 chars
optional). Eligibility: the caller must have a `COMPLETED` appointment with this doctor
and must not have reviewed them before (`@@unique([doctorId, patientId])`).
Responses: `201` `{ review: { id, rating, comment, createdAt, patientName } }` ·
`403 NOT_ELIGIBLE` (no completed appointment) · `409 ALREADY_REVIEWED` ·
`404 DOCTOR_NOT_FOUND`. The doctor receives a `REVIEW_RECEIVED` notification
(rating only — never the comment text).

### 3.3 Reference data (public)

#### `GET /specialties`
Response `200`:
```jsonc
{ "specialties": [
  { "id": "…", "name": "Cardiology", "nameBn": "কার্ডিওলজি (হৃদরোগ)",
    "slug": "cardiology", "icon": "HeartPulse", "doctorCount": 2 }
] }
```

#### `GET /meta`
Reference data for the search UI.
Response `200`:
```jsonc
{ "cities": ["Chattogram", "Dhaka"],
  "languages": [{ "code": "bn", "label": "বাংলা (Bengali)" }, { "code": "en", "label": "English" }],
  "currency": "BDT",
  "emergencyNumber": "999" }
```

#### `GET /hospitals` — public hospital directory (Phase 6 public slice)
Response `200`:
```jsonc
{ "items": [
  { "id": "…", "name": "Greenview General Hospital", "slug": "greenview-general-hospital",
    "city": "Dhaka", "address": "…", "phone": "+880 …", "about": "…",
    "doctorCount": 3 }   // doctors in the public statuses
] }
```

### 3.3b Notifications (authenticated — Phase 9 core slice)

#### `GET /notifications`
Response `200`: `{ "items": [ NotificationItem … ], "unreadCount": 2 }` (newest first,
capped at 50). **NotificationItem:**
```jsonc
{ "id": "…", "type": "APPOINTMENT_APPROVED",   // see NOTIFICATION_TYPES in constants.ts
  "title": "Appointment approved", "body": "Dr. Ayesha Rahman approved your appointment (MB-…).",
  "meta": "{\"appointmentId\":\"…\",\"referenceCode\":\"MB-…\",\"doctorSlug\":\"dr-…\"}",
  "readAt": null, "createdAt": "…" }
```
Notification bodies never contain medical information (no notes, no review comments).

#### `POST /notifications/:id/read` — mark one read
Response: `200` `{ read: true }` · `404 NOT_FOUND` (not owned).

#### `POST /notifications/read-all` — mark everything read
Response: `200` `{ updated: <count> }`.

### 3.4 Appointments

#### `GET /appointments` — list own / guest lookup
- **Logged-in PATIENT:** returns the patient’s appointments (own history).
- **Logged-in DOCTOR:** returns appointments for the doctor’s own profile.
- **Guest lookup:** query `?phone=<booking phone>&code=MB-XXXXXX` returns the
  matching appointments without a session.

Response `200`: `{ "appointments": [ AppointmentDto … ] }` ·
`401 UNAUTHORIZED` (no session and no valid phone+code pair) ·
`400 VALIDATION_ERROR`.

**AppointmentDto:**
```jsonc
{
  "id": "…", "referenceCode": "MB-7K2P9Q",
  "status": "CONFIRMED",            // PENDING_APPROVAL | CONFIRMED | REJECTED |
                                    // CANCELLED_BY_PATIENT | CANCELLED_BY_DOCTOR |
                                    // COMPLETED | EXPIRED
  "type": "IN_PERSON",              // IN_PERSON | VIDEO
  "bookingMode": "APPROVAL",        // INSTANT | APPROVAL
  "fee": 1000, "currency": "BDT",
  "slotStart": "2026-11-21T11:00:00.000Z", "slotEnd": "2026-11-21T11:30:00.000Z",
  "patientName": "…", "patientPhone": "…", "patientAge": 34,
  "patientGender": "MALE",
  "notes": "…", "doctorNote": null, "consultationNote": null, "createdAt": "…",
  "doctor": { "slug": "dr-ayesha-rahman", "name": "Dr. Ayesha Rahman", "city": "Dhaka",
              "consultationFee": 1000, "specialties": ["Medicine & Diabetology"] },
  "patientId": "…"
}
```

#### `POST /appointments` — book (public; patients and guests)
Body:
```jsonc
{
  "doctorSlug": "dr-ayesha-rahman",
  "date": "2026-11-21",             // Asia/Dhaka calendar date
  "slotStartIso": "2026-11-21T11:00:00.000Z",  // exact startIso from the slots endpoint
  "type": "IN_PERSON",              // IN_PERSON | VIDEO (VIDEO only if supportsVideo)
  "patientName": "Nasreen Sultana", // required (guest-compatible snapshot)
  "patientPhone": "+880…",
  "patientAge": 45,                 // optional
  "patientGender": "FEMALE",        // optional
  "notes": "Thyroid check-up"       // optional
}
```
Behavior: the slot is validated against the doctor’s computed availability; then the
insert relies on the **`@@unique([doctorId, slotStart])`** constraint — a concurrent
double-booking surfaces as `409 SLOT_TAKEN`. `bookingMode` snapshots the doctor’s
`requiresApproval`: `false` ⇒ created as `CONFIRMED` (instant), `true` ⇒ created as
`PENDING_APPROVAL`. Logged-in patients get `patientId` attached; guests must keep the
returned `referenceCode` (plus their phone) for later lookup/cancellation.

Responses: `201` `{ appointment: AppointmentDto }` ·
`404 NOT_FOUND` (doctor) · `400 VALIDATION_ERROR` / `SLOT_INVALID` (not a real, future,
bookable slot) · `409 SLOT_TAKEN`.

#### `POST /appointments/[id]/cancel` — cancel
Caller: the owning **PATIENT** (session), the **DOCTOR** owning the appointment, or a
**guest** verifying with `phone` + `referenceCode`. Resulting status:
`CANCELLED_BY_PATIENT` or `CANCELLED_BY_DOCTOR` depending on the caller. Doctors may
supply `doctorNote` (reason).
Responses: `200` `{ appointment }` · `401 UNAUTHORIZED` · `403 FORBIDDEN` ·
`404 NOT_FOUND` · `409 INVALID_STATE` (already terminal).

#### `POST /appointments/[id]/reschedule` — move to a new slot
Caller: owning patient/guest (as above). Body: `{ "date": "YYYY-MM-DD", "slotStart": "<ISO>" }`.
Re-runs slot validation + the unique-constraint race. If the doctor requires approval the
appointment returns to `PENDING_APPROVAL`; instant doctors re-confirm immediately.
Responses: `200` `{ appointment }` · `409 SLOT_TAKEN` · same error set as cancel.

#### `POST /appointments/[id]/approve` — doctor approves a request
**DOCTOR only**, own appointment, from `PENDING_APPROVAL` → `CONFIRMED`.
Responses: `200` `{ appointment }` · `403 FORBIDDEN` · `409 INVALID_STATE`.

#### `POST /appointments/[id]/reject` — doctor rejects a request
**DOCTOR only**. Body: `{ "reason": "…" }` (optional, stored as `doctorNote`).
`PENDING_APPROVAL` → `REJECTED` (terminal).
Responses: `200` `{ appointment }` · `403 FORBIDDEN` · `409 INVALID_STATE`.

#### `POST /appointments/[id]/complete` — doctor marks a visit done
**DOCTOR only**, own appointment, `CONFIRMED` → `COMPLETED` (terminal).
Body: `{ "consultationNote": "…" }` (optional, ≤2000 chars — stored on the appointment
and shown to the patient in their history).
Responses: `200` `{ appointment }` · `403 FORBIDDEN` · `409 INVALID_STATE` ·
`400 NOT_ENDED` (the consultation time has not ended yet).

> State-transition rules and blocking statuses are specified in
> [database.md §3.1](database.md#31-appointment-state-machine). Transitions that would
> violate the machine return `409 INVALID_STATE`.

### 3.5 Doctor self-service (DOCTOR role)

#### `GET /doctor/dashboard`
Response `200`:
```jsonc
{
  "stats": { "todayTotal": 3, "pendingRequests": 2, "confirmedUpcoming": 4,
             "completedTotal": 12, "ratingAvg": 4.5, "ratingCount": 2,
             "earnings": {                     // SIMULATED Phase-7 preview (no real payments)
               "completedRevenue": 12000, "platformCommission": 1200,
               "netEarnings": 10800, "currency": "BDT" } },
  "pending": [ AppointmentDto … ],     // PENDING_APPROVAL queue
  "upcoming": [ AppointmentDto … ],    // upcoming CONFIRMED
  "availability": [ { "id": "…", "dayOfWeek": 6, "startMinute": 1020, "endMinute": 1260, "isActive": true } ]
}
```
Errors: `401 UNAUTHORIZED` / `403 FORBIDDEN` (non-doctor).

#### `GET /doctor/availability`
Response `200`: `{ "availability": [ { id, dayOfWeek, startMinute, endMinute, isActive } ] }`.

#### `PUT /doctor/availability` — replace weekly schedule
Body: `{ "rules": [ { "dayOfWeek": 6, "startMinute": 1020, "endMinute": 1260, "isActive": true } ] }`
(replaces the doctor’s rules; validated: `0 ≤ dayOfWeek ≤ 6`,
`startMinute < endMinute`, no duplicate `(dayOfWeek, startMinute)`).
Responses: `200` `{ availability }` · `400 VALIDATION_ERROR`.

#### `PATCH /doctor/profile` — update profile
Partial update of editable fields (`bio`, `experienceYears`, `consultationFee`,
`followUpFee`, `videoConsultFee`, `city`, `chamberAddress`, `languages`, `supportsVideo`,
`requiresApproval`, `photoUrl`). Verification fields (`verificationStatus`,
`verifiedAt`) are **not** editable by doctors — admin-only.
Responses: `200` `{ profile: DoctorDetail }` · `400 VALIDATION_ERROR`.

### 3.6 Admin (ADMIN role)

#### `GET /admin/stats`
Response `200`:
```jsonc
{ "totalUsers": 17, "totalPatients": 4, "totalDoctors": 12, "verifiedDoctors": 9,
  "pendingDoctors": 2, "totalAppointments": 4, "confirmedAppointments": 2,
  "pendingApprovals": 2 }
```

#### `GET /admin/verifications` — verification queue
Doctors with non-terminal verification status (`PENDING`, `UNDER_REVIEW`, `MORE_INFO`).
Response `200`: `{ "items": [ VerificationItem … ] }` where each item carries
`userId`, `doctorId`, `slug`, `name`, `email`, `phone`, `city`, `regNumber`,
`experienceYears`, `consultationFee`, `bio`, `specialties`, `verificationStatus`,
`verificationNote`, `submittedAt`.

#### `POST /admin/verifications/[doctorId]/decision`
Body: `{ "decision": "APPROVE" | "REJECT" | "MORE_INFO", "note": "…" }`
- `APPROVE` → `VERIFIED`, sets `verifiedAt`
- `REJECT` → `REJECTED`
- `MORE_INFO` → `MORE_INFO` (note shown to the doctor)

Every decision writes an `AuditLog` row (`actorId` = admin).
Responses: `200` `{ doctor: VerificationItem }` · `404 NOT_FOUND` ·
`409 INVALID_STATE` (already decided terminal state).

#### `GET /admin/doctors`
All doctors with verification status (supports the same filter params as `GET /doctors`
where applicable). Response `200`: `{ "doctors": [ DoctorCard … ] }`.

#### `GET /admin/users` — user directory (Phase 11 slice)
Query: `?role=PATIENT|DOCTOR|ADMIN` (optional) and `?q=<name/email/phone search>`
(optional). Response `200`: `{ "items": [ AdminUserItem … ] }` where each item carries
`id`, `name`, `email`, `phone`, `role`, `status`, `provider`, `phoneVerified`,
`createdAt`, `doctorSlug`, `verificationStatus`.

#### `POST /admin/users/[id]/status` — suspend / reactivate (audited)
Body: `{ "status": "ACTIVE" | "SUSPENDED" }`. Guards: an admin cannot change their own
status and cannot modify ADMIN accounts; suspended users lose their sessions immediately.
Responses: `200` `{ status }` · `400 CANNOT_MODIFY_SELF` · `403 FORBIDDEN` (ADMIN target).

#### `GET /admin/reviews` — review moderation queue (Phase 11 slice)
Response `200`: `{ "items": [ ModerationReviewItem … ] }` (newest first, capped at 100)
where each item carries `id`, `rating`, `comment`, `createdAt`, `patientName`,
`doctorName`, `doctorSlug`.

#### `DELETE /admin/reviews/[id]` — remove a review (audited)
Response: `200` `{ deleted: true }` · `404 NOT_FOUND`. Writes an `AuditLog` row
(`REVIEW_DELETED`).

#### `GET /admin/audit-logs`
Response `200`:
```jsonc
{ "logs": [ { "id": "…", "action": "DOCTOR_VERIFIED", "entity": "DoctorProfile",
              "entityId": "…", "meta": "{…}", "createdAt": "…", "actorName": "Platform Admin" } ] }
```

## 4. RBAC Matrix

| Endpoint | Guest | PATIENT | DOCTOR | ADMIN |
| --- | :---: | :---: | :---: | :---: |
| POST /auth/register, /auth/login | ✅ | ✅ | ✅ | ✅ |
| POST /auth/logout, GET /auth/me | – | ✅ | ✅ | ✅ |
| GET /doctors, /doctors/[slug], /slots, /reviews | ✅ | ✅ | ✅ | ✅ |
| GET /specialties, /meta | ✅ | ✅ | ✅ | ✅ |
| POST /appointments | ✅ (guest booking) | ✅ | ❌ | ❌ |
| GET /appointments | ✅ (phone + referenceCode) | own | own | ❌ |
| POST /appointments/[id]/cancel | ✅ (guest owner) | own | own | ❌ |
| POST /appointments/[id]/reschedule | ✅ (guest owner) | own | ❌ | ❌ |
| POST /appointments/[id]/approve · /reject · /complete | ❌ | ❌ | own | ❌ |
| GET /doctor/dashboard, /availability; PUT /availability; PATCH /profile | ❌ | ❌ | ✅ | ❌ |
| GET /admin/stats, /verifications, /doctors, /audit-logs; POST /verifications/[doctorId]/decision | ❌ | ❌ | ❌ | ✅ |

“own” = restricted to resources owned by the caller (server-side enforced — a doctor
cannot read or mutate another doctor’s appointments; a patient cannot see other
patients’ bookings).

## 5. Error Codes

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Request body/query failed zod validation |
| `SLOT_INVALID` | 400 | Submitted slot is not a real, future, bookable slot for that doctor/date |
| `UNAUTHORIZED` | 401 | Missing/expired session (or invalid guest phone+code pair) |
| `INVALID_CREDENTIALS` | 401 | Login failed (same response for unknown email vs. wrong password — anti-enumeration) |
| `FORBIDDEN` | 403 | Authenticated but wrong role, or not the resource owner |
| `NOT_FOUND` | 404 | Unknown doctor/slug/appointment/resource |
| `EMAIL_TAKEN` | 409 | Registration email already exists |
| `SLOT_TAKEN` | 409 | Slot already booked — surfaced from the `@@unique([doctorId, slotStart])` violation (Prisma `P2002`) |
| `INVALID_STATE` | 409 | State-machine violation (e.g. completing a rejected appointment) |
| `RATE_LIMITED` | 429 | Too many auth attempts from this client (in-memory limiter) |
| `INTERNAL_ERROR` | 500 | Unexpected server error (logged server-side) |
| `HTTP_<status>` | any | Fallback when no specific code applies |

## 6. Rate Limits

- **Auth endpoints (`register`, `login`):** a simple **in-memory, per-instance** limiter
  protects against credential-stuffing and registration abuse; violations return
  `429 RATE_LIMITED`. Limit constants live in the auth route module.
- **Other endpoints:** no explicit limit at MVP (single-instance local deployment).
- **Limitation (honest):** an in-memory limiter resets on restart and does not share
  state across instances. Moving to Redis-backed limiting is required before any
  multi-instance production deploy — see
  [security.md §9](security.md#9-known-mvp-limitations-security-relevant-honest).

## 7. Golden Path — curl Examples

The complete patient journey: register → login → search → slots → book → cancel.

```bash
BASE=http://localhost:3000/api/v1

# 1) Register a patient account (session cookie is set on success)
curl -s -c cookies.txt -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"role":"PATIENT","name":"Test Patient","email":"test.patient@example.com","password":"SuperSecret123","phone":"+8801700000000"}'

# 2) (Alternative) log in as the seeded demo patient
curl -s -c cookies.txt -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@medbriq.dev","password":"Patient@123"}'

# 3) Search verified doctors in Dhaka, max fee 1200 BDT
curl -s "$BASE/doctors?city=Dhaka&verified=true&maxFee=1200&sort=fee_asc"

# 4) Get bookable slots for a doctor on a Dhaka date
curl -s "$BASE/doctors/dr-ayesha-rahman/slots?date=2026-11-21"

# 5) Book an appointment (guests omit the cookie; keep referenceCode from the response!)
curl -s -b cookies.txt -X POST $BASE/appointments \
  -H "Content-Type: application/json" \
  -d '{"doctorSlug":"dr-ayesha-rahman","date":"2026-11-21","slotStartIso":"2026-11-21T11:00:00.000Z","type":"IN_PERSON","patientName":"Test Patient","patientPhone":"+8801700000000","notes":"Fever for two days"}'
# → 201 { ok: true, data: { appointment: { "referenceCode": "MB-7K2P9Q", "status": "PENDING_APPROVAL" … } } }

# 6) List my appointments (session) — or, as a guest:
curl -s "$BASE/appointments?phone=%2B8801700000000&code=MB-7K2P9Q"

# 7) Cancel the appointment (id from step 5)
curl -s -b cookies.txt -X POST $BASE/appointments/<APPOINTMENT_ID>/cancel \
  -H "Content-Type: application/json" -d '{}'
# → 200 { ok: true, data: { appointment: { "status": "CANCELLED_BY_PATIENT" … } } }
```

Doctor-side flow (approve a request) and admin-side flow (verify a doctor):

```bash
# Doctor approves a pending request
curl -s -c doc.txt -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"doctor@medbriq.dev","password":"Doctor@123"}'
curl -s -b doc.txt -X POST $BASE/appointments/<APPOINTMENT_ID>/approve

# Admin verifies a pending doctor
curl -s -c admin.txt -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@medbriq.dev","password":"Admin@Medbriq123"}'
curl -s -b admin.txt $BASE/admin/verifications
curl -s -b admin.txt -X POST $BASE/admin/verifications/<DOCTOR_ID>/decision \
  -H "Content-Type: application/json" \
  -d '{"decision":"APPROVE","note":"BMDC registry checked (demo)"}'
```

## 8. Versioning & Compatibility

- All current endpoints are `/api/v1/*`. Breaking changes require a new version prefix
  (`/api/v2`) with a deprecation window — never break v1 in place.
- Additive changes (new optional fields, new filters) are allowed within v1.
- The planned Flutter clients (see [architecture.md](architecture.md#6-future-scaling-path))
  consume this same contract — treat any breaking change as a cross-platform release issue.

## 9. Doctor-wise Fee System (docs/FEE_SYSTEM.md)

All fee endpoints are bound to the `appointmentBooking` module and the
Prisma-backed store (data-residency gate, `docs/ARCHITECTURE_CORRECTIONS.md`
#5/#6). On a gated store they answer `503 MODULE_DISABLED` with the reason.

### POST /api/v1/booking/price-preview — guest-eligible

Classification + price breakdown BEFORE confirmation. The response is
informational only — the authoritative price is recomputed at booking time.

```bash
curl -s -X POST $BASE/booking/price-preview -H "Content-Type: application/json" \
  -d '{"doctorSlug":"dr-ayesha-rahman","patientPhone":"+880 1811-000001"}'
# → 200 { ok: true, data: { preview: {
#     patientType: "NEW|RETURNING|FOLLOW_UP", fee: 600, currency: "BDT",
#     explanation: "Last completed visit was on …",
#     basis: { rule, anchorDate, returningExpiryDate, followUpExpiryDate, … },
#     feeSettings: { newPatientFee, returningPatientFee, … }
#   }, doctor: { slug, name, city } } }
```

### POST /api/v1/appointments — booking with server-side pricing

The body additionally accepts OPTIONAL client expectations and an idempotency
key (never trusted — the server always recomputes):

| Field | Type | Behavior |
|---|---|---|
| `expectedFee` | int | mismatch with the recomputed fee → `409 PRICE_CHANGED` |
| `expectedPatientType` | `"NEW"\|"RETURNING"\|"FOLLOW_UP"` | mismatch → `409 PRICE_CHANGED` |
| `idempotencyKey` | string 8–80 | retry with the same key replays the original appointment (`idempotentReplay: true`); reused for a different payload → `409 IDEMPOTENCY_MISMATCH` |
| `type: "VIDEO"` | — | `503 MODULE_DISABLED` (telehealth is Phase-0 gated) |

Success now includes `priceBreakdown` (patientType, fee, explanation, basis).
Every appointment stores the frozen snapshot: `patientType`, `fee`,
`feeSettingsVersion`, `pricingBasis` (JSON), `pricedAt`, plus the separated
status axes `paymentStatus` / `consultationStatus` / `refundStatus`.

### GET /api/v1/doctor/fee-settings — DOCTOR

Own settings; auto-created with platform defaults (new ৳1000 / returning ৳600 /
6 months) on first read.

### PUT /api/v1/doctor/fee-settings — DOCTOR

Validated server-side (fees 0–100000 whole ৳, returning ≤ new, follow-up ≤ new
when enabled, returning validity 1–365 days / 1–36 months, follow-up validity
1–90 days / 1–12 months). Version auto-increments; an immutable history row and
an audit log entry are written in the same transaction; `DoctorProfile` fee
fields stay in sync.

```bash
curl -s -b doc.txt -X PUT $BASE/doctor/fee-settings -H "Content-Type: application/json" \
  -d '{"newPatientFee":1000,"returningPatientFee":600,"returningValidityValue":6,
       "returningValidityUnit":"MONTHS","followUpEnabled":true,"followUpFee":400,
       "followUpValidityValue":15,"followUpValidityUnit":"DAYS",
       "changeReason":"Chamber fee revision"}'
# → 200 { ok: true, data: { settings: { …, version: 2 } } }
```

### GET /api/v1/doctor/fee-settings/history?limit=20 — DOCTOR

Immutable versioned history, newest first (`version`, all fee fields,
`changeReason`, `changedBy`, `createdAt`).

### GET /api/v1/doctor/patients/visits?phone=… — DOCTOR

One patient's completed-visit history **with the signed-in doctor only** (the
query is doctor-scoped in the data layer). Each item carries `qualifying`
(whether it counts toward returning status) and `paymentStatusAtCompletion`.

### POST /api/v1/appointments/{id}/no-show — DOCTOR owner

Marks a CONFIRMED appointment `NO_SHOW` (`consultationStatus: NOT_HELD`).
No visit-history row is written — a no-show never establishes returning-patient
eligibility (docs/FEE_SYSTEM.md §2.2).

### POST /api/v1/appointments/{id}/complete — DOCTOR owner

Now completes the appointment AND records the `doctor_patient_history` visit
row in ONE transaction. The `qualifying` flag (completed consultation +
settled payment) is snapshotted onto the visit row.
