# Public Portal Upgrade — Phase 0 Audit & Implementation Plan

> Product goal: transform MedBricBD from a login-first appointment app into a
> **public healthcare discovery portal** (no login to browse) with a
> **login-gated application** (booking, records, dashboards) behind it.
> Original request: "Public Healthcare Discovery Portal + Login-Gated Application".

---

## 1. Current route audit (as found)

### User-visible surface
| Route | File | Renders |
|---|---|---|
| `/` | `src/app/page.tsx` | `<App/>` — single-route SPA shell |
| 404 | (default) | unstyled Next 404 |

`App` (`src/components/app/app.tsx`) boots via `GET /api/v1/bootstrap`, then:
- guest → **AuthScreen** (the login wall — this is what the homepage must stop being)
- `PATIENT` → `PatientShell` + `PatientApp` (screens: home, doctors, doctor, booking, bookings, appointment, records, profile, notifications, specialties, hospitals, hospital)
- `DOCTOR` / `HOSPITAL` / `ADMIN` → lazy dashboards (sidebar sections)

Navigation is zustand-driven (`src/lib/app-state.ts`) — **no URL routing**.
i18n: `src/lib/i18n.ts` (en/bn dictionaries, `t()` + `useT()`), persisted.

### API surface (v1 public unless noted)
| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/v1/bootstrap` | – | session + authConfig + specialties + homeDoctors + appointments |
| `GET /api/v1/meta` | – | cities, languages, platformStats, dataStore |
| `GET /api/v1/doctors` | – | `q, specialty, city, language, video, verified, maxFee, availableToday, page, pageSize, sort` |
| `GET /api/v1/doctors/[slug]` | – | full `DoctorDetail` incl. chambers, feeStructure |
| `GET /api/v1/doctors/[slug]/reviews` | – | public reviews |
| `GET /api/v1/doctors/[slug]/slots?date=` | – | slot grid |
| `GET /api/v1/hospitals` | – | `HospitalInfo[]` with doctorCount |
| `GET /api/v1/specialties` | – | with doctorCount |
| `GET /api/v1/auth/*` | mixed | login/register/otp/logout/config/forgot |
| `GET/POST /api/v1/appointments`, `/booking/*` | session | booking + server-side price revalidation |
| `/api/v1/doctor/*`, `/api/v1/admin/*`, `/api/v1/notifications`, `/api/v1/push` | role-gated | dashboards |
| `/api/v2/*` | session | direct-Prisma dashboards (hospital/admin/patient v2) |

### Found & fixed during audit
- `patient/parts.tsx` + `screens/doctors-screen.tsx` imported `searchPreset`
  from `./index` (moved module) → **runtime crash on the Doctors screen**.
  Fixed to import from `./preset`.
- 16 remaining pre-existing type errors (v2 admin/hospital Prisma field
  mismatches etc.) — out of scope for this upgrade, tracked separately.

---

## 2. Public/private route matrix (target)

Sandbox constraint: **only `/` is user-visible** (platform rule). All portal
"pages" are therefore views of the single-route SPA, deep-linkable via query
params (`/?view=…`). In a real multi-route deployment each view lifts to its
own route 1:1 (components are written route-portable).

| View (`?view=`) | Public? | Indexable? | Auth gate |
|---|---|---|---|
| `home` (default) | ✅ | ✅ | – |
| `doctors`, `doctor&slug=` | ✅ | ✅ (post-sandbox) | – |
| `hospitals`, `hospital&slug=` | ✅ | ✅ | – |
| `specialties` | ✅ | ✅ | – |
| `library`, `article&slug=` | ✅ | ✅ | – |
| `symptoms`, `symptom&slug=` | ✅ | ✅ | – |
| `equipment`, `equipment-item&slug=` | ✅ | ✅ | – |
| `for-patients`, `for-doctors`, `for-hospitals`, `for-providers` | ✅ | ✅ | – |
| `how-it-works`, `verification`, `emergency`, `tools`, `calendar`, `faq` | ✅ | ✅ | – |
| `auth` (login/register/forgot) | page itself public | ❌ noindex target post-sandbox | – |
| Booking flow (patient app `booking` screen) | ❌ | ❌ | **PATIENT session** |
| Records / profile / notifications | ❌ | ❌ | session |
| Doctor / hospital / admin dashboards | ❌ | ❌ | role session |

Server-side enforcement already exists (guards in `/api/v1` + `/api/v2/_lib/guards.ts`);
the portal only changes **presentation**, never authorization.

### Booking gate (spec §12)
1. Guest clicks **Book appointment** on a public doctor profile
2. `pendingBooking = { doctorSlug }` saved (zustand + sessionStorage)
3. → auth view with context banner ("Sign in to continue booking with Dr. X")
4. After PATIENT login: `resetPatient({ name:"booking", slug })`
5. Existing booking flow revalidates slot + fee **server-side** on confirm
   (already implemented — `POST /api/v1/appointments` + `classifyAndPrice`)
6. Non-patient roles: honest toast, intent cleared.

---

## 3. Homepage wireframe (18 sections, spec §2)

```
┌────────────────────────────────────────────────────────────┐
│ 1 HEADER: logo | Find Doctors Hospitals Specialties        │
│   Health Library For Doctors For Hospitals | lang ▾        │
│   [Log in] [Join platform]        (mobile: ☰ drawer+search)│
├────────────────────────────────────────────────────────────┤
│ 2+3 HERO: headline + subcopy (teal/blue, illustration)     │
│   [unified search: doctor/hospital/specialty/area ▾ city]  │
│   [Find a Doctor] [Join as a Healthcare Provider]          │
│   trust stats: verified doctors · hospitals · specialties  │
├────────────────────────────────────────────────────────────┤
│ 4 SERVICE CATEGORIES (6 cards)                             │
│ 5 FEATURED VERIFIED DOCTORS (cards → profiles)             │
│ 6 HOSPITAL & CLINIC DIRECTORY (preview cards)              │
│ 7 MEDICAL SPECIALIZATIONS (icon chips)                     │
│ 8 HEALTH TIPS & ARTICLES (3-4) + health-days teaser        │
│ 9 SYMPTOMS EDUCATION (accessible slider → guides)          │
│ 10 MEDICAL EQUIPMENT GALLERY (icon cards → guides)         │
│ 11 HOW BOOKING WORKS (7-step timeline)                     │
│ 12 ONLINE CONSULTATION (honest: disabled pending review)   │
│ 13 FOR DOCTORS (CTA band)                                  │
│ 14 FOR HOSPITALS (CTA band)                                │
│ 15 PATIENT BENEFITS (6 cards)                              │
│ 16 TRUST, VERIFICATION & SAFETY (steps + stats)            │
│ 17 FAQ (accordion)                                         │
│ 18 FOOTER (links, emergency 999 strip, disclaimer)         │
└────────────────────────────────────────────────────────────┘
```

## 4. Component inventory (new, `src/components/portal/`)

- `portal.tsx` — top shell: view router + URL sync + analytics page_views
- `header/portal-header.tsx`, `header/mobile-nav.tsx` (Sheet drawer)
- `footer/portal-footer.tsx` (emergency strip, no dead links)
- `home/hero.tsx` (search + suggest dropdown + city select)
- `home/sections.tsx` (categories, doctors, hospitals, specialties, articles,
  symptoms slider, equipment, booking steps, telehealth, CTA bands, benefits,
  trust) — grouped to keep file count sane
- `doctors/doctor-directory.tsx`, `doctors/doctor-card.tsx`, `doctors/doctor-profile.tsx`
- `hospitals/hospital-directory.tsx`, `hospitals/hospital-profile.tsx`
- `library/library-home.tsx`, `library/article-view.tsx`
- `education/symptoms-home.tsx`, `education/symptom-detail.tsx`,
  `education/equipment-home.tsx`, `education/equipment-detail.tsx`
- `landing/for-patients.tsx`, `for-doctors.tsx`, `for-hospitals.tsx`, `for-providers.tsx`
- `info/how-it-works.tsx`, `info/verification-center.tsx`, `info/emergency.tsx`,
  `info/faq-view.tsx`, `info/awareness-calendar.tsx`, `tools/bmi-calculator.tsx`
- `auth/auth-frame.tsx` (wraps existing AuthScreen + context banner)
- `shared/section.tsx` (heading/eyebrow/CTA), `shared/breadcrumbs.tsx`,
  `shared/disclaimer.tsx`, `shared/status-badges.tsx`

Reused as-is: `AuthScreen`, patient booking flow, dashboards, `ui-kit`
(`VerificationBadge`, `Stars`, `Money`, `UserAvatar`, `EmptyState`, `ErrorState`),
full shadcn/ui set, `useT()` i18n.

## 5. Content model (`src/content/`)

Typed TS modules = source of truth (version-controlled, reviewable diffs);
publication overrides persisted in DB (`PlatformSetting` keys
`content:pub:{collection}:{slug}`) via admin API. Server serves only
`status === PUBLISHED` (+ override) — the workflow gate is enforced in code.

Workflow: `DRAFT → EDITOR_REVIEW → MEDICAL_REVIEW → APPROVED → PUBLISHED`
(shipped demo articles are honestly labeled: editorial review done,
**medical review pending** — no fabricated reviewers).

```
Article        slug, title, titleBn?, summary, category, keyPoints[],
               sections[{heading, body}], whenToSeekHelp[], author{name,role},
               medicalReviewer{name,credentials}|null, status, publishedAt,
               updatedAt, reviewedAt?, sources[{title,publisher,url}],
               relatedSlugs[], emergencyNote?
SymptomGuide   slug, title, summary, whatItMeans, commonCauses[],
               whenToSeekAssessment[], redFlags[], relevantSpecialties[],
               sources[], status, dates…   (never diagnostic)
EquipmentGuide slug, name, summary, whatItIs, whatItMeasures, commonUses[],
               safeUse[], limitations[], whenProfessionalHelp[], icon,
               sources[], status, dates…   (no product endorsements)
FaqItem        audience(general|patients|doctors|hospitals), q, a
AwarenessEvent month, day?, title, description
EmergencyInfo  BD: 999 ambulance, 16263 health helpline, guidance steps
```

Categories (13 article cats + 2 hubs): general-health, nutrition,
fitness-exercise, sleep, mental-wellbeing, childrens-health, womens-health,
mens-health, elderly-care, preventive-health, medical-conditions, first-aid,
medical-tests → plus Symptoms hub + Equipment hub.

Volume (deliberate, per final instruction): **23 articles, 9 symptom guides,
9 equipment guides, ~26 FAQs, 16 awareness days** — not hundreds of thin pages.

New APIs: `GET /api/v1/content/{articles|symptoms|equipment}` (+`?slug=`,
`?category=`), `GET /api/v1/search/suggest?q=`,
`POST /api/v1/analytics/event`, `GET /api/v1/admin/analytics`,
`GET|PATCH /api/v1/admin/content[/[key]]`.

## 6. SEO implementation plan

| Item | Implementation |
|---|---|
| Titles/descriptions | `metadata` in `layout.tsx` (template + default) |
| Canonical + OG + Twitter | `metadataBase` = `APP_BASE_URL` env; OG image `/og-default.png` |
| XML sitemap | `src/app/sitemap.ts` (home + view entry URLs) |
| robots.txt | `src/app/robots.ts` — allow `/`, disallow `/api/`, sitemap ref |
| 404 | `src/app/not-found.tsx` (portal-styled, helpful links) |
| Structured data | Organization + WebSite (+SearchAction) JSON-LD in layout (server-rendered); **no** fabricated Physician/Review markup — only when view-level SSR exists post-sandbox |
| Breadcrumbs | visible + aria breadcrumbs on every inner view |
| Indexability | public views crawlable; SPA query-URLs documented; post-sandbox each view becomes a static route (components are route-portable) |
| Private pages | never linked with data; auth/dashboards render client-side behind session (no PII in HTML source — data arrives via authed APIs) |

Known sandbox limitation (honest): true per-URL SSR/SSG of directory pages
requires real routes, which this sandbox forbids; the view components are
written to lift into `app/(portal)/…` route files unchanged.

## 7. Phased implementation plan

| Phase | Scope | Gate to pass before next |
|---|---|---|
| 0 | audit + fixes (done) | lint, dev server healthy |
| 1 | design tokens, portal shell, header/footer/nav, URL sync | homepage skeleton navigates |
| 2 | homepage 18 sections + emergency strip + extras | screenshots mobile/desktop |
| 3 | doctor & hospital directories + profiles + suggest API | public browse works logged-out |
| 4 | content modules (23+9+9) + content APIs + library | articles readable, disclaimers visible |
| 5 | symptoms + equipment education views | red-flag boxes present |
| 6 | auth gates + booking intent restore + landing pages + how-it-works + verification center | book→login→restore e2e |
| 7 | admin CMS console + workflow + analytics | admin-only, publish toggle works |
| 8 | SEO files + a11y/perf pass | sitemap/robots/404 verified |
| 9 | E2E: agent-browser (mobile+desktop), lint, dev.log | acceptance criteria checklist |

---

## Phase completion log (implementation session)

- **Phase 0** — audit done; fixed pre-existing `searchPreset` import crash
  (patient Doctors screen); plan doc written.
- **Phase 1** — portal state (`PortalView`, `pendingBooking`, `portalMode`),
  URL sync (`?view=…`), header/mobile drawer/footer, EN+BN i18n (~110 keys).
- **Phase 2** — homepage with all 18 sections + emergency strip, awareness
  teaser, health-tools link. Zero console errors; hero eager-loaded.
- **Phase 3** — public doctor directory (q/specialty/city/fee/today filters,
  pagination) + doctor profile (chambers, schedule, reviews, fee sidebar) +
  hospital directory/profile + `/api/v1/search/suggest`.
- **Phase 4** — Health Library: 23 articles, 13 categories, library UI with
  search + category chips; content APIs with server-side publication gate.
- **Phase 5** — 9 symptom guides + 9 equipment guides with red-flag boxes,
  education notices, sources, honest review-status labels.
- **Phase 6** — booking gate verified E2E (guest Book → intent saved →
  login → booking auto-resume → chamber/slot/details → server-side price
  preview (New patient, classified with explanation) → confirmed
  MB-HE6EXM). 4 landing pages, how-it-works (3 audiences), verification
  center, emergency (999/16263/333), FAQ, awareness calendar, BMI tool.
- **Phase 7** — admin CMS console (workflow pipeline, publish/unpublish
  overrides persisted in PlatformSetting, verified round-trip on the public
  API) + privacy-respecting analytics (whitelisted events only) with
  funnel cards.
- **Phase 8** — metadata (title/desc/OG/Twitter/canonical/metadataBase),
  JSON-LD Organization+WebSite+SearchAction, sitemap.xml (17 entries),
  robots.txt (allow /, disallow /api/), custom 404.
- **Phase 9** — agent-browser E2E: all 16 public views render (h1+content),
  doctor/hospital/article/symptom pages verified, mobile viewport (390px)
  + drawer, language toggle (বাংলা headline), auth gate, booking funnel,
  admin CMS toggle round-trip, 404 page. Lint 0/0. Remaining 15 TS errors
  are pre-existing (v2 admin/hospital + push-notification work), outside
  this upgrade's scope.

**Known limitations (honest):** single-route sandbox means portal "pages"
are query-param views (route-portable components); per-URL SSR and
Physician/Article JSON-LD land with real routes post-sandbox; content
publication overrides are Prisma-backed (Firestore deployments fall back
to module defaults — documented in publications.ts).
