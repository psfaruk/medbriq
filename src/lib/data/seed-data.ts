/**
 * Medbriq demo data definitions — shared by BOTH seeders:
 *
 *   - prisma/seed.ts           → local SQLite (PrismaStore)
 *   - scripts/firestore-seed.ts → production Firestore (FirestoreStore)
 *
 * IMPORTANT: all doctors, hospitals, reviews and appointments defined here are
 * FICTIONAL demo data. They exist so the platform workflows (search, booking,
 * verification, dashboards) can be exercised end-to-end. The UI labels this
 * environment as "Demo MVP". No real doctors, patients, licenses or medical
 * claims are represented.
 */

// ── Pure time helpers (Dhaka is UTC+6, no DST) ──────────────────────────

function dhakaToday(): { dateStr: string; dayOfWeek: number } {
  const now = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const dateStr = now.toISOString().slice(0, 10);
  return { dateStr, dayOfWeek: now.getUTCDay() };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Next Dhaka date (>= tomorrow+minDays) whose weekday is in `days`. */
export function nextDhakaDate(days: number[], minDays = 1): string {
  const { dateStr } = dhakaToday();
  let candidate = addDays(dateStr, minDays);
  for (let i = 0; i < 14; i++) {
    const dow = new Date(candidate + "T00:00:00Z").getUTCDay();
    if (days.includes(dow)) return candidate;
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/** Dhaka-local date + minute-of-day → UTC Date (mirrors src/lib/time.ts). */
export function dhakaToUtc(dateStr: string, minuteOfDay: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minuteOfDay - 360, 0, 0));
}

// ── Reference data ─────────────────────────────────────────────────────

export const SEED_SPECIALTIES = [
  { name: "Medicine & Diabetology", nameBn: "মেডিসিন ও ডায়াবেটোলজি", slug: "medicine-diabetology", icon: "Stethoscope" },
  { name: "Cardiology", nameBn: "কার্ডিওলজি (হৃদরোগ)", slug: "cardiology", icon: "HeartPulse" },
  { name: "Dermatology", nameBn: "চর্মরোগ", slug: "dermatology", icon: "Layers" },
  { name: "Pediatrics", nameBn: "শিশু রোগ", slug: "pediatrics", icon: "Baby" },
  { name: "Gynecology & Obstetrics", nameBn: "গাইনোকোলজি ও প্রসূতি", slug: "gynecology-obstetrics", icon: "Heart" },
  { name: "Orthopedics", nameBn: "অর্থোপেডিক্স", slug: "orthopedics", icon: "Bone" },
  { name: "ENT", nameBn: "নাক-কান-গলা", slug: "ent", icon: "Ear" },
  { name: "Neurology", nameBn: "নিউরোলজি (স্নায়ুরোগ)", slug: "neurology", icon: "Brain" },
  { name: "Psychiatry", nameBn: "মানসিক স্বাস্থ্য", slug: "psychiatry", icon: "BrainCircuit" },
  { name: "Dentistry", nameBn: "দাঁতের চিকিৎসা", slug: "dentistry", icon: "Smile" },
];

export const SEED_HOSPITALS = [
  { name: "Greenview General Hospital", slug: "greenview-general-hospital", city: "Dhaka", address: "House 12, Road 5, Dhanmondi, Dhaka 1205", phone: "+880 2-9612xxx (demo)", about: "Multi-disciplinary private hospital (fictional demo data) with 24/7 emergency, diagnostics and inpatient care." },
  { name: "Lakeview Medical Center", slug: "lakeview-medical-center", city: "Dhaka", address: "Level 4, Block C, Gulshan Avenue, Dhaka 1212", phone: "+880 2-8835xxx (demo)", about: "Modern outpatient specialist center (fictional demo data) focusing on consultations and day-care procedures." },
  { name: "Padma City Hospital", slug: "padma-city-hospital", city: "Chattogram", address: "Sheikh Mujib Road, Kotwali, Chattogram 4000", phone: "+880 31-611xxx (demo)", about: "General and specialty hospital in Chattogram (fictional demo data)." },
  { name: "Uttara Central Clinic", slug: "uttara-central-clinic", city: "Dhaka", address: "Sector 7, Uttara, Dhaka 1230", phone: "+880 2-4891xxx (demo)", about: "Neighborhood family clinic (fictional demo data) with evening chambers." },
];

// ── Demo accounts ──────────────────────────────────────────────────────

export const SEED_ADMIN = {
  email: "admin@medbriq.dev",
  password: "Admin@Medbriq123",
  name: "Platform Admin",
  phone: "+880 1700-000000",
  role: "ADMIN" as const,
};

export const SEED_PATIENTS = [
  {
    email: "patient@medbriq.dev",
    password: "Patient@123",
    name: "Rahim Uddin",
    phone: "+880 1811-000001",
    role: "PATIENT" as const,
  },
  {
    email: "patient2@medbriq.dev",
    password: "Patient@123",
    name: "Salma Khatun",
    phone: "+880 1811-000002",
    role: "PATIENT" as const,
  },
  {
    email: "patient3@medbriq.dev",
    password: "Patient@123",
    name: "Abdul Karim",
    phone: "+880 1811-000003",
    role: "PATIENT" as const,
  },
];

// ── Doctors ────────────────────────────────────────────────────────────

export type DoctorSeed = {
  name: string;
  email: string;
  phone: string;
  slug: string;
  specialtySlug: string;
  bio: string;
  experienceYears: number;
  consultationFee: number;
  followUpFee: number;
  videoConsultFee?: number;
  regNumber: string;
  verificationStatus: "VERIFIED" | "PENDING" | "MORE_INFO";
  city: string;
  chamberAddress: string;
  hospitalSlug: string;
  languages: string;
  supportsVideo: boolean;
  requiresApproval: boolean;
  /** [dayOfWeek, startMinute, endMinute][] */
  hours: [number, number, number][];
  password: string;
};

export const SEED_DOCTORS: DoctorSeed[] = [
  {
    name: "Dr. Ayesha Rahman", email: "doctor@medbriq.dev", phone: "+880 1711-000001",
    slug: "dr-ayesha-rahman", specialtySlug: "medicine-diabetology",
    bio: "Consultant physician focused on diabetes management, thyroid disorders and preventive family medicine. MBBS, FCPS (Medicine). Fictional demo profile.",
    experienceYears: 12, consultationFee: 1000, followUpFee: 600, videoConsultFee: 800,
    regNumber: "BMDC-A-101001 (demo)", verificationStatus: "VERIFIED",
    city: "Dhaka", chamberAddress: "Chamber 302, Greenview General Hospital, Dhanmondi",
    hospitalSlug: "greenview-general-hospital", languages: "bn,en",
    supportsVideo: true, requiresApproval: true,
    hours: [[6, 1020, 1260], [0, 1020, 1260], [1, 1020, 1260], [2, 1020, 1260], [3, 1020, 1260]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Mahmudul Hasan", email: "dr.mahmudul@medbriq.dev", phone: "+880 1711-000002",
    slug: "dr-mahmudul-hasan", specialtySlug: "cardiology",
    bio: "Interventional cardiologist managing hypertension, coronary artery disease and heart failure. MBBS, MD (Cardiology). Fictional demo profile.",
    experienceYears: 15, consultationFee: 1500, followUpFee: 800,
    regNumber: "BMDC-A-101002 (demo)", verificationStatus: "VERIFIED",
    city: "Dhaka", chamberAddress: "Chamber 105, Greenview General Hospital, Dhanmondi",
    hospitalSlug: "greenview-general-hospital", languages: "bn,en",
    supportsVideo: false, requiresApproval: true,
    hours: [[0, 600, 780], [1, 600, 780], [2, 600, 780], [3, 600, 780], [4, 600, 780]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Farhana Akter", email: "dr.farhana@medbriq.dev", phone: "+880 1711-000003",
    slug: "dr-farhana-akter", specialtySlug: "dermatology",
    bio: "Dermatologist and venereologist treating acne, eczema, psoriasis and hair disorders. MBBS, DDV. Fictional demo profile.",
    experienceYears: 8, consultationFee: 800, followUpFee: 500, videoConsultFee: 700,
    regNumber: "BMDC-A-101003 (demo)", verificationStatus: "VERIFIED",
    city: "Dhaka", chamberAddress: "Room 210, Lakeview Medical Center, Gulshan",
    hospitalSlug: "lakeview-medical-center", languages: "bn,en",
    supportsVideo: true, requiresApproval: false,
    hours: [[1, 960, 1200], [2, 960, 1200], [3, 960, 1200], [4, 960, 1200], [5, 960, 1200]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Tanvir Ahmed", email: "dr.tanvir@medbriq.dev", phone: "+880 1711-000004",
    slug: "dr-tanvir-ahmed", specialtySlug: "pediatrics",
    bio: "Child specialist covering newborn care, immunization, nutrition and childhood asthma. MBBS, FCPS (Paediatrics). Fictional demo profile.",
    experienceYears: 10, consultationFee: 900, followUpFee: 500,
    regNumber: "BMDC-A-101004 (demo)", verificationStatus: "VERIFIED",
    city: "Dhaka", chamberAddress: "Uttara Central Clinic, Sector 7",
    hospitalSlug: "uttara-central-clinic", languages: "bn,en,hi",
    supportsVideo: false, requiresApproval: false,
    hours: [[6, 1080, 1260], [0, 1080, 1260], [1, 1080, 1260], [2, 1080, 1260], [3, 1080, 1260]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Nusrat Jahan", email: "dr.nusrat@medbriq.dev", phone: "+880 1711-000005",
    slug: "dr-nusrat-jahan", specialtySlug: "gynecology-obstetrics",
    bio: "Consultant gynecologist & obstetrician — pregnancy care, infertility counseling and minimally invasive surgery. MBBS, FCPS (Gynae). Fictional demo profile.",
    experienceYears: 14, consultationFee: 1200, followUpFee: 700,
    regNumber: "BMDC-A-101005 (demo)", verificationStatus: "VERIFIED",
    city: "Chattogram", chamberAddress: "OPD 2, Padma City Hospital, Kotwali",
    hospitalSlug: "padma-city-hospital", languages: "bn,en",
    supportsVideo: false, requiresApproval: true,
    hours: [[0, 600, 840], [1, 600, 840], [2, 600, 840], [3, 600, 840], [4, 600, 840]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Rafiul Islam", email: "dr.rafiul@medbriq.dev", phone: "+880 1711-000006",
    slug: "dr-rafiul-islam", specialtySlug: "orthopedics",
    bio: "Orthopedic surgeon — fracture care, sports injuries, knee and hip replacement. MBBS, MS (Ortho). Fictional demo profile.",
    experienceYears: 11, consultationFee: 1000, followUpFee: 600,
    regNumber: "BMDC-A-101006 (demo)", verificationStatus: "VERIFIED",
    city: "Dhaka", chamberAddress: "Room 118, Lakeview Medical Center, Gulshan",
    hospitalSlug: "lakeview-medical-center", languages: "bn,en",
    supportsVideo: false, requiresApproval: true,
    hours: [[6, 1020, 1200], [0, 1020, 1200], [1, 1020, 1200], [2, 1020, 1200]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Sadia Karim", email: "dr.sadia@medbriq.dev", phone: "+880 1711-000007",
    slug: "dr-sadia-karim", specialtySlug: "ent",
    bio: "ENT specialist for sinusitis, tonsillitis, hearing loss and vertigo. MBBS, DLO. Fictional demo profile.",
    experienceYears: 7, consultationFee: 900, followUpFee: 500, videoConsultFee: 750,
    regNumber: "BMDC-A-101007 (demo)", verificationStatus: "VERIFIED",
    city: "Dhaka", chamberAddress: "Chamber 8, Greenview General Hospital, Dhanmondi",
    hospitalSlug: "greenview-general-hospital", languages: "bn,en",
    supportsVideo: true, requiresApproval: true,
    hours: [[1, 660, 900], [2, 660, 900], [3, 660, 900], [4, 660, 900], [5, 660, 900], [6, 660, 900]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Imran Chowdhury", email: "dr.imran@medbriq.dev", phone: "+880 1711-000008",
    slug: "dr-imran-chowdhury", specialtySlug: "neurology",
    bio: "Neurologist treating stroke, epilepsy, migraine and neuropathy. MBBS, MD (Neurology). Fictional demo profile.",
    experienceYears: 16, consultationFee: 1600, followUpFee: 900,
    regNumber: "BMDC-A-101008 (demo)", verificationStatus: "VERIFIED",
    city: "Chattogram", chamberAddress: "Neuro OPD, Padma City Hospital, Kotwali",
    hospitalSlug: "padma-city-hospital", languages: "bn,en",
    supportsVideo: false, requiresApproval: true,
    hours: [[0, 960, 1200], [1, 960, 1200], [2, 960, 1200], [3, 960, 1200]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Mehjabin Islam", email: "dr.mehjabin@medbriq.dev", phone: "+880 1711-000009",
    slug: "dr-mehjabin-islam", specialtySlug: "psychiatry",
    bio: "Psychiatrist for anxiety, depression, sleep disorders and CBT-based therapy. MBBS, FCPS (Psychiatry). Fictional demo profile.",
    experienceYears: 6, consultationFee: 1300, followUpFee: 800, videoConsultFee: 1100,
    regNumber: "BMDC-A-101009 (demo)", verificationStatus: "PENDING",
    city: "Dhaka", chamberAddress: "Room 305, Lakeview Medical Center, Gulshan",
    hospitalSlug: "lakeview-medical-center", languages: "bn,en",
    supportsVideo: true, requiresApproval: true,
    hours: [[1, 1020, 1260], [3, 1020, 1260], [5, 1020, 1260]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Arif Hossain", email: "dr.arif@medbriq.dev", phone: "+880 1711-000010",
    slug: "dr-arif-hossain", specialtySlug: "dentistry",
    bio: "Dental surgeon — root canal, braces consultation and cosmetic dentistry. BDS, FCPS-I. Fictional demo profile.",
    experienceYears: 5, consultationFee: 700, followUpFee: 400,
    regNumber: "BMDC-D-101010 (demo)", verificationStatus: "PENDING",
    city: "Dhaka", chamberAddress: "Uttara Central Clinic, Sector 7",
    hospitalSlug: "uttara-central-clinic", languages: "bn,en",
    supportsVideo: false, requiresApproval: false,
    hours: [[1, 600, 1080], [2, 600, 1080], [3, 600, 1080], [4, 600, 1080], [5, 600, 1080]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Kamrul Hasan", email: "dr.kamrul@medbriq.dev", phone: "+880 1711-000011",
    slug: "dr-kamrul-hasan", specialtySlug: "medicine-diabetology",
    bio: "General physician with special interest in hypertension and lifestyle diseases. MBBS, MCPS. Fictional demo profile.",
    experienceYears: 9, consultationFee: 800, followUpFee: 500,
    regNumber: "BMDC-A-101011 (demo)", verificationStatus: "PENDING",
    city: "Chattogram", chamberAddress: "Chamber 4, Padma City Hospital, Kotwali",
    hospitalSlug: "padma-city-hospital", languages: "bn,en",
    supportsVideo: false, requiresApproval: true,
    hours: [[6, 1020, 1200], [0, 1020, 1200], [2, 1020, 1200], [4, 1020, 1200]],
    password: "Doctor@123",
  },
  {
    name: "Dr. Shireen Huq", email: "dr.shireen@medbriq.dev", phone: "+880 1711-000012",
    slug: "dr-shireen-huq", specialtySlug: "cardiology",
    bio: "Senior consultant cardiologist — echocardiography, heart failure clinics and preventive cardiology. MBBS, MD, FACC. Fictional demo profile.",
    experienceYears: 20, consultationFee: 2000, followUpFee: 1200,
    regNumber: "BMDC-A-101012 (demo)", verificationStatus: "MORE_INFO",
    city: "Dhaka", chamberAddress: "Chamber 501, Greenview General Hospital, Dhanmondi",
    hospitalSlug: "greenview-general-hospital", languages: "bn,en",
    supportsVideo: false, requiresApproval: true,
    hours: [[0, 960, 1200], [2, 960, 1200], [4, 960, 1200]],
    password: "Doctor@123",
  },
];

// ── Demo appointments (future slots, computed relative to today in Dhaka) ──

export type DemoAppointmentSpec = {
  referenceCode: string;
  doctorSlug: string;
  patientEmail: string | null; // null → guest booking
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  notes: string | null;
  slotStartIso: string;
  slotEndIso: string;
  type: "IN_PERSON" | "VIDEO";
  status: "PENDING_APPROVAL" | "CONFIRMED";
  bookingMode: "INSTANT" | "APPROVAL";
  fee: number;
  // ── Fee system snapshots (docs/FEE_SYSTEM.md §3) ──
  patientType?: "NEW" | "RETURNING" | "FOLLOW_UP";
  feeSettingsVersion?: number;
};

/**
 * Build the 4 demo appointments. Future dates are computed relative to today
 * in Dhaka so the demo always shows bookable upcoming slots. Fee snapshots
 * are consistent with SEED_FEE_SETTINGS + SEED_COMPLETED_VISITS below
 * (docs/FEE_SYSTEM.md).
 */
export function buildDemoAppointments(): DemoAppointmentSpec[] {
  const ayesha = SEED_DOCTORS.find((d) => d.slug === "dr-ayesha-rahman")!;
  const ayeshaDays = ayesha.hours.map((h) => h[0]);
  const date1 = nextDhakaDate(ayeshaDays, 1);
  const date2 = nextDhakaDate(ayeshaDays, 3);
  const farhana = SEED_DOCTORS.find((d) => d.slug === "dr-farhana-akter")!;
  const farhanaDays = farhana.hours.map((h) => h[0]);
  const date3 = nextDhakaDate(farhanaDays, 2);

  return [
    {
      referenceCode: "MB-DEMO01",
      doctorSlug: ayesha.slug,
      patientEmail: "patient@medbriq.dev",
      patientName: "Rahim Uddin",
      patientPhone: "+880 1811-000001",
      patientAge: 34,
      patientGender: "MALE",
      notes: "Regular diabetes follow-up. Fasting sugar reports attached mentally :) (demo)",
      slotStartIso: dhakaToUtc(date1, 1050).toISOString(), // 5:30 PM
      slotEndIso: dhakaToUtc(date1, 1080).toISOString(),
      type: "IN_PERSON",
      status: "PENDING_APPROVAL",
      bookingMode: "APPROVAL",
      // Rahim completed a visit 60 days ago (SEED_COMPLETED_VISITS) →
      // within Ayesha's 6-month returning validity → RETURNING @ 600.
      fee: 600,
      patientType: "RETURNING",
      feeSettingsVersion: 1,
    },
    {
      referenceCode: "MB-DEMO02",
      doctorSlug: ayesha.slug,
      patientEmail: null,
      patientName: "Nasreen Sultana",
      patientPhone: "+880 1911-000002",
      patientAge: 45,
      patientGender: "FEMALE",
      notes: "Thyroid check-up (demo guest booking)",
      slotStartIso: dhakaToUtc(date1, 1110).toISOString(), // 6:30 PM
      slotEndIso: dhakaToUtc(date1, 1140).toISOString(),
      type: "IN_PERSON",
      status: "PENDING_APPROVAL",
      bookingMode: "APPROVAL",
      fee: ayesha.consultationFee,
      patientType: "NEW",
      feeSettingsVersion: 1,
    },
    {
      referenceCode: "MB-DEMO03",
      doctorSlug: ayesha.slug,
      patientEmail: "patient2@medbriq.dev",
      patientName: "Salma Khatun",
      patientPhone: "+880 1811-000002",
      patientAge: 29,
      patientGender: "FEMALE",
      notes: null,
      slotStartIso: dhakaToUtc(date2, 1020).toISOString(), // 5:00 PM
      slotEndIso: dhakaToUtc(date2, 1050).toISOString(),
      type: "IN_PERSON",
      status: "CONFIRMED",
      bookingMode: "APPROVAL",
      // Salma's completed visit is with Dr. Farhana — classification is
      // per-doctor, so with Dr. Ayesha she is NEW (docs/FEE_SYSTEM.md §1).
      fee: ayesha.consultationFee,
      patientType: "NEW",
      feeSettingsVersion: 1,
    },
    {
      referenceCode: "MB-DEMO04",
      doctorSlug: farhana.slug,
      patientEmail: "patient@medbriq.dev",
      patientName: "Rahim Uddin",
      patientPhone: "+880 1811-000001",
      patientAge: 34,
      patientGender: "MALE",
      notes: "Skin rash on forearm (demo instant booking)",
      slotStartIso: dhakaToUtc(date3, 990).toISOString(), // 4:30 PM
      slotEndIso: dhakaToUtc(date3, 1020).toISOString(),
      // Telehealth module is disabled (docs/ARCHITECTURE_CORRECTIONS.md #2/#3)
      // — demo bookings are physical (in-person) visits.
      type: "IN_PERSON",
      status: "CONFIRMED",
      bookingMode: "INSTANT",
      fee: farhana.consultationFee,
      patientType: "NEW",
      feeSettingsVersion: 1,
    },
  ];
}

// ── Doctor-wise fee settings (docs/FEE_SYSTEM.md) ─────────────────────

export type FeeSettingsSpec = {
  doctorSlug: string;
  newPatientFee: number;
  returningPatientFee: number;
  returningValidityValue: number;
  returningValidityUnit: "DAYS" | "MONTHS";
  followUpEnabled: boolean;
  followUpFee: number;
  followUpValidityValue: number;
  followUpValidityUnit: "DAYS" | "MONTHS";
};

/**
 * Per-doctor fee configurations for the demo — deliberately varied so the
 * UI shows different validity units, presets and follow-up setups:
 *  - dr-ayesha-rahman: spec defaults (1000/600, 6 months) + 15-day follow-up
 *  - dr-mahmudul-hasan: 12-month returning validity, no follow-up
 *  - dr-farhana-akter: 1-month returning + 10-day follow-up @ 300
 *  - dr-tanvir-ahmed: custom DAYS validity (30 days)
 *  - others: their legacy consultation fee as the new-patient fee
 */
export const SEED_FEE_SETTINGS: FeeSettingsSpec[] = [
  { doctorSlug: "dr-ayesha-rahman", newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: true, followUpFee: 400, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-mahmudul-hasan", newPatientFee: 1500, returningPatientFee: 800, returningValidityValue: 12, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-farhana-akter", newPatientFee: 800, returningPatientFee: 500, returningValidityValue: 1, returningValidityUnit: "MONTHS", followUpEnabled: true, followUpFee: 300, followUpValidityValue: 10, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-tanvir-ahmed", newPatientFee: 900, returningPatientFee: 500, returningValidityValue: 30, returningValidityUnit: "DAYS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-nusrat-jahan", newPatientFee: 1200, returningPatientFee: 700, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-rafiul-islam", newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 3, returningValidityUnit: "MONTHS", followUpEnabled: true, followUpFee: 500, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-sadia-karim", newPatientFee: 900, returningPatientFee: 500, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-imran-chowdhury", newPatientFee: 1600, returningPatientFee: 900, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-mehjabin-islam", newPatientFee: 1300, returningPatientFee: 800, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-arif-hossain", newPatientFee: 700, returningPatientFee: 400, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-kamrul-hasan", newPatientFee: 800, returningPatientFee: 500, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
  { doctorSlug: "dr-shireen-huq", newPatientFee: 2000, returningPatientFee: 1200, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" },
];

// ── Completed-visit history (doctor_patient_history fixtures) ──────────

export type CompletedVisitSpec = {
  referenceCode: string;
  doctorSlug: string;
  patientEmail: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  /** How many days ago the visit happened (Dhaka calendar days). */
  daysAgo: number;
  /** Visit start, minutes from Dhaka midnight. */
  minuteOfDay: number;
  patientType: "NEW" | "RETURNING" | "FOLLOW_UP";
  fee: number;
  feeSettingsVersion: number;
  qualifying: boolean;
};

/**
 * Past COMPLETED visits + their doctor_patient_history rows, so the demo
 * immediately exercises all classifications (docs/FEE_SYSTEM.md §2):
 *
 *  - Rahim → Dr. Ayesha, 60 days ago: inside the 6-month returning window,
    outside the 15-day follow-up → next booking RETURNING @ 600.
 *  - Abdul Karim → Dr. Ayesha, 240 days ago: 6-month validity expired → NEW.
 *  - Salma → Dr. Farhana, 5 days ago: inside the 10-day follow-up window
 *    → next booking FOLLOW_UP @ 300 (and RETURNING @ 500 until 1 month).
 */
export function buildCompletedVisits(): CompletedVisitSpec[] {
  return [
    {
      referenceCode: "MB-PAST01",
      doctorSlug: "dr-ayesha-rahman",
      patientEmail: "patient@medbriq.dev",
      patientName: "Rahim Uddin",
      patientPhone: "+880 1811-000001",
      patientAge: 34,
      patientGender: "MALE",
      daysAgo: 60,
      minuteOfDay: 1050,
      patientType: "RETURNING",
      fee: 600,
      feeSettingsVersion: 1,
      qualifying: true,
    },
    {
      referenceCode: "MB-PAST02",
      doctorSlug: "dr-ayesha-rahman",
      patientEmail: "patient3@medbriq.dev",
      patientName: "Abdul Karim",
      patientPhone: "+880 1811-000003",
      patientAge: 51,
      patientGender: "MALE",
      daysAgo: 240,
      minuteOfDay: 1080,
      patientType: "NEW",
      fee: 1000,
      feeSettingsVersion: 1,
      qualifying: true,
    },
    {
      referenceCode: "MB-PAST03",
      doctorSlug: "dr-farhana-akter",
      patientEmail: "patient2@medbriq.dev",
      patientName: "Salma Khatun",
      patientPhone: "+880 1811-000002",
      patientAge: 29,
      patientGender: "FEMALE",
      daysAgo: 5,
      minuteOfDay: 1000,
      patientType: "NEW",
      fee: 800,
      feeSettingsVersion: 1,
      qualifying: true,
    },
  ];
}

// ── Demo reviews ───────────────────────────────────────────────────────

export type DemoReviewSpec = {
  doctorSlug: string;
  patientEmail: string;
  rating: number;
  comment: string;
};

export const SEED_REVIEWS: DemoReviewSpec[] = [
  { doctorSlug: "dr-ayesha-rahman", patientEmail: "patient2@medbriq.dev", rating: 5, comment: "Very patient listener, explained my reports clearly. (demo review)" },
  { doctorSlug: "dr-ayesha-rahman", patientEmail: "patient3@medbriq.dev", rating: 4, comment: "Good consultation, chamber was a bit busy. (demo review)" },
  { doctorSlug: "dr-mahmudul-hasan", patientEmail: "patient2@medbriq.dev", rating: 5, comment: "Thorough cardiac evaluation. Highly recommended. (demo review)" },
  { doctorSlug: "dr-farhana-akter", patientEmail: "patient@medbriq.dev", rating: 5, comment: "Effective treatment for my acne. (demo review)" },
  { doctorSlug: "dr-farhana-akter", patientEmail: "patient3@medbriq.dev", rating: 4, comment: "Helpful video consultation. (demo review)" },
  { doctorSlug: "dr-tanvir-ahmed", patientEmail: "patient@medbriq.dev", rating: 5, comment: "Great with kids, gentle and reassuring. (demo review)" },
];
