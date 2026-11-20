# Task 4-b: Doctor Web Dashboard — MedBricBD

Your Task ID: 4-b. You are building the DOCTOR WEB DASHBOARD for MedBricBD, a Bangladesh healthcare platform. UI-only work on an existing Next.js 16 project — the backend is DONE and must NOT be modified.

## Project facts
- Root: /home/z/my-project. Dev server ALREADY RUNNING on port 3000 (do NOT restart, do NOT run build, never `next build`).
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui in src/components/ui (button, card, input, label, select, tabs, dialog, alert-dialog, badge, avatar, skeleton, textarea, radio-group, checkbox, separator, switch, table, popover, dropdown-menu, scroll-area, sheet, toast, etc.)
- Single-route SPA: "/" renders src/components/app/app.tsx → role DOCTOR renders YOUR component. NO new routes, NO server components — 'use client' everywhere.

## Files you own (ONLY touch these)
REPLACE the stub src/components/app/doctor/index.tsx with your implementation. Create sections under src/components/app/doctor/sections/*.tsx. NEVER touch anything outside src/components/app/doctor/.

## Required export contract
`export default function DoctorDashboard()` in src/components/app/doctor/index.tsx. Wrap everything in DashboardShell (import default from "@/components/app/dashboard-shell"; props: roleLabel="Doctor Dashboard", navItems (array of {key, label, icon: LucideIcon, badge?}), activeSection, onSectionChange). Use `useAppStore()` from "@/lib/app-state": doctorSection + setDoctorSection(key).

## State & helpers (READ these files first)
- Store: useAppStore from "@/lib/app-state" — { user (SessionUser), lang, doctorSection, setDoctorSection, logout }.
- API client from "@/lib/api-client": apiGet<T>(url), apiPost<T>(url, body), apiPatch<T>(url, body), apiPut<T>(url, body), apiDelete<T>(url) — THROW ApiCallError (err.message = server message). Envelope {ok:true,data}|{ok:false,error{message,code}}.
- Shared kit from "@/components/app/shared/ui-kit": useT() → {lang, t(key, vars?)}; Money; AppointmentStatusBadge; VerificationBadge; PatientTypeBadge; PaymentStatusBadge; PageHeader; StatCard {label,value,hint,icon,tone}; SectionCard {title,action,children}; Stars; LoadingCard; EmptyState; ErrorState; DemoNotice; UserAvatar; fmtTime, fmtDate, fmtDateLong, fmtDateTime, dhakaToday, addDaysStr, DAY_LABELS.
- Types from "@/lib/types": AppointmentDto, DoctorDashboardData, FeeSettingsDto, FeeHistoryItem, VisitHistoryItem, SessionUser.
- Toast from "@/hooks/use-toast". Icons lucide-react. NO emojis.
- i18n keys (read src/lib/i18n.ts): doctorNav.*, status.*, pay.*, type.*, common.* — for other copy use plain English.

## Design system (STRICT)
- Primary #1769AA (bg-primary etc.), teal #13A89E secondary, bg #F4F8FC, white cards rounded-2xl shadow-soft, text #172B4D, muted #718096. Semantic Tailwind tokens only (bg-card, text-muted-foreground, bg-primary-soft, border-border) — never raw hex.
- Desktop: content grid, stat cards row, tables for lists. Mobile: shell collapses sidebar to drawer — use responsive grids (grid gap-4 sm:grid-cols-2 xl:grid-cols-4); wrap tables in overflow-x-auto or use card lists on mobile.
- Every section: loading (LoadingCard/Skeleton), empty (EmptyState), error (ErrorState with retry). Destructive actions (reject, cancel, delete chamber) need AlertDialog confirmation.

## API contracts (backend exists — verify with curl if unsure; session: curl -c /tmp/doc.jar then POST /api/v1/auth/login with {"email":"doctor@medbriq.dev","password":"Doctor@123"})
1. GET /api/v1/doctor/dashboard → DoctorDashboardData { stats: {todayTotal, pendingRequests, confirmedUpcoming, completedTotal, ratingAvg, ratingCount, earnings: {completedRevenue, platformCommission, netEarnings, currency}}, pending: AppointmentDto[], upcoming: AppointmentDto[], availability: [{id, dayOfWeek (0=Sun..6=Sat), startMinute, endMinute, isActive}] }
2. GET /api/v1/doctor/appointments?status=&date=YYYY-MM-DD&limit= → {items: AppointmentDto[]} — full status list. AppointmentDto: id, referenceCode, status, type, bookingMode, fee, currency, slotStart, slotEnd, patientName, patientPhone, patientAge, patientGender, notes, doctorNote, consultationNote, paymentStatus, consultationStatus, refundStatus, patientType, feeSettingsVersion, pricedAt, createdAt, chamberId, chamberName, doctor {slug, name, city, consultationFee, specialties[]}, patientId.
3. POST /api/v1/appointments/{id}/approve — confirms PENDING_APPROVAL.
4. POST /api/v1/appointments/{id}/reject {reason?}
5. POST /api/v1/appointments/{id}/complete {consultationNote?: string|null} — marks completed (establishes returning-patient eligibility).
6. POST /api/v1/appointments/{id}/no-show
7. POST /api/v1/appointments/{id}/cancel {reason?} (doctor-side cancel)
8. GET /api/v1/doctor/fee-settings → FeeSettingsDto {newPatientFee, returningPatientFee, returningValidityValue, returningValidityUnit: "DAYS"|"MONTHS", followUpEnabled, followUpFee, followUpValidityValue, followUpValidityUnit, version, updatedAt}. PUT same URL with full body {newPatientFee, returningPatientFee, returningValidityValue, returningValidityUnit, followUpEnabled, followUpFee, followUpValidityValue, followUpValidityUnit}.
9. GET /api/v1/doctor/fee-settings/history → {items: FeeHistoryItem[]} (version, fee fields, changeReason, changedBy, createdAt).
10. GET /api/v1/doctor/availability → {items: [{id, dayOfWeek, startMinute, endMinute, isActive}]}; PUT /api/v1/doctor/availability {rules: [{dayOfWeek, startMinute, endMinute, isActive}]} — replaces all rules (minutes from midnight; validate end > start, ≤1440).
11. GET /api/v2/doctor/chambers → {items: [{id, name, address, city, area, phone, isActive, createdAt}]}; POST {name, address, city, area?, phone?}; PATCH /api/v2/doctor/chambers/{id} partial; DELETE /api/v2/doctor/chambers/{id} (409 if upcoming bookings — show server message).
12. GET /api/v1/doctor/patients/visits?phone=01XXXXXXXXX → {items: VisitHistoryItem[]} (id, appointmentId, patientName, slotStart, completedAt, qualifying, paymentStatusAtCompletion) — this doctor's visit history for that phone.
13. GET /api/v1/doctor/profile → doctor profile (bio, experienceYears, consultationFee, followUpFee, regNumber, verificationStatus, city, chamberAddress, languages, supportsVideo, requiresApproval, slug). PUT /api/v1/doctor/profile {bio?, experienceYears?, consultationFee?, followUpFee?, regNumber?, city?, chamberAddress?, languages?, supportsVideo?, requiresApproval?}.
14. GET /api/v1/doctors/{slug}/reviews → {items: ReviewItem[]}.
15. GET /api/v2/auth/context → {role, doctor: {id, slug, verificationStatus, chamberCount}}.

## Sections to build (nav order)
1. **overview**: greeting + verification banner (if user.verificationStatus !== "VERIFIED" show amber banner with status + "Profile activates after admin verification"); stat cards (today's appointments, pending approvals, confirmed upcoming, completed total, rating, net earnings); today's queue preview (GET doctor/appointments?date=dhakaToday()); recent pending requests with Approve/Reject actions; earnings summary. DemoNotice.
2. **queue** (Today's Patient Queue): appointments for today (date=dhakaToday()) sorted by time; card list: time, patient name/age/gender, PatientTypeBadge, paymentStatus, chamber, phone; actions per status: PENDING_APPROVAL → Approve/Reject; CONFIRMED → Complete (dialog with consultationNote textarea) / No-show / Cancel; COMPLETED → show consultationNote; others → status badge.
3. **appointments**: status filter tabs (All, Pending approval, Confirmed, Completed, Cancelled, No-show, Rejected); searchable list (client-side by patient name/referenceCode); each row: date/time, patient, patientType badge, fee, status, payment, chamber; row click → details dialog (all fields incl. notes, doctorNote, consultationNote, feeSettingsVersion) with status actions.
4. **patients**: phone search input; results: GET /api/v1/doctor/patients/visits?phone=... → visit history cards (date, qualifying badge, paymentStatusAtCompletion); privacy note "Only your own visits with this patient are visible"; empty state if none.
5. **fees** (CRITICAL FEATURE): current settings card (New patient fee, Returning patient fee, validity e.g. "6 months" or "75 days", follow-up enabled/fee/validity, version, updatedAt); edit form (Dialog or inline): newPatientFee, returningPatientFee (৳ numbers), validity presets (1/2/3/6/12 months) + custom (value + unit DAYS/MONTHS), follow-up toggle + fee + validity; PUT → toast "Fee settings updated — new bookings use the new version. Existing confirmed bookings keep their price."; fee history table (version, fees, validity, reason, date) with "current" badge on latest; explanatory note: "Classification: first completed visit = New; bookings within your validity window after a completed visit = Returning. Only completed consultations count."
6. **schedule**: weekly availability editor — 7 day rows (DAY_LABELS), each with time ranges (start/end selects in 30-min increments 06:00–22:00), multiple ranges per day, add/remove range; "Save schedule" → PUT availability {rules}; note slot length is 30 minutes. Use minutes math (17:00 = 1020).
7. **chambers**: list chambers (name, address, city/area, phone, active badge); add dialog (name, address, city, area?, phone?); edit dialog; deactivate toggle (PATCH isActive); delete with AlertDialog (server 409s if upcoming bookings — toast the server message).
8. **earnings**: stat cards from dashboard stats.earnings (gross, commission, net); payment breakdown from GET doctor/appointments?status=COMPLETED (fee sums by paymentStatus, online vs at-chamber); monthly bars: pure CSS div bar chart of completed revenue per month (group by slotStart.slice(0,7), last 6 months); note "Sandbox earnings — platform commission simulated at 10%".
9. **reviews**: list from GET /api/v1/doctors/{slug}/reviews (slug from /api/v2/auth/context or profile); Stars + comment + date; rating summary (avg from dashboard stats).
10. **profile** (My Profile): profile card (name, email, VerificationBadge + verificationNote if present, regNumber, city); edit form: bio (textarea), experienceYears, consultationFee, followUpFee, city, chamberAddress, languages (checkbox chips bn/en/hi), supportsVideo switch (with note "requires regulatory approval before activation"), requiresApproval switch (approval vs instant bookings) → PUT profile; "Submit for verification" button if verificationStatus !== VERIFIED (PUT profile with regNumber then toast "Submitted for admin review").
11. **settings**: account (name/phone via PATCH /api/v1/auth/me), language switcher (setLang), notification preferences (UI toggles), sign out (logout()), DemoNotice with demo account info.

## Quality gates
1. `cd /home/z/my-project && bun run lint` — fix ALL errors in YOUR files. Traps: no components defined inside components; no setState called synchronously in useEffect body (use apiGet(...).then(setX).catch(...) pattern); no unused imports.
2. Verify with agent-browser (installed): `agent-browser open http://localhost:3000/`, `agent-browser snapshot -i`, expand "Demo accounts" accordion on auth screen, click "Doctor — Dr. Ayesha Rahman" to sign in. Walk every section: overview loads stats; queue shows appointments (approve one pending if present); fees → edit and save a fee change; schedule → save; chambers → 2 chambers listed; patients → search 01 series phone; earnings; reviews; profile. Screenshots /tmp/doc-*.png. Check `agent-browser errors`; tail last 30 lines of dev.log.
3. Responsive: `agent-browser set viewport 375 700` screenshot (no horizontal overflow) + `agent-browser set viewport 1440 900`.

## Demo facts
doctor@medbriq.dev / Doctor@123 = Dr. Ayesha Rahman, VERIFIED, medicine-diabetology, 2 chambers, fee v1: new ৳1000/returning ৳600/6 months, requiresApproval=true, has pending + confirmed + completed appointments.

Reply when done with: files created, lint status, verification walkthrough (tested, fixes), known limitations. Never touch files outside src/components/app/doctor/, never modify APIs, never restart the dev server.
