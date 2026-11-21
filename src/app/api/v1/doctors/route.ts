import type { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { publicCacheHeaders } from "@/lib/cache";
import {
  DoctorsQueryError,
  doctorsPage,
} from "@/app/api/v1/_lib/directory";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/doctors — public doctor directory.
 *
 * The whole computation (filters, rating aggregation, batched availability
 * for nextAvailableLabel / availableToday, sorting, pagination) lives in
 * src/app/api/v1/_lib/directory.ts so GET /api/v1/bootstrap can share the
 * exact same cached() entry per query string.
 */
export async function GET(request: NextRequest) {
  try {
    const data = await doctorsPage(request.nextUrl.search);
    return ok(data, { headers: publicCacheHeaders(60) });
  } catch (err) {
    if (err instanceof DoctorsQueryError) {
      return fail(
        `Invalid query parameters — ${err.message}`,
        400,
        "INVALID_QUERY"
      );
    }
    return handleRouteError(err);
  }
}
