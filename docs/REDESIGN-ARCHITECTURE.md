# Medbriq Product & Architecture Redesign

**Branch:** `redesign/medbriq-modern-ui`  
**Base:** `main`  
**Status:** implementation blueprint; existing APIs and data contracts remain authoritative until a separately tested migration is approved.

## Product direction

Medbriq is a Bangladesh-first healthcare discovery and appointment platform. The product should make the next action obvious for each persona: patients find and book care; doctors manage their practice; hospitals manage facilities and clinicians; administrators operate the platform safely.

### Design system

- **Primary:** clear sky blue for navigation, primary actions and focus states.
- **Secondary:** medical teal for verified/trust signals and supportive actions.
- **Accent:** restrained warm sunshine for highlights, reminders and empty-state illustrations.
- **Surfaces:** white cards on a very light blue-grey canvas; readable navy text; subtle borders; restrained shadows.
- **Typography:** Geist/Inter for Latin and Noto Sans Bengali for Bangla; avoid tiny text and overly dense cards.
- **Responsive rules:** 360px mobile baseline, tablet two-column layouts, desktop persistent navigation; safe-area-aware mobile controls; touch targets at least 44px.
- **Accessibility:** semantic landmarks, keyboard navigation, visible focus, reduced-motion support, status not conveyed by color alone, and WCAG AA contrast targets.

## Information architecture

### Public discovery
Keep the homepage focused on a small number of high-value sections:
1. Header and global search (doctor, specialty, hospital, city).
2. Specialty shortcuts.
3. Verified/featured doctors.
4. Hospitals and clinics.
5. Clear booking steps.
6. Patient benefits and trust/verification.
7. Health education/library entry points.
8. FAQ and emergency guidance.
9. Footer.

Long-form educational galleries, symptom explainers, medical equipment references, calculators and provider marketing remain available as dedicated pages; they should not all compete for attention on the homepage.

### Patient workspace
Mobile-first five-item navigation: **Home, Find doctors, Bookings, Records, Profile**. Keep the active booking state visible; booking should be a short, linear sequence: doctor → chamber/visit type → date/time → patient details → fee breakdown → final server validation → confirmation. Never imply payment is available unless a real payment provider is enabled.

### Doctor workspace
Group the existing capabilities into four mental models:
- **Today:** overview, appointment queue, calendar.
- **Practice:** appointments, patients, chambers, availability, fees.
- **Growth:** earnings, reviews, profile.
- **Account & trust:** verification, VVS, settings.

Pending appointment requests and today's schedule should be the first visible tasks. Do not present simulated earnings as withdrawable balance.

### Hospital workspace
Group overview, appointments, doctors, branches, departments, revenue and profile/settings. Clearly distinguish verified/pending facility status. Hospital-specific access must remain server-authorized; a client-side role toggle is never authorization.

### Admin workspace
Group overview/analytics, people and organizations, doctor/hospital verification, appointments/reviews/content, finance, audit logs, security and system configuration. Privileged actions require confirmation, reason capture where appropriate, and audit events.

## Backend architecture guardrails

Keep the current modular-monolith deployment model for now: Next.js App Router + versioned Route Handlers + domain libraries + DataStore interface. Do not split services or replace the persistence layer as part of a visual redesign.

- UI components call typed API-client functions; they must not access Prisma, Firestore or server secrets.
- Route handlers validate input (Zod), authenticate, authorize role and resource ownership, invoke domain services, then return the standard `{ ok, data }` / `{ ok, error }` envelope.
- Domain services own booking transitions, pricing, verification, notifications and audit rules; no business rule should live only in React.
- `DataStore` is the persistence boundary. Prisma, Firestore and Hybrid implementations must preserve identical semantics for booking conflicts, idempotency, conditional state transitions, access scope and timestamps.
- Booking availability is advisory until the final transaction/conditional write. Preserve the database-level doctor+slot uniqueness guard and idempotency behavior.
- Keep Bangladesh defaults explicit: BDT minor-unit/decimal-safe money, Asia/Dhaka presentation, UTC persistence, normalized +880 phone numbers, and emergency number 999.
- Feature/module flags must be returned from bootstrap and respected by all entry points. Disabled modules must explain why and must not be represented as functional.
- Never introduce demo data into real accounts by default. Keep seeders opt-in and development-only.

## Security and reliability release gates

Before a production claim:
1. Hash opaque session tokens at rest; revoke sessions on password reset and sensitive credential changes.
2. Move OTP/login throttling and abuse counters to a shared atomic store before multi-instance production; production OTP requires a real provider.
3. Enforce CSRF/origin protections for cookie-authenticated mutations, secure cookie settings, strict input validation and safe error messages.
4. Verify RBAC and record ownership in every route; test cross-user and cross-role access denial.
5. Review Firestore rules and service-account handling; no secrets in client bundles, logs or committed files.
6. Verify rate limits, audit trails, idempotency, booking race conditions and data-store parity.
7. Use Decimal/minor units for money and explicit currency; test rounding and fee calculations.
8. Add automated unit, API integration, component and browser E2E coverage for registration/login, search, booking, cancellation, doctor approval, hospital operations and admin verification.
9. Run lint, typecheck, production build, fee verification, security checks and migration checks before release.

## Delivery sequence

- **Stage 0 — Baseline:** inspect actual branch state, routes, role navigation, shared UI, feature flags, data-store contracts, CI and known limitations.
- **Stage 1 — Visual foundation:** design tokens, spacing/type scale, responsive shell, reusable page headers/cards/tables/empty/loading/error states.
- **Stage 2 — Public portal:** reduce homepage overload, improve search hierarchy and doctor/hospital discovery without removing dedicated content pages.
- **Stage 3 — Patient journey:** simplify patient shell and booking flow; verify all transitions against existing API contracts.
- **Stage 4 — Provider workspaces:** reorganize doctor and hospital navigation; preserve every working operation.
- **Stage 5 — Admin operations:** group dense navigation and improve high-risk action review and audit visibility.
- **Stage 6 — Backend consistency:** map routes to domain services, reconcile v1/v2 behavior and DataStore parity; only make behavior changes with tests.
- **Stage 7 — Quality gates:** add or strengthen tests, run CI-equivalent checks, document failures honestly, and open a reviewable PR.

## Non-goals for this redesign

No live payment integration, telemedicine call provider, SMS vendor, medical diagnosis/recommendation engine, production migration, or service decomposition is to be fabricated as part of UI work. Keep current real capabilities and module flags truthful.


## Baseline findings confirmed during implementation

These are compatibility risks to resolve before calling the redesign complete:

- The v1 API uses the `DataStore` abstraction, but `src/app/api/v2/_lib/guards.ts` explicitly rejects non-Prisma stores for v2 surfaces. The hospital dashboard currently calls `/api/v2/hospital/overview`; therefore the UI must handle the honest disabled/error state and the backend needs a DataStore-backed implementation before those operations can be claimed as Firestore/Hybrid-ready.
- `src/lib/modules.ts` currently enables appointment booking on all store kinds, while the v2 guard still disables Prisma-direct surfaces on Firestore/Hybrid. This is not necessarily a booking-engine contradiction (v1 booking is DataStore-backed), but module flags must be scoped to the actual API surface and must not imply every dashboard module is enabled.
- Some comments in `src/lib/data/types.ts` and `docs/architecture.md` describe the old Firestore fee/booking freeze or local-only deployment state. The current `src/lib/data/index.ts` and `src/lib/modules.ts` describe a later owner override. Documentation must be reconciled against the deployed configuration and actual store implementation, not updated by assumption.
- `docs/security.md` lists only PATIENT / DOCTOR / ADMIN, while the Prisma schema, app shell and hospital dashboard include HOSPITAL. The RBAC matrix and endpoint ownership tests must cover all four roles.
- The CI workflow currently gates lint, typecheck, production build and secret scanning, but does not run a dedicated unit/API/browser test suite. No claim of full end-to-end verification should be made until those tests exist and run.
- The Prisma schema still documents Float for financial amounts. A money migration must be planned separately with rounding/compatibility tests; do not silently change persisted types during a visual redesign.
