"use client";

import { useEffect } from "react";
import { useAppStore, type ViewName } from "@/lib/store";
import { BrandLogo, BrandWordmark, DemoBadge } from "@/components/brand";
import NotificationBell from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  Stethoscope,
  Search,
  CalendarCheck,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  LogIn,
  LogOut,
  PhoneCall,
  HeartPulse,
  UserRound,
  Sparkles,
  Clock3,
} from "lucide-react";

import HomeView from "@/components/views/home-view";
import SearchView from "@/components/views/search-view";
import DoctorProfileView from "@/components/views/doctor-profile-view";
import BookingView from "@/components/views/booking-view";
import MyAppointmentsView from "@/components/views/my-appointments-view";
import DoctorDashboardView from "@/components/views/doctor-dashboard-view";
import AdminView from "@/components/views/admin-view";
import SettingsView from "@/components/views/settings-view";
import AuthView from "@/components/views/auth-view";
import ComplianceView from "@/components/views/compliance-view";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const NAV_ITEMS: { label: string; view: ViewName; icon: React.ElementType }[] = [
  { label: "Home", view: "home", icon: HeartPulse },
  { label: "Find Doctors", view: "search", icon: Search },
  { label: "My Appointments", view: "appointments", icon: CalendarCheck },
];

/** Mobile bottom tab bar items (app-like navigation). */
const TAB_ITEMS: { label: string; view: ViewName; icon: React.ElementType }[] = [
  { label: "Home", view: "home", icon: HeartPulse },
  { label: "Doctors", view: "search", icon: Search },
  { label: "Visits", view: "appointments", icon: CalendarCheck },
];

export default function MedbriqApp() {
  const { view, user, userLoaded, navigate, setUser, setUserLoaded } =
    useAppStore();

  // Resolve the current session once on load.
  useEffect(() => {
    fetch("/api/v1/auth/me")
      .then((r) => r.json())
      .then((res) => setUser(res.ok ? res.data.user : null))
      .catch(() => setUser(null))
      .finally(() => setUserLoaded(true));
  }, [setUser, setUserLoaded]);

  // Scroll to top whenever the active view changes.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const logout = async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    navigate({ name: "home" });
  };

  const roleNav: { label: string; view: ViewName; icon: React.ElementType }[] =
    user?.role === "DOCTOR"
      ? [{ label: "Doctor Dashboard", view: "doctor-dashboard", icon: LayoutDashboard }]
      : user?.role === "ADMIN"
        ? [{ label: "Admin Console", view: "admin", icon: ShieldCheck }]
        : [];

  const allNav = [...NAV_ITEMS, ...roleNav];

  const roleBadge =
    user?.role === "DOCTOR" ? (
      user.verificationStatus === "VERIFIED" ? (
        <Badge className="bg-success text-success-foreground hover:bg-success">
          Verified Doctor
        </Badge>
      ) : (
        <Badge variant="outline" className="border-warning/50 text-warning">
          Verification {user.verificationStatus ?? "PENDING"}
        </Badge>
      )
    ) : user?.role === "ADMIN" ? (
      <Badge variant="secondary">Admin</Badge>
    ) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ---------------------------------------------------------------- */}
      {/* Header (desktop nav + mobile menu)                                */}
      {/* ---------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-white/85 dark:bg-background/85 backdrop-blur-lg supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Brand */}
            <button
              onClick={() => navigate({ name: "home" })}
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label="Medbriq home"
            >
              <span className="relative">
                <BrandLogo className="h-9 w-9 transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-white dark:ring-background animate-pulse-soft" />
              </span>
              <span className="flex flex-col items-start leading-none">
                <BrandWordmark className="text-xl" />
                <span className="hidden sm:block text-[10px] font-medium tracking-wide text-muted-foreground mt-0.5">
                  Find &amp; book verified doctors
                </span>
              </span>
            </button>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 p-1"
              aria-label="Main"
            >
              {allNav.map((item) => {
                const active = view.name === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => navigate({ name: item.view })}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-brand-gradient text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <DemoBadge />
              {userLoaded && user ? <NotificationBell /> : null}
              {userLoaded && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 rounded-full border border-border/70 bg-card p-1 pr-2.5 hover:border-primary/40 hover:shadow-sm transition-all"
                      aria-label="Account menu"
                    >
                      <Avatar className="h-8 w-8">
                        {user.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : null}
                        <AvatarFallback className="bg-brand-gradient text-primary-foreground text-xs font-semibold">
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium max-w-28 truncate">
                        {user.name}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col gap-1">
                      <span>{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">
                        {user.email}
                      </span>
                      {roleBadge}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {roleNav.map((item) => (
                      <DropdownMenuItem
                        key={item.view}
                        onClick={() => navigate({ name: item.view })}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    {user.role === "PATIENT" && (
                      <DropdownMenuItem
                        onClick={() => navigate({ name: "appointments" })}
                      >
                        <CalendarCheck className="h-4 w-4 mr-2" />
                        My Appointments
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ name: "settings" })}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : userLoaded ? (
                <Button
                  size="sm"
                  className="gap-1.5 bg-brand-gradient text-primary-foreground shadow-sm hover:opacity-90 hover:shadow-md transition-all"
                  onClick={() => navigate({ name: "auth" })}
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              ) : (
                <div className="h-8 w-20 rounded-md bg-secondary animate-pulse" />
              )}

              {/* Mobile menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <BrandLogo className="h-7 w-7" />
                      <BrandWordmark />
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                    {allNav.map((item) => (
                      <Button
                        key={item.view}
                        variant={view.name === item.view ? "secondary" : "ghost"}
                        className="justify-start gap-2"
                        onClick={() => navigate({ name: item.view })}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    ))}
                    <div className="h-px bg-border my-2" />
                    {user ? (
                      <>
                        <div className="flex items-center justify-between gap-2 px-1 py-1.5">
                          <span className="text-sm font-medium">
                            Notifications
                          </span>
                          <NotificationBell />
                        </div>
                        <Button
                          variant="ghost"
                          className="justify-start gap-2"
                          onClick={() => navigate({ name: "settings" })}
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Button>
                        <Button
                          variant="outline"
                          className="justify-start gap-2"
                          onClick={logout}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out ({user.name.split(" ")[0]})
                        </Button>
                      </>
                    ) : (
                      <Button
                        className="justify-start gap-2 bg-brand-gradient text-primary-foreground"
                        onClick={() => navigate({ name: "auth" })}
                      >
                        <LogIn className="h-4 w-4" />
                        Sign in / Register
                      </Button>
                    )}
                    <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground">
                        <PhoneCall className="h-3.5 w-3.5 text-destructive" />
                        Medical emergency?
                      </span>
                      <span className="mt-1 block">
                        Call <strong className="text-foreground">999</strong>{" "}
                        (Bangladesh national emergency number) immediately.
                      </span>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Active view (single-route SPA shell)                              */}
      {/* ---------------------------------------------------------------- */}
      <main className="flex-1 pb-16 md:pb-0">
        {view.name === "home" && <HomeView />}
        {view.name === "search" && <SearchView />}
        {view.name === "doctor" && view.slug && <DoctorProfileView slug={view.slug} />}
        {view.name === "booking" && view.slug && <BookingView slug={view.slug} />}
        {view.name === "appointments" && <MyAppointmentsView />}
        {view.name === "doctor-dashboard" && <DoctorDashboardView />}
        {view.name === "admin" && <AdminView />}
        {view.name === "settings" && <SettingsView />}
        {view.name === "auth" && <AuthView />}
        {view.name === "compliance" && <ComplianceView />}
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Footer (sticky to bottom, pushed down by long content)            */}
      {/* ---------------------------------------------------------------- */}
      <footer className="mt-auto bg-gradient-to-b from-[oklch(0.31_0.06_168)] to-[oklch(0.24_0.05_170)] text-emerald-50/90 pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <BrandLogo className="h-7 w-7" />
                </span>
                <span className="text-lg font-semibold text-white">
                  Medbriq
                </span>
              </div>
              <p className="mt-4 text-sm text-emerald-100/70">
                Connecting patients with verified doctors — search, compare and
                book appointments with confidence.
              </p>
              <p className="mt-3 text-xs text-emerald-100/50">
                Initial market: Bangladesh · Built as a free-first MVP.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  BMDC-verified profiles
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-emerald-50">
                  <Clock3 className="h-3.5 w-3.5" />
                  Asia/Dhaka schedules
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-white">Platform</h3>
              <ul className="space-y-2.5 text-sm text-emerald-100/70">
                <li>
                  <button
                    className="hover:text-white transition-colors"
                    onClick={() => navigate({ name: "search" })}
                  >
                    Find Doctors
                  </button>
                </li>
                <li>
                  <button
                    className="hover:text-white transition-colors"
                    onClick={() => navigate({ name: "appointments" })}
                  >
                    My Appointments
                  </button>
                </li>
                <li>
                  <button
                    className="hover:text-white transition-colors"
                    onClick={() => navigate({ name: "auth" })}
                  >
                    Doctor Registration
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-white">Popular Specialties</h3>
              <ul className="space-y-2.5 text-sm text-emerald-100/70">
                {[
                  { label: "Medicine & Diabetology", slug: "medicine-diabetology" },
                  { label: "Cardiology", slug: "cardiology" },
                  { label: "Dermatology", slug: "dermatology" },
                  { label: "Pediatrics", slug: "pediatrics" },
                ].map((s) => (
                  <li key={s.slug}>
                    <button
                      className="hover:text-white transition-colors"
                      onClick={() => navigate({ name: "search" })}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-white">Safety &amp; Trust</h3>
              <p className="text-sm text-emerald-100/70">
                Medbriq is a discovery &amp; booking platform — it does not provide
                medical advice, diagnosis, or prescriptions.
              </p>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <button
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors text-emerald-100/70"
                    onClick={() => navigate({ name: "compliance" })}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Architecture &amp; compliance review
                  </button>
                </li>
              </ul>
              <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-3 text-xs text-rose-50/80">
                <span className="flex items-center gap-1.5 font-semibold text-rose-50">
                  <PhoneCall className="h-3.5 w-3.5" />
                  Emergency?
                </span>
                <span className="mt-1 block">
                  Call <strong className="text-rose-50">999</strong> — the
                  national emergency number in Bangladesh.
                </span>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-100/50">
            <p>© {new Date().getFullYear()} Medbriq. Demo MVP — seed data is illustrative.</p>
            <p className="flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" />
              Doctor profiles shown in this demo are sample data, not real people.
            </p>
          </div>
        </div>
      </footer>

      {/* ---------------------------------------------------------------- */}
      {/* Mobile bottom tab bar (app-like navigation, hidden on desktop)    */}
      {/* ---------------------------------------------------------------- */}
      <nav
        aria-label="Bottom"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border/70 bg-white/92 dark:bg-background/92 backdrop-blur-lg pb-safe-nav"
      >
        <div className="grid grid-cols-4">
          {TAB_ITEMS.map((item) => {
            const active = view.name === item.view;
            return (
              <button
                key={item.view}
                onClick={() => navigate({ name: item.view })}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
                    active ? "bg-primary-soft" : ""
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
              </button>
            );
          })}
          {userLoaded && user ? (
            <button
              onClick={() => navigate({ name: "settings" })}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                view.name === "settings" ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={view.name === "settings" ? "page" : undefined}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
                  view.name === "settings" ? "bg-primary-soft" : ""
                }`}
              >
                <UserRound className="h-5 w-5" />
              </span>
              Profile
            </button>
          ) : (
            <button
              onClick={() => navigate({ name: "auth" })}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                view.name === "auth" ? "text-primary" : "text-primary"
              }`}
              aria-current={view.name === "auth" ? "page" : undefined}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-all ${
                  view.name === "auth" ? "bg-primary-soft" : "bg-primary/10"
                }`}
              >
                <LogIn className="h-5 w-5" />
              </span>
              Sign in
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
