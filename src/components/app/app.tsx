"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppStore, hydrateLang } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import { setPreloadedBoot } from "@/lib/boot-data";
import type { AppointmentDto, AuthConfig, DoctorCard, SessionUser, SpecialtyInfo } from "@/lib/types";
import AuthScreen from "@/components/app/auth-screen";
import PatientShell from "@/components/app/patient-shell";
import PatientApp from "@/components/app/patient";

// The three dashboards are big (charts, tables, form editors) and mutually
// exclusive per session — load them lazily so a patient session never
// compiles admin code (faster boot, much lower dev-server memory).
const DoctorDashboard = dynamic(() => import("@/components/app/doctor"), {
  loading: () => <DashboardFallback label="Doctor dashboard" />,
});
const HospitalDashboard = dynamic(() => import("@/components/app/hospital"), {
  loading: () => <DashboardFallback label="Hospital dashboard" />,
});
const AdminDashboard = dynamic(() => import("@/components/app/admin"), {
  loading: () => <DashboardFallback label="Admin panel" />,
});

function DashboardFallback({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          Loading {label}…
        </p>
      </div>
    </div>
  );
}

/** GET /api/v1/bootstrap payload (only what the client consumes). */
type BootstrapPayload = {
  user: SessionUser | null;
  authConfig: AuthConfig;
  specialties: SpecialtyInfo[];
  homeDoctors: DoctorCard[];
  appointments: AppointmentDto[];
};

/**
 * MedBricBD root application (single-route SPA on "/").
 *
 * Boot: ONE /api/v1/bootstrap request resolves the session AND the public
 * data the first screen needs (previously a 3–5 request waterfall, each
 * paying its own serverless cold start). The public parts are stashed in
 * src/lib/boot-data.ts so the auth screen / patient home render instantly;
 * `boot()` then flips the shell to the matching interface:
 *   PATIENT → mobile-first patient app (bottom tabs on phones)
 *   DOCTOR  → doctor web dashboard (sidebar)
 *   HOSPITAL→ hospital web dashboard (sidebar)
 *   ADMIN   → super admin panel (sidebar)
 * Guests see the auth flow.
 */
export default function App() {
  const { booted, user, boot } = useAppStore();

  useEffect(() => {
    hydrateLang();
    apiGet<BootstrapPayload>("/api/v1/bootstrap")
      .then((d) => {
        setPreloadedBoot({
          capturedForUserId: d.user?.id ?? null,
          authConfig: d.authConfig ?? null,
          specialties: d.specialties ?? null,
          homeDoctors: d.homeDoctors ?? null,
          appointments: Array.isArray(d.appointments) ? d.appointments : null,
        });
        boot(d.user);
      })
      .catch(() => boot(null));
  }, [boot]);

  if (!booted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3" role="status">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-xs font-medium text-muted-foreground">
            Loading MedBricBD…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (user.role === "DOCTOR") {
    return <DoctorDashboard />;
  }
  if (user.role === "HOSPITAL") {
    return <HospitalDashboard />;
  }
  if (user.role === "ADMIN") {
    return <AdminDashboard />;
  }

  // Default: PATIENT (and any future patient-like role).
  return (
    <PatientShell>
      <PatientApp />
    </PatientShell>
  );
}
