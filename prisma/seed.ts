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
import {
  SEED_ADMIN,
  SEED_DOCTORS,
  SEED_HOSPITALS,
  SEED_PATIENTS,
  SEED_REVIEWS,
  SEED_SPECIALTIES,
  buildDemoAppointments,
} from "../src/lib/data/seed-data";

const db = new PrismaClient();

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

  // Demo appointments (future slots, shared spec) -----------------------------
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
