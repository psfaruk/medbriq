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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  LogOut,
  Globe,
  PhoneCall,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { LANGS } from "@/lib/i18n";
import { BrandLockup } from "@/components/app/shared/brand";
import { UserAvatar, useT } from "@/components/app/shared/ui-kit";
import NotificationBell from "@/components/app/shared/notification-bell";
import { cn } from "@/lib/utils";

/**
 * DashboardShell — shared chrome for the Doctor, Hospital and Admin web
 * dashboards (master prompt §4 layout: persistent left sidebar + compact
 * top bar on desktop; top bar + drawer navigation on mobile).
 *
 * Each dashboard passes its nav config and renders the active section as
 * children, keeping all three interfaces visually consistent.
 */

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  group?: string;
};

function NavList({
  items,
  activeSection,
  onSectionChange,
  onNavigate,
}: {
  items: NavItem[];
  activeSection: string;
  onSectionChange: (key: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Dashboard">
      {items.map((item, index) => {
        const active = item.key === activeSection;
        const showGroup = Boolean(item.group && item.group !== items[index - 1]?.group);
        return (
          <div key={item.key}>
            {showGroup ? (
              <p className={cn("px-3.5 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/65", index === 0 && "pt-1")}>
                {item.group}
              </p>
            ) : null}
          <button
            key={item.key}
            onClick={() => {
              onSectionChange(item.key);
              onNavigate?.();
            }}
            className={cn(
              "group relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              active
                ? "bg-primary-soft text-primary shadow-[inset_3px_0_0_0_var(--primary)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{item.label}</span>
            {typeof item.badge === "number" && item.badge > 0 ? (
              <span
                className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
          </div>
        );
      })}
    </nav>
  );
}

export default function DashboardShell({
  roleLabel,
  navItems,
  activeSection,
  onSectionChange,
  children,
}: {
  roleLabel: string;
  navItems: NavItem[];
  activeSection: string;
  onSectionChange: (key: string) => void;
  children: ReactNode;
}) {
  const { t, lang } = useT();
  const { user, setLang, logout } = useAppStore();

  const activeItem = navItems.find((n) => n.key === activeSection);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-border/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] lg:flex">
        <div className="flex h-[76px] items-center border-b border-border/70 px-6">
          <BrandLockup size="sm" tagline={false} />
        </div>
        <div className="flex-1 overflow-y-auto app-scroll px-3 py-4">
          <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {roleLabel}
          </p>
          <NavList
            items={navItems}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        </div>
        <div className="border-t border-border/70 p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <UserAvatar
              name={user?.name ?? "User"}
              photoUrl={user?.avatarUrl}
              className="h-9 w-9"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.signOut")}
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex min-h-screen flex-col lg:pl-[272px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border/80 bg-white/90 px-4 shadow-[0_2px_14px_rgba(23,43,77,0.035)] backdrop-blur-xl sm:gap-3 sm:px-6 md:h-[76px]">
          {/* Mobile: hamburger + brand */}
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-72 max-w-[calc(100vw-1.5rem)] p-0"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-16 items-center border-b border-border px-5">
                  <BrandLockup size="sm" tagline={false} />
                </div>
                <div className="px-3 py-4">
                  <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {roleLabel}
                  </p>
                  <NavList
                    items={navItems}
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                  />
                  <button
                    onClick={logout}
                    className="mt-4 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("auth.signOut")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <span className="flex min-h-11 min-w-0 items-center">
              <BrandLockup size="sm" tagline={false} />
            </span>
          </div>

          {/* Desktop: section title */}
          <h1 className="hidden text-xl font-bold tracking-tight text-foreground lg:block">
            {activeItem?.label ?? roleLabel}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            {/* Back to the public portal (spec: dashboards link to the site) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => useAppStore.getState().setPortalMode(true)}
              className="hidden gap-1.5 rounded-full text-muted-foreground sm:inline-flex"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Public site
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 gap-2 rounded-full px-0 text-muted-foreground sm:h-8 sm:w-auto sm:px-3"
                  aria-label="Language"
                >
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs font-semibold">
                    {LANGS.find((l) => l.code === lang)?.native}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {LANGS.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(lang === l.code && "font-semibold text-primary")}
                  >
                    {l.native} — {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <NotificationBell onNavigate={() => onSectionChange(activeSection)} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  <UserAvatar
                    name={user?.name ?? "User"}
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
                  onClick={() =>
                    setLang(lang === "en" ? "bn" : "en")
                  }
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {t("profile.language")}: {LANGS.find((l) => l.code !== lang)?.native}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("auth.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 animate-rise-in">
          <div className="mx-auto max-w-[1480px] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
            {/* Mobile section title — matches the desktop size so the
                dashboard reads proportionate on phones (app-like, not billboard). */}
            <h1 className="mb-5 text-xl font-bold tracking-tight text-foreground lg:hidden">
              {activeItem?.label ?? roleLabel}
            </h1>
            {children}
          </div>
        </main>

        {/* Sticky footer */}
        <footer className="mt-auto border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Find Medi Doctor · {roleLabel}
            </p>
            <p className="flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
              <PhoneCall className="h-3 w-3" />
              Emergency: 999
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
