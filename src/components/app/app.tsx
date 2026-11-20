"use client";

import { useEffect } from "react";
import { useAppStore, hydrateLang } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import type { SessionUser } from "@/lib/types";
import AuthScreen from "@/components/app/auth-screen";
import PatientShell from "@/components/app/patient-shell";
import PatientApp from "@/components/app/patient";
import DoctorDashboard from "@/components/app/doctor";
import HospitalDashboard from "@/components/app/hospital";
import AdminDashboard from "@/components/app/admin";

/**
 * MedBricBD root application (single-route SPA on "/").
 *
 * Boot: resolve the session once, hydrate the stored language, then render
 * the interface matching the signed-in role:
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
    apiGet<{ user: SessionUser | null }>("/api/v1/auth/me")
      .then((d) => boot(d.user))
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
