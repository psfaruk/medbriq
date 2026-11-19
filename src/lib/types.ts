/**
 * Shared client/server types for the Medbriq MVP.
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
  hospital: { name: string; slug: string; city: string; address: string | null } | null;
  weeklySchedule: {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
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
  createdAt: string;
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

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { message: string; code: string };
};
export type ApiResult<T> = ApiSuccess<T> | ApiError;
