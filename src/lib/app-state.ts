"use client";

import { create } from "zustand";
import type { SessionUser } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import { readStoredLang, storeLang } from "@/lib/i18n";

/**
 * MedBricBD application state.
 *
 * The product is a single-route SPA (only "/" is user-visible), so all
 * navigation lives here: the patient app runs a screen + history stack,
 * the three dashboards (doctor / hospital / admin) run a section state,
 * and the auth flow runs its own small view state.
 */

// ── Patient app screens ────────────────────────────────────────────
export type PatientScreen =
  | { name: "home" }
  | { name: "doctors" }
  | { name: "doctor"; slug: string }
  | { name: "booking"; slug: string }
  | { name: "bookings" }
  | { name: "appointment"; id: string }
  | { name: "records" }
  | { name: "profile" }
  | { name: "notifications" }
  | { name: "specialties" }
  | { name: "hospitals" }
  | { name: "hospital"; slug: string };

export type AuthView = "welcome" | "login" | "register" | "otp" | "forgot";

export type DashboardSection = string;

interface AppState {
  // ── boot / session ──────────────────────────────────────────────
  booted: boolean;
  user: SessionUser | null;
  boot: (user: SessionUser | null) => void;
  setUser: (user: SessionUser | null) => void;

  // ── language (bn / en) ──────────────────────────────────────────
  lang: Lang;
  setLang: (lang: Lang) => void;

  // ── auth flow ───────────────────────────────────────────────────
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  /** phone number pending OTP verification */
  otpPhone: string;
  setOtpPhone: (phone: string) => void;

  // ── patient app navigation ──────────────────────────────────────
  patientScreen: PatientScreen;
  patientHistory: PatientScreen[];
  pushPatient: (screen: PatientScreen) => void;
  popPatient: () => void;
  resetPatient: (screen: PatientScreen) => void;

  // ── dashboard sections (doctor / hospital / admin) ─────────────
  doctorSection: DashboardSection;
  hospitalSection: DashboardSection;
  adminSection: DashboardSection;
  setDoctorSection: (s: DashboardSection) => void;
  setHospitalSection: (s: DashboardSection) => void;
  setAdminSection: (s: DashboardSection) => void;

  logout: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  booted: false,
  user: null,
  boot: (user) => set({ user, booted: true }),
  setUser: (user) => set({ user }),

  lang: "en",
  setLang: (lang) => {
    storeLang(lang);
    set({ lang });
  },

  authView: "welcome",
  setAuthView: (authView) => set({ authView }),
  otpPhone: "",
  setOtpPhone: (otpPhone) => set({ otpPhone }),

  patientScreen: { name: "home" },
  patientHistory: [],
  pushPatient: (screen) => {
    const { patientScreen: current, patientHistory } = get();
    set({
      patientHistory: [...patientHistory, current],
      patientScreen: screen,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },
  popPatient: () => {
    const { patientHistory } = get();
    if (patientHistory.length === 0) return;
    const previous = patientHistory[patientHistory.length - 1];
    set({
      patientScreen: previous,
      patientHistory: patientHistory.slice(0, -1),
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },
  resetPatient: (screen) => {
    set({ patientScreen: screen, patientHistory: [] });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },

  doctorSection: "overview",
  hospitalSection: "overview",
  adminSection: "overview",
  setDoctorSection: (doctorSection) => {
    set({ doctorSection });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },
  setHospitalSection: (hospitalSection) => {
    set({ hospitalSection });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },
  setAdminSection: (adminSection) => {
    set({ adminSection });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },

  logout: async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    set({
      user: null,
      authView: "welcome",
      patientScreen: { name: "home" },
      patientHistory: [],
      doctorSection: "overview",
      hospitalSection: "overview",
      adminSection: "overview",
    });
  },
}));

/** Hydrate the language from localStorage once on the client. */
export function hydrateLang() {
  const lang = readStoredLang();
  if (useAppStore.getState().lang !== lang) {
    useAppStore.setState({ lang });
  }
}
