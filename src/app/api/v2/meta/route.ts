import { db } from "@/lib/db";
import { ok, handleRouteError } from "@/lib/api";
import { GuardError, requirePrismaBackedStore } from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * GET /api/v2/meta — public runtime configuration for the client:
 * feature flags, platform settings (support contacts, commission) and the
 * active country list. Lets the UI gate modules (telehealth, payments)
 * without hardcoding them (master prompt §7 Feature Flags).
 */
export async function GET() {
  try {
    requirePrismaBackedStore(); // reads Prisma-direct config; honest 503 on Firestore
    const [flags, settings, countries] = await Promise.all([
      db.featureFlag.findMany(),
      db.platformSetting.findMany(),
      db.country.findMany({ orderBy: { name: "asc" } }),
    ]);

    return ok({
      flags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
      flagDetails: flags.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        description: f.description,
        updatedAt: f.updatedAt.toISOString(),
      })),
      settings: Object.fromEntries(settings.map((s) => [s.key, s.value])),
      countries: countries.map((c) => ({
        code: c.code,
        name: c.name,
        currency: c.currency,
        phoneCode: c.phoneCode,
        isActive: c.isActive,
      })),
    });
  } catch (err) {
    if (err instanceof GuardError) {
      return ok({
        flags: {},
        flagDetails: [],
        settings: {},
        countries: [],
        disabled: true,
        reason: err.message,
      });
    }
    return handleRouteError(err);
  }
}
