import { ok, handleRouteError } from "@/lib/api";
import { getGoogleClientId } from "@/lib/google";
import { isDevOtpMode } from "@/lib/sms";
import type { AuthConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/config — public.
 * Tells the client which alternative sign-in methods this deployment
 * supports (Google GIS button, phone OTP) and whether OTPs are echoed back
 * in API responses (dev mode with the console SMS provider).
 */
export async function GET() {
  try {
    const googleClientId = getGoogleClientId();
    const config: AuthConfig = {
      googleEnabled: googleClientId !== null,
      googleClientId,
      phoneOtpEnabled: true,
      devOtpMode: isDevOtpMode(),
    };
    return ok(config);
  } catch (err) {
    return handleRouteError(err);
  }
}
