"use client";

/**
 * DoctorDashboard — the doctor web dashboard (master prompt §4).
 *
 * One DashboardShell + eleven sections: overview, today's queue,
 * appointments manager, patient visit lookup, fee settings (doctor-wise
 * pricing), weekly schedule, chambers, earnings, reviews, profile and
 * settings. All data comes from the finished Find Medi Doctor API — this file is
 * presentation only.
 */

import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  CircleDollarSign,
  CalendarClock,
  Building2,
  Wallet,
  MessageSquareQuote,
  UserRound,
  Settings,
  ShieldCheck,
} from "lucide-react";
import DashboardShell, { type NavItem } from "@/components/app/dashboard-shell";
import { useAppStore } from "@/lib/app-state";
import { useT } from "@/components/app/shared/ui-kit";
import {
  DoctorDashboardProvider,
  useDoctorDashboard,
} from "./context";
import OverviewSection from "./sections/overview";
import QueueSection from "./sections/queue";
import VvsSection from "./sections/vvs";
import AppointmentsSection from "./sections/appointments";
import PatientsSection from "./sections/patients";
import FeesSection from "./sections/fees";
import ScheduleSection from "./sections/schedule";
import ChambersSection from "./sections/chambers";
import EarningsSection from "./sections/earnings";
import ReviewsSection from "./sections/reviews";
import ProfileSection from "./sections/profile";
import SettingsSection from "./sections/settings";

const SECTION_KEYS = [
  "overview",
  "queue",
  "vvs",
  "appointments",
  "patients",
  "fees",
  "schedule",
  "chambers",
  "earnings",
  "reviews",
  "profile",
  "settings",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}

export default function DoctorDashboard() {
  const { doctorSection, setDoctorSection } = useAppStore();
  const active = isSectionKey(doctorSection) ? doctorSection : "overview";

  return (
    <DoctorDashboardProvider>
      <DoctorDashboardInner
        activeSection={active}
        onSectionChange={setDoctorSection}
      />
    </DoctorDashboardProvider>
  );
}

function DoctorDashboardInner({
  activeSection,
  onSectionChange,
}: {
  activeSection: SectionKey;
  onSectionChange: (key: string) => void;
}) {
  const { t } = useT();
  const { data } = useDoctorDashboard();
  const pending = data?.stats.pendingRequests ?? 0;

  const navItems: NavItem[] = [
    { key: "overview", group: "Today", label: t("doctorNav.overview"), icon: LayoutDashboard },
    { key: "queue", group: "Today", label: t("doctorNav.queue"), icon: ClipboardList, badge: pending },
    { key: "appointments", group: "Practice", label: t("doctorNav.appointments"), icon: CalendarDays },
    { key: "patients", group: "Practice", label: t("doctorNav.patients"), icon: Users },
    { key: "fees", group: "Practice", label: t("doctorNav.fees"), icon: CircleDollarSign },
    { key: "schedule", group: "Practice", label: t("doctorNav.schedule"), icon: CalendarClock },
    { key: "chambers", group: "Practice", label: t("doctorNav.chambers"), icon: Building2 },
    { key: "earnings", group: "Growth", label: t("doctorNav.earnings"), icon: Wallet },
    { key: "reviews", group: "Growth", label: t("doctorNav.reviews"), icon: MessageSquareQuote },
    { key: "vvs", group: "Account & trust", label: t("doctorNav.vvs"), icon: ShieldCheck },
    { key: "profile", group: "Account & trust", label: t("doctorNav.profile"), icon: UserRound },
    { key: "settings", group: "Account & trust", label: t("doctorNav.settings"), icon: Settings },
  ];

  return (
    <DashboardShell
      roleLabel="Doctor Dashboard"
      navItems={navItems}
      activeSection={activeSection}
      onSectionChange={onSectionChange}
    >
      <div key={activeSection} className="animate-rise-in">
        {activeSection === "overview" ? <OverviewSection /> : null}
        {activeSection === "queue" ? <QueueSection /> : null}
        {activeSection === "vvs" ? <VvsSection /> : null}
        {activeSection === "appointments" ? <AppointmentsSection /> : null}
        {activeSection === "patients" ? <PatientsSection /> : null}
        {activeSection === "fees" ? <FeesSection /> : null}
        {activeSection === "schedule" ? <ScheduleSection /> : null}
        {activeSection === "chambers" ? <ChambersSection /> : null}
        {activeSection === "earnings" ? <EarningsSection /> : null}
        {activeSection === "reviews" ? <ReviewsSection /> : null}
        {activeSection === "profile" ? <ProfileSection /> : null}
        {activeSection === "settings" ? <SettingsSection /> : null}
      </div>
    </DashboardShell>
  );
}
