import type { NextRequest } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { ok, fail, handleRouteError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getStore } from "@/lib/data";
import type { SessionUser } from "@/lib/types";
import type { AppointmentRecord } from "@/lib/data/types";
import { normalizePhone } from "@/lib/phone";
import { addDays, dhakaDateString, dhakaToUtc } from "@/lib/time";
import { notifyUser } from "@/app/api/v1/_lib/booking";
import {
  VVS_CONFIRMATION_EXPIRY_MINUTES,
  VVS_CONFIRMATION_MAX_ATTEMPTS,
  VVS_POLICY_SETTING,
  VVS_POLICIES,
  VvsError,
  buildQrPayload,
  ensureVerification,
  generateConfirmationCode,
  generateReceiptNumber,
  getCredential,
  getVvsPolicy,
  loadVerificationWithAppointment,
  parseQrPayload,
  rateLimit,
  requireVvsStore,
  rotateCredential,
  sha256,
  vvsAudit,
  verifyCredential,
} from "@/lib/vvs";
import { GuardError, requireRole } from "@/app/api/v2/_lib/guards";

export const dynamic = "force-dynamic";

/**
 * Verified Visit System (VVS) API — /api/v2/vvs/[...path]
 *
 * All appointment data is read through the SAME store the booking engine
 * writes to (getStore()), while VVS records (credentials, visits, receipts,
 * disputes) live in Prisma. Every endpoint enforces session auth + role /
 * ownership checks server-side; a QR credential never bypasses permissions.
 *
 * GET  settings                     — active policy (any authenticated user)
 * GET  status/:appointmentId        — verification + visit + confirmation state
 * GET  receipt/:appointmentId       — immutable digital visit receipt
 * GET  doctor/today?date=YYYY-MM-DD — today's queue with VVS state merged
 * GET  doctor/visits?limit=         — completed-visit history (doctor)
 * GET  patient/visits               — visit history (patient)
 * GET  disputes                     — dispute queue (admin)
 *
 * POST document                      — issue/log the two-part A4 form
 * POST verify                        — scan/manual credential check (doctor/staff)
 * POST check-in/:appointmentId       — mark patient arrived (doctor/staff)
 * POST complete/:appointmentId       — record the completed visit (idempotent)
 * POST patient-confirmation/:apptId  — patient confirms (app or code)
 * POST dispute                       — patient reports an incorrect completion
 * POST disputes/:id/resolve          — admin dismiss or correct (audited)
 * POST settings                      — admin sets the verification policy
 * POST public-verify                 — unauthenticated minimal QR check
 */

// ── helpers ───────────────────────────────────────────────────────────

function toVvsFail(err: unknown) {
  if (err instanceof GuardError) return fail(err.message, err.status, err.code);
  if (err instanceof VvsError) return fail(err.message, err.status, err.code);
  return handleRouteError(err);
}

/** Request origin for QR URLs (proxy-aware). */
function originOf(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return req.nextUrl.origin;
}

/** Can this session see this appointment as the patient? */
function patientOwns(appointment: AppointmentRecord, user: SessionUser): boolean {
  if (user.role === "ADMIN") return true;
  if (appointment.patientId && appointment.patientId === user.id) return true;
  // Phone-match ownership requires a VERIFIED phone: the account phone is
  // user-settable via PATCH /auth/me without proving ownership, so matching
  // an unverified phone would grant access to another person's guest
  // bookings, visit receipts and confirmations.
  if (user.phone && user.phoneVerified) {
    const a = normalizePhone(appointment.patientPhone);
    const b = normalizePhone(user.phone);
    return a.length > 8 && a === b;
  }
  return false;
}

/** The appointment's chamber must be one of the doctor's active chambers. */
async function doctorChamberValid(appointment: AppointmentRecord): Promise<boolean> {
  if (!appointment.chamberId) return true;
  const chamber = await db.chamber.findUnique({
    where: { id: appointment.chamberId },
  });
  return !!chamber && chamber.doctorId === appointment.doctorId && chamber.isActive;
}

/**
 * Mode C staff authorization: a HOSPITAL-role user whose hospital is the
 * doctor's affiliated hospital may check in / verify / complete on the
 * doctor's behalf. Every staff action is audited.
 */
async function staffAuthorized(
  appointment: AppointmentRecord,
  user: SessionUser,
  policy: "A" | "B" | "C"
): Promise<boolean> {
  if (policy !== "C" || user.role !== "HOSPITAL") return false;
  const hospital = await db.hospital.findUnique({ where: { userId: user.id } });
  if (!hospital) return false;
  const doctor = await db.doctorProfile.findUnique({
    where: { id: appointment.doctorId },
  });
  return !!doctor && doctor.hospitalId === hospital.id;
}

/** Effective confirmation status with lazy expiry. */
async function freshConfirmation(visit: {
  id: string;
  patientConfirmationStatus: string;
}): Promise<string> {
  if (visit.patientConfirmationStatus !== "PENDING") {
    return visit.patientConfirmationStatus;
  }
  const row = await db.patientVisitConfirmation.findUnique({
    where: { visitId: visit.id },
  });
  if (row && !row.consumedAt && row.expiresAt < new Date()) {
    await db.completedVisit.update({
      where: { id: visit.id },
      data: { patientConfirmationStatus: "EXPIRED" },
    });
    return "EXPIRED";
  }
  return "PENDING";
}

type VisitRow = NonNullable<Awaited<ReturnType<typeof db.completedVisit.findUnique>>>;
type VerificationRow = NonNullable<
  Awaited<ReturnType<typeof db.appointmentVerification.findUnique>>
>;

function visitToDto(visit: VisitRow) {
  return {
    id: visit.id,
    appointmentId: visit.appointmentId,
    referenceCode: visit.referenceCode,
    receiptNumber: visit.receiptNumber,
    doctorId: visit.doctorId,
    doctorName: visit.doctorName,
    chamberName: visit.chamberName,
    patientName: visit.patientName,
    slotStart: visit.slotStart.toISOString(),
    fee: visit.fee,
    currency: visit.currency,
    patientType: visit.patientType,
    completedById: visit.completedById,
    completedByName: visit.completedByName,
    completedAt: visit.completedAt.toISOString(),
    verificationMethod: visit.verificationMethod,
    policy: visit.policy,
    patientConfirmationStatus: visit.patientConfirmationStatus,
    patientConfirmedAt: visit.patientConfirmedAt?.toISOString() ?? null,
    patientConfirmedVia: visit.patientConfirmedVia,
    correctionStatus: visit.correctionStatus,
    correctionReason: visit.correctionReason,
    correctedAt: visit.correctedAt?.toISOString() ?? null,
    consultationNote: visit.consultationNote,
  };
}

function verificationToDto(v: VerificationRow) {
  return {
    appointmentId: v.appointmentId,
    referenceCode: v.referenceCode,
    serialNumber: v.serialNumber,
    status: v.status,
    policy: v.policy,
    documentVersion: v.documentVersion,
    issueCount: v.issueCount,
    lastIssuedAt: v.lastIssuedAt?.toISOString() ?? null,
    checkInAt: v.checkInAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
  };
}

function appointmentSummary(a: AppointmentRecord) {
  return {
    id: a.id,
    referenceCode: a.referenceCode,
    status: a.status,
    paymentStatus: a.paymentStatus,
    patientType: a.patientType,
    fee: a.fee,
    currency: a.currency,
    slotStart: a.slotStart,
    slotEnd: a.slotEnd,
    type: a.type,
    chamberId: a.chamberId ?? null,
    chamberName: a.chamberName ?? null,
    patientId: a.patientId,
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    patientAge: a.patientAge,
    patientGender: a.patientGender,
    notes: a.notes,
    doctor: {
      name: a.doctor.name,
      slug: a.doctor.slug,
      city: a.doctor.city,
      specialties: a.doctor.specialties,
    },
  };
}

async function getLiveOr404(appointmentId: string): Promise<AppointmentRecord> {
  const appointment = await getStore().getAppointmentById(appointmentId);
  if (!appointment) {
    throw new VvsError("Appointment not found.", 404, "NOT_FOUND");
  }
  return appointment;
}

/** Parse a JSON body defensively (null-safe). */
async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  const raw: unknown = await req.json().catch(() => null);
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

// ── GET ───────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    requireVvsStore();
    const { path } = await params;
    const [resource, arg] = path;

    // settings — any authenticated user (policy badge in dashboards)
    if (resource === "settings") {
      const user = await getCurrentUser();
      if (!user) return fail("Sign in required.", 401, "UNAUTHORIZED");
      const policy = await getVvsPolicy();
      return ok({ policy, policies: VVS_POLICIES });
    }

    const user = await getCurrentUser();
    if (!user) return fail("Sign in required.", 401, "UNAUTHORIZED");

    // doctor/today — the doctor's queue with VVS state merged
    if (resource === "doctor" && arg === "today") {
      if (user.role !== "DOCTOR") {
        return fail("Doctors only.", 403, "FORBIDDEN");
      }
      const profile = await db.doctorProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) return fail("Doctor profile not found.", 404, "NOT_FOUND");

      const url = new URL(req.url);
      const dateParam = url.searchParams.get("date");
      const day = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "")
        ? (dateParam as string)
        : dhakaDateString();
      const dayStart = dhakaToUtc(day, 0);
      const dayEnd = dhakaToUtc(addDays(day, 1), 0);

      const all = await getStore().listAppointmentsByDoctor(profile.id);
      const todays = all
        .filter((a) => {
          const t = new Date(a.slotStart).getTime();
          return t >= dayStart.getTime() && t < dayEnd.getTime();
        })
        .sort((a, b) => a.slotStart.localeCompare(b.slotStart));

      const verifications = await db.appointmentVerification.findMany({
        where: { doctorId: profile.id, slotStart: { gte: dayStart, lt: dayEnd } },
      });
      const visits = await db.completedVisit.findMany({
        where: { doctorId: profile.id, slotStart: { gte: dayStart, lt: dayEnd } },
      });
      const vMap = new Map(verifications.map((v) => [v.appointmentId, v]));
      const visitMap = new Map(visits.map((v) => [v.appointmentId, v]));
      const policy = await getVvsPolicy();

      return ok({
        date: day,
        policy,
        items: todays.map((a) => {
          const v = vMap.get(a.id);
          const visit = visitMap.get(a.id);
          return {
            ...appointmentSummary(a),
            serialNumber: v?.serialNumber ?? null,
            verificationStatus: v?.status ?? "NONE",
            checkInAt: v?.checkInAt?.toISOString() ?? null,
            visit: visit ? visitToDto(visit) : null,
          };
        }),
      });
    }

    // doctor/visits — completed-visit history
    if (resource === "doctor" && arg === "visits") {
      if (user.role !== "DOCTOR") {
        return fail("Doctors only.", 403, "FORBIDDEN");
      }
      const profile = await db.doctorProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) return fail("Doctor profile not found.", 404, "NOT_FOUND");
      const url = new URL(req.url);
      const limit = Math.min(
        200,
        Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100)
      );
      const visits = await db.completedVisit.findMany({
        where: { doctorId: profile.id },
        orderBy: { completedAt: "desc" },
        take: limit,
        include: { disputes: true },
      });
      return ok({
        items: visits.map((v) => ({
          ...visitToDto(v),
          disputeStatus: v.disputes[0]?.status ?? null,
        })),
      });
    }

    // patient/visits — the patient's own visit history
    if (resource === "patient" && arg === "visits") {
      if (user.role !== "PATIENT" && user.role !== "DOCTOR") {
        return ok({ items: [] });
      }
      // Phone matching requires a verified phone (see patientOwns) — an
      // unverified, self-set account phone must not pull other people's
      // visit records via the OR clause.
      const phone =
        user.phone && user.phoneVerified
          ? normalizePhone(user.phone)
          : null;
      const visits = await db.completedVisit.findMany({
        where: phone
          ? { OR: [{ patientId: user.id }, { patientPhone: phone }] }
          : { patientId: user.id },
        orderBy: { completedAt: "desc" },
        take: 200,
      });
      return ok({ items: visits.map(visitToDto) });
    }

    // disputes — admin queue
    if (resource === "disputes" && !arg) {
      if (user.role !== "ADMIN") {
        return fail("Administrators only.", 403, "FORBIDDEN");
      }
      const disputes = await db.visitDispute.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { visit: true },
      });
      return ok({
        items: disputes.map((d) => ({
          id: d.id,
          visitId: d.visitId,
          appointmentId: d.appointmentId,
          reporterName: d.reporterName,
          reporterPhone: d.reporterPhone,
          reason: d.reason,
          status: d.status,
          resolution: d.resolution,
          createdAt: d.createdAt.toISOString(),
          resolvedAt: d.resolvedAt?.toISOString() ?? null,
          visit: d.visit ? visitToDto(d.visit) : null,
        })),
      });
    }

    // status/:appointmentId — VVS state for the details screens
    if (resource === "status" && arg) {
      const { verification, appointment } = await loadVerificationWithAppointment(arg);
      const visit = await db.completedVisit.findUnique({ where: { appointmentId: arg } });
      const dispute = visit
        ? await db.visitDispute.findFirst({
            where: { appointmentId: arg },
            orderBy: { createdAt: "desc" },
          })
        : null;

      const isPatient = patientOwns(appointment, user);
      const isDoctor = user.role === "DOCTOR" && appointment.doctor.userId === user.id;
      if (!isPatient && !isDoctor && user.role !== "ADMIN") {
        const policy = await getVvsPolicy();
        const staff = await staffAuthorized(appointment, user, policy);
        if (!staff) return fail("Not your appointment.", 403, "FORBIDDEN");
      }

      let confirmation: {
        status: string;
        expiresAt: string | null;
        confirmedAt: string | null;
        confirmedVia: string | null;
      } | null = null;
      if (visit) {
        const status = await freshConfirmation(visit);
        const row = await db.patientVisitConfirmation.findUnique({
          where: { visitId: visit.id },
        });
        confirmation = {
          status,
          expiresAt: row?.expiresAt.toISOString() ?? null,
          confirmedAt: visit.patientConfirmedAt?.toISOString() ?? null,
          confirmedVia: visit.patientConfirmedVia,
        };
      }

      return ok({
        appointment: appointmentSummary(appointment),
        verification: verificationToDto(verification),
        visit: visit ? visitToDto(visit) : null,
        confirmation,
        dispute: dispute
          ? {
              id: dispute.id,
              status: dispute.status,
              reason: dispute.reason,
              resolution: dispute.resolution,
              createdAt: dispute.createdAt.toISOString(),
            }
          : null,
        viewer: { isPatient, isDoctor },
      });
    }

    // receipt/:appointmentId — the immutable digital receipt
    if (resource === "receipt" && arg) {
      const { verification, appointment } = await loadVerificationWithAppointment(arg);
      const visit = await db.completedVisit.findUnique({ where: { appointmentId: arg } });
      if (!visit) {
        return fail("No completed visit recorded for this appointment yet.", 404, "NO_VISIT");
      }
      const isPatient = patientOwns(appointment, user);
      const isDoctor = user.role === "DOCTOR" && appointment.doctor.userId === user.id;
      const policy = await getVvsPolicy();
      const staff = await staffAuthorized(appointment, user, policy);
      if (!isPatient && !isDoctor && !staff && user.role !== "ADMIN") {
        return fail("Not your receipt.", 403, "FORBIDDEN");
      }
      const doctor = await getStore().getDoctorById(verification.doctorId);
      return ok({
        receipt: {
          ...visitToDto(visit),
          patientConfirmationStatus: await freshConfirmation(visit),
          serialNumber: verification.serialNumber,
          checkInAt: verification.checkInAt?.toISOString() ?? null,
          doctorRegNumber: doctor?.regNumber ?? null,
          platform: "Find Medi Doctor",
          issuedAt: new Date().toISOString(),
        },
      });
    }

    return fail("Unknown VVS resource.", 404, "NOT_FOUND");
  } catch (err) {
    return toVvsFail(err);
  }
}

// ── POST schemas ──────────────────────────────────────────────────────

const documentSchema = z.object({
  appointmentId: z.string().min(1),
  format: z.enum(["PRINT", "PDF"]).default("PRINT"),
  lang: z.enum(["en", "bn"]).default("en"),
});

const verifySchema = z.object({
  payload: z.string().max(2048).optional(),
  referenceCode: z.string().trim().max(24).optional(),
  code: z.string().trim().max(64).optional(),
});

const completeSchema = z.object({
  credential: z.string().trim().max(2048).optional(),
  referenceCode: z.string().trim().max(24).optional(),
  consultationNote: z.string().trim().max(2000).nullable().optional(),
});

const confirmationSchema = z.object({
  code: z.string().trim().max(12).optional(),
});

const disputeSchema = z.object({
  appointmentId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .min(10, "Please describe the issue (at least 10 characters).")
    .max(1000),
});

const resolveDisputeSchema = z.object({
  action: z.enum(["DISMISS", "CORRECT"]),
  resolution: z.string().trim().min(3).max(1000),
});

const settingsSchema = z.object({ policy: z.enum(["A", "B", "C"]) });

const publicVerifySchema = z.object({ payload: z.string().min(10).max(2048) });

// ── POST ──────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    requireVvsStore();
    const { path } = await params;
    const [resource, arg, sub] = path;
    const body = await readJson(req);

    // public-verify — unauthenticated minimal QR validity check (no patient data)
    if (resource === "public-verify") {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
      if (!rateLimit(`vvs:public:${ip}`, 10, 60_000)) {
        return fail("Too many checks. Try again in a minute.", 429, "RATE_LIMITED");
      }
      const parsed = publicVerifySchema.safeParse(body);
      if (!parsed.success) return fail("Invalid request.", 400, "VALIDATION_ERROR");
      const qr = parseQrPayload(parsed.data.payload);
      if (!qr.ok) return ok({ valid: false, reason: qr.reason });
      const verification = await db.appointmentVerification.findFirst({
        where: { referenceCode: qr.payload.referenceCode },
      });
      if (!verification || sha256(qr.payload.token) !== verification.qrTokenHash) {
        return ok({ valid: false, reason: "Credential not recognized." });
      }
      const appointment = await getStore().getAppointmentById(
        verification.appointmentId
      );
      void vvsAudit(null, "VVS_PUBLIC_VERIFY", verification.appointmentId, {
        referenceCode: verification.referenceCode,
      });
      return ok({
        valid: true,
        referenceCode: verification.referenceCode,
        doctorName: appointment?.doctor.name ?? null,
        slotStart: appointment?.slotStart ?? null,
        appointmentStatus: appointment?.status ?? null,
        visitRecorded: verification.status === "USED",
      });
    }

    const user = await getCurrentUser();
    if (!user) return fail("Sign in required.", 401, "UNAUTHORIZED");

    // settings — admin sets the verification policy
    if (resource === "settings") {
      await requireRole("ADMIN");
      const parsed = settingsSchema.safeParse(body);
      if (!parsed.success) return fail("Invalid policy.", 400, "VALIDATION_ERROR");
      await db.platformSetting.upsert({
        where: { key: VVS_POLICY_SETTING },
        create: {
          key: VVS_POLICY_SETTING,
          value: parsed.data.policy,
          updatedBy: user.id,
        },
        update: { value: parsed.data.policy, updatedBy: user.id },
      });
      await vvsAudit(user.id, "VVS_SETTINGS_UPDATED", "platform", {
        policy: parsed.data.policy,
      });
      return ok({ policy: parsed.data.policy, policies: VVS_POLICIES });
    }

    // document — issue/log the two-part form (patient owner, doctor, admin)
    if (resource === "document") {
      const parsed = documentSchema.safeParse(body);
      if (!parsed.success) return fail("Invalid request.", 400, "VALIDATION_ERROR");
      if (!rateLimit(`vvs:doc:${user.id}`, 20, 60_000)) {
        return fail("Too many downloads. Please wait a moment.", 429, "RATE_LIMITED");
      }
      const appointment = await getLiveOr404(parsed.data.appointmentId);
      const isPatient = patientOwns(appointment, user);
      const isDoctor = user.role === "DOCTOR" && appointment.doctor.userId === user.id;
      if (!isPatient && !isDoctor && user.role !== "ADMIN") {
        return fail(
          "Only the patient or the assigned doctor can access this form.",
          403,
          "FORBIDDEN"
        );
      }
      if (appointment.status === "PENDING_APPROVAL") {
        return fail(
          "This appointment is still awaiting the doctor's approval. The form becomes available once it is confirmed.",
          409,
          "NOT_CONFIRMED"
        );
      }
      if (
        ["REJECTED", "CANCELLED_BY_PATIENT", "CANCELLED_BY_DOCTOR", "EXPIRED"].includes(
          appointment.status
        )
      ) {
        return fail(
          "Cancelled or rejected appointments cannot be issued a form.",
          409,
          "INVALID_STATUS"
        );
      }

      const policy = await getVvsPolicy();
      const { verification } = await ensureVerification(appointment, policy);

      // Recover the SAME credential for every download (re-print safe);
      // rotate only when the ciphertext is unreadable (env migration).
      let credential = await getCredential(verification);
      let rotated = false;
      if (verification.status === "ACTIVE" && !credential) {
        credential = await rotateCredential(verification.id);
        rotated = true;
      }
      const credentialUsable = verification.status === "ACTIVE" && credential;

      let qrPayload = "";
      let qrUrl = "";
      let qrDataUrl = "";
      let manualCode: string | null = null;
      if (credentialUsable && credential) {
        qrPayload = buildQrPayload(appointment.referenceCode, credential.qrToken);
        const origin = originOf(req);
        qrUrl = `${origin}/?view=verify&d=${encodeURIComponent(qrPayload)}`;
        qrDataUrl = await QRCode.toDataURL(qrUrl, {
          margin: 1,
          width: 320,
          errorCorrectionLevel: "M",
          color: { dark: "#111111", light: "#ffffff" },
        });
        manualCode = credential.manualCode;
      }

      const now = new Date();
      await db.appointmentDocument.create({
        data: {
          verificationId: verification.id,
          appointmentId: appointment.id,
          format: parsed.data.format,
          lang: parsed.data.lang,
          issuedById: user.id,
        },
      });
      await db.appointmentVerification.update({
        where: { id: verification.id },
        data: { issueCount: { increment: 1 }, lastIssuedAt: now, policy },
      });
      await vvsAudit(user.id, "VVS_DOCUMENT_ISSUED", appointment.id, {
        format: parsed.data.format,
        lang: parsed.data.lang,
        issueCount: verification.issueCount + 1,
        ...(rotated ? { credentialRotated: true } : {}),
      });

      const doctor = await getStore().getDoctorById(appointment.doctorId);
      return ok({
        document: {
          appointment: appointmentSummary(appointment),
          verification: verificationToDto(verification),
          doctor: {
            name: appointment.doctor.name,
            regNumber: doctor?.regNumber ?? null,
            city: appointment.doctor.city,
            specialties: appointment.doctor.specialties,
          },
          form: {
            qrPayload,
            qrUrl,
            qrDataUrl,
            manualCode,
            credentialState: verification.status, // ACTIVE | USED | REVOKED
            printDate: now.toISOString(),
            documentVersion: verification.documentVersion,
            copyLabels: { patient: "PATIENT COPY", doctor: "DOCTOR COPY" },
          },
        },
      });
    }

    // verify — scan / manual credential check (doctor owner or Mode C staff)
    if (resource === "verify") {
      const parsed = verifySchema.safeParse(body);
      if (!parsed.success) {
        return fail(
          "Provide a scanned payload or a reference + code.",
          400,
          "VALIDATION_ERROR"
        );
      }
      if (!rateLimit(`vvs:verify:${user.id}`, 30, 60_000)) {
        return fail("Too many verification attempts. Wait a minute.", 429, "RATE_LIMITED");
      }

      let referenceCode: string;
      let credential: string;
      let method: "QR" | "MANUAL_CODE";
      if (parsed.data.payload) {
        const qr = parseQrPayload(parsed.data.payload);
        if (!qr.ok) {
          await vvsAudit(user.id, "VVS_VERIFY_FAILED", "unknown", {
            reason: qr.reason,
          });
          return fail(qr.reason, 400, "BAD_QR");
        }
        referenceCode = qr.payload.referenceCode;
        credential = qr.payload.token;
        method = "QR";
      } else if (parsed.data.referenceCode && parsed.data.code) {
        referenceCode = parsed.data.referenceCode.toUpperCase();
        credential = parsed.data.code.toUpperCase();
        method = "MANUAL_CODE";
      } else {
        return fail(
          "Provide a scanned payload or a reference + code.",
          400,
          "VALIDATION_ERROR"
        );
      }

      const policy = await getVvsPolicy();
      const expectDoctorId = user.role === "DOCTOR" ? user.id : undefined;
      let result;
      try {
        result = await verifyCredential(referenceCode, credential, { expectDoctorId });
      } catch (err) {
        if (err instanceof VvsError) {
          await vvsAudit(user.id, "VVS_VERIFY_FAILED", "unknown", {
            referenceCode,
            method,
            code: err.code,
          });
        }
        throw err;
      }
      const { verification, appointment } = result;

      if (!(await doctorChamberValid(appointment))) {
        return fail(
          "The appointment's chamber is not authorized for this doctor.",
          409,
          "WRONG_CHAMBER"
        );
      }
      if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
        const staff = await staffAuthorized(appointment, user, policy);
        if (!staff) {
          await vvsAudit(user.id, "VVS_VERIFY_FORBIDDEN", appointment.id, {
            role: user.role,
          });
          return fail(
            "Only the assigned doctor or authorized chamber staff can verify visits.",
            403,
            "FORBIDDEN"
          );
        }
      }

      const visit = await db.completedVisit.findUnique({
        where: { appointmentId: appointment.id },
      });
      await vvsAudit(user.id, "VVS_QR_VERIFIED", appointment.id, {
        method,
        actorRole: user.role,
      });

      const today = dhakaDateString();
      const dayOfSlot = dhakaDateString(new Date(appointment.slotStart));
      return ok({
        method,
        appointment: appointmentSummary(appointment),
        verification: verificationToDto(verification),
        visit: visit ? visitToDto(visit) : null,
        allowed: {
          canCheckIn:
            appointment.status === "CONFIRMED" &&
            (!visit || visit.correctionStatus === "CORRECTED") &&
            (dayOfSlot === today ||
              new Date(appointment.slotStart).getTime() <= Date.now()),
          canComplete:
            appointment.status === "CONFIRMED" &&
            (!visit || visit.correctionStatus === "CORRECTED") &&
            dayOfSlot <= today,
        },
      });
    }

    // check-in/:appointmentId — patient arrived at the chamber
    if (resource === "check-in" && arg) {
      const appointment = await getLiveOr404(arg);
      const policy = await getVvsPolicy();
      const isDoctor = user.role === "DOCTOR" && appointment.doctor.userId === user.id;
      const staff = await staffAuthorized(appointment, user, policy);
      if (!isDoctor && !staff && user.role !== "ADMIN") {
        return fail(
          "Only the assigned doctor or authorized staff can check patients in.",
          403,
          "FORBIDDEN"
        );
      }
      if (appointment.status !== "CONFIRMED") {
        return fail(
          `This appointment is ${appointment.status.replace(/_/g, " ").toLowerCase()} and cannot be checked in.`,
          409,
          "INVALID_STATUS"
        );
      }
      const today = dhakaDateString();
      const dayOfSlot = dhakaDateString(new Date(appointment.slotStart));
      if (dayOfSlot !== today && new Date(appointment.slotStart).getTime() > Date.now()) {
        return fail(
          "Check-in is for today's appointments. Ask the patient to reschedule or come on the appointment day.",
          409,
          "NOT_TODAY"
        );
      }
      // Lazy issuance — the patient may not have downloaded the form yet;
      // check-in creates the credential the same way the document flow does.
      const { verification } = await ensureVerification(appointment, policy);
      if (verification.checkInAt) {
        return ok({
          checkInAt: verification.checkInAt.toISOString(),
          alreadyCheckedIn: true,
        });
      }
      const now = new Date();
      const updated = await db.appointmentVerification.update({
        where: { id: verification.id },
        data: { checkInAt: now, checkInById: user.id },
      });
      await vvsAudit(user.id, "VVS_CHECKED_IN", appointment.id, {
        actorRole: user.role,
        byStaff: !isDoctor,
      });
      return ok({
        checkInAt: now.toISOString(),
        alreadyCheckedIn: false,
        verification: verificationToDto(updated),
      });
    }

    // complete/:appointmentId — record the completed visit (idempotent)
    if (resource === "complete" && arg) {
      const parsed = completeSchema.safeParse(body);
      if (!parsed.success) {
        return fail(
          parsed.error.issues[0]?.message ?? "Invalid request.",
          400,
          "VALIDATION_ERROR"
        );
      }
      const appointment = await getLiveOr404(arg);
      const policy = await getVvsPolicy();

      const isDoctor = user.role === "DOCTOR" && appointment.doctor.userId === user.id;
      const staff = await staffAuthorized(appointment, user, policy);
      if (!isDoctor && !staff && user.role !== "ADMIN") {
        return fail(
          "Only the assigned doctor or authorized chamber staff can complete this visit.",
          403,
          "FORBIDDEN"
        );
      }

      // Idempotent replay — never create a second visit for one appointment.
      // A CORRECTED visit (admin-authorized dispute outcome) is re-completable:
      // the revival is itself an audited event (VVS_VISIT_RECOMPLETED).
      const existing = await db.completedVisit.findUnique({
        where: { appointmentId: arg },
      });
      if (existing && existing.correctionStatus !== "CORRECTED") {
        return ok({
          visit: visitToDto(existing),
          alreadyCompleted: true,
          confirmation: { status: await freshConfirmation(existing) },
        });
      }

      if (appointment.status !== "CONFIRMED") {
        if (appointment.status === "COMPLETED") {
          return fail(
            "This appointment was already completed outside the Verified Visit flow.",
            409,
            "ALREADY_COMPLETED"
          );
        }
        return fail(
          `This appointment is ${appointment.status.replace(/_/g, " ").toLowerCase()} and cannot be completed.`,
          409,
          "INVALID_STATUS"
        );
      }
      if (!(await doctorChamberValid(appointment))) {
        return fail(
          "The appointment's chamber is not authorized for this doctor.",
          409,
          "WRONG_CHAMBER"
        );
      }

      // Lazy issuance — completing without a printed form (patient forgot it)
      // still needs a credential row to burn and a serial to record.
      await ensureVerification(appointment, policy);
      let method: "QR" | "MANUAL_CODE" | "REFERENCE";
      const slotStarted = new Date(appointment.slotStart).getTime() <= Date.now();
      if (parsed.data.credential) {
        // QR payload or manual code from the patient's form.
        let referenceCode = parsed.data.referenceCode?.toUpperCase();
        let credential = parsed.data.credential;
        const qr = parseQrPayload(parsed.data.credential);
        if (qr.ok) {
          referenceCode = qr.payload.referenceCode;
          credential = qr.payload.token;
        }
        if (!referenceCode) {
          return fail(
            "A reference code is required with the verification code.",
            400,
            "VALIDATION_ERROR"
          );
        }
        const result = await verifyCredential(referenceCode, credential, {
          expectDoctorId: isDoctor ? user.id : undefined,
        });
        if (result.appointment.id !== arg) {
          return fail(
            "The scanned form belongs to a different appointment.",
            409,
            "CREDENTIAL_MISMATCH"
          );
        }
        method = result.method;
      } else {
        // Manual fallback (patient forgot the printed form): only the
        // ASSIGNED DOCTOR may complete by reference, once the slot started.
        if (!isDoctor) {
          return fail(
            "Chamber staff must scan the patient's QR code or enter the manual verification code.",
            403,
            "CREDENTIAL_REQUIRED"
          );
        }
        if (!slotStarted) {
          return fail(
            "The consultation time has not started yet. Scan the patient's form or wait for the appointment time.",
            400,
            "NOT_STARTED"
          );
        }
        method = "REFERENCE";
      }

      // Time rules: never complete a future appointment; reference-only
      // completion additionally requires the slot to have started.
      const today = dhakaDateString();
      const dayOfSlot = dhakaDateString(new Date(appointment.slotStart));
      if (dayOfSlot > today) {
        return fail(
          "This appointment is for a future date and cannot be completed yet.",
          400,
          "FUTURE_SLOT"
        );
      }
      if (method === "REFERENCE" && !slotStarted) {
        return fail("Consultation time has not started yet.", 400, "NOT_STARTED");
      }

      // 1) Mark the appointment COMPLETED through the SAME engine the v1
      //    flow uses (records the fee-eligibility visit row transactionally).
      const consultationNote =
        parsed.data.consultationNote && parsed.data.consultationNote.length > 0
          ? parsed.data.consultationNote
          : null;
      await getStore().completeAppointmentWithVisit(arg, { consultationNote });

      // 2) The permanent digital visit record. First completion CREATES the
      //    row; a re-completion after an authorized correction REVIVES it with
      //    a fresh receipt + confirmation state (original facts stay in the
      //    audit trail; the corrected receipt is void by design).
      const visit = existing
        ? await db.completedVisit.update({
            where: { id: existing.id },
            data: {
              completedById: user.id,
              completedByName: user.name,
              completedAt: new Date(),
              verificationMethod: method,
              policy,
              consultationNote,
              receiptNumber: generateReceiptNumber(),
              patientConfirmationStatus: policy === "B" ? "PENDING" : "NOT_REQUIRED",
              patientConfirmedAt: null,
              patientConfirmedVia: null,
              correctionStatus: null,
              correctedById: null,
              correctedAt: null,
              correctionReason: null,
            },
          })
        : await db.completedVisit.create({
            data: {
              appointmentId: arg,
              referenceCode: appointment.referenceCode,
              doctorId: appointment.doctorId,
              doctorName: appointment.doctor.name,
              chamberId: appointment.chamberId ?? null,
              chamberName: appointment.chamberName ?? null,
              patientId: appointment.patientId ?? null,
              patientName: appointment.patientName,
              patientPhone: normalizePhone(appointment.patientPhone),
              slotStart: new Date(appointment.slotStart),
              fee: appointment.fee,
              currency: appointment.currency,
              patientType: appointment.patientType ?? null,
              completedById: user.id,
              completedByName: user.name,
              verificationMethod: method,
              policy,
              consultationNote,
              receiptNumber: generateReceiptNumber(),
              patientConfirmationStatus: policy === "B" ? "PENDING" : "NOT_REQUIRED",
            },
          });

      // 3) Burn the credential (single use — replay impossible).
      await db.appointmentVerification.update({
        where: { appointmentId: arg },
        data: { status: "USED" },
      });

      // 4) Mode B: issue the one-time patient confirmation code — delivered
      //    ONLY to the patient (in-app notification); the doctor never sees it.
      let confirmationExpiry: string | null = null;
      if (policy === "B") {
        const code = generateConfirmationCode();
        const expiresAt = new Date(
          Date.now() + VVS_CONFIRMATION_EXPIRY_MINUTES * 60_000
        );
        // Replace any spent code from a pre-correction completion.
        await db.patientVisitConfirmation.upsert({
          where: { appointmentId: arg },
          create: {
            visitId: visit.id,
            appointmentId: arg,
            codeHash: sha256(`${arg}:${code}`),
            expiresAt,
          },
          update: {
            codeHash: sha256(`${arg}:${code}`),
            expiresAt,
            attempts: 0,
            consumedAt: null,
          },
        });
        confirmationExpiry = expiresAt.toISOString();
        await notifyUser(
          appointment.patientId,
          "VISIT_COMPLETED",
          "Visit completed — please confirm",
          `Dr. ${appointment.doctor.name.replace(/^(dr\.?|ডা\.?)\s*/i, "")} marked your visit (${appointment.referenceCode}) as completed. Your confirmation code is ${code}. Show it at the chamber or confirm in your app.`,
          { appointmentId: arg, referenceCode: appointment.referenceCode }
        );
      } else {
        await notifyUser(
          appointment.patientId,
          "VISIT_COMPLETED",
          "Visit completed",
          `Your consultation (${appointment.referenceCode}) was recorded as completed. A digital receipt is available in your appointments.`,
          { appointmentId: arg, referenceCode: appointment.referenceCode }
        );
      }

      await vvsAudit(user.id, existing ? "VVS_VISIT_RECOMPLETED" : "VVS_VISIT_COMPLETED", arg, {
        method,
        policy,
        receiptNumber: visit.receiptNumber,
        actorRole: user.role,
        byStaff: !isDoctor,
        ...(existing ? { priorReceiptNumber: existing.receiptNumber } : {}),
      });

      return ok({
        visit: visitToDto(visit),
        alreadyCompleted: false,
        confirmation: {
          status: policy === "B" ? "PENDING" : "NOT_REQUIRED",
          expiresAt: confirmationExpiry,
        },
      });
    }

    // patient-confirmation/:appointmentId — patient confirms (app or code)
    if (resource === "patient-confirmation" && arg) {
      const parsed = confirmationSchema.safeParse(body);
      if (!parsed.success) return fail("Invalid request.", 400, "VALIDATION_ERROR");

      const { appointment } = await loadVerificationWithAppointment(arg);
      const visit = await db.completedVisit.findUnique({
        where: { appointmentId: arg },
      });
      if (!visit) {
        return fail("No completed visit to confirm.", 404, "NO_VISIT");
      }
      if (visit.patientConfirmationStatus === "CONFIRMED") {
        return ok({ status: "CONFIRMED", alreadyConfirmed: true });
      }

      const isPatient = patientOwns(appointment, user);
      const policy = await getVvsPolicy();
      const isDoctor = user.role === "DOCTOR" && appointment.doctor.userId === user.id;
      const staff = await staffAuthorized(appointment, user, policy);

      const confirmationRow = await db.patientVisitConfirmation.findUnique({
        where: { visitId: visit.id },
      });

      const windowExpired = () =>
        !!confirmationRow &&
        !confirmationRow.consumedAt &&
        confirmationRow.expiresAt < new Date();

      if (isPatient && !parsed.data.code) {
        // Patient confirms directly in their own authenticated session.
        if (visit.patientConfirmationStatus === "EXPIRED" || windowExpired()) {
          if (windowExpired()) {
            await db.completedVisit.update({
              where: { id: visit.id },
              data: { patientConfirmationStatus: "EXPIRED" },
            });
          }
          return fail("The confirmation window has expired.", 410, "CODE_EXPIRED");
        }
      } else {
        // Code path — the patient read their code to the doctor/staff.
        if (!parsed.data.code) {
          return fail(
            "Enter the patient's confirmation code (shown in the patient's app).",
            400,
            "CODE_REQUIRED"
          );
        }
        if (!isDoctor && !staff && !isPatient && user.role !== "ADMIN") {
          return fail("Not authorized to confirm this visit.", 403, "FORBIDDEN");
        }
        if (!confirmationRow || confirmationRow.consumedAt) {
          return fail("No active confirmation code for this visit.", 409, "CODE_UNAVAILABLE");
        }
        if (windowExpired()) {
          await db.completedVisit.update({
            where: { id: visit.id },
            data: { patientConfirmationStatus: "EXPIRED" },
          });
          return fail("The confirmation code has expired.", 410, "CODE_EXPIRED");
        }
        if (confirmationRow.attempts >= VVS_CONFIRMATION_MAX_ATTEMPTS) {
          await vvsAudit(user.id, "VVS_CONFIRMATION_LOCKED", arg, {});
          return fail(
            "Too many incorrect attempts. The code is locked; the patient can still confirm in their own app.",
            429,
            "ATTEMPTS_EXCEEDED"
          );
        }
        const matches =
          sha256(`${arg}:${parsed.data.code.trim()}`) === confirmationRow.codeHash;
        if (!matches) {
          await db.patientVisitConfirmation.update({
            where: { id: confirmationRow.id },
            data: { attempts: { increment: 1 } },
          });
          await vvsAudit(user.id, "VVS_CONFIRMATION_FAILED", arg, {
            attempts: confirmationRow.attempts + 1,
          });
          return fail("Incorrect confirmation code.", 401, "BAD_CODE");
        }
      }

      const now = new Date();
      const viaApp = isPatient && !parsed.data.code;
      const updated = await db.completedVisit.update({
        where: { id: visit.id },
        data: {
          patientConfirmationStatus: "CONFIRMED",
          patientConfirmedAt: now,
          patientConfirmedVia: viaApp ? "APP" : "CODE",
        },
      });
      if (confirmationRow && !confirmationRow.consumedAt) {
        await db.patientVisitConfirmation.update({
          where: { id: confirmationRow.id },
          data: { consumedAt: now },
        });
      }
      await vvsAudit(user.id, "VVS_PATIENT_CONFIRMED", arg, {
        via: viaApp ? "APP" : "CODE",
        confirmedByPatientSession: viaApp,
      });
      return ok({ status: "CONFIRMED", visit: visitToDto(updated) });
    }

    // dispute — patient reports an incorrectly completed visit
    if (resource === "dispute" && !arg) {
      const parsed = disputeSchema.safeParse(body);
      if (!parsed.success) {
        return fail(
          parsed.error.issues[0]?.message ?? "Invalid request.",
          400,
          "VALIDATION_ERROR"
        );
      }
      const { appointment } = await loadVerificationWithAppointment(
        parsed.data.appointmentId
      );
      if (!patientOwns(appointment, user)) {
        return fail("Only the patient can report this visit.", 403, "FORBIDDEN");
      }
      const visit = await db.completedVisit.findUnique({
        where: { appointmentId: parsed.data.appointmentId },
      });
      if (!visit) {
        return fail("No completed visit recorded for this appointment.", 404, "NO_VISIT");
      }
      if (visit.correctionStatus === "DISPUTED") {
        return fail(
          "A dispute is already open for this visit. Our team will review it.",
          409,
          "DISPUTE_OPEN"
        );
      }
      if (visit.correctionStatus === "CORRECTED") {
        return fail(
          "This visit has already been corrected after a dispute.",
          409,
          "ALREADY_CORRECTED"
        );
      }
      const dispute = await db.visitDispute.create({
        data: {
          visitId: visit.id,
          appointmentId: parsed.data.appointmentId,
          reportedById: user.id,
          reporterName: user.name,
          reporterPhone: user.phone,
          reason: parsed.data.reason,
        },
      });
      await db.completedVisit.update({
        where: { id: visit.id },
        data: { correctionStatus: "DISPUTED" },
      });
      await vvsAudit(user.id, "VVS_DISPUTE_OPENED", parsed.data.appointmentId, {
        disputeId: dispute.id,
        reason: parsed.data.reason.slice(0, 200),
      });
      await notifyUser(
        appointment.doctor.userId,
        "VISIT_DISPUTED",
        "A patient disputed a completed visit",
        `The patient reported an issue with visit ${appointment.referenceCode}. Admin will review it — no action is needed from you yet.`,
        { appointmentId: appointment.id, referenceCode: appointment.referenceCode }
      );
      return ok({
        dispute: {
          id: dispute.id,
          status: dispute.status,
          createdAt: dispute.createdAt.toISOString(),
        },
      });
    }

    // disputes/:id/resolve — admin dismisses or corrects (audited either way)
    if (resource === "disputes" && arg && sub === "resolve") {
      await requireRole("ADMIN");
      const parsed = resolveDisputeSchema.safeParse(body);
      if (!parsed.success) {
        return fail(
          parsed.error.issues[0]?.message ?? "Invalid request.",
          400,
          "VALIDATION_ERROR"
        );
      }
      const dispute = await db.visitDispute.findUnique({
        where: { id: arg },
        include: { visit: true },
      });
      if (!dispute) return fail("Dispute not found.", 404, "NOT_FOUND");
      if (dispute.status === "RESOLVED") {
        return fail("This dispute is already resolved.", 409, "ALREADY_RESOLVED");
      }

      const now = new Date();
      await db.visitDispute.update({
        where: { id: dispute.id },
        data: {
          status: "RESOLVED",
          resolution: parsed.data.resolution,
          resolvedById: user.id,
          resolvedAt: now,
        },
      });

      if (parsed.data.action === "DISMISS") {
        // The visit stands; clear the disputed marker.
        await db.completedVisit.update({
          where: { id: dispute.visitId },
          data: { correctionStatus: null },
        });
        await vvsAudit(user.id, "VVS_DISPUTE_RESOLVED", dispute.appointmentId, {
          disputeId: dispute.id,
          action: "DISMISS",
        });
        return ok({ resolved: true, action: "DISMISS" });
      }

      // CORRECT — the visit did not happen (or was recorded wrongly). The
      // original record is PRESERVED (correctionStatus); the appointment is
      // reverted to CONFIRMED so the doctor can re-complete it properly.
      // Nothing is silently deleted — the correction is a new audited event.
      await db.completedVisit.update({
        where: { id: dispute.visitId },
        data: {
          correctionStatus: "CORRECTED",
          correctedById: user.id,
          correctedAt: now,
          correctionReason: parsed.data.resolution,
        },
      });
      await getStore().updateAppointment(dispute.appointmentId, {
        status: "CONFIRMED",
        consultationStatus: "NOT_STARTED",
      });
      // Re-activate the credential so a fresh form scan works again.
      await db.appointmentVerification.updateMany({
        where: { appointmentId: dispute.appointmentId },
        data: { status: "ACTIVE" },
      });
      await vvsAudit(user.id, "VVS_VISIT_CORRECTED", dispute.appointmentId, {
        disputeId: dispute.id,
        action: "CORRECT",
        reason: parsed.data.resolution.slice(0, 200),
      });
      return ok({ resolved: true, action: "CORRECT" });
    }

    return fail("Unknown VVS action.", 404, "NOT_FOUND");
  } catch (err) {
    return toVvsFail(err);
  }
}
