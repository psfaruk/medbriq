"use client";

import { create } from "zustand";
import type { SessionUser } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import { readStoredLang, storeLang } from "@/lib/i18n";

/**
 * Find Medi Doctor application state.
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

// ── Public portal views (guest experience on "/") ──────────────────
// The portal is a single-route SPA: every "page" is a view, deep-linkable
// via ?view=…&slug=… (see components/portal/view-url.ts). When this
// sandbox constraint lifts, each view maps 1:1 to a real route.
export type PortalView =
  | { name: "home" }
  | { name: "doctors"; q?: string; specialty?: string; city?: string; division?: string; district?: string; upazila?: string }
  | { name: "doctor"; slug: string }
  | { name: "hospitals"; city?: string }
  | { name: "hospital"; slug: string }
  | { name: "specialties" }
  | { name: "library"; category?: string }
  | { name: "article"; slug: string }
  | { name: "symptoms" }
  | { name: "symptom"; slug: string }
  | { name: "equipment" }
  | { name: "equipment-item"; slug: string }
  | { name: "childrens-health" }
  | { name: "family-health" }
  | { name: "community-health" }
  | { name: "for-patients" }
  | { name: "for-doctors" }
  | { name: "for-hospitals" }
  | { name: "for-providers" }
  | { name: "how-it-works" }
  | { name: "verification" }
  | { name: "emergency" }
  | { name: "tools" }
  | { name: "calendar" }
  | { name: "faq" }
  | { name: "verify"; d: string }
  | { name: "legal"; doc?: string }
  | { name: "auth"; mode: "login" | "register" | "forgot" };

/** A booking intent saved before login (spec §12). */
export type PendingBooking = {
  doctorSlug: string;
  doctorName: string;
  /** When the intent was saved (sessionStorage persistence). */
  savedAt: string;
};

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

  // ── public portal navigation ──────────────────────────────────
  portalView: PortalView;
  /** Navigate the public portal; `true` pushes a history entry so the
   *  browser Back button walks portal views like pages. */
  setPortalView: (view: PortalView, opts?: { push?: boolean }) => void;
  /** When true, a signed-in user browses the public portal instead of their
   *  dashboard ("Public site" ⇄ "My dashboard" toggle). */
  portalMode: boolean;
  setPortalMode: (on: boolean) => void;

  // ── booking intent saved across login (spec §12) ────────────────
  pendingBooking: PendingBooking | null;
  setPendingBooking: (intent: PendingBooking | null) => void;

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

  portalView: { name: "home" },
  setPortalView: (view, opts) => {
    set({ portalView: view });
    if (typeof window !== "undefined") {
      if (opts?.push) {
        window.history.pushState(null, "", viewToUrl(view));
      } else {
        window.history.replaceState(null, "", viewToUrl(view));
      }
      window.scrollTo({ top: 0 });
    }
  },

  portalMode: false,
  setPortalMode: (on) => {
    set({ portalMode: on });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  },

  pendingBooking: readPendingBooking(),
  setPendingBooking: (intent) => {
    set({ pendingBooking: intent });
    if (typeof window !== "undefined") {
      try {
        if (intent) {
          window.sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(intent));
        } else {
          window.sessionStorage.removeItem(PENDING_BOOKING_KEY);
        }
      } catch {
        /* storage unavailable — in-memory only */
      }
    }
  },

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
      portalView: { name: "home" },
      portalMode: false,
      pendingBooking: null,
    });
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(PENDING_BOOKING_KEY);
      } catch {
        /* ignore */
      }
    }
  },
}));

/** Hydrate the language from localStorage once on the client. */
export function hydrateLang() {
  const lang = readStoredLang();
  if (useAppStore.getState().lang !== lang) {
    useAppStore.setState({ lang });
  }
}

// ── Portal view ↔ URL (?view=…&slug=…&…) ───────────────────────────

const PENDING_BOOKING_KEY = "fmd.pendingBooking";

/** Serialize a portal view into a shareable URL on the single "/" route. */
export function viewToUrl(view: PortalView): string {
  const p = new URLSearchParams();
  if (view.name !== "home") p.set("view", view.name);
  switch (view.name) {
    case "doctor":
    case "hospital":
    case "article":
    case "symptom":
    case "equipment-item":
      p.set("slug", view.slug);
      break;
    case "doctors":
      if (view.q) p.set("q", view.q);
      if (view.specialty) p.set("specialty", view.specialty);
      if (view.city) p.set("city", view.city);
      if (view.division) p.set("division", view.division);
      if (view.district) p.set("district", view.district);
      if (view.upazila) p.set("upazila", view.upazila);
      break;
    case "hospitals":
      if (view.city) p.set("city", view.city);
      break;
    case "library":
      if (view.category) p.set("category", view.category);
      break;
    case "verify":
      if (view.d) p.set("d", view.d);
      break;
    case "legal":
      if (view.doc) p.set("doc", view.doc);
      break;
    case "auth":
      if (view.mode !== "login") p.set("mode", view.mode);
      break;
  }
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}

/** Parse a URL search string into a portal view (defensive: any garbage → home). */
export function urlToView(search: string): PortalView {
  const p = new URLSearchParams(search);
  const view = p.get("view") ?? "home";
  const slug = p.get("slug") ?? "";
  switch (view) {
    case "home":
    case "specialties":
    case "symptoms":
    case "equipment":
    case "childrens-health":
    case "family-health":
    case "community-health":
    case "for-patients":
    case "for-doctors":
    case "for-hospitals":
    case "for-providers":
    case "how-it-works":
    case "verification":
    case "emergency":
    case "tools":
    case "calendar":
    case "faq":
      return { name: view };
    case "doctors":
      return {
        name: "doctors",
        q: p.get("q") ?? undefined,
        specialty: p.get("specialty") ?? undefined,
        city: p.get("city") ?? undefined,
        division: p.get("division") ?? undefined,
        district: p.get("district") ?? undefined,
        upazila: p.get("upazila") ?? undefined,
      };
    case "hospitals":
      return { name: "hospitals", city: p.get("city") ?? undefined };
    case "library":
      return { name: "library", category: p.get("category") ?? undefined };
    case "verify":
      return { name: "verify", d: p.get("d") ?? "" };
    case "legal":
      return { name: "legal", doc: p.get("doc") ?? undefined };
    case "auth": {
      const mode = p.get("mode");
      return {
        name: "auth",
        mode: mode === "register" || mode === "forgot" ? mode : "login",
      };
    }
    default:
      // slug-carrying views — unknown slugs render honest not-found states
      if (!slug) return { name: "home" };
      if (view === "doctor") return { name: "doctor", slug };
      if (view === "hospital") return { name: "hospital", slug };
      if (view === "article") return { name: "article", slug };
      if (view === "symptom") return { name: "symptom", slug };
      if (view === "equipment-item") return { name: "equipment-item", slug };
      return { name: "home" };
  }
}

/** Restore a booking intent saved before login (session-scoped). */
function readPendingBooking(): PendingBooking | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBooking;
    if (parsed?.doctorSlug && parsed?.doctorName) return parsed;
  } catch {
    /* corrupted entry — ignore */
  }
  return null;
}
