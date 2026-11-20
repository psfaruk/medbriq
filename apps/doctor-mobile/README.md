# Doctor Mobile App (Flutter) — PLANNED, NOT YET IMPLEMENTED

> **Status: placeholder directory. There is NO code here yet — and none is claimed.**
> This README exists to document the plan and reserve the workspace per the master
> product spec’s repository architecture. Do not treat anything in this directory as
> working software.

## What is planned

A Flutter application for doctors (Android first, iOS-compatible architecture) per the
master product spec’s product vision:

- Doctor registration & license verification status
- Professional profile management
- Availability/schedule management
- Appointment queue: approve / reject / complete / cancel
- Patient queue & daily schedule views
- Earnings overview **when payments land** (Phase 7, currently deferred)
- Video consultations **when Phase 8 lands** (currently deferred)

## How it will integrate

The app will consume the **same versioned REST API** as the web SPA:
[`/api/v1`](../../docs/api.md) — response envelope, auth model, and RBAC are documented
there (doctor-role endpoints: `/doctor/dashboard`, `/doctor/availability`,
`/doctor/profile`, appointment approve/reject/complete). Because the contract is
API-first, the mobile client will never scrape HTML.

Notes for implementation time:
- Cookie sessions work in browsers; mobile will likely need the documented session model
  adapted (bearer-token or cookie-jar via the HTTP client) — coordinate an API addition
  with the backend agent rather than improvising.
- Stack (per master spec): Flutter/Dart, Riverpod, GoRouter, Dio, secure token storage,
  localization support (English + Bengali first).

## Current state

| Item | Status |
| --- | --- |
| Code | ⛔ None |
| Designs | ⛔ None |
| CI/build | ⛔ None |
| API contract to build against | ✅ Documented — [docs/api.md](../../docs/api.md) |

When work starts, create the Flutter project here (`apps/doctor-mobile/`), keep the
directory self-contained, and update this README + the phase reports with real status.
