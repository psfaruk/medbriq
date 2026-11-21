"use client";

/**
 * Auth gate frame (spec §12): wraps the existing AuthScreen inside the
 * portal with a minimal top bar and — when a booking intent is pending —
 * a context banner explaining exactly what resumes after sign-in.
 */

import { useEffect } from "react";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { useT } from "@/components/app/shared/ui-kit";
import { BrandLogo } from "@/components/app/shared/brand";
import { PortalLink, useTrackPageView } from "../shared";
import AuthScreen from "@/components/app/auth-screen";

export default function AuthFrameView({ mode }: { mode: "login" | "register" | "forgot" }) {
  const { t } = useT();
  useTrackPageView(`auth-${mode}`);
  const pendingBooking = useAppStore((s) => s.pendingBooking);
  const setPortalView = useAppStore((s) => s.setPortalView);

  // Map the portal auth mode onto the existing AuthScreen view state.
  // (welcome is bypassed: the portal itself is the welcome experience.)
  // Effect, not render-phase: setting auth state during render is illegal.
  const setAuthView = useAppStore((s) => s.setAuthView);
  const targetView =
    mode === "register" ? "register" : mode === "forgot" ? "forgot" : "login";
  useEffect(() => {
    if (useAppStore.getState().authView !== targetView) {
      setAuthView(targetView);
    }
  }, [targetView, setAuthView]);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal top bar */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <PortalLink
            view={{ name: "home" }}
            ariaLabel={t("portal.nav.backToSite")}
            className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <BrandLogo className="h-7 w-7" />
            <span className="text-sm font-extrabold text-foreground">MedBricBD</span>
          </PortalLink>
          <button
            type="button"
            onClick={() => setPortalView({ name: "home" }, { push: true })}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("portal.nav.backToSite")}
          </button>
        </div>
      </header>

      {/* Booking context banner (spec §12) */}
      {pendingBooking && (
        <div
          role="status"
          className="border-b border-[#13A89E]/30 bg-[#13A89E]/10"
        >
          <div className="mx-auto flex w-full max-w-6xl items-start gap-3 px-4 py-3 sm:px-6">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-[#0f8f87]" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed text-[#0f8f87]">
              {t("portal.auth.bookingNotice", { name: pendingBooking.doctorName })}
            </p>
          </div>
        </div>
      )}

      {/* The existing, battle-tested auth flow (login/register/OTP/forgot) */}
      <AuthScreen />
    </div>
  );
}
