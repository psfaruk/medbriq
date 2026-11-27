"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Hospital as HospitalIcon,
  LayoutDashboard,
  Layers,
  Settings,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/dashboard-shell";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import { useT } from "@/components/app/shared/ui-kit";
import OverviewSection from "./sections/overview";
import BranchesSection from "./sections/branches";
import DepartmentsSection from "./sections/departments";
import DoctorsSection from "./sections/doctors";
import AppointmentsSection from "./sections/appointments";
import RevenueSection from "./sections/revenue";
import ProfileSection from "./sections/profile";
import SettingsSection from "./sections/settings";
import type { HospitalOverview } from "./types";

/**
 * HospitalDashboard — the hospital/clinic web dashboard (master prompt §6).
 *
 * Section navigation lives in the app store (hospitalSection) and renders
 * inside the shared DashboardShell; each section owns its own data fetching,
 * loading / empty / error states and dialogs.
 */
export default function HospitalDashboard() {
  const { t } = useT();
  const hospitalSection = useAppStore((s) => s.hospitalSection);
  const setHospitalSection = useAppStore((s) => s.setHospitalSection);
  const [pendingApprovals, setPendingApprovals] = useState<number | null>(null);
  const [summaryUnavailable, setSummaryUnavailable] = useState(false);

  // Nav badge: pending appointment approvals (hospital managers monitor
  // these but approvals happen in the doctor dashboard).
  useEffect(() => {
    let cancelled = false;
    apiGet<{ stats: { pendingApprovals: number } }>("/api/v2/hospital/overview")
      .then((d) => {
        if (!cancelled) {
          setPendingApprovals(d.stats.pendingApprovals);
          setSummaryUnavailable(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingApprovals(null);
          setSummaryUnavailable(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems: NavItem[] = [
    {
      key: "overview", group: "Overview",
      label: t("hospitalNav.overview"),
      icon: LayoutDashboard,
    },
    {
      key: "branches", group: "Operations",
      label: t("hospitalNav.branches"),
      icon: Building2,
    },
    {
      key: "departments", group: "Operations",
      label: t("hospitalNav.departments"),
      icon: Layers,
    },
    {
      key: "doctors", group: "Operations",
      label: t("hospitalNav.doctors"),
      icon: Stethoscope,
    },
    {
      key: "appointments", group: "Operations",
      label: t("hospitalNav.appointments"),
      icon: CalendarDays,
      badge: pendingApprovals ?? undefined,
    },
    {
      key: "revenue", group: "Finance",
      label: t("hospitalNav.revenue"),
      icon: Wallet,
    },
    {
      key: "profile", group: "Account",
      label: t("hospitalNav.profile"),
      icon: HospitalIcon,
    },
    {
      key: "settings", group: "Account",
      label: t("hospitalNav.settings"),
      icon: Settings,
    },
  ];

  return (
    <DashboardShell
      roleLabel="Hospital Dashboard"
      navItems={navItems}
      activeSection={hospitalSection}
      onSectionChange={setHospitalSection}
    >
      {summaryUnavailable ? (
        <div role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Hospital operations summary is unavailable with the current data-store configuration. Missing counts do not mean there are zero pending appointments.
        </div>
      ) : null}
      {hospitalSection === "overview" ? (
        <OverviewSection onNavigate={setHospitalSection} />
      ) : hospitalSection === "branches" ? (
        <BranchesSection />
      ) : hospitalSection === "departments" ? (
        <DepartmentsSection />
      ) : hospitalSection === "doctors" ? (
        <DoctorsSection />
      ) : hospitalSection === "appointments" ? (
        <AppointmentsSection />
      ) : hospitalSection === "revenue" ? (
        <RevenueSection />
      ) : hospitalSection === "profile" ? (
        <ProfileSection />
      ) : hospitalSection === "settings" ? (
        <SettingsSection />
      ) : (
        <OverviewSection onNavigate={setHospitalSection} />
      )}
    </DashboardShell>
  );
}
