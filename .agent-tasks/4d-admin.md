# Task 4-d: Super Admin Panel — MedBricBD

Your Task ID: 4-d. You are building the SUPER ADMIN WEB PANEL for MedBricBD, a Bangladesh healthcare platform. UI-only work on an existing Next.js 16 project — the backend is DONE and must NOT be modified.

## Project facts
- Root: /home/z/my-project. Dev server ALREADY RUNNING on port 3000 (do NOT restart, do NOT run build, never `next build`).
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui in src/components/ui (button, card, input, label, select, tabs, dialog, alert-dialog, badge, avatar, skeleton, textarea, separator, switch, table, popover, dropdown-menu, scroll-area, sheet, toast, etc.)
- Single-route SPA: "/" renders src/components/app/app.tsx → role ADMIN renders YOUR component. NO new routes, NO server components.

## Files you own (ONLY touch these)
REPLACE the stub src/components/app/admin/index.tsx. Create sections under src/components/app/admin/sections/*.tsx. NEVER touch anything outside src/components/app/admin/.

## Required export contract
`export default function AdminDashboard()` in src/components/app/admin/index.tsx. Wrap in DashboardShell (import default from "@/components/app/dashboard-shell"; props: roleLabel="Super Admin", navItems: {key,label,icon:LucideIcon,badge?}[], activeSection, onSectionChange). Use useAppStore() from "@/lib/app-state": adminSection + setAdminSection.

## State & helpers (READ these files first)
- Store: useAppStore from "@/lib/app-state" — { user, lang, adminSection, setAdminSection, logout }.
- API client from "@/lib/api-client": apiGet<T>, apiPost<T>, apiPatch<T>, apiPut<T>, apiDelete<T> — THROW ApiCallError (err.message = server message). Envelope {ok:true,data}|{ok:false,error{message,code}}.
- Shared kit from "@/components/app/shared/ui-kit": useT() → {lang,t(key,vars?)}; Money; AppointmentStatusBadge; VerificationBadge; PatientTypeBadge; PaymentStatusBadge; PageHeader; StatCard; SectionCard; Stars; LoadingCard; EmptyState; ErrorState; DemoNotice; UserAvatar; fmtTime, fmtDate, fmtDateLong, fmtDateTime, dhakaToday, addDaysStr, DAY_LABELS.
- Types from "@/lib/types": AdminStats, AdminUserItem, VerificationItem, AuditLogItem, ModerationReviewItem, SessionUser, SpecialtyInfo.
- Toast from "@/hooks/use-toast". Icons lucide-react. NO emojis.
- i18n keys (src/lib/i18n.ts): adminNav.*, status.*, pay.*, type.*, common.* — else plain English.

## Design system (STRICT)
Primary #1769AA, teal #13A89E, bg #F4F8FC, white cards rounded-2xl shadow-soft, text #172B4D, muted #718096. Semantic Tailwind tokens only — no raw hex. Desktop-first: dense but breathable data tables (overflow-x-auto, text-sm, hover rows), stat card grids, filter tabs. Mobile: tables become card lists (NO horizontal-scroll-only tables on phones). Every section: loading, empty, error states. Verification decisions and destructive actions → AlertDialog confirm with reason input where relevant.

## API contracts (ADMIN session: admin@medbriq.dev / Admin@Medbriq123; test with curl -c /tmp/adm.jar + POST /api/v1/auth/login)
IMPORTANT: v1 routes' exact contracts may differ slightly — READ the route files under src/app/api/v1/admin/ BEFORE wiring (especially the verifications decision body and the users status body).

v1 endpoints:
1. GET /api/v1/admin/stats → AdminStats {totalUsers, totalPatients, totalDoctors, verifiedDoctors, pendingDoctors, totalAppointments, confirmedAppointments, pendingApprovals}
2. GET /api/v1/admin/users?role=&q= (READ src/app/api/v1/admin/users/route.ts for exact params) → {items: AdminUserItem[]} — {id, name, email, phone, role, status, provider, phoneVerified, createdAt, doctorSlug, verificationStatus}
3. POST /api/v1/admin/users/{id}/status {…} (READ the [id]/status route file for the exact body — likely {status: "ACTIVE"|"SUSPENDED"})
4. GET /api/v1/admin/doctors → doctor list (read route for shape)
5. GET /api/v1/admin/verifications → {items: VerificationItem[]} — pending doctor verifications {userId, doctorId, slug, name, email, phone, city, regNumber, experienceYears, consultationFee, bio, specialties[], verificationStatus, verificationNote, submittedAt}
6. POST /api/v1/admin/verifications/{doctorId}/decision {…} (READ the decision route file for the EXACT action field names and values before wiring!)
7. GET /api/v1/admin/reviews → {items: ModerationReviewItem[]} and PATCH/DELETE /api/v1/admin/reviews/{id} (read the [id] route for supported actions)
8. GET /api/v1/admin/audit-logs?limit= → {items: AuditLogItem[]} — {id, action, entity, entityId, meta, createdAt, actorName}
9. GET /api/v1/specialties → {items: SpecialtyInfo[]}

v2 endpoints (read src/app/api/v2/admin/[...path]/route.ts for exact shapes):
10. GET /api/v2/admin/hospitals → {items: [{id, name, slug, city, address, phone, verificationStatus, verificationNote, managerName, managerEmail, doctorCount, branchCount}]}
11. POST /api/v2/admin/hospitals/{id}/decision {status: "PENDING"|"UNDER_REVIEW"|"VERIFIED"|"REJECTED", note?}
12. GET /api/v2/admin/payments → {items: [{id, appointmentId, referenceCode, doctorName, patientName, method, amount, currency, status, txnRef, createdAt, paidAt}], totals: {count, succeededAmount, refundedAmount, currency}}
13. POST /api/v2/admin/payments/refund {paymentId}
14. GET /api/v2/admin/flags → {items: [{key, enabled, description, updatedAt}]}
15. PUT /api/v2/admin/flags {key, enabled}
16. GET /api/v2/admin/platform → {settings: [{key, value, updatedAt}], countries: [{id, code, name, currency, phoneCode, isActive}]}
17. PUT /api/v2/admin/platform {key, value} — commissionPercent must be 0–50
18. GET /api/v2/admin/system → {status, dbLatencyMs, dataStore, runtime: {node, platform, uptimeSeconds}, counts: {users, doctors, hospitals, appointments, payments, tickets, flags}}
19. GET /api/v2/support (admin sees all) → {items: [{id, subject, message, category, status, priority, reply, createdAt, updatedAt, requesterName, requesterEmail}]}; PATCH /api/v2/support/{id} {status?, priority?, reply?}
20. GET /api/v2/meta → {flags, settings, countries}

## Sections to build (nav order)
1. **overview**: "Global overview" — stat card grid (total users, patients, doctors verified/pending, appointments total/confirmed/pending approvals, hospitals verified/pending — derive hospital counts from /api/v2/admin/hospitals); platform pulse card: telehealth flag status (amber "Disabled — pending regulatory review" — CORRECT behavior, don't make it look broken), onlinePayments flag, commission %, data store; recent audit log preview (5 rows); DemoNotice.
2. **patients**: user directory role=PATIENT (GET /api/v1/admin/users with role param — verify name); search by name/email (client-side); table: name, email, phone, provider badge (credentials/google/phone), status, joined date; row action: suspend/activate (AlertDialog confirm → POST status).
3. **doctors**: tabs "All doctors" / "Verification queue"; verification queue: application cards (name, BMDC regNumber, specialty, city, experience, fee, bio preview, submitted date, current status + note) with Approve (green) / Reject (red — reason required in dialog) / Request more info (amber, note) actions → POST decision (use the EXACT body the route expects) → toast + refresh; all doctors table: name + VerificationBadge, specialty, city, status, joined.
4. **hospitals**: hospital cards: name, city, manager (name/email), doctors count, branches count, VerificationBadge; pending ones with Review → dialog (details + Approve/Reject/Under review with note) → POST decision; verified list below.
5. **appointments** (aggregate monitor): NO admin per-appointment endpoint exists — build an honest aggregate view: stats cards from /api/v1/admin/stats + doctor activity table from GET /api/v1/doctors?sort=rating&pageSize=24 (doctor, city, fee, rating, availability label) + recent payments ledger reference (link-hint "Per-appointment drill-down lives in doctor & hospital dashboards"). NO fake data.
6. **payments**: totals stat cards (transactions, succeeded amount, refunded amount); payments table: date, reference, doctor, patient, method (bKash/Nagad/Card badges), amount, txnRef, status badge; refund action (AlertDialog) on SUCCEEDED payments → POST refund → toast + refresh; note "Sandbox payment simulation — no real money".
7. **platform**: feature flags list with Switch toggles (telehealth with warning icon + description "disabled until DGHS telemedicine compliance review", onlinePayments, patientRecords, reviews) → PUT flags (toast on change); commission percent editor (number input + save → PUT platform, validate 0–50); support contacts (supportPhone, supportEmail editable → PUT platform); countries table (code, name, currency, phoneCode, active badge); specializations list from /api/v1/specialties (name, nameBn, doctorCount) — read-only.
8. **reviews**: moderation queue from /api/v1/admin/reviews — cards: Stars, comment, patientName → doctorName, date; actions per what the [id] route supports (read it first — implement exactly).
9. **tickets**: support tickets from GET /api/v2/support — status tabs (Open, In progress, Resolved, Closed, All); ticket cards: subject, category badge, priority badge (URGENT red / HIGH amber), requester, message, date; detail dialog: full message + reply textarea + status/priority selects → PATCH /api/v2/support/{id} → toast + refresh.
10. **audit**: audit log table from /api/v1/admin/audit-logs?limit=100 — time (fmtDateTime), actor, action badge (color by verb: green APPROVE/VERIFIED, red REJECT/REFUND, blue UPDATE), entity + entityId, meta preview (expandable dialog with pretty JSON). max-h-96+ overflow with app-scroll.
11. **security** (Security & RBAC): role permission matrix (static table: PATIENT/DOCTOR/HOSPITAL/ADMIN × capabilities — book appointments, own records only, doctor queue, fee settings, hospital branches, verifications, feature flags — check/x icons); data-residency note ("SQLite local / Firestore when configured — data stays in the deployment region"); emergency banner "Call 999 for medical emergencies".
12. **system**: system health from /api/v2/admin/system — status card (green "Healthy"), DB latency, data store, runtime (node version, platform, uptime), entity counts grid; last-check timestamp + refresh button.

## Quality gates
1. `cd /home/z/my-project && bun run lint` — fix ALL errors in YOUR files. Traps: no nested component definitions; no synchronous setState in useEffect body (use apiGet(...).then(setX).catch(...)); no unused imports.
2. Verify with agent-browser (installed): open http://localhost:3000/, expand "Demo accounts", click "Super Admin — Platform" to sign in. Walk ALL 12 sections: overview stats load; doctors → verification queue (approve or reject one pending doctor — check seeded pending doctors exist); hospitals → approve a pending hospital; payments → refund a SUCCEEDED payment; flags → toggle onlinePayments off and back on; tickets → reply to an open ticket; audit → verify new rows appear from your actions. Screenshots /tmp/adm-*.png. Check `agent-browser errors`; tail last 30 lines of dev.log.
3. Responsive: `agent-browser set viewport 375 700` + `agent-browser set viewport 1440 900` screenshots.

## Demo facts
admin@medbriq.dev / Admin@Medbriq123. Seeded: 18 users, 12 doctors (several PENDING verification), 4 hospitals (1 VERIFIED Greenview + 3 PENDING), 2 SUCCEEDED sandbox payments, 3 support tickets, 4 feature flags (telehealth OFF intentionally — regulatory gate).

Reply when done with: files created, lint status, verification walkthrough (tested + fixed), known limitations. Never touch files outside src/components/app/admin/, never modify APIs, never restart the dev server.
