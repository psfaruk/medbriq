# Task 4-a: Patient Mobile-First App — MedBricBD

Your Task ID: 4-a. You are building the PATIENT MOBILE-FIRST APP for MedBricBD, a Bangladesh healthcare platform (doctor discovery + appointment booking). This is UI-only work on an existing Next.js 16 project — the backend is DONE and must NOT be modified.

## Project facts
- Root: /home/z/my-project. Dev server ALREADY RUNNING on port 3000 (do NOT restart it, do NOT run build, never use `next build`).
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui components already in src/components/ui (button, card, input, label, select, tabs, dialog, alert-dialog, sheet, badge, avatar, skeleton, textarea, radio-group, checkbox, separator, popover, calendar, input-otp, toast, dropdown-menu, scroll-area, switch, table, alert, collapsible, accordion, etc.)
- Single-route SPA: the ONLY page is "/" (src/app/page.tsx renders src/components/app/app.tsx). NO new routes. NO server components — everything 'use client'.
- Your component renders inside PatientShell (src/components/app/patient-shell.tsx) which already provides: top bar, mobile bottom tab nav (Home/Doctors/Bookings/Records/Profile), account dropdown, footer. You build ONLY the screen content.

## Files you own (ONLY touch these)
REPLACE the stub at src/components/app/patient/index.tsx with your real implementation. Create screens under src/components/app/patient/screens/*.tsx. NEVER touch any file outside src/components/app/patient/. Never edit shared files, API routes, i18n, schema, or package.json.

## Required export contract
`export default function PatientApp()` in src/components/app/patient/index.tsx — reads the current screen from the store and renders it:
- { name: "home" } → HomeScreen
- { name: "doctors" } → DoctorsScreen (search + filters + results)
- { name: "doctor"; slug: string } → DoctorProfileScreen (props: slug)
- { name: "booking"; slug: string } → BookingFlowScreen (props: slug) — the full multi-step booking
- { name: "bookings" } → BookingsScreen (upcoming + history tabs)
- { name: "appointment"; id: string } → AppointmentDetailsScreen (props: id)
- { name: "records" } → RecordsScreen (visit history + family members)
- { name: "profile" } → ProfileScreen (account settings, language, help/support, privacy)
- { name: "notifications" } → NotificationsScreen
- { name: "specialties" } → SpecialtiesScreen (specialty directory, tap → doctors filtered)
- { name: "hospitals" } → HospitalsScreen (hospital directory)
- { name: "hospital"; slug: string } → HospitalDetailScreen (props: slug)

## State & helpers (READ these files first)
- `useAppStore` from "@/lib/app-state": { lang, user, patientScreen, pushPatient(screen), popPatient(), resetPatient(screen), otpPhone, logout }. Navigation: pushPatient({name:"doctor", slug}) etc. Back: popPatient(). Tab reset: resetPatient({name:"doctors"}).
- API client from "@/lib/api-client": `apiGet<T>(url)`, `apiPost<T>(url, body)`, `apiPatch<T>(url, body)`, `apiDelete<T>(url)` — they THROW ApiCallError (err.message = server's message) on failure. Envelope: {ok:true,data} | {ok:false,error:{message,code}}.
- Shared UI kit from "@/components/app/shared/ui-kit": useT() → {lang, t(key, vars?)}; Money (BDT ৳ formatting); AppointmentStatusBadge, VerificationBadge, PatientTypeBadge, PaymentStatusBadge; PageHeader {title, subtitle, action, onBack}; StatCard; SectionCard {title, action, children}; Stars; LoadingCard; EmptyState {icon,title,hint,action}; ErrorState {message,onRetry}; DemoNotice; UserAvatar; fmtTime(iso), fmtDate(iso), fmtDateLong(iso), fmtDateTime(iso), dhakaToday(), addDaysStr(dateStr,days), DAY_LABELS.
- Types from "@/lib/types": DoctorCard, DoctorDetail, SlotInfoDto, AppointmentDto, SpecialtyInfo, HospitalInfo, ReviewItem, PricePreviewDto, FeeSettingsDto.
- Toast: `const { toast } = useToast()` from "@/hooks/use-toast" → toast({ title, description, variant: "destructive" }).
- Icons: lucide-react. NO emojis anywhere.
- t() keys available (see src/lib/i18n.ts — READ IT): nav.*, home.*, search.*, doctor.*, booking.*, appointments.*, records.*, profile.*, status.*, pay.*, type.*, common.*. For anything not in the dictionary use plain English strings. Never edit i18n.ts.

## Design system (STRICT)
- Primary #1769AA (use bg-primary / text-primary Tailwind classes), secondary teal #13A89E, background #F4F8FC, cards white rounded-2xl with shadow-soft, text #172B4D, muted #718096, success #16A34A, warning #D97706, error #DC2626. Use Tailwind semantic tokens (bg-card, text-foreground, text-muted-foreground, bg-primary-soft, border-border) — NOT raw hex.
- Mobile-first: design for 375px first, enhance for desktop (max-w-6xl container already provided). Touch targets ≥ 44px. Bottom nav handled by the shell (it adds pb-24 md:pb-8 padding).
- Every screen: clear title (PageHeader), ONE primary action, skeleton loading (LoadingCard or Skeleton), empty state (EmptyState), error state (ErrorState with retry). Long lists: max-h-96+ overflow-y-auto with class "app-scroll".
- Cards: rounded-2xl border border-border bg-card shadow-soft, hover lift via "card-lift" class where clickable. Subtle transitions only. No gradients except "bg-brand-gradient" (blue→teal) for the hero banner.

## Screens to build (all 12)

1. **HomeScreen**: greeting (t("home.greeting", {name: user.name.split(" ")[0]})), search input (tap → pushes doctors screen), quick action grid (Find Doctor, My Bookings, Family Records, Specialties), specialty chips row (from API), "Top rated doctors" horizontal cards (GET /api/v1/doctors?sort=rating&pageSize=6&verified=true), upcoming appointments preview (GET /api/v1/appointments → filter future non-cancelled, take 2, tap → appointment screen). Slim hero banner (bg-brand-gradient) with "Book your next visit in minutes" + CTA. DemoNotice at bottom.

2. **DoctorsScreen** (search + filters + results): sticky search input; filter row (specialty Select, city Select, "Available today" toggle chip, "Verified" chip, max fee Select); results list of doctor cards: avatar, name + VerificationBadge, specialty tags, city + experience, Stars rating, fee "৳ X" + "New patient" hint, nextAvailableLabel chip, "View profile" primary button → pushPatient({name:"doctor", slug}). Use GET /api/v1/doctors?q=&specialty=&city=&availableToday=&verified=true&maxFee=&sort=&page=1&pageSize=12 → {items, total}. GET /api/v1/specialties for filter options, GET /api/v1/meta for cities (data.cities). Empty state + count display.

3. **DoctorProfileScreen(slug)**: back button (popPatient); header card: avatar, name, specialties, VerificationBadge, Stars, city, experience years, languages (bn→বাংলা, en→English); fee card showing feeStructure (New patient / Returning patient fees + validity "X months|days" from feeStructure.returningValidityValue+Unit; fallback: consultationFee); About (bio); chambers list (detail.chambers — name, address, city); weekly schedule (detail.weeklySchedule: dayOfWeek 0=Sun..6=Sat, startMinute/endMinute → format HH:MM 24h or 12h); reviews (GET /api/v1/doctors/{slug}/reviews → {items: ReviewItem[]}) with Stars + comment + relative date; prominent "Book appointment" button → pushPatient({name:"booking", slug}). VIDEO: if doctor.supportsVideo show "Video consultation — coming soon" disabled chip (telehealth flag off; fetch GET /api/v2/meta → data.flags.telehealth).

4. **BookingFlowScreen(slug)** — THE CORE FLOW, multi-step wizard with progress indicator (chips: Chamber → Date & Time → Details → Confirm):
   - Step 1 Chamber: fetch doctor detail (GET /api/v1/doctors/{slug}); if detail.chambers.length > 1 show selectable cards (name/address/area), if 1 auto-select, if 0 use chamberAddress text.
   - Step 2 Date & Time: date strip (horizontal scroll of next 14 days from dhakaToday() — day label, date number, "Today"/"Tomorrow" highlight); slots grid from GET /api/v1/doctors/{slug}/slots?date=YYYY-MM-DD&chamberId={id} → {slots: [{startIso,endIso,label,taken,past}]}; group by Morning (<12h)/Afternoon (12-17h)/Evening (≥17h) via Dhaka hour from startIso (new Date(startIso).getHours() with timeZone Asia/Dhaka or UTC+6 math); taken/past slots disabled. Empty state: t("booking.noSlots").
   - Step 3 Patient Details: "For myself" vs "For a family member" (radio cards; family list from GET /api/v2/patient/family with "Add member" inline dialog → POST {name, relation: SELF|SPOUSE|CHILD|PARENT|SIBLING|OTHER, age?, gender?, phone?}); patient name/phone/age/gender prefilled from user when self; notes textarea (optional, 500 chars). Validation: name ≥2, phone valid BD (01XXXXXXXXX or +880...).
   - Step 4 Fee breakdown + Confirm: POST /api/v1/booking/price-preview {doctorSlug, patientPhone} → PricePreviewDto {patientType: NEW|RETURNING|FOLLOW_UP, fee, currency, explanation, basis, feeSettings}. Show PatientTypeBadge + explanation + fee rows + payment choice ("Pay online (sandbox)" bKash/Nagad/Card radio vs "Pay at chamber" CASH) + total. Confirm → POST /api/v1/appointments {doctorSlug, date, slotStartIso, type: "IN_PERSON", chamberId?, patientName, patientPhone, patientAge?, patientGender?, notes?, expectedFee, expectedPatientType, idempotencyKey: crypto.randomUUID()} → {appointment, referenceCode}. If 409 PRICE_CHANGED → re-fetch preview + toast "Price changed — please review". On success: if payment !== CASH → POST /api/v2/payments {appointmentId, method} (labelled sandbox); then success screen: big check icon, status (CONFIRMED vs PENDING_APPROVAL messaging), referenceCode, doctor summary, fee, "View appointment" → resetPatient({name:"bookings"}).
   - Errors via toast + inline ErrorState.

5. **BookingsScreen**: tabs Upcoming | History. GET /api/v1/appointments → {items: AppointmentDto[]}. Upcoming: status PENDING_APPROVAL or CONFIRMED and slotEnd in future, sorted by slotStart asc. History: everything else sorted desc. Card: doctor name, specialty, fmtDateTime(slotStart), chamberName, AppointmentStatusBadge, PaymentStatusBadge, PatientTypeBadge, fee Money; tap → appointment details screen (pushPatient({name:"appointment", id})). Empty states with "Find a doctor" CTA.

6. **AppointmentDetailsScreen(id)**: fetch /api/v1/appointments, find by id; full details: status badges, referenceCode (copy button), doctor + chamber + date/time card, patient info, fee breakdown (patientType, fee, paymentStatus), notes, consultationNote (if COMPLETED), actions: Reschedule (dialog: date strip + slots via GET /api/v1/doctors/{doctor.slug}/slots?date= then POST /api/v1/appointments/{id}/reschedule {newDate, newSlotStartIso}), Cancel (AlertDialog → POST /api/v1/appointments/{id}/cancel {reason?} → toast + refresh), Pay now (if paymentStatus === "PENDING": POST /api/v2/payments {appointmentId, method: BKASH}), Video consultation: if type VIDEO → waiting room placeholder with honest notice "Video consultations are pending regulatory approval — you will be notified when enabled." Review: if COMPLETED → stars + comment dialog → POST /api/v1/doctors/{doctor.slug}/reviews {rating, comment}.

7. **RecordsScreen**: two sections. Visit history: COMPLETED appointments — cards with doctor, date, consultationNote preview, fee. Family members: list from GET /api/v2/patient/family (name, relation badge, age, phone), add/edit dialog (POST/PATCH /api/v2/patient/family, DELETE /api/v2/patient/family/{id} with confirm). Note "Records are private — only you and your treating doctors can see them."

8. **ProfileScreen**: user card (avatar, name, email, phone); account section (edit name/phone → PATCH /api/v1/auth/me {name?, phone?}); language section (English/বাংলা radio → setLang); notification settings (UI-only toggles); privacy section (static text); Help & support (ticket form → POST /api/v2/support {subject, message, category}; list existing via GET /api/v2/support with status badges); sign out (logout()).

9. **NotificationsScreen**: list from GET /api/v1/notifications → {items: NotificationItem[]}; unread highlighted; "Mark all read" → POST /api/v1/notifications/read-all; item tap → mark read + navigate to appointment if meta.appointmentId (meta is JSON string).

10. **SpecialtiesScreen**: grid of specialty cards (icon circle, name, nameBn, doctorCount) from GET /api/v1/specialties → tap → doctors with specialty filter (export a `searchPreset` object from patient/index.tsx: `export const searchPreset: {specialty?: string; q?: string} = {}` that DoctorsScreen reads and clears on mount).

11. **HospitalsScreen**: cards from GET /api/v1/hospitals → {items: HospitalInfo[]} (name, city, address, doctorCount) → tap → hospital detail.

12. **HospitalDetailScreen(slug)**: find in /api/v1/hospitals list; about, address, phone, doctorCount + doctors of that hospital (filter client-side from GET /api/v1/doctors?pageSize=24 matching doctor.hospitalName) → doctor cards → doctor profile.

## Quality gates
- Run `cd /home/z/my-project && bun run lint` — fix ALL errors in YOUR files. Traps: NO components defined inside components; NO setState called synchronously inside useEffect body (use `apiGet(...).then(setX).catch(...)` inside the effect); remove unused imports.
- Verify with agent-browser (installed): `agent-browser open http://localhost:3000/`, `agent-browser snapshot -i`, on the auth screen click the "Demo accounts" accordion, click "Patient — Rahim Uddin" to sign in. Walk: Home → Doctors → Dr. Ayesha Rahman profile → Book → chamber → date/slot → details → confirm → booking appears in Bookings. Screenshot key screens (/tmp/pat-*.png). Fix console errors (`agent-browser errors`) and layout problems. Check dev.log tail (last ~30 lines only) for API errors.
- Responsive: `agent-browser set viewport 375 700` screenshot + `agent-browser set viewport 1280 800` screenshot.

## Demo data facts
- Dr. Ayesha Rahman (dr-ayesha-rahman): VERIFIED, 2 chambers, medicine-diabetology, new ৳1000/returning ৳600/6 months, requires approval (booking → PENDING_APPROVAL).
- Dr. Farhana Akter: instant booking (CONFIRMED immediately).
- Rahim (patient@medbriq.dev) is RETURNING with Dr. Ayesha (fee ৳600); has 3 family members.
- patient3@medbriq.dev (Abdul Karim / Patient@123) is NEW with Dr. Ayesha (fee ৳1000).

Reply when done with: files created, lint status, verification walkthrough (what worked, what you fixed), known limitations. Never touch files outside src/components/app/patient/, never modify APIs, never restart the dev server.
