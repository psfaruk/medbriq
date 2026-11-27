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


## Patient booking flow — implementation notes

The current patient wizard already has a server-authoritative four-step sequence:
1. Select a chamber (or the doctor's published location when no chamber records exist).
2. Select a Dhaka-local date and a live slot; the API revalidates the slot at write time.
3. Enter patient details or select a saved family member.
4. Review the server-generated fee preview and confirm; the API recomputes price and uses an idempotency key.

The redesign must preserve these protections. The current UI pass improves the progress indicator with a visible step count, accessible progress semantics and a responsive stage strip. Payment selection is fail-closed: online payment is selectable only when the bootstrap flag explicitly says it is enabled. A missing or stale module flag cannot accidentally expose an unverified payment path; the user receives a Bengali/English explanation and can choose pay-at-chamber.

### Booking invariants to keep under regression coverage

- No booking is created from a client-side fee calculation; `expectedFee` is only an expectation.
- A `PRICE_CHANGED` response must show the fresh server breakdown and require another explicit confirmation.
- A `SLOT_TAKEN`, `SLOT_UNAVAILABLE` or `SLOT_PAST` response clears the selected slot and returns the user to date/time selection.
- A retried request reuses the same cryptographically random idempotency key; a materially new submission gets a new key.
- Online payments remain disabled unless the payment module is explicitly enabled by the approved operator process. Do not enable bKash/Nagad/card based on UI work alone.
- Family member and patient details must remain scoped to the authenticated patient; server-side validation and ownership checks remain authoritative.

## Hospital API boundary — confirmed implementation detail

The hospital dashboard is currently served by the catch-all `src/app/api/v2/hospital/[...path]/route.ts`. It calls Prisma directly for hospital, branch, department, doctor and appointment records. `requireHospitalProfile()` first invokes `requirePrismaBackedStore()`, so this surface is deliberately unavailable on Firestore-only and Hybrid store kinds. The UI should show a truthful unavailable state rather than query a different database or fabricate zero counts.

Do not simply remove that guard. The current `DataStore` contract does not expose the complete hospital operations required by this route (branches, departments, hospital-scoped appointment aggregates, revenue). A safe migration requires:
1. Define typed hospital DTOs and domain methods in `DataStore`.
2. Implement equivalent methods in PrismaStore and FirestoreStore, and explicitly route HybridStore calls to the correct store according to the data-residency decision.
3. Enforce hospital ownership and doctor membership inside each store method, not only in React.
4. Add parity tests for list/create/update/delete, cross-hospital isolation, date boundaries in Asia/Dhaka, appointment counts and revenue calculations.
5. Only then remove the Prisma-only guard for the specific endpoints that have proven parity.

## Validation notes

The GitHub Actions run for the earlier UI baseline completed lint, TypeScript typecheck, secret scan and production build successfully. Its opt-in production preflight correctly failed because the configured SMS provider resolves to the development `console` provider; this is a deployment-safety blocker, not a frontend compilation failure. Google sign-in and Firebase web push settings were also absent and reported as warnings. Do not weaken or skip this preflight to make CI appear green. Re-run CI against the latest commit after every subsequent UI change.

## Hospital API migration — concrete DataStore parity backlog

The current hospital catch-all route is not yet store-agnostic. `requireHospitalProfile()` calls `requirePrismaBackedStore()` and the handler directly uses Prisma models. Keep that guard until every operation below has equivalent behavior in all enabled stores.

| Current operation | Required domain method | Required invariants before enabling Firestore/Hybrid |
|---|---|---|
| Hospital profile lookup | `getHospitalByUserId` (extend its return type only if needed) | Resolve strictly by authenticated user ID; never accept a client-supplied hospital ID |
| Overview counts + recent appointments | `getHospitalOverview(userId, dhakaDateRange)` | Counts and appointment rows must be scoped through doctors owned by the hospital; preserve Dhaka day boundaries |
| Branch list/create/update/delete | `listHospitalBranches`, `createHospitalBranch`, `updateHospitalBranch`, `deleteHospitalBranch` | Every mutation must verify branch ownership atomically; preserve main-branch rules and stable ordering |
| Department list/create/update/delete | `listHospitalDepartments`, `createHospitalDepartment`, `updateHospitalDepartment`, `deleteHospitalDepartment` | Every mutation must verify hospital ownership; define duplicate-name behavior consistently |
| Hospital doctors | `listHospitalDoctors` | Include only doctors affiliated with the authenticated hospital; return the same public/admin-safe DTO fields |
| Hospital appointments | `listHospitalAppointments` | Filter through hospital-owned doctor IDs; validate status filters; never expose consultation notes or unrelated patient records |
| Revenue summary | `getHospitalRevenue` | Use completed visits only; define currency/rounding and commission snapshot semantics; never call a calculated figure withdrawable balance |
| Hospital profile update | `updateHospitalProfile` | Validate allowed fields and ownership in the same transaction; slug and verification state remain server-controlled |

Implementation sequence:
1. Define serializable record/input/output types and error contracts in `src/lib/data/types.ts`.
2. Implement each method in PrismaStore first and add focused unit/integration tests for ownership, state transitions, rounding and date boundaries.
3. Implement the same method in FirestoreStore using server-only credentials and explicit document paths/rules.
4. Implement HybridStore routing according to the approved data-residency decision; do not replicate patient visit/appointment details into an unapproved region.
5. Add contract tests that run the same fixtures against every store adapter; include cross-hospital access denial and mutation races.
6. Move the v2 route to typed domain methods; remove only the corresponding Prisma-only guard after parity tests pass.
7. Update module flags to reflect the actual store capability, then verify dashboard states for enabled, disabled and temporarily unavailable modules.

The existing `DataStore` currently covers public hospital directory/profile lookup but does not define the branch, department, hospital-scoped doctor, appointment, overview or revenue operations above. This is an intentional implementation gap, not a reason to read/write a second database from production.

## Dashboard operational truth rules

- A badge is absent while its count is unknown; it must not display `0` until the relevant request succeeds.
- Independent badge/data requests should fail independently. One endpoint failure must not erase another endpoint's valid result.
- A fallback directory is not a substitute for an admin verification queue. Label its source and mark verification state unknown.
- Keep stale successful data visible during refresh, but label refresh errors and provide a retry action.
- Do not present missing values as zero, online payment as enabled without a confirmed module/provider state, or calculated revenue as a payable balance.
- Dashboard notification links must navigate to the relevant section; mobile navigation must close after a successful selection and remain scrollable on small screens.