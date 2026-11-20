/**
 * Hospital dashboard API DTOs (contracts 1-12 of /api/v2/hospital/*).
 * These mirror the route handlers in src/app/api/v2/hospital/[...path]/route.ts.
 */

export type HospitalSummary = {
  id: string;
  name: string;
  slug: string;
  city: string;
  verificationStatus: string;
};

export type HospitalOverview = {
  hospital: HospitalSummary;
  stats: {
    branchCount: number;
    departmentCount: number;
    doctorCount: number;
    verifiedDoctors: number;
    pendingDoctors: number;
    todaysAppointments: number;
    totalAppointments: number;
    pendingApprovals: number;
    completedAppointments: number;
  };
  recentAppointments: {
    id: string;
    referenceCode: string;
    patientName: string;
    doctorName: string;
    chamberName: string | null;
    status: string;
    paymentStatus: string;
    slotStart: string;
    fee: number;
    currency: string;
  }[];
};

export type HospitalBranch = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isMain: boolean;
  createdAt: string;
};

export type HospitalDepartment = {
  id: string;
  name: string;
  about: string | null;
  createdAt: string;
};

export type HospitalDoctor = {
  id: string;
  slug: string;
  name: string;
  email: string;
  city: string;
  verificationStatus: string;
  experienceYears: number;
  specialties: string[];
  appointmentCount: number;
  reviewCount: number;
};

export type HospitalAppointment = {
  id: string;
  referenceCode: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  chamberName: string | null;
  status: string;
  paymentStatus: string;
  patientType: string | null;
  slotStart: string;
  slotEnd: string;
  fee: number;
  currency: string;
  createdAt: string;
};

export type HospitalRevenue = {
  commissionPercent: number;
  totals: {
    completedVisits: number;
    grossRevenue: number;
    commission: number;
    netRevenue: number;
    currency: string;
  };
  monthly: { month: string; revenue: number; visits: number }[];
  payments: {
    id: string;
    referenceCode: string;
    doctorName: string;
    patientName: string;
    fee: number;
    currency: string;
    paymentStatus: string;
    method: string | null;
    txnRef: string | null;
    slotStart: string;
  }[];
};

export type HospitalProfile = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  phone: string | null;
  about: string | null;
  website: string | null;
  verificationStatus: string;
  verificationNote: string | null;
};
