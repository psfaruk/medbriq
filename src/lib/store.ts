"use client";

import { create } from "zustand";
import type { SearchFilters, SessionUser } from "@/lib/types";

/**
 * Medbriq client-side app store.
 *
 * The MVP is a single-route application (SPA-style view switching on "/"),
 * so navigation state lives here instead of the URL. All view components
 * read their context from this store; the shell (src/app/page.tsx) renders
 * the active view.
 */

export type ViewName =
  | "home"
  | "search"
  | "doctor"
  | "booking"
  | "appointments"
  | "doctor-dashboard"
  | "admin"
  | "settings"
  | "auth"
  | "compliance";

export type AppView = { name: ViewName; slug?: string };

type AppState = {
  view: AppView;
  user: SessionUser | null;
  userLoaded: boolean;
  searchFilters: SearchFilters;
  /** after login/register, return to this view */
  authReturnView: AppView;
  navigate: (view: AppView) => void;
  setUser: (user: SessionUser | null) => void;
  setUserLoaded: (loaded: boolean) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setAuthReturnView: (view: AppView) => void;
};

export const useAppStore = create<AppState>((set) => ({
  view: { name: "home" },
  user: null,
  userLoaded: false,
  searchFilters: {},
  authReturnView: { name: "home" },
  navigate: (view) => set({ view }),
  setUser: (user) => set({ user }),
  setUserLoaded: (userLoaded) => set({ userLoaded }),
  setSearchFilters: (searchFilters) => set({ searchFilters }),
  setAuthReturnView: (authReturnView) => set({ authReturnView }),
}));
