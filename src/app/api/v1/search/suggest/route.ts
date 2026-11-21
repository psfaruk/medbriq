import type { NextRequest } from "next/server";
import { ok, handleRouteError } from "@/lib/api";
import { cached, publicCacheHeaders } from "@/lib/cache";
import { getStore } from "@/lib/data";
import { doctorsPage } from "@/app/api/v1/_lib/directory";
import type { HospitalInfo, SpecialtyInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/search/suggest?q=… — public global-search suggestions.
 *
 * Aggregates doctors (via the same cached directory computation as
 * /api/v1/doctors), hospitals and specialties matching the query. Public
 * data only — no PII, no session, no availability computation (this must
 * stay cheap and cacheable).
 */

type Suggestions = {
  doctors: { slug: string; name: string; specialty: string | null; city: string }[];
  hospitals: { slug: string; name: string; city: string }[];
  specialties: { slug: string; name: string }[];
};

function matches(q: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return fields.some((f) => !!f && f.toLowerCase().includes(needle));
}

export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
    if (q.trim().length < 2) {
      return ok({ doctors: [], hospitals: [], specialties: [] } satisfies Suggestions, {
        headers: publicCacheHeaders(30),
      });
    }

    // All three sources share the exact cached() entries used by the public
    // routes, so a warmed directory makes this near-free.
    const [doctorPage, hospitals, specialties] = await Promise.all([
      doctorsPage(
        new URLSearchParams({ q, pageSize: "5", page: "1" }).toString()
      ),
      cached("v1:hospitals", 120_000, () => getStore().listHospitals()),
      cached(
        "v1:specialties",
        120_000,
        () =>
          getStore()
            .getSpecialtiesWithDoctorCounts(["VERIFIED", "PENDING"])
            .then((rows) =>
              rows.sort(
                (a, b) =>
                  b.doctorCount - a.doctorCount || a.name.localeCompare(b.name)
              )
            )
      ),
    ]);

    const doctorItems = doctorPage.items.slice(0, 5).map((d) => ({
      slug: d.slug,
      name: d.name,
      specialty: d.specialties[0]?.name ?? null,
      city: d.city,
    }));

    const hospitalItems = (hospitals as HospitalInfo[])
      .filter((h) => matches(q, h.name, h.city))
      .slice(0, 3)
      .map((h) => ({ slug: h.slug, name: h.name, city: h.city }));

    const specialtyItems = (specialties as SpecialtyInfo[])
      .filter((s) => matches(q, s.name, s.nameBn))
      .slice(0, 3)
      .map((s) => ({ slug: s.slug, name: s.name }));

    return ok(
      {
        doctors: doctorItems,
        hospitals: hospitalItems,
        specialties: specialtyItems,
      } satisfies Suggestions,
      { headers: publicCacheHeaders(30) }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
