"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DoctorDashboardData } from "@/lib/types";
import { apiGet } from "@/lib/api-client";
import { errMessage } from "./helpers";

/**
 * DoctorDashboardContext — dashboard stats shared between the shell (nav
 * badge for pending approvals) and any section that needs them (overview,
 * earnings, reviews). Mutating sections call `reload()` so the badge and
 * stats stay fresh after approve/reject/complete actions.
 */

type DoctorDashboardContextValue = {
  data: DoctorDashboardData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const DoctorDashboardContext =
  createContext<DoctorDashboardContextValue | null>(null);

export function DoctorDashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiGet<DoctorDashboardData>("/api/v1/doctor/dashboard")
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(errMessage(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  return (
    <DoctorDashboardContext.Provider value={{ data, loading, error, reload }}>
      {children}
    </DoctorDashboardContext.Provider>
  );
}

export function useDoctorDashboard(): DoctorDashboardContextValue {
  const ctx = useContext(DoctorDashboardContext);
  if (!ctx) {
    throw new Error("useDoctorDashboard must be used inside the provider");
  }
  return ctx;
}
