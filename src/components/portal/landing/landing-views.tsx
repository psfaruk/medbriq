"use client";

/**
 * Join-the-platform landing pages (spec §10): who it's for, benefits, how
 * it works, requirements, registration, verification, fees (honest), FAQ,
 * and a registration CTA that opens the matching auth flow.
 */

import {
  UserRound,
  Stethoscope,
  Building2,
  Handshake,
  CheckCircle2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQ_ITEMS, type FaqAudience } from "@/content";
import { useAppStore } from "@/lib/app-state";
import { track } from "@/lib/analytics";
import { useT } from "@/components/app/shared/ui-kit";
import { Breadcrumbs, PortalSection, PortalLink, useTrackPageView } from "../shared";

// ── shared page scaffold ──────────────────────────────────────────────

type LandingProps = {
  eyebrow: string;
  title: string;
  lead: string;
  icon: LucideIcon;
  benefitsTitle: string;
  benefits: string[];
  stepsTitle: string;
  steps: string[];
  requirements: string[];
  feesHonesty: string;
  audience: Exclude<FaqAudience, "general">;
  cta: { label: string; register: boolean; note?: string };
  trackScope: string;
};

function LandingPage(props: LandingProps) {
  useTrackPageView(props.trackScope);
  const { t } = useT();
  const setPortalView = useAppStore((s) => s.setPortalView);
  const faqs = FAQ_ITEMS.filter((f) => f.audience === props.audience);

  function startRegistration() {
    track("registration_start");
    setPortalView({ name: "auth", mode: props.cta.register ? "register" : "login" }, { push: true });
  }

  const Icon = props.icon;

  return (
    <main id="main">
      <div className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <Breadcrumbs items={[{ label: props.title }]} />
        <header className="flex flex-wrap items-start gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary-soft text-primary">
            <Icon className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0f8f87]">
              {props.eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {props.title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{props.lead}</p>
          </div>
          <div className="ml-auto">
            <Button size="lg" className="gap-1.5 font-bold" onClick={startRegistration}>
              {props.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            {props.cta.note && (
              <p className="mt-2 max-w-56 text-right text-xs text-muted-foreground">
                {props.cta.note}
              </p>
            )}
          </div>
        </header>
      </div>

      {/* Benefits */}
      <PortalSection title={props.benefitsTitle}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.benefits.map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-foreground shadow-soft"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#13A89E]" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      </PortalSection>

      {/* Steps + requirements */}
      <PortalSection title={props.stepsTitle} tinted>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <ol className="grid gap-3 sm:grid-cols-2">
            {props.steps.map((step, i) => (
              <li
                key={step}
                className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
                  {i + 1}
                </span>
                <p className="pt-1 text-sm font-semibold leading-snug text-foreground">{step}</p>
              </li>
            ))}
          </ol>
          <div className="space-y-4">
            <Card className="shadow-soft">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground">What you need</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {props.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-[#13A89E]/30 bg-[#13A89E]/5 shadow-none">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground">Fees — stated honestly</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {props.feesHonesty}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PortalSection>

      {/* FAQ */}
      {faqs.length > 0 && (
        <PortalSection title={`${t("portal.section.faq")} — ${props.eyebrow}`}>
          <Accordion
            type="single"
            collapsible
            className="rounded-2xl border border-border bg-card px-5 shadow-soft"
          >
            {faqs.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border last:border-0">
                <AccordionTrigger className="py-4 text-left text-sm font-bold text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </PortalSection>
      )}

      {/* Bottom CTA */}
      <PortalSection title={t("portal.cta.getStarted")} tinted>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary p-8 text-center shadow-soft">
          <p className="max-w-xl text-base font-medium leading-relaxed text-primary-foreground">
            {props.lead}
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="gap-1.5 bg-white font-bold text-primary hover:bg-white/90"
            onClick={startRegistration}
          >
            {props.cta.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </PortalSection>
    </main>
  );
}

// ── the four pages ────────────────────────────────────────────────────

export function ForPatientsView() {
  return (
    <LandingPage
      trackScope="for-patients"
      eyebrow="For patients"
      title="Book verified doctors with transparent fees"
      lead="Create a free patient account to book chamber appointments, see your automatic new/returning patient fee before confirming, manage your bookings and keep your visit history in one private place. Browsing and health education stay free without an account."
      icon={UserRound}
      benefitsTitle="Why a patient account helps"
      benefits={[
        "Book and manage appointments in a few taps",
        "See your exact fee (new / returning / follow-up) before confirming — calculated automatically",
        "Cancel or reschedule from your bookings list",
        "In-app notifications for status changes and reminders",
        "Your visit history stays private — public profiles never expose patient data",
        "Reviews you write are tied to completed visits only",
      ]}
      stepsTitle="How it works"
      steps={[
        "Find a doctor",
        "Review qualifications and chamber",
        "Select an appointment",
        "Sign in or create an account",
        "Review your automatically calculated fee",
        "Confirm the booking",
        "Attend the appointment",
      ]}
      requirements={[
        "A valid email address or mobile number",
        "Basic profile details (name, phone) for the appointment",
      ]}
      feesHonesty="Creating an account is free. Booking in this demo carries no payment — in a live deployment any consultation fees are the doctor's own published fees, shown before you confirm, with no hidden charges."
      audience="patients"
      cta={{
        label: "Create a free account",
        register: true,
        note: "Booking needs an account — browsing never does.",
      }}
    />
  );
}

export function ForDoctorsView() {
  return (
    <LandingPage
      trackScope="for-doctors"
      eyebrow="For doctors"
      title="Reach patients, manage your chamber, own your fees"
      lead="Join as a doctor to publish a verified public profile, configure chambers and weekly schedules, and set your own new/returning patient fees. The platform classifies each patient automatically and prices every booking server-side."
      icon={Stethoscope}
      benefitsTitle="Built for practice realities"
      benefits={[
        "Your own new / returning / follow-up fee structure with validity windows",
        "Automatic patient classification using visit history — no manual fee arguments",
        "Chamber, weekly schedule and slot management",
        "Verification badge after credential review — honest Pending label until then",
        "Appointment requests with instant or approval-based booking modes",
        "Earnings overview with transparent commission line (demo preview)",
      ]}
      stepsTitle="How joining works"
      steps={[
        "Register a doctor account",
        "Submit credentials (registration number, qualifications)",
        "Complete verification review",
        "Configure your public profile",
        "Set chamber and weekly schedule",
        "Configure new and returning patient fees",
        "Manage appointments from your dashboard",
      ]}
      requirements={[
        "A valid medical registration number (e.g. BMDC)",
        "Qualification and practice details for verification",
        "Chamber location and weekly availability",
      ]}
      feesHonesty="Listing and profile management are free during the demo phase. Any future commission or subscription will be published openly and agreed with doctors before taking effect — nothing charged silently."
      audience="doctors"
      cta={{
        label: "Join as a doctor",
        register: true,
        note: "Verification is required before the Verified badge appears.",
      }}
    />
  );
}

export function ForHospitalsView() {
  return (
    <LandingPage
      trackScope="for-hospitals"
      eyebrow="For hospitals & clinics"
      title="A public profile for your institution"
      lead="Register your hospital or clinic to receive a public profile with verification status, branches and departments, and a directory of the doctors practising at your institution — managed from one dashboard."
      icon={Building2}
      benefitsTitle="What hospitals get"
      benefits={[
        "Public hospital profile with verification status",
        "Branch and department management",
        "Directory of doctors practising at your institution",
        "Appointment and schedule oversight across chambers",
        "Contact and location details for patients",
        "Honest verification labeling — no unverified claims",
      ]}
      stepsTitle="How joining works"
      steps={[
        "Register a hospital account",
        "Submit institution details for verification",
        "Verification review by the platform team",
        "Create branches and departments",
        "Doctors list your hospital as their practice location",
        "Manage appointments and schedules from the dashboard",
      ]}
      requirements={[
        "Institution name, city and address",
        "Contact details for the public profile",
        "Verification documents when self-serve upload launches (today: admin-assisted in the demo)",
      ]}
      feesHonesty="Hospital profiles are free during the demo phase. Any future pricing will be published openly before taking effect."
      audience="hospitals"
      cta={{
        label: "Register your hospital",
        register: true,
        note: "In this demo, hospital accounts are provisioned after registration review.",
      }}
    />
  );
}

export function ForProvidersView() {
  useTrackPageView("for-providers");
  const { t } = useT();
  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs items={[{ label: "For healthcare providers" }]} />
      <header className="flex flex-wrap items-start gap-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#13A89E]/10 text-[#0f8f87]">
          <Handshake className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#0f8f87]">
            For healthcare providers
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Diagnostics, pharmacies & telehealth partners
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            MedBricBD is building a partner ecosystem around doctor discovery:
            diagnostic centers, pharmacies, and — after regulatory review —
            telehealth services. Partner registration is not open yet; this page
            explains what is coming so you can plan ahead.
          </p>
        </div>
      </header>

      <PortalSection title="Partner categories (roadmap)">
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Diagnostic centers",
              desc: "List tests and locations so doctors and patients can find you near the chamber.",
            },
            {
              title: "Pharmacies",
              desc: "Medicine availability information — never prescriptions or clinical claims.",
            },
            {
              title: "Telehealth services",
              desc: "Video consultation integrations after DGHS telemedicine compliance review.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft"
            >
              <h2 className="text-sm font-bold text-foreground">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              <p className="mt-3 rounded-full bg-muted px-2.5 py-0.5 text-center text-xs font-semibold text-muted-foreground">
                Coming soon
              </p>
            </li>
          ))}
        </ul>
      </PortalSection>

      <PortalSection title="What we will require from partners" tinted>
        <Card className="shadow-soft">
          <CardContent className="p-6">
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Valid trade license and sector-specific licenses</li>
              <li>No unsupported medical claims in any listed content</li>
              <li>Clear, honest service descriptions and pricing</li>
              <li>Data protection commitments for any patient-facing integration</li>
              <li>Regulatory compliance for telehealth before any clinical feature ships</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Interested? Register interest through{" "}
              <PortalLink
                view={{ name: "auth", mode: "register" }}
                className="font-semibold text-primary hover:underline"
              >
                a hospital/provider account
              </PortalLink>{" "}
              and mention partnerships — {t("app.name")} admins will follow up.
            </p>
          </CardContent>
        </Card>
      </PortalSection>
    </main>
  );
}
