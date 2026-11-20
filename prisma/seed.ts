/**
 * Medbriq seed script — demo data for the MVP (local SQLite via Prisma).
 *
 * IMPORTANT: all doctors, hospitals, reviews and appointments seeded here are
 * FICTIONAL demo data. They exist so the platform workflows (search, booking,
 * verification, dashboards) can be exercised end-to-end. The UI labels this
 * environment as "Demo MVP". No real doctors, patients, licenses or medical
 * claims are represented.
 *
 * The data definitions live in src/lib/data/seed-data.ts and are shared with
 * scripts/firestore-seed.ts (production Firestore seeder), so both stores
 * always contain the same demo content. Password hashing comes from the
 * shared src/lib/password.ts helper so demo logins work everywhere.
 *
 * Run: bun prisma/seed.ts   (after `bun run db:push`)
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { normalizePhone } from "../src/lib/phone";
import {
  SEED_ADMIN,
  SEED_DOCTORS,
  SEED_FEE_SETTINGS,
  SEED_HOSPITALS,
  SEED_PATIENTS,
  SEED_REVIEWS,
  SEED_SPECIALTIES,
  buildCompletedVisits,
  buildDemoAppointments,
  dhakaToUtc,
} from "../src/lib/data/seed-data";

const db = new PrismaClient();

/** Dhaka calendar date `daysAgo` days before today, as YYYY-MM-DD. */
function dhakaDateDaysAgo(daysAgo: number): string {
  const now = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo)
  );
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("🌱 Seeding Medbriq demo data ...");

  // Wipe existing data (demo database only).
  await db.payment.deleteMany();
  await db.supportTicket.deleteMany();
  await db.featureFlag.deleteMany();
  await db.platformSetting.deleteMany();
  await db.familyMember.deleteMany();
  await db.chamber.deleteMany();
  await db.hospitalBranch.deleteMany();
  await db.hospitalDepartment.deleteMany();
  await db.doctorPatientVisit.deleteMany();
  await db.doctorFeeHistory.deleteMany();
  await db.doctorFeeSettings.deleteMany();
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
  for (const s of SEED_SPECIALTIES) {
    const created = await db.specialty.create({ data: s });
    specialtyMap.set(s.slug, created.id);
  }

  // Hospitals -------------------------------------------------------------
  const hospitalMap = new Map<string, string>();
  for (const h of SEED_HOSPITALS) {
    const created = await db.hospital.create({ data: h });
    hospitalMap.set(h.slug, created.id);
  }

  // Admin ------------------------------------------------------------------
  const admin = await db.user.create({
    data: {
      email: SEED_ADMIN.email,
      passwordHash: hashPassword(SEED_ADMIN.password),
      name: SEED_ADMIN.name,
      phone: SEED_ADMIN.phone,
      role: SEED_ADMIN.role,
    },
  });

  // Demo patients ------------------------------------------------------------
  const patientIdByEmail = new Map<string, string>();
  for (const p of SEED_PATIENTS) {
    const created = await db.user.create({
      data: {
        email: p.email,
        passwordHash: hashPassword(p.password),
        name: p.name,
        phone: p.phone,
        role: p.role,
      },
    });
    patientIdByEmail.set(p.email, created.id);
  }

  // Demo Google account — sandbox fallback when real Google OAuth is not
  // configured (GOOGLE_CLIENT_ID missing). The auth screen's "Continue with
  // Google" button signs in here when the real provider is unavailable,
  // clearly labelled as the demo path.
  await db.user.create({
    data: {
      email: "google.demo@medbriq.dev",
      passwordHash: hashPassword("Google@Demo123"),
      name: "Rifat Hasan",
      phone: "+880 1711-000010",
      role: "PATIENT",
      provider: "google",
    },
  });

  // Doctors ------------------------------------------------------------------
  const doctorMap = new Map<
    string,
    { id: string; requiresApproval: boolean }
  >();
  for (const d of SEED_DOCTORS) {
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
        verificationNote:
          d.verificationStatus === "MORE_INFO"
            ? "Please re-upload a clearer copy of the BMDC certificate."
            : null,
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
      data: {
        doctorId: profile.id,
        specialtyId: specialtyMap.get(d.specialtySlug)!,
      },
    });
    for (const [day, start, end] of d.hours) {
      await db.availabilityRule.create({
        data: {
          doctorId: profile.id,
          dayOfWeek: day,
          startMinute: start,
          endMinute: end,
          isActive: true,
        },
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
    doctorMap.set(d.slug, { id: profile.id, requiresApproval: d.requiresApproval });
  }

  // Doctor-wise fee settings (docs/FEE_SYSTEM.md) ────────────────────────
  // One DoctorFeeSettings row + immutable v1 history row per doctor.
  for (const spec of SEED_FEE_SETTINGS) {
    const doctor = doctorMap.get(spec.doctorSlug)!;
    const created = await db.doctorFeeSettings.create({
      data: {
        doctorId: doctor.id,
        newPatientFee: spec.newPatientFee,
        returningPatientFee: spec.returningPatientFee,
        returningValidityValue: spec.returningValidityValue,
        returningValidityUnit: spec.returningValidityUnit,
        followUpEnabled: spec.followUpEnabled,
        followUpFee: spec.followUpFee,
        followUpValidityValue: spec.followUpValidityValue,
        followUpValidityUnit: spec.followUpValidityUnit,
        version: 1,
      },
    });
    await db.doctorFeeHistory.create({
      data: {
        doctorId: doctor.id,
        version: 1,
        newPatientFee: created.newPatientFee,
        returningPatientFee: created.returningPatientFee,
        returningValidityValue: created.returningValidityValue,
        returningValidityUnit: created.returningValidityUnit,
        followUpEnabled: created.followUpEnabled,
        followUpFee: created.followUpFee,
        followUpValidityValue: created.followUpValidityValue,
        followUpValidityUnit: created.followUpValidityUnit,
        changeReason: "Initial demo configuration (seed)",
        changedBy: admin.id,
      },
    });
  }

  // Demo appointments (future slots, shared spec) ──────────────────────
  for (const spec of buildDemoAppointments()) {
    const doctor = doctorMap.get(spec.doctorSlug)!;
    await db.appointment.create({
      data: {
        referenceCode: spec.referenceCode,
        doctorId: doctor.id,
        patientId: spec.patientEmail
          ? (patientIdByEmail.get(spec.patientEmail) ?? null)
          : null,
        patientName: spec.patientName,
        patientPhone: spec.patientPhone,
        patientAge: spec.patientAge,
        patientGender: spec.patientGender,
        notes: spec.notes,
        slotStart: new Date(spec.slotStartIso),
        slotEnd: new Date(spec.slotEndIso),
        type: spec.type,
        status: spec.status,
        bookingMode: spec.bookingMode,
        fee: spec.fee,
        patientType: spec.patientType ?? null,
        feeSettingsVersion: spec.feeSettingsVersion ?? null,
        pricingBasis: spec.patientType
          ? JSON.stringify({
              rule:
                spec.patientType === "RETURNING"
                  ? "WITHIN_RETURNING_VALIDITY"
                  : "NO_PRIOR_COMPLETED_VISIT",
              doctorId: doctor.id,
              patientPhone: normalizePhone(spec.patientPhone),
              seed: true,
            })
          : null,
        pricedAt: new Date(Date.now() - 60_000),
      },
    });
  }

  // Past completed visits + doctor_patient_history rows ─────────────────
  // (demonstrates NEW / RETURNING / FOLLOW_UP classification immediately)
  for (const spec of buildCompletedVisits()) {
    const doctor = doctorMap.get(spec.doctorSlug)!;
    const patientId = spec.patientEmail
      ? (patientIdByEmail.get(spec.patientEmail) ?? null)
      : null;
    const dateStr = dhakaDateDaysAgo(spec.daysAgo);
    const slotStart = dhakaToUtc(dateStr, spec.minuteOfDay);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
    const appointment = await db.appointment.create({
      data: {
        referenceCode: spec.referenceCode,
        doctorId: doctor.id,
        patientId,
        patientName: spec.patientName,
        patientPhone: spec.patientPhone,
        patientAge: spec.patientAge,
        patientGender: spec.patientGender,
        notes: null,
        slotStart,
        slotEnd,
        type: "IN_PERSON",
        status: "COMPLETED",
        bookingMode: "APPROVAL",
        fee: spec.fee,
        paymentStatus: "NOT_REQUIRED",
        consultationStatus: "COMPLETED",
        patientType: spec.patientType,
        feeSettingsVersion: spec.feeSettingsVersion,
        pricingBasis: JSON.stringify({
          rule: "NO_PRIOR_COMPLETED_VISIT",
          doctorId: doctor.id,
          patientId,
          patientPhone: normalizePhone(spec.patientPhone),
          seed: true,
        }),
        pricedAt: slotStart,
        consultationNote: null,
      },
    });
    await db.doctorPatientVisit.create({
      data: {
        doctorId: doctor.id,
        appointmentId: appointment.id,
        patientId,
        patientPhone: normalizePhone(spec.patientPhone),
        slotStart,
        completedAt: slotEnd,
        qualifying: spec.qualifying,
        paymentStatusAtCompletion: "NOT_REQUIRED",
      },
    });
  }

  // Demo reviews (shared spec) -------------------------------------------------
  for (const r of SEED_REVIEWS) {
    const doctor = doctorMap.get(r.doctorSlug)!;
    await db.review.create({
      data: {
        doctorId: doctor.id,
        patientId: patientIdByEmail.get(r.patientEmail)!,
        rating: r.rating,
        comment: r.comment,
      },
    });
  }

  // ── Hospital dashboard demo data (master prompt §6) ──────────────────
  // A HOSPITAL-role user manages Greenview General Hospital (VERIFIED).
  const hospitalManager = await db.user.create({
    data: {
      email: "hospital@medbriq.dev",
      passwordHash: hashPassword("Hospital@123"),
      name: "Greenview Admin",
      phone: "+880 1711-000009",
      role: "HOSPITAL",
    },
  });
  const greenview = hospitalMap.get("greenview-general-hospital")!;
  await db.hospital.update({
    where: { id: greenview },
    data: {
      userId: hospitalManager.id,
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      website: "https://greenview.example",
    },
  });
  // Other hospitals stay PENDING for the admin verification queue.
  await db.hospital.update({
    where: { id: hospitalMap.get("lakeview-medical-center")! },
    data: { verificationStatus: "PENDING" },
  });
  await db.hospital.update({
    where: { id: hospitalMap.get("padma-city-hospital")! },
    data: { verificationStatus: "PENDING" },
  });
  await db.hospital.update({
    where: { id: hospitalMap.get("uttara-central-clinic")! },
    data: { verificationStatus: "PENDING" },
  });

  // Branches + departments for Greenview
  await db.hospitalBranch.createMany({
    data: [
      {
        hospitalId: greenview,
        name: "Dhanmondi Main Branch",
        address: "House 12, Road 5, Dhanmondi, Dhaka 1205",
        city: "Dhaka",
        phone: "+880 2-9612xxx",
        isMain: true,
      },
      {
        hospitalId: greenview,
        name: "Mirpur Branch",
        address: "Plot 27, Avenue 4, Mirpur DOHS, Dhaka 1216",
        city: "Dhaka",
        phone: "+880 2-9002xxx",
        isMain: false,
      },
    ],
  });
  await db.hospitalDepartment.createMany({
    data: [
      { hospitalId: greenview, name: "Medicine & Diabetology", about: "General medicine, diabetes and endocrine care." },
      { hospitalId: greenview, name: "Cardiology", about: "Heart and vascular consultations, ECG and echo." },
      { hospitalId: greenview, name: "Dermatology", about: "Skin, hair and nail care." },
      { hospitalId: greenview, name: "Pediatrics", about: "Child health and immunization." },
      { hospitalId: greenview, name: "Diagnostics", about: "Lab and imaging (demo department)." },
    ],
  });

  // ── Doctor chambers (master prompt §3.17, §5) ────────────────────────
  // Two chambers for Dr. Ayesha (multi-location doctor), one for the rest.
  const chamberSpecs: {
    doctorSlug: string;
    name: string;
    address: string;
    city: string;
    area: string;
    phone: string;
  }[] = [
    {
      doctorSlug: "dr-ayesha-rahman",
      name: "Greenview Chamber (Dhanmondi)",
      address: "Chamber 302, Greenview General Hospital, House 12, Road 5, Dhanmondi",
      city: "Dhaka",
      area: "Dhanmondi",
      phone: "+880 2-9612xxx",
    },
    {
      doctorSlug: "dr-ayesha-rahman",
      name: "Mirpur Evening Chamber",
      address: "Suite 4, Mirpur Community Center, Avenue 2, Mirpur 10",
      city: "Dhaka",
      area: "Mirpur",
      phone: "+880 2-9012xxx",
    },
    {
      doctorSlug: "dr-mahmudul-hasan",
      name: "Cardiac OPD (Greenview)",
      address: "Chamber 105, Greenview General Hospital, Dhanmondi",
      city: "Dhaka",
      area: "Dhanmondi",
      phone: "+880 2-9612xxx",
    },
    {
      doctorSlug: "dr-farhana-akter",
      name: "Skin Care Chamber (Lakeview)",
      address: "Room 210, Lakeview Medical Center, Gulshan Avenue",
      city: "Dhaka",
      area: "Gulshan",
      phone: "+880 2-8835xxx",
    },
    {
      doctorSlug: "dr-tanvir-ahmed",
      name: "Uttara Central Clinic",
      address: "Sector 7, Uttara, Dhaka 1230",
      city: "Dhaka",
      area: "Uttara",
      phone: "+880 2-4891xxx",
    },
    {
      doctorSlug: "dr-nusrat-jahan",
      name: "Padma City OPD",
      address: "OPD 2, Padma City Hospital, Sheikh Mujib Road, Kotwali",
      city: "Chattogram",
      area: "Kotwali",
      phone: "+880 31-611xxx",
    },
    {
      doctorSlug: "dr-rafiul-islam",
      name: "Ortho Chamber (Lakeview)",
      address: "Room 118, Lakeview Medical Center, Gulshan",
      city: "Dhaka",
      area: "Gulshan",
      phone: "+880 2-8835xxx",
    },
    {
      doctorSlug: "dr-sadia-karim",
      name: "ENT Chamber (Greenview)",
      address: "Chamber 8, Greenview General Hospital, Dhanmondi",
      city: "Dhaka",
      area: "Dhanmondi",
      phone: "+880 2-9612xxx",
    },
  ];
  for (const spec of chamberSpecs) {
    const doctor = doctorMap.get(spec.doctorSlug)!;
    const { doctorSlug: _omit, ...chamberData } = spec;
    await db.chamber.create({ data: { doctorId: doctor.id, ...chamberData } });
  }

  // Family member profiles for the demo patient (master prompt §3.36)
  const rahimId = patientIdByEmail.get("patient@medbriq.dev")!;
  await db.familyMember.createMany({
    data: [
      { userId: rahimId, name: "Rehana Uddin", relation: "SPOUSE", age: 34, gender: "FEMALE", phone: "+880 1712-345678" },
      { userId: rahimId, name: "Ayan Uddin", relation: "CHILD", age: 8, gender: "MALE" },
      { userId: rahimId, name: "Mozammel Haque", relation: "PARENT", age: 66, gender: "MALE", phone: "+880 1713-345678" },
    ],
  });

  // Feature flags (admin-controlled, master prompt §7). Telehealth stays
  // OFF pending regulatory review (docs/ARCHITECTURE_CORRECTIONS.md #2/#3).
  await db.featureFlag.createMany({
    data: [
      { key: "telehealth", enabled: false, description: "Video consultations — disabled until DGHS telemedicine compliance review passes." },
      { key: "onlinePayments", enabled: true, description: "Sandbox payment simulation (bKash/Nagad/Card) at booking." },
      { key: "patientRecords", enabled: true, description: "Patient visit history and family member profiles." },
      { key: "reviews", enabled: true, description: "Doctor reviews and ratings." },
    ],
  });

  // Platform settings
  await db.platformSetting.createMany({
    data: [
      { key: "commissionPercent", value: "10", updatedBy: admin.id },
      { key: "supportPhone", value: "+880 9612-000000" },
      { key: "supportEmail", value: "support@medbriq.dev" },
      { key: "defaultCurrency", value: "BDT" },
      { key: "defaultCountry", value: "BD" },
    ],
  });

  // Demo support tickets
  await db.supportTicket.createMany({
    data: [
      {
        userId: rahimId,
        email: "patient@medbriq.dev",
        subject: "Reschedule help needed",
        message: "I need to move my appointment with Dr. Ayesha to next week. Can the doctor approve a new time?",
        category: "BOOKING",
        status: "OPEN",
        priority: "NORMAL",
      },
      {
        userId: null,
        email: "dr.mahmudul@medbriq.dev",
        subject: "BMDC certificate upload failed",
        message: "The verification upload rejected my certificate PDF (too large). Please advise.",
        category: "ACCOUNT",
        status: "IN_PROGRESS",
        priority: "HIGH",
      },
      {
        userId: patientIdByEmail.get("patient2@medbriq.dev")!,
        email: "patient2@medbriq.dev",
        subject: "Refund not received",
        message: "My cancelled booking refund has not arrived after 5 working days.",
        category: "PAYMENT",
        status: "RESOLVED",
        priority: "HIGH",
        reply: "Refund processed via sandbox gateway — please confirm receipt.",
      },
    ],
  });

  // Sandbox payment records for two completed visits (ledger demo).
  const paidCompleted = await db.appointment.findMany({
    where: { status: "COMPLETED" },
    take: 2,
    orderBy: { slotStart: "desc" },
  });
  for (const appt of paidCompleted) {
    await db.payment.create({
      data: {
        appointmentId: appt.id,
        method: "BKASH",
        amount: appt.fee,
        currency: appt.currency,
        status: "SUCCEEDED",
        txnRef: `SBX-${appt.referenceCode.replace("MB-", "")}`,
        paidAt: appt.slotEnd,
      },
    });
    await db.appointment.update({
      where: { id: appt.id },
      data: { paymentStatus: "PAID" },
    });
  }

  const counts = {
    users: await db.user.count(),
    specialties: await db.specialty.count(),
    hospitals: await db.hospital.count(),
    doctors: await db.doctorProfile.count(),
    feeSettings: await db.doctorFeeSettings.count(),
    feeHistory: await db.doctorFeeHistory.count(),
    appointments: await db.appointment.count(),
    visits: await db.doctorPatientVisit.count(),
    reviews: await db.review.count(),
    chambers: await db.chamber.count(),
    familyMembers: await db.familyMember.count(),
    branches: await db.hospitalBranch.count(),
    departments: await db.hospitalDepartment.count(),
    payments: await db.payment.count(),
    tickets: await db.supportTicket.count(),
    featureFlags: await db.featureFlag.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log("   Demo logins (DEV ONLY — see README):");
  console.log("   admin@medbriq.dev / Admin@Medbriq123");
  console.log("   doctor@medbriq.dev / Doctor@123   (Dr. Ayesha Rahman, VERIFIED)");
  console.log("   hospital@medbriq.dev / Hospital@123 (Greenview General Hospital, VERIFIED)");
  console.log("   patient@medbriq.dev / Patient@123 (Rahim Uddin — RETURNING with Dr. Ayesha)");
  console.log("   patient2@medbriq.dev / Patient@123 (Salma Khatun — FOLLOW_UP with Dr. Farhana)");
  console.log("   patient3@medbriq.dev / Patient@123 (Abdul Karim — expired validity → NEW)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
