"use client";

/**
 * Info views: How it works (3 audiences, spec §9), Verification Center,
 * Emergency information (Bangladesh), FAQ (all audiences), Health
 * awareness calendar.
 */

import { useState } from "react";
import {
  Search,
  UserCheck,
  CalendarClock,
  FileCheck2,
  Wallet,
  CalendarCheck2,
  Stethoscope,
  ClipboardList,
  Settings2,
  Building2,
  ShieldCheck,
  PhoneCall,
  Siren,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AWARENESS_EVENTS, FAQ_ITEMS, type FaqAudience } from "@/content";
import { BD_EMERGENCY_NUMBERS, EMERGENCY_GUIDANCE } from "@/content";
import { useT } from "@/components/app/shared/ui-kit";
import {
  Breadcrumbs,
  PortalLink,
  PortalSection,
  useTrackPageView,
} from "../shared";

// ── How it works ──────────────────────────────────────────────────────

type StepList = { icon: LucideIcon; title: string; desc: string }[];

const PATIENT_STEPS: StepList = [
  { icon: Search, title: "Find a doctor", desc: "Search by name, specialty, city, hospital or fee — no account needed." },
  { icon: UserCheck, title: "Review qualifications & chamber", desc: "Check verification status, experience, chambers and weekly schedule." },
  { icon: CalendarClock, title: "Select an appointment", desc: "Pick a chamber, date and a free slot from the doctor's live availability." },
  { icon: FileCheck2, title: "Sign in or create an account", desc: "Booking requires a free patient account — your selection is saved and resumes after sign-in." },
  { icon: Wallet, title: "See your automatically calculated fee", desc: "New, returning or follow-up — the correct fee for YOU is computed and shown before you confirm." },
  { icon: CalendarCheck2, title: "Confirm the booking", desc: "Availability and price are revalidated on the server. You receive a booking reference code." },
  { icon: Stethoscope, title: "Attend the appointment", desc: "Show your reference code at the chamber. Manage everything from your bookings list." },
];

const DOCTOR_STEPS: StepList = [
  { icon: FileCheck2, title: "Register", desc: "Create a doctor account from the For Doctors page." },
  { icon: ClipboardList, title: "Submit credentials", desc: "Provide your registration number, qualifications and practice details." },
  { icon: ShieldCheck, title: "Complete verification", desc: "The platform reviews your credentials before the Verified badge appears." },
  { icon: Settings2, title: "Configure your profile", desc: "Bio, photo, specialties, languages and practice locations." },
  { icon: CalendarClock, title: "Set chamber & schedule", desc: "Chambers and weekly availability with instant or approval-based booking." },
  { icon: Wallet, title: "Configure new & returning fees", desc: "Your own fee structure with validity windows — versioned and auditable." },
  { icon: CalendarCheck2, title: "Manage appointments", desc: "Requests, confirmations, completion and patient classification at a glance." },
];

const HOSPITAL_STEPS: StepList = [
  { icon: Building2, title: "Register the institution", desc: "Create a hospital account from the For Hospitals page." },
  { icon: ClipboardList, title: "Submit verification documents", desc: "Institution details are reviewed by the platform team (self-serve upload on the roadmap)." },
  { icon: FileCheck2, title: "Create branches & departments", desc: "Maintain your institutional structure from the dashboard." },
  { icon: UserCheck, title: "Invite / connect doctors", desc: "Doctors list your hospital as their practice location and appear on your public profile." },
  { icon: CalendarCheck2, title: "Manage appointments & schedules", desc: "Oversee chambers and appointments across your institution." },
];

export function HowItWorksView() {
  useTrackPageView("how-it-works");
  const { t } = useT();
  const [audience, setAudience] = useState("patients");

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.footer.howTitle") }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.footer.howTitle")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Step-by-step guides for every kind of user.
        </p>
      </header>

      <Tabs value={audience} onValueChange={setAudience}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-6">
          <StepGrid steps={PATIENT_STEPS} />
          <div className="mt-6 flex flex-wrap gap-3">
            <PortalLink view={{ name: "doctors" }} ctaLabel="how-patients-find">
              <Button className="font-semibold">{t("portal.cta.getStarted")}</Button>
            </PortalLink>
            <PortalLink view={{ name: "for-patients" }}>
              <Button variant="outline">{t("portal.footer.forPatientsTitle")}</Button>
            </PortalLink>
          </div>
        </TabsContent>
        <TabsContent value="doctors" className="mt-6">
          <StepGrid steps={DOCTOR_STEPS} />
          <div className="mt-6">
            <PortalLink view={{ name: "for-doctors" }} ctaLabel="how-doctors-join">
              <Button className="font-semibold">{t("portal.cta.joinAsDoctor")}</Button>
            </PortalLink>
          </div>
        </TabsContent>
        <TabsContent value="hospitals" className="mt-6">
          <StepGrid steps={HOSPITAL_STEPS} />
          <div className="mt-6">
            <PortalLink view={{ name: "for-hospitals" }} ctaLabel="how-hospitals-join">
              <Button className="font-semibold">{t("portal.cta.joinAsHospital")}</Button>
            </PortalLink>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StepGrid({ steps }: { steps: StepList }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, i) => (
        <li
          key={step.title}
          className="flex gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
            {i + 1}
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <step.icon className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
              {step.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Verification Center ───────────────────────────────────────────────

export function VerificationCenterView() {
  useTrackPageView("verification");
  const { t } = useT();

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.footer.verifyTitle") }]} />
      <header className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          <ShieldCheck className="h-8 w-8 text-[#13A89E]" aria-hidden="true" />
          {t("portal.footer.verifyTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Trust is earned through transparency. Here is exactly how MedBricBD
          verifies doctors and hospitals, what the badges mean, and what we
          deliberately do NOT claim.
        </p>
      </header>

      <PortalSection title="Doctor verification — how it works">
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "1. Submission",
              desc: "Doctors submit their medical registration number, qualifications, specialties and practice details when joining.",
            },
            {
              title: "2. Credential review",
              desc: "The platform team reviews the submission against the provided registration and qualification details.",
            },
            {
              title: "3. Verified badge",
              desc: "Approved profiles receive the Verified badge with the review date. Rejected or pending profiles are labeled honestly — never as verified.",
            },
            {
              title: "4. Public transparency",
              desc: "Every public profile shows its verification status. Pending doctors are still listed (clearly marked) so patients can decide with full information.",
            },
          ].map((s) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <h2 className="text-sm font-bold text-foreground">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </PortalSection>

      <PortalSection title="Hospital verification" tinted>
        <Card className="shadow-soft">
          <CardContent className="p-6 text-sm leading-relaxed text-muted-foreground">
            Hospitals submit institution details which are reviewed before the
            public profile is marked verified. Branch and department
            information is maintained by the verified hospital account itself.
            In this demo, hospital verification is admin-assisted; self-serve
            document upload is on the roadmap and will be announced here.
          </CardContent>
        </Card>
      </PortalSection>

      <PortalSection title="What we do NOT claim">
        <Card className="border-amber-200 bg-amber-50 shadow-none">
          <CardContent className="p-6">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-900">
              <li>A Verified badge confirms credential review — it is not a guarantee of treatment outcomes.</li>
              <li>We do not rank doctors; any ordering reflects search criteria, not medical quality judgments.</li>
              <li>Reviews come only from patients with completed visits and are moderated for abuse — they are opinions, not clinical assessments.</li>
              <li>Health Library content is educational and carries review dates; in this demo it awaits medical review, as labeled.</li>
            </ul>
          </CardContent>
        </Card>
      </PortalSection>
    </main>
  );
}

// ── Emergency information ─────────────────────────────────────────────

export function EmergencyView() {
  useTrackPageView("emergency");
  const { t } = useT();

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.cat.emergency") }]} />
      <header className="mb-6">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-red-800 sm:text-3xl">
          <Siren className="h-8 w-8" aria-hidden="true" />
          {t("portal.emergency.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Bangladesh emergency numbers and first-response guidance. If
          something feels immediately life-threatening, call 999 now.
        </p>
      </header>

      {/* Numbers */}
      <div className="grid gap-4 sm:grid-cols-3">
        {BD_EMERGENCY_NUMBERS.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            className="group flex flex-col items-center gap-1 rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-center transition-colors hover:border-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            <span className="flex items-center gap-2 text-3xl font-extrabold tabular-nums text-red-800">
              <PhoneCall className="h-6 w-6" aria-hidden="true" />
              {n.number}
            </span>
            <span className="text-sm font-bold text-foreground">{n.label}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{n.note}</span>
            <span className="mt-1 rounded-full bg-red-700 px-3 py-1 text-xs font-bold text-white">
              {t("portal.emergency.call")}
            </span>
          </a>
        ))}
      </div>

      {/* Guidance */}
      <div className="mt-8 space-y-5">
        {EMERGENCY_GUIDANCE.map((g) => (
          <section
            key={g.title}
            aria-label={g.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <Info className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
              {g.title}
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {g.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        This page provides general emergency guidance for Bangladesh. It is not
        medical advice. When in doubt, call 999 or go to the nearest emergency
        department.
      </p>
    </main>
  );
}

// ── FAQ (all audiences) ───────────────────────────────────────────────

const FAQ_SECTIONS: { audience: FaqAudience; label: string }[] = [
  { audience: "general", label: "General" },
  { audience: "patients", label: "For patients" },
  { audience: "doctors", label: "For doctors" },
  { audience: "hospitals", label: "For hospitals" },
];

export function FaqView() {
  useTrackPageView("faq");
  const { t } = useT();

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.footer.faqTitle") }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.footer.faqTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          {t("portal.section.faqSub")}
        </p>
      </header>

      <div className="space-y-8">
        {FAQ_SECTIONS.map((section) => {
          const items = FAQ_ITEMS.filter((f) => f.audience === section.audience);
          if (items.length === 0) return null;
          return (
            <section key={section.audience} aria-label={section.label}>
              <h2 className="mb-3 text-base font-bold text-foreground">{section.label}</h2>
              <Accordion
                type="single"
                collapsible
                className="rounded-2xl border border-border bg-card px-5 shadow-soft"
              >
                {items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`${section.audience}-${i}`}
                    className="border-border last:border-0"
                  >
                    <AccordionTrigger className="py-4 text-left text-sm font-bold text-foreground hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          );
        })}
      </div>
    </main>
  );
}

// ── Awareness calendar ────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarView() {
  useTrackPageView("calendar");
  const { t } = useT();

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: t("portal.footer.calendarTitle") }]} />
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {t("portal.footer.calendarTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
          Well-known global health observances — a simple reason to check in on
          your health habits (and share awareness with family).
        </p>
      </header>

      <ol className="grid gap-3 sm:grid-cols-2">
        {AWARENESS_EVENTS.map((e, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft font-bold leading-none text-primary">
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {MONTHS[e.month - 1].slice(0, 3)}
              </span>
              <span className="text-lg">{e.day ?? "•"}</span>
            </span>
            <div>
              <h2 className="text-sm font-bold text-foreground">{e.title}</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {e.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
