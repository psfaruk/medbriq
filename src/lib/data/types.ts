import type { AdminStats, SpecialtyInfo } from "@/lib/types";

/**
 * Medbriq data layer — store-agnostic domain contract.
 *
 * Every API route under src/app/api/v1/** (plus src/lib/auth.ts and
 * src/lib/slots.ts) talks to the database EXCLUSIVELY through this interface.
 * Two implementations exist:
 *
 *   - PrismaStore    (src/lib/data/prisma-store.ts)    → local dev, SQLite
 *   - FirestoreStore (src/lib/data/firestore-store.ts) → production, Firebase
 *
 * The active store is selected at runtime by getStore() in src/lib/data/index.ts:
 * when FIREBASE_SERVICE_ACCOUNT is set (and parses as JSON) the FirestoreStore
 * is used, otherwise the local Prisma/SQLite store. See docs/database.md §8.
 *
 * All records are plain serializable objects; all timestamps are ISO-8601 UTC
 * strings ("…Z") so they sort lexicographically and serialize identically in
 * both stores.
 */

// ─────────────────────────── Domain errors ───────────────────────────

/**
 * Thrown by createAppointment/rescheduleAppointment when the
 * (doctorId, slotStart) uniqueness guard rejects the write — the data-layer
 * equivalent of Prisma's P2002 on @@unique([doctorId, slotStart]). API routes
 * translate this into `409 SLOT_TAKEN`.
 */
export class SlotConflictError extends Error {
  constructor(message = "This slot was just booked by someone else.") {
    super(message);
    this.name = "SlotConflictError";
  }
}

/**
 * Thrown by createAppointment when the generated referenceCode (MB-XXXXXX)
 * collides with an existing appointment. Astronomically unlikely (32^6 space);
 * callers retry with a fresh code.
 */
export class ReferenceCodeCollisionError extends Error {
  constructor(message = "Reference code collision.") {
    super(message);
    this.name = "ReferenceCodeCollisionError";
  }
}

// ─────────────────────────── Record types ───────────────────────────

/** Users (patients, doctors, admins) as seen by the auth flow. */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string; // PATIENT | DOCTOR | ADMIN
  status: string; // ACTIVE | SUSPENDED
  provider: string; // credentials | google | phone
  phoneVerified: boolean;
  avatarUrl: string | null;
  doctorSlug: string | null;
  verificationStatus: string | null;
};

export type AuthUserWithCredentials = AuthUser & { passwordHash: string };

/** Session row + the resolved user (used by getCurrentUser). */
export type SessionRecord = {
  id: string;
  token: string;
  userId: string;
  expiresAt: string; // ISO
  createdAt: string; // ISO
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    provider: string;
    phone: string | null;
    phoneVerified: boolean;
    avatarUrl: string | null;
    doctorSlug: string | null;
    verificationStatus: string | null;
  };
};

export type SpecialtyRecord = {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  icon: string | null;
};

/**
 * A doctor profile with the "joined" data the API needs: the owning user's
 * identity fields, specialty list, hospital affiliation, and all review
 * ratings (for in-memory aggregation). One rich shape serves search, detail,
 * booking, dashboards and admin views.
 */
export type DoctorRecord = {
  id: string;
  userId: string;
  slug: string;
  bio: string | null;
  experienceYears: number;
  consultationFee: number;
  followUpFee: number;
  videoConsultFee: number | null;
  regNumber: string | null;
  verificationStatus: string;
  verificationNote: string | null;
  verifiedAt: string | null; // ISO
  city: string;
  country: string;
  chamberAddress: string | null;
  languages: string | null; // comma-separated codes, e.g. "bn,en"
  supportsVideo: boolean;
  requiresApproval: boolean;
  photoUrl: string | null;
  hospitalId: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  name: string; // owning user's display name
  email: string; // owning user's email (admin views only — never in public DTOs)
  phone: string | null; // owning user's phone (admin views only)
  specialties: { name: string; slug: string }[];
  hospital: { name: string; slug: string; city: string; address: string | null } | null;
  reviewRatings: number[];
};

export type AvailabilityRuleRecord = {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  startMinute: number; // minutes from Dhaka midnight
  endMinute: number;
  isActive: boolean;
  createdAt: string; // ISO
};

/**
 * An appointment plus the doctor join used by DTO mapping and ownership
 * checks (doctor.userId, doctor.requiresApproval, specialty names).
 */
export type AppointmentRecord = {
  id: string; // stable logical id (survives reschedule)
  referenceCode: string;
  doctorId: string;
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  notes: string | null;
  slotStart: string; // ISO UTC
  slotEnd: string; // ISO UTC
  type: string; // IN_PERSON | VIDEO
  status: string; // see constants.ts APPOINTMENT_STATUS
  bookingMode: string; // INSTANT | APPROVAL
  fee: number;
  currency: string;
  doctorNote: string | null;
  consultationNote: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  doctor: {
    userId: string;
    slug: string;
    city: string;
    consultationFee: number;
    requiresApproval: boolean;
    name: string;
    specialties: string[]; // names only
  };
};

export type ReviewRecord = {
  id: string;
  doctorId: string;
  patientId: string;
  rating: number; // 1..5
  comment: string | null;
  createdAt: string; // ISO
  patientName: string;
};

/** Review + doctor join for the admin moderation queue. */
export type ModerationReviewRecord = ReviewRecord & {
  doctorSlug: string;
  doctorName: string;
};

/** In-app notification row (Phase 9 core slice). */
export type NotificationRecord = {
  id: string;
  userId: string;
  type: string; // see NOTIFICATION_TYPES
  title: string;
  body: string;
  meta: string | null; // JSON string
  readAt: string | null; // ISO
  createdAt: string; // ISO
};

/** Admin user-directory row. */
export type AdminUserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  provider: string;
  phoneVerified: boolean;
  createdAt: string; // ISO
  doctorSlug: string | null;
  verificationStatus: string | null;
};

/** Public hospital directory row (Phase 6 public slice). */
export type HospitalRecord = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  about: string | null;
  doctorCount: number; // doctors in PUBLIC_STATUSES
};

export type AuditLogRecord = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: string | null; // JSON string
  createdAt: string; // ISO
  actorName: string | null;
};

// ─────────────────────────── Input types ───────────────────────────

export type CreatePatientUserInput = {
  email: string;
  passwordHash: string;
  name: string;
  phone: string | null;
};

export type CreateDoctorAccountInput = {
  email: string;
  passwordHash: string;
  name: string;
  phone: string | null;
  specialtyId: string;
  profile: {
    slug: string;
    verificationStatus: string; // doctors register as PENDING
    bio: string | null;
    experienceYears: number;
    consultationFee: number;
    followUpFee: number;
    videoConsultFee: number | null;
    regNumber: string | null;
    city: string;
    chamberAddress: string | null;
    languages: string;
    supportsVideo: boolean;
    requiresApproval: boolean;
    hospitalId: string | null;
  };
};

/** Partial DoctorProfile update. `undefined` = leave unchanged, `null` = clear. */
export type DoctorProfilePatch = {
  bio?: string | null;
  experienceYears?: number;
  consultationFee?: number;
  followUpFee?: number;
  videoConsultFee?: number | null;
  city?: string;
  chamberAddress?: string | null;
  languages?: string;
  supportsVideo?: boolean;
  requiresApproval?: boolean;
  photoUrl?: string | null;
  verificationStatus?: string;
  verificationNote?: string | null;
  verifiedAt?: string | null; // ISO
};

export type NewAvailabilityRule = {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

export type CreateAppointmentInput = {
  referenceCode: string;
  doctorId: string;
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  notes: string | null;
  slotStart: string; // ISO UTC
  slotEnd: string; // ISO UTC
  type: string;
  status: string;
  bookingMode: string;
  fee: number;
  currency: string;
};

export type AppointmentPatch = {
  status?: string;
  doctorNote?: string | null;
  consultationNote?: string | null;
};

export type CreateAuditLogInput = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: string | null; // JSON string
};

/** Find-or-create inputs for the OTP (phone) and Google auth flows. */
export type CreatePhoneUserInput = {
  /** normalized BD number, e.g. +8801712345678 */
  phone: string;
  name: string;
  email: string; // deterministic synthetic email, e.g. p_8801712345678@phone.medbriq.dev
};

export type UpsertGoogleUserInput = {
  email: string; // Google-verified email (lowercased)
  name: string;
  avatarUrl: string | null;
};

/** Self-service profile patch (PATCH /api/v1/auth/me). */
export type UserProfilePatch = {
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type CreateOtpCodeInput = {
  phone: string;
  codeHash: string;
  purpose: string; // LOGIN | RESET
  expiresAtIso: string;
};

export type ActiveOtpCode = {
  id: string;
  codeHash: string;
  attempts: number;
  expiresAt: string; // ISO
};

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  meta: string | null; // JSON string
};

export type CreateReviewInput = {
  doctorId: string;
  patientId: string;
  rating: number; // 1..5
  comment: string | null;
};

/** DB-level filters of the public doctor search (see GET /api/v1/doctors). */
export type SearchDoctorsFilters = {
  /** allowed verification statuses (public = VERIFIED+PENDING; verified-only = [VERIFIED]) */
  statuses: string[];
  supportsVideo?: boolean;
  maxFee?: number;
  specialtySlug?: string;
};

export type ListDoctorsOptions = {
  verificationStatus?: string; // omit for all statuses
  order?: "createdAtAsc" | "createdAtDesc";
};

export type ReferenceMeta = {
  /** distinct cities of doctors whose status is in the public statuses (unsorted) */
  cities: string[];
  verifiedDoctors: number;
  pendingDoctors: number;
  specialtyCount: number;
  hospitalCount: number;
};

// ─────────────────────────── The interface ───────────────────────────

export type StoreKind = "prisma" | "firestore";

export interface DataStore {
  // ── Auth / users / sessions ──────────────────────────────────────────
  /** Find a user by email (login + registration duplicate check). */
  findUserByEmail(email: string): Promise<AuthUserWithCredentials | null>;
  /** Find a user by normalized phone (OTP login + password reset). */
  findUserByPhone(phone: string): Promise<AuthUserWithCredentials | null>;
  /** Find-or-create a PATIENT account for a phone-OTP login. */
  findOrCreatePhoneUser(input: CreatePhoneUserInput): Promise<{ user: AuthUser; created: boolean }>;
  /** Find-or-create/link a PATIENT account for a Google sign-in. */
  upsertGoogleUser(input: UpsertGoogleUserInput): Promise<{ user: AuthUser; created: boolean }>;
  /** Self-service profile updates (name / phone / avatar). */
  updateUserProfile(userId: string, patch: UserProfilePatch): Promise<AuthUser>;
  /** Replace the password hash ("" sentinel = no password set yet). */
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  /** Mark the user's phone as verified (OTP flows). */
  setUserPhoneVerified(userId: string): Promise<void>;
  /** Admin: suspend or reactivate an account. */
  updateUserStatus(userId: string, status: string): Promise<void>;
  /** Create a PATIENT user. */
  createPatientUser(input: CreatePatientUserInput): Promise<AuthUser>;
  /** Create a DOCTOR user + profile + specialty link atomically. */
  createDoctorAccount(input: CreateDoctorAccountInput): Promise<AuthUser>;
  /** Persist a session (token is generated by the caller). */
  createSession(token: string, userId: string, expiresAtIso: string): Promise<void>;
  /** Resolve a session token to its user (null when unknown). */
  getSessionUser(token: string): Promise<SessionRecord | null>;
  /** Delete one session row (lazy expiry cleanup). */
  deleteSessionById(id: string): Promise<void>;
  /** Delete session(s) for a token (logout). */
  deleteSessionsByToken(token: string): Promise<void>;

  // ── Phone OTP codes ──────────────────────────────────────────────────
  /** Invalidate previous active codes and persist a new one. */
  createOtpCode(input: CreateOtpCodeInput): Promise<void>;
  /** The newest unconsumed, unexpired code for (phone, purpose). */
  findActiveOtpCode(phone: string, purpose: string): Promise<ActiveOtpCode | null>;
  /** +1 failed attempt (locks the code after OTP_MAX_ATTEMPTS). */
  incrementOtpAttempts(id: string): Promise<void>;
  /** Mark consumed (single use). */
  consumeOtpCode(id: string): Promise<void>;

  // ── Notifications (Phase 9 core slice) ────────────────────────
  createNotification(input: CreateNotificationInput): Promise<void>;
  /** Newest-first list for the bell/notification center. */
  listNotifications(userId: string, limit: number): Promise<NotificationRecord[]>;
  countUnreadNotifications(userId: string): Promise<number>;
  /** Mark one notification read; false when not found/not owned. */
  markNotificationRead(id: string, userId: string): Promise<boolean>;
  /** Mark all owned notifications read; returns the updated count. */
  markAllNotificationsRead(userId: string): Promise<number>;

  // ── Reference data ───────────────────────────────────────────────────
  findSpecialtyBySlug(slug: string): Promise<SpecialtyRecord | null>;
  /** Specialties with doctor counts restricted to the given (public) statuses. */
  getSpecialtiesWithDoctorCounts(publicStatuses: string[]): Promise<SpecialtyInfo[]>;
  /** Aggregates for GET /api/v1/meta. */
  getReferenceMeta(publicStatuses: string[]): Promise<ReferenceMeta>;

  // ── Doctors ──────────────────────────────────────────────────────────
  /** Directory search with the DB-level filters; remaining filtering/sorting/pagination stays in the route. */
  searchDoctors(filters: SearchDoctorsFilters): Promise<DoctorRecord[]>;
  getDoctorBySlug(slug: string): Promise<DoctorRecord | null>;
  getDoctorById(id: string): Promise<DoctorRecord | null>;
  getDoctorByUserId(userId: string): Promise<DoctorRecord | null>;
  /** Lightweight lookup for the slots/reviews routes. */
  getDoctorIdAndStatusBySlug(slug: string): Promise<{ id: string; verificationStatus: string } | null>;
  doctorSlugExists(slug: string): Promise<boolean>;
  updateDoctorProfile(id: string, patch: DoctorProfilePatch): Promise<DoctorRecord>;
  /** All doctors, optionally filtered by verification status (admin views). */
  listDoctors(options: ListDoctorsOptions): Promise<DoctorRecord[]>;

  // ── Availability ─────────────────────────────────────────────────────
  /** Active rules for one weekday, ordered by startMinute (slot engine). */
  findActiveRulesForDay(doctorId: string, dayOfWeek: number): Promise<AvailabilityRuleRecord[]>;
  /** All rules of a doctor, ordered by (dayOfWeek, startMinute). */
  listAvailabilityRules(doctorId: string): Promise<AvailabilityRuleRecord[]>;
  /** Replace-all weekly schedule; returns the new rules ordered. */
  replaceAvailabilityRules(doctorId: string, rules: NewAvailabilityRule[]): Promise<AvailabilityRuleRecord[]>;

  // ── Appointments ─────────────────────────────────────────────────────
  /**
   * Create an appointment. Throws SlotConflictError when (doctorId, slotStart)
   * is already taken (the database-level double-booking guard) and
   * ReferenceCodeCollisionError on a referenceCode collision.
   */
  createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord>;
  getAppointmentById(id: string): Promise<AppointmentRecord | null>;
  /** Patient history, slotStart desc, capped at 100. */
  listAppointmentsByPatient(patientId: string): Promise<AppointmentRecord[]>;
  /** All appointments of a doctor (doctor dashboard; filtering/slicing in the route). */
  listAppointmentsByDoctor(doctorId: string): Promise<AppointmentRecord[]>;
  /** Guest lookup: referenceCode compared case-insensitively, phone normalized on both sides. */
  findAppointmentsByReferenceCode(referenceCode: string, phone: string): Promise<AppointmentRecord[]>;
  /** Slot starts in [fromIso, toIso) occupied by any of the given statuses (slot engine). */
  findBlockingSlotStarts(doctorId: string, fromIso: string, toIso: string, statuses: string[]): Promise<string[]>;
  /** In-place update (status transitions, doctorNote). */
  updateAppointment(id: string, patch: AppointmentPatch): Promise<AppointmentRecord>;
  /**
   * Move an appointment to a new slot. Throws SlotConflictError when the new
   * (doctorId, slotStart) is taken. `resetToPendingApproval` mirrors the
   * approval-mode doctors requiring re-approval after a move.
   */
  rescheduleAppointment(id: string, slotStartIso: string, slotEndIso: string, resetToPendingApproval: boolean): Promise<AppointmentRecord>;

  // ── Reviews ──────────────────────────────────────────────────────────
  /** All reviews of a doctor, newest first (route slices/aggregates). */
  listReviewsByDoctor(doctorId: string): Promise<ReviewRecord[]>;
  /** One patient's review of one doctor (dedupe check). */
  findReviewByDoctorAndPatient(doctorId: string, patientId: string): Promise<ReviewRecord | null>;
  /** Create a review (unique per doctor+patient enforced by the DB). */
  createReview(input: CreateReviewInput): Promise<ReviewRecord>;
  /** Recent reviews across all doctors with doctor names (admin moderation). */
  listRecentReviews(limit: number): Promise<ModerationReviewRecord[]>;
  /** Admin moderation delete; false when not found. */
  deleteReview(id: string): Promise<boolean>;

  /** Public hospital directory with doctor counts in the public statuses. */
  listHospitals(): Promise<HospitalRecord[]>;

  /** User directory with optional role filter and name/email/phone search. */
  listUsers(filters: { role?: string; q?: string }): Promise<AdminUserRecord[]>;

  // ── Admin ────────────────────────────────────────────────────────────
  getAdminStats(): Promise<AdminStats>;
  /** Most recent audit entries with actor names, newest first. */
  listAuditLogs(limit: number): Promise<AuditLogRecord[]>;
  createAuditLog(input: CreateAuditLogInput): Promise<void>;
}
