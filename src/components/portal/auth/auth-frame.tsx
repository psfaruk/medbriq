"use client";

/**
 * Auth gate frame (spec §12): wraps the existing AuthScreen inside the
 * portal. The screen itself now renders a full-screen cinematic video wall
 * with an overlaid glass form card, so this frame only maps the portal
 * auth mode onto the auth view state and — when a booking intent is
 * pending — passes a context banner explaining exactly what resumes after
 * sign-in.
 */

import { useEffect } from "react";
import { CalendarClock } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { useT } from "@/components/app/shared/ui-kit";
import AuthScreen from "@/components/app/auth-screen";

export default function AuthFrameView({ mode }: { mode: "login" | "register" | "forgot" }) {
  const { t } = useT();
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

  // Booking context banner (spec §12) — floats over the video wall as a
  // glassy teal strip right under the top bar.
  const notice = pendingBooking ? (
    <div className="px-4 pt-1 sm:px-6" role="status">
      <div className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-2xl border border-[#13A89E]/50 bg-[#0B1B30]/70 px-4 py-3 shadow-lg backdrop-blur-md">
        <CalendarClock
          className="mt-0.5 h-5 w-5 shrink-0 text-[#5EEAD4]"
          aria-hidden="true"
        />
        <p className="text-sm font-medium leading-relaxed text-teal-50">
          {t("portal.auth.bookingNotice", { name: pendingBooking.doctorName })}
        </p>
      </div>
    </div>
  ) : null;

  return (
    <AuthScreen
      notice={notice}
      onBack={() => setPortalView({ name: "home" }, { push: true })}
      backLabel={t("portal.nav.backToSite")}
    />
  );
}
