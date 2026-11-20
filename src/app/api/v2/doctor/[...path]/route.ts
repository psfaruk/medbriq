import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import {
  GuardError,
  requireDoctorProfile,
} from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * /api/v2/doctor/chambers — practice-location management for the signed-in
 * doctor (master prompt §4.18-19: Chamber Management, Multiple Locations).
 *
 *  GET    /api/v2/doctor/chambers       — list own chambers
 *  POST   /api/v2/doctor/chambers       — add a chamber
 *  PATCH  /api/v2/doctor/chambers/:id   — update / deactivate
 *  DELETE /api/v2/doctor/chambers/:id   — remove (blocked while future
 *                                         bookings reference it)
 */

const chamberSchema = z.object({
  name: z.string().trim().min(2, "Chamber name must be at least 2 characters.").max(120),
  address: z.string().trim().min(5, "Address must be at least 5 characters.").max(200),
  city: z.string().trim().min(2).max(80),
  area: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
});

function toDto(row: {
  id: string;
  name: string;
  address: string;
  city: string;
  area: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    area: row.area,
    phone: row.phone,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const { profile } = await requireDoctorProfile();
    const rows = await db.chamber.findMany({
      where: { doctorId: profile.id },
      orderBy: { createdAt: "asc" },
    });
    return ok({ items: rows.map(toDto) });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { profile, user } = await requireDoctorProfile();
    const raw: unknown = await req.json().catch(() => null);
    const parsed = chamberSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid chamber.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const created = await db.chamber.create({
      data: {
        doctorId: profile.id,
        name: parsed.data.name,
        address: parsed.data.address,
        city: parsed.data.city,
        area: parsed.data.area ?? null,
        phone: parsed.data.phone ?? null,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "CHAMBER_ADDED",
        entity: "Chamber",
        entityId: created.id,
        meta: JSON.stringify({ name: created.name, city: created.city }),
      },
    });
    return ok({ chamber: toDto(created) });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { profile } = await requireDoctorProfile();
    const { path } = await params;
    const id = path[0];
    if (!id) return fail("Chamber id is required.", 400, "INVALID_BODY");

    const raw: unknown = await req.json().catch(() => null);
    const parsed = chamberSchema.partial().extend({
      isActive: z.boolean().optional(),
    }).safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid update.",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Ownership check — a doctor can only update their own chamber.
    const existing = await db.chamber.findFirst({
      where: { id, doctorId: profile.id },
    });
    if (!existing) return fail("Chamber not found.", 404, "NOT_FOUND");

    const updated = await db.chamber.update({
      where: { id },
      data: parsed.data,
    });
    return ok({ chamber: toDto(updated) });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { profile } = await requireDoctorProfile();
    const { path } = await params;
    const id = path[0];
    if (!id) return fail("Chamber id is required.", 400, "INVALID_BODY");

    const existing = await db.chamber.findFirst({
      where: { id, doctorId: profile.id },
      include: {
        appointments: {
          where: {
            status: { in: ["PENDING_APPROVAL", "CONFIRMED"] },
            slotStart: { gte: new Date() },
          },
          take: 1,
        },
      },
    });
    if (!existing) return fail("Chamber not found.", 404, "NOT_FOUND");
    if (existing.appointments.length > 0) {
      return fail(
        "This chamber has upcoming bookings. Deactivate it instead — existing appointments keep their location.",
        409,
        "CHAMBER_IN_USE"
      );
    }

    // Detach chamber-linked schedule rules before removal so no orphan
    // references remain.
    await db.availabilityRule.updateMany({
      where: { chamberId: id },
      data: { chamberId: null },
    });
    await db.chamber.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}
