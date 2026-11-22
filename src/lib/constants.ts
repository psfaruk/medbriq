/**
 * Find Medi Doctor application constants.
 * SQLite does not support native Prisma enums, so these string unions are the
 * single source of truth for role/status values. Keep in sync with
 * prisma/schema.prisma comments.
 */

export const ROLES = {
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  HOSPITAL: "HOSPITAL",
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
  NO_SHOW: "NO_SHOW",
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
export const SESSION_COOKIE = "fmd_session";
/** Session lifetime in days. */
export const SESSION_TTL_DAYS = 7;

// ── Authentication providers (User.provider) ────────────────────────────
export const AUTH_PROVIDERS = {
  CREDENTIALS: "credentials",
  GOOGLE: "google",
  PHONE: "phone",
} as const;

// ── Phone OTP (login + password reset) ──────────────────────────────────
/** OTP code length (digits). */
export const OTP_LENGTH = 6;
/** OTP validity window in seconds. */
export const OTP_TTL_SECONDS = 5 * 60;
/** Max failed verify attempts per code before it is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;
/** Max OTP requests per phone per rolling window (see otpRequestLimiter). */
export const OTP_REQUEST_LIMIT = 3;
/** Rolling window for OTP request limiting, in milliseconds. */
export const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
/** OTP purposes. */
export const OTP_PURPOSE = {
  LOGIN: "LOGIN",
  RESET: "RESET",
} as const;

/** In-app notification types (Phase 9 core slice). */
export const NOTIFICATION_TYPES = {
  APPOINTMENT_REQUESTED: "APPOINTMENT_REQUESTED",
  APPOINTMENT_APPROVED: "APPOINTMENT_APPROVED",
  APPOINTMENT_REJECTED: "APPOINTMENT_REJECTED",
  APPOINTMENT_CONFIRMED: "APPOINTMENT_CONFIRMED",
  APPOINTMENT_CANCELLED_BY_PATIENT: "APPOINTMENT_CANCELLED_BY_PATIENT",
  APPOINTMENT_CANCELLED_BY_DOCTOR: "APPOINTMENT_CANCELLED_BY_DOCTOR",
  APPOINTMENT_COMPLETED: "APPOINTMENT_COMPLETED",
  APPOINTMENT_NO_SHOW: "APPOINTMENT_NO_SHOW",
  APPOINTMENT_RESCHEDULED: "APPOINTMENT_RESCHEDULED",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
} as const;

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

// ── Doctor-wise fee system (docs/FEE_SYSTEM.md) ────────────────────────

/** Patient classification types — per doctor, never global. */
export const PATIENT_TYPE = {
  NEW: "NEW",
  RETURNING: "RETURNING",
  FOLLOW_UP: "FOLLOW_UP",
} as const;
export type PatientType = (typeof PATIENT_TYPE)[keyof typeof PATIENT_TYPE];

/** Validity duration units. */
export const VALIDITY_UNIT = {
  DAYS: "DAYS",
  MONTHS: "MONTHS",
} as const;
export type ValidityUnit = (typeof VALIDITY_UNIT)[keyof typeof VALIDITY_UNIT];

/** Platform defaults when a doctor has no explicit fee settings yet. */
export const FEE_DEFAULTS = {
  NEW_PATIENT_FEE: 1000,
  RETURNING_PATIENT_FEE: 600,
  RETURNING_VALIDITY_VALUE: 6,
  RETURNING_VALIDITY_UNIT: VALIDITY_UNIT.MONTHS,
  FOLLOW_UP_ENABLED: false,
  FOLLOW_UP_FEE: 0,
  FOLLOW_UP_VALIDITY_VALUE: 15,
  FOLLOW_UP_VALIDITY_UNIT: VALIDITY_UNIT.DAYS,
} as const;

/** Server-side validation limits for fee settings. */
export const FEE_LIMITS = {
  MIN_FEE: 0,
  MAX_FEE: 100000,
  RETURNING_DAYS: { MIN: 1, MAX: 365 },
  RETURNING_MONTHS: { MIN: 1, MAX: 36 },
  FOLLOW_UP_DAYS: { MIN: 1, MAX: 90 },
  FOLLOW_UP_MONTHS: { MIN: 1, MAX: 12 },
} as const;

/** UI preset durations for the returning-validity selector (months). */
export const RETURNING_VALIDITY_PRESETS_MONTHS = [1, 2, 3, 6, 12] as const;

/** Separated status axes (docs/ARCHITECTURE_CORRECTIONS.md #12). */
export const PAYMENT_STATUS = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
} as const;

export const CONSULTATION_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  COMPLETED: "COMPLETED",
  NOT_HELD: "NOT_HELD",
} as const;

export const REFUND_STATUS = {
  NONE: "NONE",
  REQUESTED: "REQUESTED",
  PROCESSED: "PROCESSED",
} as const;

// ── Hospital dashboard (master prompt §6) ───────────────────────────────
export const HOSPITAL_VERIFICATION_STATUS = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;

// ── Payments (sandbox simulation — no real money moves) ────────────────
export const PAYMENT_METHODS = {
  BKASH: "BKASH",
  NAGAD: "NAGAD",
  CARD: "CARD",
  CASH: "CASH", // pay at the chamber
} as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_TXN_STATUS = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

// ── Support tickets ────────────────────────────────────────────────────
export const TICKET_STATUS = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export const TICKET_CATEGORY = {
  GENERAL: "GENERAL",
  BOOKING: "BOOKING",
  PAYMENT: "PAYMENT",
  ACCOUNT: "ACCOUNT",
  REPORT: "REPORT",
} as const;

// ── Family member relations ────────────────────────────────────────────
export const FAMILY_RELATIONS = {
  SELF: "SELF",
  SPOUSE: "SPOUSE",
  CHILD: "CHILD",
  PARENT: "PARENT",
  SIBLING: "SIBLING",
  OTHER: "OTHER",
} as const;

// ── Platform setting keys ──────────────────────────────────────────────
export const PLATFORM_SETTINGS = {
  COMMISSION_PERCENT: "commissionPercent",
  SUPPORT_PHONE: "supportPhone",
  SUPPORT_EMAIL: "supportEmail",
  DEFAULT_CURRENCY: "defaultCurrency",
} as const;
