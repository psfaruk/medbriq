"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Building2,
  CalendarCheck,
  CreditCard,
  SlidersHorizontal,
  Star,
  LifeBuoy,
  ScrollText,
  Activity,
  FileText,
  BarChart3,
  ShieldCheck,
  ScanLine,
} from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/dashboard-shell";
import { useAppStore } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import { useT } from "@/components/app/shared/ui-kit";
import type { VerificationItem } from "@/lib/types";
import OverviewSection from "./sections/overview-section";
import PatientsSection from "./sections/patients-section";
import DoctorsSection from "./sections/doctors-section";
import HospitalsSection from "./sections/hospitals-section";
import AppointmentsSection from "./sections/appointments-section";
import PaymentsSection from "./sections/payments-section";
import PlatformSection from "./sections/platform-section";
import ReviewsSection from "./sections/reviews-section";
import TicketsSection from "./sections/tickets-section";
import AuditSection from "./sections/audit-section";
import SecuritySection from "./sections/security-section";
import SystemSection from "./sections/system-section";
import ContentSection from "./sections/content-section";
import AnalyticsSection from "./sections/analytics-section";
import VvsAdminSection from "./sections/vvs-section";
import type { SupportTicketItem } from "./types";

/**
 * AdminDashboard — the Find Medi Doctor super admin web panel (master prompt §7).
 *
 * One DashboardShell + twelve sections keyed by `adminSection` in the app
 * store. The nav carries live badges for the doctor verification queue and
 * open support tickets; sections refresh the badges after every mutation.
 */
export default function AdminDashboard() {
  const adminSection = useAppStore((s) => s.adminSection);
  const setAdminSection = useAppStore((s) => s.setAdminSection);
  const { t } = useT();

  const [badges, setBadges] = useState<{ doctors: number | null; tickets: number | null }>({
    doctors: null,
    tickets: null,
  });
  const [badgeNonce, setBadgeNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      apiGet<{ items: VerificationItem[] }>(
        "/api/v1/admin/verifications?status=PENDING"
      ),
      apiGet<{ items: SupportTicketItem[] }>("/api/v2/support/list"),
    ]).then(([queueResult, ticketResult]) => {
      if (!alive) return;
      setBadges((current) => ({
        doctors:
          queueResult.status === "fulfilled"
            ? queueResult.value.items.length
            : current.doctors,
        tickets:
          ticketResult.status === "fulfilled"
            ? ticketResult.value.items.filter((x) => x.status === "OPEN").length
            : current.tickets,
      }));
    });
    return () => {
      alive = false;
    };
  }, [badgeNonce]);

  const refreshBadges = useCallback(() => setBadgeNonce((n) => n + 1), []);

  const navItems: NavItem[] = [
    { key: "overview", group: "Overview", label: t("adminNav.overview"), icon: LayoutDashboard },
    { key: "patients", group: "People & organizations", label: t("adminNav.patients"), icon: Users },
    { key: "doctors", group: "People & organizations", label: t("adminNav.doctors"), icon: Stethoscope, badge: badges.doctors ?? undefined },
    { key: "hospitals", group: "People & organizations", label: t("adminNav.hospitals"), icon: Building2 },
    { key: "appointments", group: "Operations", label: t("adminNav.appointments"), icon: CalendarCheck },
    { key: "vvs", group: "Operations", label: t("adminNav.vvs"), icon: ScanLine },
    { key: "content", group: "Operations", label: t("adminNav.content"), icon: FileText },
    { key: "reviews", group: "Operations", label: t("adminNav.reviews"), icon: Star },
    { key: "tickets", group: "Operations", label: t("adminNav.tickets"), icon: LifeBuoy, badge: badges.tickets ?? undefined },
    { key: "payments", group: "Finance & platform", label: t("adminNav.payments"), icon: CreditCard },
    { key: "platform", group: "Finance & platform", label: t("adminNav.platform"), icon: SlidersHorizontal },
    { key: "analytics", group: "Finance & platform", label: t("adminNav.analytics"), icon: BarChart3 },
    { key: "audit", group: "Governance", label: t("adminNav.audit"), icon: ScrollText },
    { key: "security", group: "Governance", label: t("adminNav.security"), icon: ShieldCheck },
    { key: "system", group: "Governance", label: t("adminNav.system"), icon: Activity },
  ];

  return (
    <DashboardShell
      roleLabel="Super Admin"
      navItems={navItems}
      activeSection={adminSection}
      onSectionChange={setAdminSection}
    >
      {adminSection === "overview" ? (
        <OverviewSection onNavigate={setAdminSection} />
      ) : null}
      {adminSection === "patients" ? <PatientsSection /> : null}
      {adminSection === "doctors" ? (
        <DoctorsSection onMutate={refreshBadges} />
      ) : null}
      {adminSection === "hospitals" ? (
        <HospitalsSection onMutate={refreshBadges} />
      ) : null}
      {adminSection === "appointments" ? (
        <AppointmentsSection onNavigate={setAdminSection} />
      ) : null}
      {adminSection === "payments" ? <PaymentsSection /> : null}
      {adminSection === "platform" ? <PlatformSection /> : null}
      {adminSection === "vvs" ? <VvsAdminSection /> : null}
      {adminSection === "content" ? <ContentSection /> : null}
      {adminSection === "analytics" ? <AnalyticsSection /> : null}
      {adminSection === "reviews" ? <ReviewsSection /> : null}
      {adminSection === "tickets" ? (
        <TicketsSection onMutate={refreshBadges} />
      ) : null}
      {adminSection === "audit" ? <AuditSection /> : null}
      {adminSection === "security" ? <SecuritySection /> : null}
      {adminSection === "system" ? <SystemSection /> : null}
    </DashboardShell>
  );
}
