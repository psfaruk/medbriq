"use client";

/**
 * Public portal footer (spec §2 §18).
 * Includes the standing emergency strip (999), link columns that only
 * point at real views (no dead links), the demo disclaimer, and
 * medical-content disclaimer. Sticky to the viewport bottom on short
 * pages via the portal's min-h-screen flex column layout.
 */

import { PhoneCall, ShieldCheck } from "lucide-react";
import { useAppStore, type PortalView } from "@/lib/app-state";
import { useT } from "@/components/app/shared/ui-kit";
import { BrandLogo } from "@/components/app/shared/brand";
import { PortalLink } from "../shared";

type FooterColumn = {
  titleKey: string;
  links: { labelKey: string; view: PortalView }[];
};

const COLUMNS: FooterColumn[] = [
  {
    titleKey: "portal.footer.patients",
    links: [
      { labelKey: "portal.footer.doctorsTitle", view: { name: "doctors" } },
      { labelKey: "portal.footer.hospitalsTitle", view: { name: "hospitals" } },
      { labelKey: "portal.footer.specialtiesTitle", view: { name: "specialties" } },
      { labelKey: "portal.footer.libraryTitle", view: { name: "library" } },
      { labelKey: "portal.footer.symptomsTitle", view: { name: "symptoms" } },
      { labelKey: "portal.footer.equipmentTitle", view: { name: "equipment" } },
      { labelKey: "portal.footer.emergencyTitle", view: { name: "emergency" } },
    ],
  },
  {
    titleKey: "portal.footer.providers",
    links: [
      { labelKey: "portal.footer.forPatientsTitle", view: { name: "for-patients" } },
      { labelKey: "portal.nav.forDoctors", view: { name: "for-doctors" } },
      { labelKey: "portal.nav.forHospitals", view: { name: "for-hospitals" } },
      { labelKey: "portal.footer.verifyTitle", view: { name: "verification" } },
      { labelKey: "portal.footer.howTitle", view: { name: "how-it-works" } },
    ],
  },
  {
    titleKey: "portal.footer.platform",
    links: [
      { labelKey: "portal.footer.faqTitle", view: { name: "faq" } },
      { labelKey: "portal.footer.toolsTitle", view: { name: "tools" } },
      { labelKey: "portal.footer.calendarTitle", view: { name: "calendar" } },
    ],
  },
];

export default function PortalFooter() {
  const { t } = useT();
  const lang = useAppStore((s) => s.lang);

  return (
    <footer className="mt-auto border-t border-border bg-slate-50">
      {/* Emergency strip */}
      <PortalLink
        view={{ name: "emergency" }}
        ctaLabel="emergency-strip"
        className="block bg-red-700 text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
      >
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center sm:px-6">
          <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold tracking-wide sm:text-sm">
            {t("portal.emergency.strip")}
          </p>
        </div>
      </PortalLink>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          {/* Brand + tagline */}
          <div>
            <div className="flex items-center gap-2">
              <BrandLogo className="h-9 w-9" />
              <span className="text-lg font-extrabold tracking-tight text-foreground">
                MedBricBD
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("portal.footer.tagline")}
            </p>
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-white p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-[#13A89E]"
                aria-hidden="true"
              />
              {t("portal.footer.disclaimer")}
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.titleKey} aria-label={t(col.titleKey)}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {t(col.titleKey)}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.labelKey}>
                    <PortalLink
                      view={link.view}
                      className="rounded px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {t(link.labelKey)}
                    </PortalLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} MedBricBD. {t("portal.footer.rights")}
          </p>
          <p>
            {lang === "bn"
              ? "বাংলাদেশ-কেন্দ্রিক · বিশ্বজুড়ে ব্যবহারের জন্য প্রস্তুত"
              : "Bangladesh-first · Built for global use"}
          </p>
        </div>
      </div>
    </footer>
  );
}
