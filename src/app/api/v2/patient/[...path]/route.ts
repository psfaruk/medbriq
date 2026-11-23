import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import {
  GuardError,
  requirePrismaBackedStore,
  requireSession,
} from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * /api/v2/patient/family — family member profiles (master prompt §3.36).
 *
 *  GET    /api/v2/patient/family        — list the patient's members
 *  POST   /api/v2/patient/family        — add a member
 *  PATCH  /api/v2/patient/family/:id    — update a member
 *  DELETE /api/v2/patient/family/:id    — remove a member
 *
 * Patients only ever see their own members (role separation, corrections #7).
 */

const memberSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  relation: z.enum(["SELF", "SPOUSE", "CHILD", "PARENT", "SIBLING", "OTHER"]),
  age: z.number().int().min(0).max(120).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  phone: z.string().trim().max(30).optional(),
});

function toDto(row: {
  id: string;
  name: string;
  relation: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    relation: row.relation,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Catch-all validation: only /api/v2/patient/family-members exists — any
    // other path under this segment answers 404 (wrong-handler fallthrough).
    const { path } = await params;
    if ((path[0] ?? "family-members") !== "family-members") {
      return fail("Unknown patient resource.", 404, "NOT_FOUND");
    }
    requirePrismaBackedStore(); // this surface queries Prisma directly
    const user = await requireSession();
    const rows = await db.familyMember.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return ok({ items: rows.map(toDto) });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if ((path[0] ?? "family-members") !== "family-members") {
      return fail("Unknown patient resource.", 404, "NOT_FOUND");
    }
    requirePrismaBackedStore(); // this surface queries Prisma directly
    const user = await requireSession();
    const raw: unknown = await req.json().catch(() => null);
    const parsed = memberSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid family member.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const created = await db.familyMember.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        relation: parsed.data.relation,
        age: parsed.data.age ?? null,
        gender: parsed.data.gender ?? null,
        phone: parsed.data.phone ?? null,
      },
    });
    return ok({ member: toDto(created) });
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
    requirePrismaBackedStore(); // this surface queries Prisma directly
    const user = await requireSession();
    const { path } = await params;
    const id = path[0];
    if (!id) return fail("Member id is required.", 400, "INVALID_BODY");

    const raw: unknown = await req.json().catch(() => null);
    const parsed = memberSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid update.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const updated = await db.familyMember.updateMany({
      where: { id, userId: user.id },
      data: parsed.data,
    });
    if (updated.count === 0) {
      return fail("Family member not found.", 404, "NOT_FOUND");
    }
    const row = await db.familyMember.findUnique({ where: { id } });
    return ok({ member: row ? toDto(row) : null });
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
    requirePrismaBackedStore(); // this surface queries Prisma directly
    const user = await requireSession();
    const { path } = await params;
    const id = path[0];
    if (!id) return fail("Member id is required.", 400, "INVALID_BODY");

    const deleted = await db.familyMember.deleteMany({
      where: { id, userId: user.id },
    });
    if (deleted.count === 0) {
      return fail("Family member not found.", 404, "NOT_FOUND");
    }
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}
