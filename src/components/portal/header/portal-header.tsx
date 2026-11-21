"use client";

/**
 * Public portal header (spec §11).
 * Desktop: logo + primary nav + language selector + Login + Join.
 * Mobile: compact bar, search icon → doctor directory, hamburger drawer.
 * No intrusive sticky bars or popups — the header is the only fixed chrome.
 */

import { useState } from "react";
import {
  Menu,
  X,
  Search,
  ChevronDown,
  Languages,
  LayoutDashboard,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore, type PortalView } from "@/lib/app-state";
import { LANGS, type Lang } from "@/lib/i18n";
import { useT } from "@/components/app/shared/ui-kit";
import { BrandLogo, BrandWordmark } from "@/components/app/shared/brand";
import { PortalLink } from "../shared";

const NAV_ITEMS: { key: string; view: PortalView }[] = [
  { key: "portal.nav.findDoctors", view: { name: "doctors" } },
  { key: "portal.nav.hospitals", view: { name: "hospitals" } },
  { key: "portal.nav.specialties", view: { name: "specialties" } },
  { key: "portal.nav.healthLibrary", view: { name: "library" } },
  { key: "portal.nav.forDoctors", view: { name: "for-doctors" } },
  { key: "portal.nav.forHospitals", view: { name: "for-hospitals" } },
];

export default function PortalHeader() {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  const setPortalMode = useAppStore((s) => s.setPortalMode);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const portalView = useAppStore((s) => s.portalView);
  const [open, setOpen] = useState(false);

  const activeName = (view: PortalView): boolean => {
    if (view.name === "doctors")
      return ["doctors", "doctor"].includes(portalView.name);
    if (view.name === "hospitals")
      return ["hospitals", "hospital"].includes(portalView.name);
    if (view.name === "library")
      return ["library", "article", "symptoms", "symptom", "equipment", "equipment-item"].includes(
        portalView.name
      );
    return portalView.name === view.name;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        {/* Logo */}
        <PortalLink
          view={{ name: "home" }}
          ariaLabel="MedBricBD — home"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <BrandLogo className="h-8 w-8" />
          <span className="hidden sm:block">
            <BrandWordmark />
          </span>
        </PortalLink>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <PortalLink
              key={item.key}
              view={item.view}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                activeName(item.view)
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(item.key)}
            </PortalLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Language: ${lang === "bn" ? "বাংলা" : "English"}`}
                className="gap-1.5 text-muted-foreground"
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span className="hidden text-xs font-semibold uppercase sm:inline">
                  {lang}
                </span>
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {LANGS.map((l: { code: Lang; label: string; native: string }) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  aria-checked={lang === l.code}
                  className={lang === l.code ? "bg-primary-soft text-primary" : ""}
                >
                  <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
                  {l.native} ({l.label})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <button
              type="button"
              onClick={() => setPortalMode(false)}
              className="hidden sm:block"
            >
              <Button size="sm" className="gap-1.5">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                {t("portal.nav.dashboard")}
              </Button>
            </button>
          ) : (
            <>
              {/* Login (desktop) */}
              <PortalLink
                view={{ name: "auth", mode: "login" }}
                ctaLabel="login"
                className="hidden sm:block"
              >
                <Button variant="ghost" size="sm">
                  {t("portal.nav.login")}
                </Button>
              </PortalLink>
              {/* Join (desktop) */}
              <PortalLink
                view={{ name: "for-patients" }}
                ctaLabel="join-platform"
                className="hidden sm:block"
              >
                <Button size="sm" className="bg-[#13A89E] font-semibold text-white hover:bg-[#0f8f87]">
                  {t("portal.nav.join")}
                </Button>
              </PortalLink>
            </>
          )}

          {/* Mobile: search shortcut */}
          <PortalLink
            view={{ name: "doctors" }}
            ariaLabel={t("portal.nav.findDoctors")}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </PortalLink>

          {/* Mobile drawer */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={t("portal.nav.menu")}
                aria-expanded={open}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
              >
                {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle className="flex items-center gap-2 font-bold">
                  <BrandLogo className="h-7 w-7" />
                  MedBricBD
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex flex-col gap-1 p-3">
                {NAV_ITEMS.map((item) => (
                  <PortalLink
                    key={item.key}
                    view={item.view}
                    onNavigate={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                      activeName(item.view)
                        ? "bg-primary-soft text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {t(item.key)}
                  </PortalLink>
                ))}
                <div className="my-2 border-t border-border" aria-hidden="true" />
                <PortalLink
                  view={{ name: "emergency" }}
                  onNavigate={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  {t("portal.cat.emergency")}
                </PortalLink>
                <PortalLink
                  view={{ name: "how-it-works" }}
                  onNavigate={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t("portal.footer.howTitle")}
                </PortalLink>
                <PortalLink
                  view={{ name: "faq" }}
                  onNavigate={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t("portal.footer.faqTitle")}
                </PortalLink>
                <div className="my-2 border-t border-border" aria-hidden="true" />
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setPortalMode(false);
                    }}
                    className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
                  >
                    {t("portal.nav.dashboard")}
                  </button>
                ) : (
                  <>
                    <PortalLink
                      view={{ name: "auth", mode: "login" }}
                      onNavigate={() => setOpen(false)}
                      className="rounded-lg border border-border px-3 py-2.5 text-center text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      {t("portal.nav.login")}
                    </PortalLink>
                    <PortalLink
                      view={{ name: "for-patients" }}
                      onNavigate={() => setOpen(false)}
                      className="rounded-lg bg-[#13A89E] px-3 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      {t("portal.nav.join")}
                    </PortalLink>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
