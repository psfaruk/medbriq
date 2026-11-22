import { ok, handleRouteError } from "@/lib/api";
import { getGoogleClientId, isGoogleAuthConfigured } from "@/lib/google";
import { isDevOtpMode } from "@/lib/sms";
import type { AuthConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/config — public.
 * Tells the client which alternative sign-in methods this deployment
 * supports (Google via Firebase Auth, phone OTP) and whether OTPs are
 * echoed back in API responses (dev mode with the console SMS provider).
 *
 * Google sign-in is enabled when EITHER the Firebase service account is
 * configured (Firebase Auth popup flow) OR an explicit GOOGLE_CLIENT_ID
 * (legacy GIS flow) is present.
 *
 * SECURITY: phone OTP is only offered when a real SMS provider is
 * configured. In production with the console provider the codes would be
 * echoed back in API responses — anyone could take over any phone number —
 * so the tab is disabled there until a real provider is wired up.
 */
function isPhoneOtpSafe(): boolean {
  if (!isDevOtpMode()) return true; // real provider implemented
  return process.env.NODE_ENV !== "production";
}

export async function GET() {
  try {
    const googleClientId = getGoogleClientId();
    const config: AuthConfig = {
      googleEnabled: isGoogleAuthConfigured(),
      googleClientId,
      phoneOtpEnabled: isPhoneOtpSafe(),
      devOtpMode: isDevOtpMode(),
    };
    return ok(config);
  } catch (err) {
    return handleRouteError(err);
  }
}
