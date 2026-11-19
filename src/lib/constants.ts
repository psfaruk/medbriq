/**
 * Medbriq application constants.
 * SQLite does not support native Prisma enums, so these string unions are the
 * single source of truth for role/status values. Keep in sync with
 * prisma/schema.prisma comments.
 */

export const ROLES = {
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const VERIFICATION_STATUS = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  MORE_INFO: "MORE_INFO",
} as const;
export type VerificationStatus =
  (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

export const APPOINTMENT_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
  CANCELLED_BY_PATIENT: "CANCELLED_BY_PATIENT",
  CANCELLED_BY_DOCTOR: "CANCELLED_BY_DOCTOR",
  COMPLETED: "COMPLETED",
  EXPIRED: "EXPIRED",
} as const;
export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const BOOKING_MODE = {
  INSTANT: "INSTANT",
  APPROVAL: "APPROVAL",
} as const;
export type BookingMode = (typeof BOOKING_MODE)[keyof typeof BOOKING_MODE];

export const APPOINTMENT_TYPE = {
  IN_PERSON: "IN_PERSON",
  VIDEO: "VIDEO",
} as const;
export type AppointmentType =
  (typeof APPOINTMENT_TYPE)[keyof typeof APPOINTMENT_TYPE];

/** Session cookie name (httpOnly, set by /api/v1/auth/*). */
export const SESSION_COOKIE = "medbriq_session";
/** Session lifetime in days. */
export const SESSION_TTL_DAYS = 7;

/** Default slot length in minutes when a doctor has no finer configuration. */
export const DEFAULT_SLOT_MINUTES = 30;

/** Platform commission percentage (simulated for MVP; see docs/costs.md). */
export const PLATFORM_COMMISSION_PERCENT = 10;

export const CURRENCY = {
  BDT: "BDT",
  USD: "USD",
} as const;

/** Languages supported at MVP launch. */
export const LANGUAGES: Record<string, string> = {
  bn: "বাংলা (Bengali)",
  en: "English",
  hi: "हिन्दी (Hindi)",
  ar: "العربية (Arabic)",
};

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

/** Bangladesh emergency number — must stay visible in the UI. */
export const BD_EMERGENCY_NUMBER = "999";
