/**
 * Admin panel local types — v2 admin API payloads (src/app/api/v2/admin)
 * plus the v1 admin doctors directory row. These live here (not in
 * src/lib/types.ts) because only the super-admin panel consumes them and
 * this task owns no files outside src/components/app/admin/.
 */

// GET /api/v1/admin/doctors
export type AdminDoctorItem = {
  id: string;
  slug: string;
  name: string;
  email: string;
  city: string;
  verificationStatus: string;
  consultationFee: number;
  experienceYears: number;
  createdAt: string;
  specialties: string[];
};

// GET /api/v2/admin/hospitals
export type AdminHospitalItem = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  verificationStatus: string;
  verificationNote: string | null;
  managerName: string | null;
  managerEmail: string | null;
  doctorCount: number;
  branchCount: number;
};

// GET /api/v2/admin/payments
export type PaymentLedgerItem = {
  id: string;
  appointmentId: string;
  referenceCode: string;
  doctorName: string;
  patientName: string;
  method: string; // BKASH | NAGAD | CARD
  amount: number;
  currency: string;
  status: string; // SUCCEEDED | REFUNDED | PENDING | FAILED
  txnRef: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type PaymentTotals = {
  count: number;
  succeededAmount: number;
  refundedAmount: number;
  currency: string;
};

// GET /api/v2/admin/flags
export type FeatureFlagItem = {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
};

// GET /api/v2/admin/platform
export type PlatformSettingItem = {
  key: string;
  value: string;
  updatedAt: string;
};

export type CountryItem = {
  id: string;
  code: string;
  name: string;
  currency: string;
  phoneCode: string;
  isActive: boolean;
};

export type PlatformPayload = {
  settings: PlatformSettingItem[];
  countries: CountryItem[];
};

// GET /api/v2/admin/system
export type SystemHealth = {
  status: string;
  dbLatencyMs: number;
  dataStore: string;
  runtime: { node: string; platform: string; uptimeSeconds: number };
  counts: {
    users: number;
    doctors: number;
    hospitals: number;
    appointments: number;
    payments: number;
    tickets: number;
    flags: number;
  };
};

// GET /api/v2/support/list (admin sees every ticket)
export type SupportTicketItem = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string; // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  priority: string; // LOW | NORMAL | HIGH | URGENT
  reply: string | null;
  createdAt: string;
  updatedAt: string;
  requesterName: string;
  requesterEmail: string | null;
};

/** Public doctor-directory card (GET /api/v1/doctors). */
export type PublicDoctorCard = {
  id: string;
  slug: string;
  name: string;
  photoUrl: string | null;
  city: string;
  verificationStatus: string;
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
