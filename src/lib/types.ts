/**
 * Shared client/server types for the Find Medi Doctor MVP.
 * These mirror the API response shapes documented in docs/api.md.
 */

import type {
  AppointmentStatus,
  AppointmentType,
  BookingMode,
  Role,
  VerificationStatus,
} from "@/lib/constants";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  doctorSlug: string | null;
  verificationStatus: string | null;
  phone: string | null;
  phoneVerified: boolean;
  provider: string; // credentials | google | phone
  avatarUrl: string | null;
};

/** GET /api/v1/auth/config — which alternative sign-in methods are available. */
export type AuthConfig = {
  googleEnabled: boolean;
  googleClientId: string | null;
  phoneOtpEnabled: boolean;
  /** true when OTPs are returned in the API response (dev mode, no SMS provider) */
  devOtpMode: boolean;
};

export type SpecialtyInfo = {
  id: string;
  name: string;
  nameBn: string | null;
  slug: string;
  icon: string | null;
  doctorCount: number;
};

export type DoctorCard = {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  city: string;
  verificationStatus: VerificationStatus;
  experienceYears: number;
  consultationFee: number;
  currency: string;
  supportsVideo: boolean;
  requiresApproval: boolean;
  specialties: { name: string; slug: string }[];
  hospitalName: string | null;
  languages: string[];
  ratingAvg: number | null;
  ratingCount: number;
  nextAvailableLabel: string | null;
};

export type DoctorDetail = DoctorCard & {
  bio: string | null;
  followUpFee: number;
  videoConsultFee: number | null;
  regNumber: string | null;
  chamberAddress: string | null;
  verifiedAt: string | null;
  country: string;
  /** Doctor-wise fee structure (docs/FEE_SYSTEM.md); null when the fee
   * module is unavailable on the active store (residency gate). */
  feeStructure?: FeeSettingsDto | null;
  hospital: { name: string; slug: string; city: string; address: string | null } | null;
  weeklySchedule: {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  }[];
  /** Active practice locations for this doctor. */
  chambers: {
    id: string;
    name: string;
    address: string;
    city: string;
    area: string | null;
    phone: string | null;
  }[];
};

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  patientName: string;
};

export type SlotInfoDto = {
  startIso: string;
  endIso: string;
  label: string;
  taken: boolean;
  past: boolean;
};

export type AppointmentDto = {
  id: string;
  referenceCode: string;
  status: AppointmentStatus;
  type: AppointmentType;
  bookingMode: BookingMode;
  fee: number;
  currency: string;
  slotStart: string;
  slotEnd: string;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  notes: string | null;
  doctorNote: string | null;
  consultationNote: string | null;
  // ── Separated status axes (docs/ARCHITECTURE_CORRECTIONS.md #12) ──
  paymentStatus: string;
  consultationStatus: string;
  refundStatus: string;
  // ── Pricing snapshot (docs/FEE_SYSTEM.md §3) ──
  patientType: string | null;
  feeSettingsVersion: number | null;
  pricedAt: string | null;
  createdAt: string;
  chamberId: string | null;
  chamberName: string | null;
  doctor: {
    slug: string;
    name: string;
    city: string;
    consultationFee: number;
    specialties: string[];
  } | null;
  patientId: string | null;
};

export type AdminStats = {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  verifiedDoctors: number;
  pendingDoctors: number;
  totalAppointments: number;
  confirmedAppointments: number;
  pendingApprovals: number;
};

export type DoctorDashboardData = {
  stats: {
    todayTotal: number;
    pendingRequests: number;
    confirmedUpcoming: number;
    completedTotal: number;
    ratingAvg: number | null;
    ratingCount: number;
    /** Simulated earnings (Phase 7 preview): COMPLETED appointments only. */
    earnings: {
      completedRevenue: number;
      platformCommission: number;
      netEarnings: number;
      currency: string;
    };
  };
  pending: AppointmentDto[];
  upcoming: AppointmentDto[];
  availability: {
    id: string;
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    isActive: boolean;
  }[];
};

export type VerificationItem = {
  userId: string;
  doctorId: string;
  slug: string;
  name: string;
  email: string;
  phone: string | null;
  city: string;
  regNumber: string | null;
  experienceYears: number;
  consultationFee: number;
  bio: string | null;
  specialties: string[];
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
  submittedAt: string;
};

export type AuditLogItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: string | null;
  createdAt: string;
  actorName: string | null;
};

/** In-app notification (Phase 9 core slice). */
export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta: string | null; // JSON string: { appointmentId?, referenceCode?, doctorSlug? }
  readAt: string | null;
  createdAt: string;
};

/** Admin user-directory row. */
export type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  provider: string;
  phoneVerified: boolean;
  createdAt: string;
  doctorSlug: string | null;
  verificationStatus: string | null;
};

/** Review for the admin moderation queue. */
export type ModerationReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  patientName: string;
  doctorName: string;
  doctorSlug: string;
};

/** Public hospital directory row (Phase 6 public slice). */
export type HospitalInfo = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  about: string | null;
  /** Facility category: HOSPITAL | CLINIC | DIAGNOSTIC. */
  type: string;
  doctorCount: number;
};

export type SearchFilters = {
  q?: string;
  specialty?: string;
  city?: string;
  language?: string;
  video?: boolean;
  verifiedOnly?: boolean;
  maxFee?: number;
  availableToday?: boolean;
};

// ── Doctor-wise fee system DTOs (docs/FEE_SYSTEM.md) ────────────────────

/** Current fee settings (GET/PUT /api/v1/doctor/fee-settings). */
export type FeeSettingsDto = {
  newPatientFee: number;
  returningPatientFee: number;
  returningValidityValue: number;
  returningValidityUnit: "DAYS" | "MONTHS";
  followUpEnabled: boolean;
  followUpFee: number;
  followUpValidityValue: number;
  followUpValidityUnit: "DAYS" | "MONTHS";
  version: number;
  updatedAt: string;
};

/** One immutable fee-settings version (GET /api/v1/doctor/fee-settings/history). */
export type FeeHistoryItem = {
  id: string;
  version: number;
  newPatientFee: number;
  returningPatientFee: number;
  returningValidityValue: number;
  returningValidityUnit: "DAYS" | "MONTHS";
  followUpEnabled: boolean;
  followUpFee: number;
  followUpValidityValue: number;
  followUpValidityUnit: "DAYS" | "MONTHS";
  changeReason: string | null;
  changedBy: string | null;
  createdAt: string;
};

/** Machine-readable classification basis (snapshotted on appointments). */
export type PricingBasis = {
  rule:
    | "NO_PRIOR_COMPLETED_VISIT"
    | "VALIDITY_EXPIRED"
    | "WITHIN_RETURNING_VALIDITY"
    | "WITHIN_FOLLOW_UP_WINDOW";
  doctorId: string;
  patientId: string | null;
  patientPhone: string;
  latestVisitId: string | null;
  latestVisitCompletedAt: string | null;
  anchorDate: string | null;
  returningExpiryDate: string | null;
  followUpExpiryDate: string | null;
  evaluatedDate: string;
  evaluatedAt: string;
  feeSettingsVersion: number;
};

/** POST /api/v1/booking/price-preview response. */
export type PricePreviewDto = {
  patientType: "NEW" | "RETURNING" | "FOLLOW_UP";
  fee: number;
  currency: string;
  explanation: string;
  basis: PricingBasis;
  feeSettings: {
    newPatientFee: number;
    returningPatientFee: number;
    returningValidityValue: number;
    returningValidityUnit: "DAYS" | "MONTHS";
    followUpEnabled: boolean;
    followUpFee: number;
    followUpValidityValue: number;
    followUpValidityUnit: "DAYS" | "MONTHS";
  };
};

/** One visit row in a doctor's patient-history lookup. */
export type VisitHistoryItem = {
  id: string;
  appointmentId: string;
  patientName: string | null;
  slotStart: string;
  completedAt: string;
  qualifying: boolean;
  paymentStatusAtCompletion: string;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { message: string; code: string };
};
export type ApiResult<T> = ApiSuccess<T> | ApiError;
