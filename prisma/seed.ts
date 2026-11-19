/**
 * Medbriq seed script — demo data for the MVP.
 *
 * IMPORTANT: all doctors, hospitals, reviews and appointments seeded here are
 * FICTIONAL demo data. They exist so the platform workflows (search, booking,
 * verification, dashboards) can be exercised end-to-end. The UI labels this
 * environment as "Demo MVP". No real doctors, patients, licenses or medical
 * claims are represented.
 *
 * Run: bun prisma/seed.ts   (after `bun run db:push`)
 */

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Dhaka is UTC+6 (no DST).
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
function nextDhakaDate(days: number[], minDays = 1): string {
  const { dateStr } = dhakaToday();
  let candidate = addDays(dateStr, minDays);
  for (let i = 0; i < 14; i++) {
    const dow = new Date(candidate + "T00:00:00Z").getUTCDay();
    if (days.includes(dow)) return candidate;
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

function dhakaToUtc(dateStr: string, minuteOfDay: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minuteOfDay - 360, 0, 0));
}

const SPECIALTIES = [
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

const HOSPITALS = [
  { name: "Greenview General Hospital", slug: "greenview-general-hospital", city: "Dhaka", address: "House 12, Road 5, Dhanmondi, Dhaka 1205", phone: "+880 2-9612xxx (demo)", about: "Multi-disciplinary private hospital (fictional demo data) with 24/7 emergency, diagnostics and inpatient care." },
  { name: "Lakeview Medical Center", slug: "lakeview-medical-center", city: "Dhaka", address: "Level 4, Block C, Gulshan Avenue, Dhaka 1212", phone: "+880 2-8835xxx (demo)", about: "Modern outpatient specialist center (fictional demo data) focusing on consultations and day-care procedures." },
  { name: "Padma City Hospital", slug: "padma-city-hospital", city: "Chattogram", address: "Sheikh Mujib Road, Kotwali, Chattogram 4000", phone: "+880 31-611xxx (demo)", about: "General and specialty hospital in Chattogram (fictional demo data)." },
  { name: "Uttara Central Clinic", slug: "uttara-central-clinic", city: "Dhaka", address: "Sector 7, Uttara, Dhaka 1230", phone: "+880 2-4891xxx (demo)", about: "Neighborhood family clinic (fictional demo data) with evening chambers." },
];

type DoctorSeed = {
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

const DOCTORS: DoctorSeed[] = [
  {
    name: "Dr. Ayesha Rahman", email: "doctor@medbriq.dev", phone: "+880 1711-000001 (demo)",
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
    name: "Dr. Mahmudul Hasan", email: "dr.mahmudul@medbriq.dev", phone: "+880 1711-000002 (demo)",
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
    name: "Dr. Farhana Akter", email: "dr.farhana@medbriq.dev", phone: "+880 1711-000003 (demo)",
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
    name: "Dr. Tanvir Ahmed", email: "dr.tanvir@medbriq.dev", phone: "+880 1711-000004 (demo)",
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
    name: "Dr. Nusrat Jahan", email: "dr.nusrat@medbriq.dev", phone: "+880 1711-000005 (demo)",
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
    name: "Dr. Rafiul Islam", email: "dr.rafiul@medbriq.dev", phone: "+880 1711-000006 (demo)",
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
    name: "Dr. Sadia Karim", email: "dr.sadia@medbriq.dev", phone: "+880 1711-000007 (demo)",
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
    name: "Dr. Imran Chowdhury", email: "dr.imran@medbriq.dev", phone: "+880 1711-000008 (demo)",
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
    name: "Dr. Mehjabin Islam", email: "dr.mehjabin@medbriq.dev", phone: "+880 1711-000009 (demo)",
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
    name: "Dr. Arif Hossain", email: "dr.arif@medbriq.dev", phone: "+880 1711-000010 (demo)",
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
    name: "Dr. Kamrul Hasan", email: "dr.kamrul@medbriq.dev", phone: "+880 1711-000011 (demo)",
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
    name: "Dr. Shireen Huq", email: "dr.shireen@medbriq.dev", phone: "+880 1711-000012 (demo)",
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

async function main() {
  console.log("🌱 Seeding Medbriq demo data ...");

  // Wipe existing data (demo database only).
  await db.auditLog.deleteMany();
  await db.review.deleteMany();
  await db.appointment.deleteMany();
  await db.availabilityRule.deleteMany();
  await db.doctorSpecialty.deleteMany();
  await db.doctorProfile.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.specialty.deleteMany();
  await db.hospital.deleteMany();
  await db.country.deleteMany();

  // Country -------------------------------------------------------------
  await db.country.create({
    data: { code: "BD", name: "Bangladesh", currency: "BDT", phoneCode: "+880" },
  });

  // Specialties ----------------------------------------------------------
  const specialtyMap = new Map<string, string>();
  for (const s of SPECIALTIES) {
    const created = await db.specialty.create({ data: s });
    specialtyMap.set(s.slug, created.id);
  }

  // Hospitals -------------------------------------------------------------
  const hospitalMap = new Map<string, string>();
  for (const h of HOSPITALS) {
    const created = await db.hospital.create({ data: h });
    hospitalMap.set(h.slug, created.id);
  }

  // Admin ------------------------------------------------------------------
  const admin = await db.user.create({
    data: {
      email: "admin@medbriq.dev",
      passwordHash: hashPassword("Admin@Medbriq123"),
      name: "Platform Admin",
      phone: "+880 1700-000000 (demo)",
      role: "ADMIN",
    },
  });

  // Demo patient ------------------------------------------------------------
  const patient = await db.user.create({
    data: {
      email: "patient@medbriq.dev",
      passwordHash: hashPassword("Patient@123"),
      name: "Rahim Uddin",
      phone: "+880 1811-000001 (demo)",
      role: "PATIENT",
    },
  });
  const reviewer2 = await db.user.create({
    data: {
      email: "patient2@medbriq.dev",
      passwordHash: hashPassword("Patient@123"),
      name: "Salma Khatun",
      phone: "+880 1811-000002 (demo)",
      role: "PATIENT",
    },
  });
  const reviewer3 = await db.user.create({
    data: {
      email: "patient3@medbriq.dev",
      passwordHash: hashPassword("Patient@123"),
      name: "Abdul Karim",
      phone: "+880 1811-000003 (demo)",
      role: "PATIENT",
    },
  });

  // Doctors ------------------------------------------------------------------
  const doctorMap = new Map<string, { id: string; hours: [number, number, number][]; requiresApproval: boolean; fee: number }>();
  for (const d of DOCTORS) {
    const user = await db.user.create({
      data: {
        email: d.email,
        passwordHash: hashPassword(d.password),
        name: d.name,
        phone: d.phone,
        role: "DOCTOR",
      },
    });
    const profile = await db.doctorProfile.create({
      data: {
        userId: user.id,
        slug: d.slug,
        bio: d.bio,
        experienceYears: d.experienceYears,
        consultationFee: d.consultationFee,
        followUpFee: d.followUpFee,
        videoConsultFee: d.videoConsultFee ?? null,
        regNumber: d.regNumber,
        verificationStatus: d.verificationStatus,
        verificationNote: d.verificationStatus === "MORE_INFO" ? "Please re-upload a clearer copy of the BMDC certificate." : null,
        verifiedAt: d.verificationStatus === "VERIFIED" ? new Date() : null,
        city: d.city,
        chamberAddress: d.chamberAddress,
        languages: d.languages,
        supportsVideo: d.supportsVideo,
        requiresApproval: d.requiresApproval,
        hospitalId: hospitalMap.get(d.hospitalSlug) ?? null,
      },
    });
    await db.doctorSpecialty.create({
      data: { doctorId: profile.id, specialtyId: specialtyMap.get(d.specialtySlug)! },
    });
    for (const [day, start, end] of d.hours) {
      await db.availabilityRule.create({
        data: { doctorId: profile.id, dayOfWeek: day, startMinute: start, endMinute: end, isActive: true },
      });
    }
    if (d.verificationStatus === "VERIFIED") {
      await db.auditLog.create({
        data: {
          actorId: admin.id,
          action: "DOCTOR_VERIFIED",
          entity: "DoctorProfile",
          entityId: profile.id,
          meta: JSON.stringify({ seed: true, regNumber: d.regNumber }),
        },
      });
    }
    doctorMap.set(d.slug, { id: profile.id, hours: d.hours, requiresApproval: d.requiresApproval, fee: d.consultationFee });
  }

  // Demo appointments (future slots) ----------------------------------------
  const ayesha = doctorMap.get("dr-ayesha-rahman")!;
  const ayeshaDays = ayesha.hours.map((h) => h[0]);
  const date1 = nextDhakaDate(ayeshaDays, 1);
  const date2 = nextDhakaDate(ayeshaDays, 3);

  await db.appointment.create({
    data: {
      referenceCode: "MB-DEMO01",
      doctorId: ayesha.id,
      patientId: patient.id,
      patientName: "Rahim Uddin",
      patientPhone: "+880 1811-000001",
      patientAge: 34,
      patientGender: "MALE",
      notes: "Regular diabetes follow-up. Fasting sugar reports attached mentally :) (demo)",
      slotStart: dhakaToUtc(date1, 1050), // 5:30 PM
      slotEnd: dhakaToUtc(date1, 1080),
      type: "IN_PERSON",
      status: "PENDING_APPROVAL",
      bookingMode: "APPROVAL",
      fee: ayesha.fee,
    },
  });
  await db.appointment.create({
    data: {
      referenceCode: "MB-DEMO02",
      doctorId: ayesha.id,
      patientId: null,
      patientName: "Nasreen Sultana",
      patientPhone: "+880 1911-000002",
      patientAge: 45,
      patientGender: "FEMALE",
      notes: "Thyroid check-up (demo guest booking)",
      slotStart: dhakaToUtc(date1, 1110), // 6:30 PM
      slotEnd: dhakaToUtc(date1, 1140),
      type: "IN_PERSON",
      status: "PENDING_APPROVAL",
      bookingMode: "APPROVAL",
      fee: ayesha.fee,
    },
  });
  await db.appointment.create({
    data: {
      referenceCode: "MB-DEMO03",
      doctorId: ayesha.id,
      patientId: reviewer2.id,
      patientName: "Salma Khatun",
      patientPhone: "+880 1811-000002",
      patientAge: 29,
      patientGender: "FEMALE",
      notes: null,
      slotStart: dhakaToUtc(date2, 1020), // 5:00 PM
      slotEnd: dhakaToUtc(date2, 1050),
      type: "IN_PERSON",
      status: "CONFIRMED",
      bookingMode: "APPROVAL",
      fee: ayesha.fee,
    },
  });

  const farhana = doctorMap.get("dr-farhana-akter")!;
  const farhanaDays = doctorMap.get("dr-farhana-akter")!.hours.map((h) => h[0]);
  const date3 = nextDhakaDate(farhanaDays, 2);
  await db.appointment.create({
    data: {
      referenceCode: "MB-DEMO04",
      doctorId: farhana.id,
      patientId: patient.id,
      patientName: "Rahim Uddin",
      patientPhone: "+880 1811-000001",
      patientAge: 34,
      patientGender: "MALE",
      notes: "Skin rash on forearm (demo instant booking)",
      slotStart: dhakaToUtc(date3, 990), // 4:30 PM
      slotEnd: dhakaToUtc(date3, 1020),
      type: "VIDEO",
      status: "CONFIRMED",
      bookingMode: "INSTANT",
      fee: 700,
    },
  });

  // Demo reviews --------------------------------------------------------------
  const reviewSeeds: { doctorSlug: string; patientId: string; rating: number; comment: string }[] = [
    { doctorSlug: "dr-ayesha-rahman", patientId: reviewer2.id, rating: 5, comment: "Very patient listener, explained my reports clearly. (demo review)" },
    { doctorSlug: "dr-ayesha-rahman", patientId: reviewer3.id, rating: 4, comment: "Good consultation, chamber was a bit busy. (demo review)" },
    { doctorSlug: "dr-mahmudul-hasan", patientId: reviewer2.id, rating: 5, comment: "Thorough cardiac evaluation. Highly recommended. (demo review)" },
    { doctorSlug: "dr-farhana-akter", patientId: patient.id, rating: 5, comment: "Effective treatment for my acne. (demo review)" },
    { doctorSlug: "dr-farhana-akter", patientId: reviewer3.id, rating: 4, comment: "Helpful video consultation. (demo review)" },
    { doctorSlug: "dr-tanvir-ahmed", patientId: patient.id, rating: 5, comment: "Great with kids, gentle and reassuring. (demo review)" },
  ];
  for (const r of reviewSeeds) {
    const doctor = doctorMap.get(r.doctorSlug)!;
    await db.review.create({
      data: { doctorId: doctor.id, patientId: r.patientId, rating: r.rating, comment: r.comment },
    });
  }

  const counts = {
    users: await db.user.count(),
    specialties: await db.specialty.count(),
    hospitals: await db.hospital.count(),
    doctors: await db.doctorProfile.count(),
    appointments: await db.appointment.count(),
    reviews: await db.review.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log("   Demo logins (DEV ONLY — see README):");
  console.log("   admin@medbriq.dev / Admin@Medbriq123");
  console.log("   doctor@medbriq.dev / Doctor@123   (Dr. Ayesha Rahman, VERIFIED)");
  console.log("   patient@medbriq.dev / Patient@123 (Rahim Uddin)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
