"use client";

import { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Search,
  CalendarCheck,
  FolderHeart,
  UserRound,
  LogOut,
  Settings,
  Globe,
  Building2,
  LayoutGrid,
  PhoneCall,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import type { PatientScreen } from "@/lib/app-state";
import { LANGS } from "@/lib/i18n";
import { BrandLockup } from "@/components/app/shared/brand";
import { UserAvatar, useT } from "@/components/app/shared/ui-kit";
import NotificationBell from "@/components/app/shared/notification-bell";
import { cn } from "@/lib/utils";

/**
 * Patient app shell — two device-specific interfaces (master prompt §1, §9):
 *
 *  Mobile  (<md): compact top bar + fixed 5-tab bottom navigation
 *                (Home | Doctors | Bookings | Records | Profile).
 *  Desktop (≥md): full top navbar with inline links, notifications and an
 *                 account menu; wide content grid.
 *
 * The active screen renders via <PatientApp/> (src/components/app/patient).
 */

const TABS: {
  key: PatientScreen["name"];
  labelKey: string;
  icon: typeof Home;
}[] = [
  { key: "home", labelKey: "nav.home", icon: Home },
  { key: "doctors", labelKey: "nav.doctors", icon: Search },
  { key: "bookings", labelKey: "nav.bookings", icon: CalendarCheck },
  { key: "records", labelKey: "nav.records", icon: FolderHeart },
  { key: "profile", labelKey: "nav.profile", icon: UserRound },
];

export default function PatientShell({ children }: { children: ReactNode }) {
  const { t, lang } = useT();
  const {
    user,
    patientScreen,
    resetPatient,
    pushPatient,
    setLang,
    logout,
  } = useAppStore();

  const activeTab = patientScreen.name;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3 md:h-16">
            <button
              onClick={() => resetPatient({ name: "home" })}
              aria-label="Find Medi Doctor home"
            >
              <BrandLockup size="sm" tagline={false} />
            </button>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Patient">
              {TABS.slice(0, 4).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => resetPatient({ name: tab.key } as PatientScreen)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  aria-current={activeTab === tab.key ? "page" : undefined}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Account menu"
                  >
                    <UserAvatar
                      name={user?.name ?? "Guest"}
                      photoUrl={user?.avatarUrl}
                      className="h-9 w-9"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="text-sm font-semibold">{user?.name}</p>
                    <p className="text-xs font-normal text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => pushPatient({ name: "profile" })}
                  >
                    <UserRound className="h-4 w-4 mr-2" />
                    {t("profile.title")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => pushPatient({ name: "specialties" })}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t("home.specialties")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => pushPatient({ name: "hospitals" })}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Hospitals
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      setLang(lang === "en" ? "bn" : "en")
                    }
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    {t("profile.language")} ·{" "}
                    {LANGS.find((l) => l.code === lang)?.native}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("auth.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 w-full pb-24 md:pb-8 animate-rise-in">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5">{children}</div>
      </main>

      {/* ── Footer (sticky bottom on short pages, pushed on long) ── */}
      <footer className="mt-auto hidden md:block border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Find Medi Doctor — verified
            doctors across Bangladesh.
          </p>
          <p className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <PhoneCall className="h-3 w-3" />
            Emergency: 999
          </p>
        </div>
      </footer>

      {/* ── Mobile bottom tab bar ───────────────────────────────── */}
      <nav
        aria-label="Bottom navigation"
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg pb-safe-nav md:hidden"
      >
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() =>
                  resetPatient({ name: tab.key } as PatientScreen)
                }
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active ? "bg-primary-soft" : ""
                  )}
                >
                  <tab.icon className="h-5 w-5" />
                </span>
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
