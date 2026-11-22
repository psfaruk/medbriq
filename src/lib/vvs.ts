import "server-only";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { getStore, storeKind } from "@/lib/data";
import type { AppointmentRecord } from "@/lib/data/types";
import { dhakaDateString } from "@/lib/time";

/**
 * Verified Visit System (VVS) — core server library.
 *
 * Responsibilities:
 * - Cryptographically secure identifiers (QR token, manual code, receipt no.).
 * - Tamper-resistant QR payloads (HMAC-SHA256 signature over a non-sensitive
 *   reference; secrets never leave the server).
 * - Verification policy resolution (Mode A / B / C, admin-configurable via the
 *   PlatformSetting "vvs.policy").
 * - Lazy issuance of AppointmentVerification rows from the LIVE appointment
 *   (via the store the booking engine wrote to — Prisma or Firestore), with a
 *   frozen document snapshot.
 *
 * Security invariants (docs/VVS.md §Threat model):
 * - No medical data, phone numbers or patient names inside QR payloads —
 *   only a reference code + one-time random token + HMAC.
 * - Raw tokens/codes exist ONLY in the QR payload / patient's authenticated
 *   session; the database stores sha256 hashes.
 * - Sequential values (serial numbers) are never used as secrets.
 * - The digital CompletedVisit record — not the paper form — is the source
 *   of truth for whether a consultation is recorded.
 */

export const VVS_POLICY_SETTING = "vvs.policy";
export const VVS_CONFIRMATION_EXPIRY_MINUTES = 24 * 60; // Mode B code lifetime
export const VVS_CONFIRMATION_MAX_ATTEMPTS = 5;
export const VVS_QR_VERSION = "MBVVS1";

export type VvsPolicy = "A" | "B" | "C";

export const VVS_POLICIES: Record<
  VvsPolicy,
  { key: VvsPolicy; en: string; bn: string; description: string }
> = {
  A: {
    key: "A",
    en: "Doctor confirmation only",
    bn: "শুধু ডাক্তারের নিশ্চিতকরণ",
    description:
      "The assigned doctor verifies the appointment (QR / manual code / reference) and completes the visit.",
  },
  B: {
    key: "B",
    en: "Doctor + patient confirmation",
    bn: "ডাক্তার ও রোগী উভয়ের নিশ্চিতকরণ",
    description:
      "After the doctor completes the visit, the patient confirms it in their app or with a one-time code. Recommended default.",
  },
  C: {
    key: "C",
    en: "Doctor + authorized chamber staff",
    bn: "ডাক্তার ও অনুমোদিত চেম্বার স্টাফ",
    description:
      "Authorized chamber staff may check in and verify visits on the doctor's behalf; every action is audited.",
  },
};

// ── Signing secret ───────────────────────────────────────────────────

/**
 * HMAC key for QR payload signatures.
 *
 * Production MUST set VVS_SIGNING_SECRET (32+ random chars). The fallback
 * derives a stable per-environment key so local/dev keeps working across
 * restarts — documented in .env.example and docs/VVS.md.
 */
function vvsSecret(): string {
  const explicit = process.env.VVS_SIGNING_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  return crypto
    .createHash("sha256")
    .update(`mfmd-vvs-fallback:${process.env.DATABASE_URL ?? "local"}`)
    .digest("hex");
}

// ── Secure identifiers ───────────────────────────────────────────────

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — print-safe

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** 24-char crypto-random QR token. */
export function generateQrToken(): string {
  return randomCode(24);
}

/** 8-char manual verification code printed on the form (QR-damage fallback). */
export function generateManualCode(): string {
  return randomCode(8);
}

/** 6-digit numeric patient confirmation code (Mode B). */
export function generateConfirmationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Receipt number, e.g. VR-7K2P9QXA (print-safe alphabet). */
export function generateReceiptNumber(): string {
  return `VR-${randomCode(8)}`;
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ── Credential encryption (re-download support) ──────────────────────
//
// The QR token / manual code must be reproducible so a patient who loses
// the printed form can re-download the SAME document (identical QR on
// every print — no accidental invalidation). Storing them plaintext would
// turn a DB leak into usable visit credentials, so they are sealed with
// AES-256-GCM under a key derived from the VVS signing secret. A database
// leak alone does not yield usable credentials; the hashes remain the
// lookup/verification path.

function encKey(): Buffer {
  return crypto.createHash("sha256").update(`enc:${vvsSecret()}`).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(sealed: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = sealed.split(".");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encKey(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

// ── QR payload ───────────────────────────────────────────────────────

export type QrPayload = { referenceCode: string; token: string };

/** Build the signed QR payload: "MBVVS1|<ref>|<token>|<hmac16>". */
export function buildQrPayload(referenceCode: string, token: string): string {
  const body = `${VVS_QR_VERSION}|${referenceCode}|${token}`;
  const sig = crypto
    .createHmac("sha256", vvsSecret())
    .update(body)
    .digest("hex")
    .slice(0, 16);
  return `${body}|${sig}`;
}

/** Parse a scanned string (raw payload or ...?view=verify&d=<payload> URL). */
export function parseQrPayload(
  scanned: string
): { ok: true; payload: QrPayload } | { ok: false; reason: string } {
  let raw = scanned.trim();
  if (raw.includes("view=verify") || raw.startsWith("http")) {
    try {
      const url = new URL(raw);
      const d = url.searchParams.get("d");
      if (d) raw = d;
    } catch {
      /* not a URL — treat as raw payload */
    }
  }
  const parts = raw.split("|");
  if (parts.length !== 4 || parts[0] !== VVS_QR_VERSION) {
    return { ok: false, reason: "Unrecognized QR code — not a Find Medi Doctor appointment form." };
  }
  const [, referenceCode, token, sig] = parts;
  const expected = crypto
    .createHmac("sha256", vvsSecret())
    .update(`${VVS_QR_VERSION}|${referenceCode}|${token}`)
    .digest("hex")
    .slice(0, 16);
  // Constant-time compare — no early-exit oracle.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "QR signature check failed — the code may be tampered or forged." };
  }
  if (!/^MB-[A-Z2-9]{6}$/.test(referenceCode)) {
    return { ok: false, reason: "Invalid appointment reference." };
  }
  return { ok: true, payload: { referenceCode, token } };
}

// ── Policy ───────────────────────────────────────────────────────────

/** Resolve the active verification policy (admin-configurable, default B). */
export async function getVvsPolicy(): Promise<VvsPolicy> {
  const row = await db.platformSetting.findUnique({
    where: { key: VVS_POLICY_SETTING },
  });
  const value = row?.value;
  if (value === "A" || value === "B" || value === "C") return value;
  return "B";
}

// ── Verification issuance ────────────────────────────────────────────

/** Terminal statuses that can never be verified/completed. */
const BLOCKED_STATUSES = new Set([
  "REJECTED",
  "CANCELLED_BY_PATIENT",
  "CANCELLED_BY_DOCTOR",
  "EXPIRED",
]);

export function isVerifiableStatus(status: string): boolean {
  return !BLOCKED_STATUSES.has(status);
}

/**
 * Fetch the live appointment through the SAME store the booking engine
 * uses (getStore()), keeping VVS compatible with both data layers.
 */
export async function getLiveAppointment(
  appointmentId: string
): Promise<AppointmentRecord | null> {
  return getStore().getAppointmentById(appointmentId);
}

/**
 * Compute the chamber-relative serial number: the 1-based rank of this
 * appointment by slotStart among the doctor's same-day appointments at the
 * same chamber (chamber-scoped serials — a doctor sitting in two chambers
 * gets independent counters; recommendation #3).
 */
export function computeSerialNumber(
  target: AppointmentRecord,
  sameDayAppointments: AppointmentRecord[]
): number {
  const day = dhakaDateString(new Date(target.slotStart));
  const sameChamber = sameDayAppointments.filter(
    (a) =>
      dhakaDateString(new Date(a.slotStart)) === day &&
      (a.chamberId ?? null) === (target.chamberId ?? null) &&
      !BLOCKED_STATUSES.has(a.status) &&
      a.status !== "NO_SHOW"
  );
  sameChamber.sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  const index = sameChamber.findIndex((a) => a.id === target.id);
  return index >= 0 ? index + 1 : Math.max(1, sameChamber.length + 1);
}

export class VvsError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "VvsError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Find-or-create the AppointmentVerification for a CONFIRMED appointment.
 * Idempotent: repeated calls return the existing credential (re-download
 * never creates a new appointment or a new token). Token rotation happens
 * only on explicit reissue (e.g. after a security event).
 */
export async function ensureVerification(
  appointment: AppointmentRecord,
  policy: VvsPolicy
) {
  const existing = await db.appointmentVerification.findUnique({
    where: { appointmentId: appointment.id },
  });
  if (existing) return { verification: existing, created: false };

  if (appointment.status !== "CONFIRMED") {
    throw new VvsError(
      "The appointment form becomes available once the appointment is confirmed.",
      409,
      "NOT_CONFIRMED"
    );
  }
  if (!isVerifiableStatus(appointment.status)) {
    throw new VvsError(
      "Cancelled or rejected appointments cannot be issued a verification form.",
      409,
      "INVALID_STATUS"
    );
  }

  const sameDay = await getStore().listAppointmentsByDoctor(
    appointment.doctorId
  );
  const serial = computeSerialNumber(appointment, sameDay);
  const qrToken = generateQrToken();
  const manualCode = generateManualCode();

  const verification = await db.appointmentVerification.create({
    data: {
      appointmentId: appointment.id,
      referenceCode: appointment.referenceCode,
      doctorId: appointment.doctorId,
      chamberId: appointment.chamberId ?? null,
      patientId: appointment.patientId ?? null,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      slotStart: new Date(appointment.slotStart),
      serialNumber: serial,
      qrTokenHash: sha256(qrToken),
      qrTokenEnc: encryptSecret(qrToken),
      manualCodeHash: sha256(manualCode),
      manualCodeEnc: encryptSecret(manualCode),
      status: "ACTIVE",
      policy,
    },
  });
  return { verification, created: true, qrToken, manualCode };
}

/**
 * Recover the raw credential (QR token + manual code) for re-download.
 * Returns null when the ciphertext is missing or was sealed under a
 * different signing secret (e.g. environment migration) — callers then
 * rotate the credential explicitly via rotateCredential.
 */
export async function getCredential(verification: {
  id: string;
  qrTokenEnc: string | null;
  manualCodeEnc: string | null;
}): Promise<{ qrToken: string; manualCode: string } | null> {
  if (!verification.qrTokenEnc || !verification.manualCodeEnc) return null;
  const qrToken = decryptSecret(verification.qrTokenEnc);
  const manualCode = decryptSecret(verification.manualCodeEnc);
  if (!qrToken || !manualCode) return null;
  return { qrToken, manualCode };
}

/**
 * Explicit credential rotation (security event / lost-form reissue when the
 * ciphertext is unreadable). The previous printed form stops verifying.
 */
export async function rotateCredential(verificationId: string): Promise<{
  qrToken: string;
  manualCode: string;
} | null> {
  const qrToken = generateQrToken();
  const manualCode = generateManualCode();
  const updated = await db.appointmentVerification.update({
    where: { id: verificationId },
    data: {
      qrTokenHash: sha256(qrToken),
      qrTokenEnc: encryptSecret(qrToken),
      manualCodeHash: sha256(manualCode),
      manualCodeEnc: encryptSecret(manualCode),
    },
  });
  void updated;
  return { qrToken, manualCode };
}

/**
 * Load a verification credential plus its LIVE appointment state. Throws a
 * typed VvsError when the appointment is no longer verifiable.
 */
export async function loadVerificationWithAppointment(appointmentId: string) {
  const verification = await db.appointmentVerification.findUnique({
    where: { appointmentId },
  });
  if (!verification) {
    throw new VvsError("No verification credential found for this appointment.", 404, "NOT_FOUND");
  }
  const appointment = await getLiveAppointment(appointmentId);
  if (!appointment) {
    throw new VvsError("The appointment no longer exists.", 404, "NOT_FOUND");
  }
  return { verification, appointment };
}

/**
 * Verify a scanned/entered credential against an appointment. Checks, in
 * order: payload signature (done by parseQrPayload), token hash match,
 * credential status, appointment status and (optionally) the assigned
 * doctor. Never reveals patient data on failure.
 */
export async function verifyCredential(
  referenceCode: string,
  tokenOrCode: string,
  options: { expectDoctorId?: string } = {}
): Promise<{
  verification: NonNullable<Awaited<ReturnType<typeof db.appointmentVerification.findUnique>>>;
  appointment: AppointmentRecord;
  method: "QR" | "MANUAL_CODE" | "REFERENCE";
}> {
  const verification = await db.appointmentVerification.findFirst({
    where: { referenceCode: referenceCode.toUpperCase() },
  });
  if (!verification) {
    throw new VvsError("No appointment found for this reference code.", 404, "NOT_FOUND");
  }
  const appointment = await getLiveAppointment(verification.appointmentId);
  if (!appointment) {
    throw new VvsError("The appointment no longer exists.", 404, "NOT_FOUND");
  }
  if (options.expectDoctorId && appointment.doctor.userId !== options.expectDoctorId) {
    throw new VvsError(
      "This appointment belongs to a different doctor.",
      403,
      "WRONG_DOCTOR"
    );
  }

  // Token comparison is constant-time-ish via hash equality on unique rows;
  // invalid attempts are audited by callers.
  const tokenHash = sha256(tokenOrCode);
  const manualHash = verification.manualCodeHash;
  let method: "QR" | "MANUAL_CODE" | "REFERENCE" | null = null;
  if (tokenHash === verification.qrTokenHash) method = "QR";
  else if (tokenHash === manualHash) method = "MANUAL_CODE";

  if (!method) {
    throw new VvsError(
      "Verification failed — the code does not match this appointment.",
      401,
      "BAD_CREDENTIAL"
    );
  }
  if (verification.status === "REVOKED") {
    throw new VvsError(
      "This form's verification credential was revoked. Ask the patient to re-download the form.",
      410,
      "CREDENTIAL_REVOKED"
    );
  }
  if (verification.status === "USED") {
    throw new VvsError(
      "This form was already used to record a visit.",
      409,
      "ALREADY_USED"
    );
  }
  if (!isVerifiableStatus(appointment.status)) {
    throw new VvsError(
      `This appointment is ${appointment.status.replace(/_/g, " ").toLowerCase()} and cannot be verified.`,
      409,
      "INVALID_STATUS"
    );
  }
  return {
    verification: verification as NonNullable<
      Awaited<ReturnType<typeof db.appointmentVerification.findUnique>>
    >,
    appointment,
    method,
  };
}

/** Simple in-memory rate limiter (per process; adequate for the MVP layer). */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** VVS requires the booking engine (appointment data) to be available. */
export function requireVvsStore(): void {
  if (storeKind() !== "prisma") {
    throw new VvsError(
      "The Verified Visit System runs on the unified Prisma data layer. This environment still uses the frozen Firestore store (see docs/ARCHITECTURE_CORRECTIONS.md #5).",
      503,
      "MODULE_DISABLED"
    );
  }
}

// ── Audit ────────────────────────────────────────────────────────────

/** Append-only audit event for every VVS action (never throws upward). */
export async function vvsAudit(
  actorId: string | null,
  action: string,
  appointmentId: string,
  meta: Record<string, unknown>
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        entity: "VvsVisit",
        entityId: appointmentId,
        meta: JSON.stringify(meta),
      },
    });
  } catch (err) {
    console.error("[vvs-audit]", action, err);
  }
}
