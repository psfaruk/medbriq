# Task 4-c: Hospital Dashboard — MedBricBD

Your Task ID: 4-c. You are building the HOSPITAL/CLINIC WEB DASHBOARD for MedBricBD, a Bangladesh healthcare platform. UI-only work on an existing Next.js 16 project — the backend is DONE and must NOT be modified.

## Project facts
- Root: /home/z/my-project. Dev server ALREADY RUNNING on port 3000 (do NOT restart, do NOT run build, never `next build`).
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui in src/components/ui (button, card, input, label, select, tabs, dialog, alert-dialog, badge, avatar, skeleton, textarea, separator, switch, table, popover, dropdown-menu, scroll-area, sheet, toast, etc.)
- Single-route SPA: "/" renders src/components/app/app.tsx → role HOSPITAL renders YOUR component. NO new routes, NO server components.

## Files you own (ONLY touch these)
REPLACE the stub src/components/app/hospital/index.tsx. Create sections under src/components/app/hospital/sections/*.tsx. NEVER touch anything outside src/components/app/hospital/.

## Required export contract
`export default function HospitalDashboard()` in src/components/app/hospital/index.tsx. Wrap in DashboardShell (import default from "@/components/app/dashboard-shell"; props: roleLabel="Hospital Dashboard", navItems: {key,label,icon:LucideIcon,badge?}[], activeSection, onSectionChange). Use useAppStore() from "@/lib/app-state": hospitalSection + setHospitalSection.

## State & helpers (READ these files first)
- Store: useAppStore from "@/lib/app-state" — { user, lang, hospitalSection, setHospitalSection, logout }.
- API client from "@/lib/api-client": apiGet<T>, apiPost<T>, apiPatch<T>, apiPut<T>, apiDelete<T> — THROW ApiCallError (err.message = server message). Envelope {ok:true,data}|{ok:false,error{message,code}}.
- Shared kit from "@/components/app/shared/ui-kit": useT() → {lang,t(key,vars?)}; Money; AppointmentStatusBadge; VerificationBadge; PatientTypeBadge; PaymentStatusBadge; PageHeader; StatCard; SectionCard; Stars; LoadingCard; EmptyState; ErrorState; DemoNotice; UserAvatar; fmtTime, fmtDate, fmtDateLong, fmtDateTime, dhakaToday, addDaysStr, DAY_LABELS.
- Toast from "@/hooks/use-toast". Icons lucide-react. NO emojis.
- i18n keys (src/lib/i18n.ts): hospitalNav.*, status.*, pay.*, type.*, common.* — else plain English copy.

## Design system (STRICT)
Primary #1769AA, teal #13A89E, bg #F4F8FC, white cards rounded-2xl shadow-soft, text #172B4D, muted #718096. Semantic Tailwind tokens only (bg-card, text-muted-foreground, bg-primary-soft, border-border) — no raw hex. Desktop-first responsive: stat card grids (grid gap-4 sm:grid-cols-2 xl:grid-cols-4), tables wrapped in overflow-x-auto with min-w, mobile card fallbacks. Every section: loading, empty, error states. Destructive actions (delete branch/department) → AlertDialog confirm.

## API contracts (all /api/v2/hospital/* — session: hospital@medbriq.dev / Hospital@123; test with curl -c /tmp/hos.jar + POST /api/v1/auth/login)
1. GET /api/v2/hospital/overview → { hospital: {id, name, slug, city, verificationStatus}, stats: {branchCount, departmentCount, doctorCount, verifiedDoctors, pendingDoctors, todaysAppointments, totalAppointments, pendingApprovals, completedAppointments}, recentAppointments: [{id, referenceCode, patientName, doctorName, chamberName, status, paymentStatus, slotStart, fee, currency}] }
2. GET /api/v2/hospital/branches → {items: [{id, name, address, city, phone, isMain, createdAt}]}
3. POST /api/v2/hospital/branches {name, address, city, phone?, isMain?}
4. PATCH /api/v2/hospital/branches/{id} partial {name?, address?, city?, phone?, isMain?}
5. DELETE /api/v2/hospital/branches/{id} (409 MAIN_BRANCH if isMain — show server message)
6. GET /api/v2/hospital/departments → {items: [{id, name, about, createdAt}]}
7. POST /api/v2/hospital/departments {name, about?}; PATCH /{id} {name?, about?}; DELETE /{id}
8. GET /api/v2/hospital/doctors → {items: [{id, slug, name, email, city, verificationStatus, experienceYears, specialties[], appointmentCount, reviewCount}]}
9. GET /api/v2/hospital/appointments?status= → {items: [{id, referenceCode, patientName, patientPhone, doctorName, chamberName, status, paymentStatus, patientType, slotStart, slotEnd, fee, currency, createdAt}]}
10. GET /api/v2/hospital/revenue → {commissionPercent, totals: {completedVisits, grossRevenue, commission, netRevenue, currency}, monthly: [{month: "2026-08", revenue, visits}] (last 6), payments: [{id, referenceCode, doctorName, patientName, fee, currency, paymentStatus, method, txnRef, slotStart}] (25 recent completed)}
11. GET /api/v2/hospital/profile → {profile: {id, name, slug, city, address, phone, about, website, verificationStatus, verificationNote}}
12. PUT /api/v2/hospital/profile {name?, about?, phone?, website?, address?, city?}
13. GET /api/v2/auth/context → {role, hospital: {id, slug, name, city, verificationStatus, verificationNote, branchCount, departmentCount, doctorCount}}

## Sections to build (nav order)
1. **overview**: welcome header with hospital name + VerificationBadge (if not VERIFIED show amber banner "Verification {status} — your public profile activates after admin review" + verificationNote if present); stat cards: doctors (verified/pending hint), today's appointments, total appointments, pending approvals, completed visits, branches, departments; "Recent appointments" table (time, patient, doctor, chamber, status, payment, fee) with badges; quick links row. DemoNotice.
2. **branches**: card grid of branches (name with "Main" badge, address, city, phone); add branch dialog (name, address, city, phone optional, isMain switch); edit dialog; delete (AlertDialog; server 409 → toast its message).
3. **departments**: list/table (name, about, created); add dialog (name + about textarea); edit; delete with confirm. Empty state.
4. **doctors**: doctor directory: avatar initials, name + VerificationBadge, specialties chips, email, city, experience, appointmentCount, reviewCount; info note "Doctors manage their own schedules and fees — this directory lists doctors attached to your hospital. Doctors register themselves and select your hospital in their profile."
5. **appointments**: status filter tabs (All, PENDING_APPROVAL, CONFIRMED, COMPLETED, Cancelled — note cancelled includes CANCELLED_BY_PATIENT and CANCELLED_BY_DOCTOR; filter client-side if needed) hitting ?status= for the single statuses; searchable (client-side) by patient/doctor/reference; table rows (date/time, patient, doctor, chamber, patientType badge, fee, status, payment); mobile: card list. Detail dialog on row click.
6. **revenue**: stat cards (gross revenue, commission % + amount, net revenue, completed visits); monthly bars — pure CSS bar chart (divs with height % of max, month labels, bg-primary bars); recent payments table (date, reference, doctor, patient, amount, method, payment status). Note "Sandbox data — simulated commission".
7. **profile**: hospital info form (name, city, address, phone, website, about textarea) → PUT; read-only verification status card with note; public slug display.
8. **settings**: manager account (name/phone → PATCH /api/v1/auth/me), language (setLang), sign out, DemoNotice.

## Quality gates
1. `cd /home/z/my-project && bun run lint` — fix ALL errors in YOUR files. Traps: no nested component definitions; no synchronous setState in useEffect body (use apiGet(...).then(setX).catch(...)); no unused imports.
2. Verify with agent-browser (installed): open http://localhost:3000/, expand "Demo accounts" accordion on auth screen, click "Hospital — Greenview General" to sign in. Walk ALL sections; in branches add a test branch then delete it; in departments add one; revenue renders bars; profile save works. Screenshots /tmp/hos-*.png. Check `agent-browser errors`; tail last 30 lines of dev.log.
3. Responsive: `agent-browser set viewport 375 700` + `agent-browser set viewport 1440 900` screenshots.

## Demo facts
hospital@medbriq.dev / Hospital@123 = Greenview General Hospital (VERIFIED), Dhaka. 2 branches (Dhanmondi Main + Mirpur), 5 departments, 4 attached doctors (3 verified, 1 pending), 5+ appointments across statuses.

Reply when done with: files created, lint status, verification walkthrough (tested + fixed), known limitations. Never touch files outside src/components/app/hospital/, never modify APIs, never restart the dev server.
