import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { DAY_NAMES } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * /api/v1/doctor/availability
 * GET  — list the doctor's weekly availability rules.
 * PUT  — replace-all update ({ rules: [...] }) validated for start < end and
 *        no overlap between ACTIVE rules on the same day.
 */

const availabilityRuleSchema = z.object({
  dayOfWeek: z
    .number()
    .int()
    .min(0, "Day of week must be 0 (Sunday) to 6 (Saturday).")
    .max(6, "Day of week must be 0 (Sunday) to 6 (Saturday)."),
  startMinute: z
    .number()
    .int()
    .min(0, "Start minute must be 0..1439.")
    .max(1439, "Start minute must be 0..1439."),
  endMinute: z
    .number()
    .int()
    .min(1, "End minute must be 1..1440.")
    .max(1440, "End minute must be 1..1440."),
  isActive: z.boolean(),
});

const putSchema = z
  .object({
    rules: z
      .array(availabilityRuleSchema)
      .max(40, "At most 40 availability rules are allowed."),
  })
  .superRefine((data, ctx) => {
    // Per-rule: start must be strictly before end.
    data.rules.forEach((rule, index) => {
      if (rule.startMinute >= rule.endMinute) {
        ctx.addIssue({
          code: "custom",
          path: ["rules", index],
          message: "Start time must be before end time.",
        });
      }
    });

    // Exact duplicates (same day + start) would trip the DB unique constraint.
    const seen = new Set<string>();
    data.rules.forEach((rule, index) => {
      const key = `${rule.dayOfWeek}:${rule.startMinute}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["rules", index],
          message: "Two rules share the same day and start time.",
        });
      }
      seen.add(key);
    });

    // Overlap check for ACTIVE rules within each day.
    const activeByDay = new Map<number, typeof data.rules>();
    for (const rule of data.rules) {
      if (!rule.isActive) continue;
      const list = activeByDay.get(rule.dayOfWeek) ?? [];
      list.push(rule);
      activeByDay.set(rule.dayOfWeek, list);
    }
    for (const [day, rules] of activeByDay) {
      const sorted = [...rules].sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].endMinute > sorted[i].startMinute) {
          ctx.addIssue({
            code: "custom",
            path: ["rules"],
            message: `Active hours for ${DAY_NAMES[day]} overlap.`,
          });
          break;
        }
      }
    }
  });

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail(
        "Availability is only available to doctor accounts.",
        403,
        "FORBIDDEN"
      );
    }
    const profile = await db.doctorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) {
      return fail("Doctor profile not found.", 404, "PROFILE_NOT_FOUND");
    }
    const rules = await db.availabilityRule.findMany({
      where: { doctorId: profile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });
    return ok({
      items: rules.map((rule) => ({
        id: rule.id,
        dayOfWeek: rule.dayOfWeek,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
        isActive: rule.isActive,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return fail("Sign in required.", 401, "UNAUTHORIZED");
    }
    if (user.role !== ROLES.DOCTOR) {
      return fail(
        "Availability is only available to doctor accounts.",
        403,
        "FORBIDDEN"
      );
    }
    const profile = await db.doctorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) {
      return fail("Doctor profile not found.", 404, "PROFILE_NOT_FOUND");
    }

    const body = await req.json().catch(() => null);
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid availability data.",
        400,
        "VALIDATION_ERROR"
      );
    }

    // Replace-all inside a transaction: delete then recreate every rule.
    await db.$transaction([
      db.availabilityRule.deleteMany({ where: { doctorId: profile.id } }),
      db.availabilityRule.createMany({
        data: parsed.data.rules.map((rule) => ({
          doctorId: profile.id,
          dayOfWeek: rule.dayOfWeek,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
          isActive: rule.isActive,
        })),
      }),
    ]);

    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "AVAILABILITY_UPDATED",
        entity: "DoctorProfile",
        entityId: profile.id,
        meta: JSON.stringify({ rules: parsed.data.rules }),
      },
    });

    const rules = await db.availabilityRule.findMany({
      where: { doctorId: profile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });
    return ok({
      items: rules.map((rule) => ({
        id: rule.id,
        dayOfWeek: rule.dayOfWeek,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
        isActive: rule.isActive,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
