"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useAppStore, hydrateLang } from "@/lib/app-state";
import { apiGet } from "@/lib/api-client";
import { setPreloadedBoot } from "@/lib/boot-data";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentDto, AuthConfig, DoctorCard, SessionUser, SpecialtyInfo } from "@/lib/types";
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
// Guests get the PUBLIC PORTAL (discovery + education, no login required);
// sign-in happens only through the portal's auth gate view.
const PublicPortal = dynamic(() => import("@/components/portal/portal"), {
  loading: () => <DashboardFallback label="MedBricBD" />,
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
 * src/lib/boot-data.ts so the portal home renders instantly; `boot()` then
 * flips the shell to the matching interface:
 *   guest   → PUBLIC PORTAL (doctor/hospital discovery, health library —
 *             no login required; auth only when booking or managing data)
 *   PATIENT → mobile-first patient app (bottom tabs on phones)
 *   DOCTOR  → doctor web dashboard (sidebar)
 *   HOSPITAL→ hospital web dashboard (sidebar)
 *   ADMIN   → super admin panel (sidebar)
 */
export default function App() {
  const { booted, user, boot } = useAppStore();
  const { toast } = useToast();
  const portalMode = useAppStore((s) => s.portalMode);
  const pendingBooking = useAppStore((s) => s.pendingBooking);
  const setPendingBooking = useAppStore((s) => s.setPendingBooking);
  const resetPatient = useAppStore((s) => s.resetPatient);
  const setPortalMode = useAppStore((s) => s.setPortalMode);

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

  // ── Booking-intent restore (spec §12) ──────────────────────────────
  // A guest who clicked "Book appointment" saved their intent; after a
  // successful PATIENT login the booking flow resumes immediately (the
  // flow revalidates slot + price server-side at confirmation).
  const pendingBookingForEffect = pendingBooking;
  const userForEffect = user;
  useEffect(() => {
    if (!userForEffect || !pendingBookingForEffect) return;
    setPendingBooking(null);
    setPortalMode(false);
    if (userForEffect.role === "PATIENT") {
      track("booking_start");
      resetPatient({ name: "booking", slug: pendingBookingForEffect.doctorSlug });
      toast({
        title: "Continuing your booking",
        description: `Resuming your appointment with ${pendingBookingForEffect.doctorName}. Availability and fees will be re-checked when you confirm.`,
      });
    } else {
      toast({
        title: "Signed in as " + userForEffect.role.toLowerCase(),
        description: `Booking is a patient feature — use a patient account to book with ${pendingBookingForEffect.doctorName}.`,
      });
    }
     
  }, [userForEffect, pendingBookingForEffect]);

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

  // A scanned VVS QR (?view=verify&d=…) opens the public verification page
  // even for signed-in users — the doctor/patient then continues from there.
  const verifyDeepLink =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("view") === "verify";

  // Guests → the public discovery portal (NOT a login wall).
  // Signed-in users in portalMode → also the portal ("Public site" toggle).
  if (!user || portalMode || verifyDeepLink) {
    return <PublicPortal />;
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
