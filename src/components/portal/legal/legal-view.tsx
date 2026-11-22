"use client";

/**
 * Legal Center (?view=legal) — the public home for every policy document:
 * terms, privacy, confidentiality, roles, safety warnings, trust &
 * verification, cookies, cancellation and grievance. Documents are
 * bilingual (EN/BN) data from src/content/legal.ts; the active document
 * is deep-linkable via ?view=legal&doc=… and every doc change syncs the
 * URL so sharing and the browser Back button work.
 */

import { useEffect } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarX,
  Cookie,
  Lock,
  MessageSquare,
  PhoneCall,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  LEGAL_DOCS,
  isLegalDocSlug,
  type LegalDoc,
  type LegalDocSlug,
  type LegalLocale,
} from "@/content/legal";
import type { Lang } from "@/lib/i18n";
import { useAppStore } from "@/lib/app-state";
import { Breadcrumbs, PortalLink, useTrackPageView } from "../shared";

const DOC_ICONS: Record<LegalDoc["icon"], LucideIcon> = {
  scale: Scale,
  shield: ShieldCheck,
  lock: Lock,
  users: Users,
  alert: AlertTriangle,
  badge: BadgeCheck,
  cookie: Cookie,
  "calendar-x": CalendarX,
  message: MessageSquare,
};

function formatUpdated(iso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(
      lang === "bn" ? "bn-BD" : "en-GB",
      { day: "numeric", month: "long", year: "numeric" }
    ).format(new Date(`${iso}T00:00:00`));
  } catch {
    return iso;
  }
}

export default function LegalCenterView({ doc }: { doc?: string }) {
  useTrackPageView(`legal-${doc ?? "terms"}`);
  const lang = useAppStore((s) => s.lang);
  const locale = (lang ?? "en") as LegalLocale;

  const active: LegalDocSlug = isLegalDocSlug(doc ?? "")
    ? (doc as LegalDocSlug)
    : "terms";
  const current = LEGAL_DOCS.find((d) => d.slug === active) ?? LEGAL_DOCS[0];
  const others = LEGAL_DOCS.filter((d) => d.slug !== current.slug);

  // Doc switches keep the same view name — scroll back up manually.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  const DocIcon: LucideIcon = DOC_ICONS[current.icon];

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
    >
      <Breadcrumbs
        items={[
          {
            label:
              locale === "bn"
                ? "আইনি ও নীতিমালা"
                : "Legal & policies",
          },
        ]}
      />

      <header className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {locale === "bn" ? "আইনি ও নীতিমালা" : "Legal & Policies"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {locale === "bn"
            ? "মেডব্রিকবিডি চলার নিয়ম — শর্তাবলী, গোপনীয়তা, ভূমিকা, সতর্কতা ও আরও সবকিছু, সহজ ভাষায়। প্রতিটি দলিল বাংলা ও ইংরেজি দুই ভাষাতেই পড়া যায়।"
            : "The rules Find Medi Doctor runs by — terms, privacy, roles, safety warnings and more, in plain language. Every document is available in both Bangla and English."}
        </p>
      </header>

      {/* Mobile: horizontally scrollable document switcher */}
      <nav
        aria-label={locale === "bn" ? "নীতিমালা দলিল" : "Policy documents"}
        className="app-scroll -mx-4 mb-6 overflow-x-auto px-4 lg:hidden"
      >
        <div className="flex w-max gap-2 pb-2">
          {LEGAL_DOCS.map((d) => {
            const DIcon = DOC_ICONS[d.icon];
            const isActive = d.slug === current.slug;
            return (
              <PortalLink
                key={d.slug}
                view={{ name: "legal", doc: d.slug }}
                ariaLabel={d.title[locale]}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <DIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {d.title[locale]}
              </PortalLink>
            );
          })}
        </div>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-10">
        {/* Desktop: sticky document nav */}
        <nav
          aria-label={locale === "bn" ? "নীতিমালা দলিল" : "Policy documents"}
          className="hidden lg:block"
        >
          <div className="app-scroll sticky top-24 max-h-[calc(100vh-8rem)] space-y-1 overflow-y-auto rounded-2xl border border-border bg-card p-2">
            {LEGAL_DOCS.map((d) => {
              const DIcon = DOC_ICONS[d.icon];
              const isActive = d.slug === current.slug;
              return (
                <PortalLink
                  key={d.slug}
                  view={{ name: "legal", doc: d.slug }}
                  ariaLabel={d.title[locale]}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <DIcon
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      isActive ? "" : "text-primary"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block leading-snug">{d.title[locale]}</span>
                    <span
                      className={`mt-0.5 block text-[11px] font-normal leading-snug ${
                        isActive
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {d.short[locale]}
                    </span>
                  </span>
                </PortalLink>
              );
            })}
          </div>
        </nav>

        {/* Active document */}
        <article className="min-w-0 animate-rise-in" key={current.slug}>
          <header className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <DocIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {current.title[locale]}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {current.short[locale]}
              </p>
            </div>
          </header>

          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <BadgeCheck className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
              {locale === "bn" ? "সর্বশেষ হালনাগাদ" : "Last updated"}:{" "}
              {formatUpdated(current.updated, lang)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              {locale === "bn"
                ? "বাংলাদেশের আইনের অধীন"
                : "Governed by the laws of Bangladesh"}
            </span>
          </p>

          <p className="mt-5 rounded-r-xl border-l-4 border-primary bg-primary/5 p-4 text-sm font-medium leading-relaxed text-foreground">
            {current.intro[locale]}
          </p>

          <div className="mt-8 space-y-9">
            {current.sections[locale].map((section, i) => (
              <section key={`${current.slug}-${i}`}>
                <h3 className="flex items-baseline gap-2.5 text-base font-bold text-foreground">
                  <span
                    className="inline-block h-4 w-1 shrink-0 translate-y-0.5 rounded-full bg-secondary"
                    aria-hidden="true"
                  />
                  {section.heading}
                </h3>
                {section.body?.map((para, j) => (
                  <p
                    key={j}
                    className="mt-2.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    {para}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 space-y-2.5">
                    {section.bullets.map((bullet, j) => (
                      <li
                        key={j}
                        className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span
                          className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-secondary"
                          aria-hidden="true"
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {/* Cross-links */}
          <footer className="mt-10 border-t border-border pt-6">
            <p className="text-sm font-bold text-foreground">
              {locale === "bn" ? "আরও নীতিমালা" : "More policies"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((d) => {
                const DIcon = DOC_ICONS[d.icon];
                return (
                  <PortalLink
                    key={d.slug}
                    view={{ name: "legal", doc: d.slug }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <DIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {d.title[locale]}
                  </PortalLink>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/40">
              <div className="flex items-start gap-2.5">
                <PhoneCall
                  className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-700 dark:text-red-300"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium leading-relaxed text-red-900 dark:text-red-100">
                  {locale === "bn"
                    ? "চিকিৎসা জরুরি পরিস্থিতিতে ৯৯৯-এ কল করুন — এই নীতিমালা কখনোই জরুরি সহায়তার বিকল্প নয়।"
                    : "In a medical emergency call 999 — these policies are never a substitute for urgent help."}
                </p>
              </div>
              <PortalLink
                view={{ name: "emergency" }}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
              >
                {locale === "bn" ? "জরুরি নির্দেশিকা" : "Emergency guidance"}
              </PortalLink>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
