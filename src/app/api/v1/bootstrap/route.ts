import { getStore, storeKind } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { handleRouteError, ok } from "@/lib/api";
import { cached } from "@/lib/cache";
import { getGoogleClientId, isGoogleAuthConfigured } from "@/lib/google";
import { isDevOtpMode, isPhoneOtpSafe } from "@/lib/sms";
import {
  doctorsPage,
  HOME_DOCTORS_QUERY,
} from "@/app/api/v1/_lib/directory";
import { toAppointmentDto } from "@/app/api/v1/_lib/booking";
import type { AuthConfig, SpecialtyInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/bootstrap — ONE request that resolves everything the app needs
 * to paint its first screen.
 *
 * PERF: previously the client booted through a request waterfall —
 * /auth/me → (guest) /auth/config + /specialties, or (patient)
 * /specialties + /doctors?sort=rating… + /appointments — i.e. up to FIVE
 * serverless invocations, each paying its own cold start on Vercel. This
 * endpoint answers all of them in a single invocation:
 *
 *   user         — session lookup (2 reads; null for guests)
 *   authConfig   — static env-derived, zero I/O
 *   specialties  — shared cached() entry with GET /api/v1/specialties
 *   homeDoctors  — shared cached() entry with GET /api/v1/doctors
 *                  (HOME_DOCTORS_QUERY is the exact query the patient home
 *                  screen uses, so both endpoints hit the same cache row)
 *   appointments — patients only (user-scoped, never cached)
 *
 * No-store: the payload embeds the caller's session.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const [authConfig, specialties, homeDoctors, appointments] =
      await Promise.all([
        buildAuthConfig(),
        cached("v1:specialties", 120_000, () =>
          getStore()
            .getSpecialtiesWithDoctorCounts(["VERIFIED", "PENDING"])
            .then((rows) =>
              rows.sort(
                (a, b) =>
                  b.doctorCount - a.doctorCount || a.name.localeCompare(b.name)
              )
            )
        ),
        doctorsPage(HOME_DOCTORS_QUERY),
        user
          ? getStore()
              .listAppointmentsByPatient(user.id)
              .then((rows) => rows.map(toAppointmentDto))
          : Promise.resolve([]),
      ]);

    return ok(
      {
        user,
        authConfig,
        specialties: specialties as SpecialtyInfo[],
        homeDoctors: homeDoctors.items,
        appointments,
        dataStore: storeKind(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

/** Same payload shape as GET /api/v1/auth/config. */
async function buildAuthConfig(): Promise<AuthConfig> {
  const googleClientId = getGoogleClientId();
  return {
    // Same rule as /api/v1/auth/config: Google works via the Firebase
    // service account (popup + server-side token verification) even when
    // no legacy GOOGLE_CLIENT_ID is set.
    googleEnabled: isGoogleAuthConfigured(),
    googleClientId,
    // BUGFIX: this was hardcoded `true`, so the production UI showed an
    // enabled phone tab that then failed with 503 — no SMS provider is
    // configured. Use the shared gate so the tab state matches reality.
    phoneOtpEnabled: isPhoneOtpSafe(),
    devOtpMode: isDevOtpMode(),
  };
}
