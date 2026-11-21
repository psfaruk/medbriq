/**
 * Verified Visit System (VVS) — client-side DTOs.
 *
 * Mirrors the shapes returned by /api/v2/vvs/* (src/app/api/v2/vvs). Kept
 * in a separate client-safe module so screens never import server code.
 */

export type VvsAppointmentSummary = {
  id: string;
  referenceCode: string;
  status: string;
  paymentStatus: string;
  patientType: string | null;
  fee: number;
  currency: string;
  slotStart: string;
  slotEnd: string;
  type: string;
  chamberId: string | null;
  chamberName: string | null;
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string | null;
  notes: string | null;
  doctor: {
    name: string;
    slug: string;
    city: string;
    specialties: string[];
  };
};

export type VvsVerificationInfo = {
  appointmentId: string;
  referenceCode: string;
  serialNumber: number;
  status: "ACTIVE" | "USED" | "REVOKED" | string;
  policy: "A" | "B" | "C" | string;
  documentVersion: number;
  issueCount: number;
  lastIssuedAt: string | null;
  checkInAt: string | null;
  createdAt: string;
};

export type VvsVisit = {
  id: string;
  appointmentId: string;
  referenceCode: string;
  receiptNumber: string;
  doctorId: string;
  doctorName: string;
  chamberName: string | null;
  patientName: string;
  slotStart: string;
  fee: number;
  currency: string;
  patientType: string | null;
  completedById: string;
  completedByName: string;
  completedAt: string;
  verificationMethod: "QR" | "MANUAL_CODE" | "REFERENCE" | string;
  policy: string;
  patientConfirmationStatus:
    | "NOT_REQUIRED"
    | "PENDING"
    | "CONFIRMED"
    | "EXPIRED"
    | string;
  patientConfirmedAt: string | null;
  patientConfirmedVia: "APP" | "CODE" | null;
  correctionStatus: "DISPUTED" | "CORRECTED" | null;
  correctionReason: string | null;
  correctedAt: string | null;
  consultationNote: string | null;
  disputeStatus?: string | null;
};

export type VvsDocument = {
  appointment: VvsAppointmentSummary;
  verification: VvsVerificationInfo;
  doctor: {
    name: string;
    regNumber: string | null;
    city: string;
    specialties: string[];
  };
  form: {
    qrPayload: string;
    qrUrl: string;
    qrDataUrl: string;
    manualCode: string | null;
    credentialState: "ACTIVE" | "USED" | "REVOKED" | string;
    printDate: string;
    documentVersion: number;
    copyLabels: { patient: string; doctor: string };
  };
};

export type VvsStatus = {
  appointment: VvsAppointmentSummary;
  verification: VvsVerificationInfo;
  visit: VvsVisit | null;
  confirmation: {
    status: string;
    expiresAt: string | null;
    confirmedAt: string | null;
    confirmedVia: string | null;
  } | null;
  dispute: {
    id: string;
    status: string;
    reason: string;
    resolution: string | null;
    createdAt: string;
  } | null;
  viewer: { isPatient: boolean; isDoctor: boolean };
};

export type VvsReceipt = VvsVisit & {
  serialNumber: number;
  checkInAt: string | null;
  doctorRegNumber: string | null;
  platform: string;
  issuedAt: string;
};

export type VvsQueueItem = VvsAppointmentSummary & {
  serialNumber: number | null;
  verificationStatus: "NONE" | "ACTIVE" | "USED" | "REVOKED" | string;
  checkInAt: string | null;
  visit: VvsVisit | null;
};

export type VvsVerifyResult = {
  method: "QR" | "MANUAL_CODE" | string;
  appointment: VvsAppointmentSummary;
  verification: VvsVerificationInfo;
  visit: VvsVisit | null;
  allowed: { canCheckIn: boolean; canComplete: boolean };
};

export type VvsPublicVerify = {
  valid: boolean;
  reason?: string;
  referenceCode?: string;
  doctorName?: string | null;
  slotStart?: string | null;
  appointmentStatus?: string | null;
  visitRecorded?: boolean;
};

export type VvsDispute = {
  id: string;
  visitId: string;
  appointmentId: string;
  reporterName: string;
  reporterPhone: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  visit: VvsVisit | null;
};
