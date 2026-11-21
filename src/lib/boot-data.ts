"use client";

/**
 * Client-side cache for the single-shot bootstrap payload
 * (GET /api/v1/bootstrap).
 *
 * app.tsx fetches bootstrap ONCE at startup and stores the public parts
 * here; the first screen (auth screen / patient home) then renders them
 * immediately instead of firing its own request waterfall. Entries are
 * single-use and age-bounded — after maxAgeMs (or once consumed where
 * appropriate) screens fall back to their normal fetch paths.
 */

import type {
  AppointmentDto,
  AuthConfig,
  DoctorCard,
  SpecialtyInfo,
} from "@/lib/types";

export type BootPayload = {
  /** Session user the payload was captured for (null = guest). Used to
   *  decide whether user-scoped parts (appointments) are still fresh. */
  capturedForUserId: string | null;
  authConfig: AuthConfig | null;
  specialties: SpecialtyInfo[] | null;
  homeDoctors: DoctorCard[] | null;
  /** Only trustworthy while capturedForUserId matches the current user. */
  appointments: AppointmentDto[] | null;
};

let preloaded: { payload: BootPayload; at: number } | null = null;

export function setPreloadedBoot(payload: BootPayload): void {
  preloaded = { payload, at: Date.now() };
}

export function clearPreloadedBoot(): void {
  preloaded = null;
}

/** Returns the bootstrap payload if it is younger than maxAgeMs. */
export function getPreloadedBoot(maxAgeMs = 60_000): BootPayload | null {
  if (!preloaded) return null;
  if (Date.now() - preloaded.at > maxAgeMs) {
    preloaded = null;
    return null;
  }
  return preloaded.payload;
}
