import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { GuardError, requireSession } from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * /api/v2/support — help & support tickets (master prompt §3.38, §7).
 *
 *  GET    /api/v2/support          — own tickets (admins see all)
 *  POST   /api/v2/support          — create a ticket (any signed-in user)
 *  PATCH  /api/v2/support/:id      — admin reply / status / priority update
 */

const createSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters.").max(120),
  message: z.string().trim().min(10, "Please describe the issue (10+ characters).").max(2000),
  category: z.enum(["GENERAL", "BOOKING", "PAYMENT", "ACCOUNT", "REPORT"]).optional(),
});

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  reply: z.string().trim().max(2000).optional(),
});

function toDto(row: {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  reply: string | null;
  createdAt: Date;
  updatedAt: Date;
  email: string | null;
  user: { name: string; email: string } | null;
}) {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    category: row.category,
    status: row.status,
    priority: row.priority,
    reply: row.reply,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    requesterName: row.user?.name ?? row.email ?? "Guest",
    requesterEmail: row.user?.email ?? row.email ?? null,
  };
}

export async function GET() {
  try {
    const user = await requireSession();
    const rows =
      user.role === "ADMIN"
        ? await db.supportTicket.findMany({
            orderBy: [{ status: "asc" }, { createdAt: "desc" }],
            include: { user: { select: { name: true, email: true } } },
          })
        : await db.supportTicket.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            include: { user: { select: { name: true, email: true } } },
          });
    return ok({ items: rows.map(toDto) });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSession();
    const raw: unknown = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid ticket.",
        400,
        "VALIDATION_ERROR"
      );
    }
    const created = await db.supportTicket.create({
      data: {
        userId: user.id,
        email: user.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        category: parsed.data.category ?? "GENERAL",
        status: "OPEN",
        priority: "NORMAL",
      },
    });
    return ok({ ticket: toDto({ ...created, user: null }) });
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
    const user = await requireSession();
    if (user.role !== "ADMIN") {
      return fail("Only platform admins can manage tickets.", 403, "FORBIDDEN");
    }
    const { path } = await params;
    const id = path[0];
    if (!id) return fail("Ticket id is required.", 400, "INVALID_BODY");

    const raw: unknown = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        parsed.error.issues[0]?.message ?? "Invalid update.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const updated = await db.supportTicket.update({
      where: { id },
      data: parsed.data,
      include: { user: { select: { name: true, email: true } } },
    });
    return ok({ ticket: toDto(updated) });
  } catch (err) {
    if (err instanceof GuardError) return fail(err.message, err.status, err.code);
    return handleRouteError(err);
  }
}
