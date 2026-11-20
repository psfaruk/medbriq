/**
 * Medbriq Firestore seeder — writes the shared demo data into the PRODUCTION
 * Firestore database (project + database id from FIREBASE_SERVICE_ACCOUNT /
 * FIREBASE_DATABASE_ID).
 *
 * IMPORTANT: all doctors, hospitals, reviews and appointments seeded here are
 * FICTIONAL demo data (see src/lib/data/seed-data.ts). The UI labels this
 * environment as "Demo MVP".
 *
 * Idempotent: when the `doctors` collection already contains documents the
 * script prints the current counts and exits WITHOUT writing anything, unless
 * `--force` is passed (which wipes and re-seeds all demo collections).
 *
 * Run:
 *   FIREBASE_SERVICE_ACCOUNT="$(jq -c . /path/to/sa.json)" \
 *   bun scripts/firestore-seed.ts [--force]
 */

import { randomUUID } from "crypto";
import { getFirestoreFromEnv } from "../src/lib/data/firestore-store";
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

const FORCE = process.argv.includes("--force");

/** Collections holding (only) demo data — wiped by --force. */
const DEMO_COLLECTIONS = [
  "audit_logs",
  "reviews",
  "appointments",
  "availability_rules",
  "doctors",
  "sessions",
  "users",
  "hospitals",
  "specialties",
] as const;

async function collectionCounts() {
  const fs = getFirestoreFromEnv();
  const entries = await Promise.all(
    DEMO_COLLECTIONS.map(async (name) => {
      const snap = await fs.collection(name).limit(1000).get();
      return [name, snap.size] as const;
    })
  );
  return Object.fromEntries(entries) as Record<(typeof DEMO_COLLECTIONS)[number], number>;
}

async function wipe() {
  const fs = getFirestoreFromEnv();
  for (const name of DEMO_COLLECTIONS) {
    // Demo-scale: every collection fits in a handful of delete batches.
    const snap = await fs.collection(name).limit(1000).get();
    if (snap.empty) continue;
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = fs.batch();
      for (const doc of snap.docs.slice(i, i + 400)) batch.delete(doc.ref);
      await batch.commit();
    }
  }
}

async function main() {
  const fs = getFirestoreFromEnv(); // throws when the env var is missing/invalid
  const counts = await collectionCounts();
  console.log("Firestore demo-collection counts before seeding:", counts);

  if (counts.doctors > 0 && !FORCE) {
    console.log(
      `✅ Firestore already seeded (${counts.doctors} doctors) — nothing to do. ` +
        "Re-run with --force to wipe and re-seed the demo data."
    );
    return;
  }

  if (FORCE) {
    console.log("--force: wiping demo collections ...");
    await wipe();
  }

  const now = new Date().toISOString();
  const batch1 = fs.batch(); // reference data

  // Specialties ----------------------------------------------------------
  const specialtyIdBySlug = new Map<string, string>();
  for (const s of SEED_SPECIALTIES) {
    const id = randomUUID();
    specialtyIdBySlug.set(s.slug, id);
    batch1.set(fs.collection("specialties").doc(id), {
      name: s.name,
      nameBn: s.nameBn,
      slug: s.slug,
      icon: s.icon,
    });
  }

  // Hospitals -------------------------------------------------------------
  const hospitalIdBySlug = new Map<string, string>();
  for (const h of SEED_HOSPITALS) {
    const id = randomUUID();
    hospitalIdBySlug.set(h.slug, id);
    batch1.set(fs.collection("hospitals").doc(id), {
      name: h.name,
      slug: h.slug,
      city: h.city,
      address: h.address,
      phone: h.phone,
      about: h.about,
    });
  }
  await batch1.commit();

  // Users (admin + patients + doctor owners) --------------------------------
  const userIdByEmail = new Map<string, string>();
  const userBatch = fs.batch();
  const adminId = randomUUID();
  userIdByEmail.set(SEED_ADMIN.email, adminId);
  userBatch.set(fs.collection("users").doc(adminId), {
    email: SEED_ADMIN.email,
    passwordHash: hashPassword(SEED_ADMIN.password),
    name: SEED_ADMIN.name,
    phone: SEED_ADMIN.phone,
    role: SEED_ADMIN.role,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });
  for (const p of SEED_PATIENTS) {
    const id = randomUUID();
    userIdByEmail.set(p.email, id);
    userBatch.set(fs.collection("users").doc(id), {
      email: p.email,
      passwordHash: hashPassword(p.password),
      name: p.name,
      phone: p.phone,
      role: p.role,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  }
  for (const d of SEED_DOCTORS) {
    const id = randomUUID();
    userIdByEmail.set(d.email, id);
    userBatch.set(fs.collection("users").doc(id), {
      email: d.email,
      passwordHash: hashPassword(d.password),
      name: d.name,
      phone: d.phone,
      role: "DOCTOR",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
  }
  await userBatch.commit();

  // Doctor profiles + availability rules + verification audit logs ------------
  const doctorIdBySlug = new Map<string, string>();
  let ruleCount = 0;
  let auditCount = 0;
  for (const d of SEED_DOCTORS) {
    const doctorId = randomUUID();
    doctorIdBySlug.set(d.slug, doctorId);
    // Stagger createdAt so "newest first" admin ordering is stable.
    const createdAt = new Date(
      Date.now() + doctorIdBySlug.size * 1000
    ).toISOString();
    await fs
      .collection("doctors")
      .doc(doctorId)
      .set({
        userId: userIdByEmail.get(d.email)!,
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
        verifiedAt: d.verificationStatus === "VERIFIED" ? now : null,
        city: d.city,
        country: "Bangladesh",
        chamberAddress: d.chamberAddress,
        languages: d.languages,
        supportsVideo: d.supportsVideo,
        requiresApproval: d.requiresApproval,
        photoUrl: null,
        hospitalId: hospitalIdBySlug.get(d.hospitalSlug) ?? null,
        specialtyIds: [specialtyIdBySlug.get(d.specialtySlug)!],
        createdAt,
        updatedAt: createdAt,
      });

    // Availability rules — deterministic doc ids mirror
    // @@unique([doctorId, dayOfWeek, startMinute]).
    const ruleBatch = fs.batch();
    for (const [day, start, end] of d.hours) {
      ruleBatch.set(
        fs
          .collection("availability_rules")
          .doc(`${doctorId}_${day}_${start}`),
        {
          doctorId,
          dayOfWeek: day,
          startMinute: start,
          endMinute: end,
          isActive: true,
          createdAt: now,
        }
      );
      ruleCount++;
    }
    await ruleBatch.commit();

    if (d.verificationStatus === "VERIFIED") {
      await fs.collection("audit_logs").doc(randomUUID()).set({
        actorId: adminId,
        action: "DOCTOR_VERIFIED",
        entity: "DoctorProfile",
        entityId: doctorId,
        meta: JSON.stringify({ seed: true, regNumber: d.regNumber }),
        createdAt: now,
      });
      auditCount++;
    }
  }

  // Demo appointments — doc id IS the (doctorId, slotStart) uniqueness guard.
  for (const spec of buildDemoAppointments()) {
    const doctorId = doctorIdBySlug.get(spec.doctorSlug)!;
    await fs
      .collection("appointments")
      .doc(`${doctorId}_${spec.slotStartIso}`)
      .set({
        id: randomUUID(),
        referenceCode: spec.referenceCode,
        doctorId,
        patientId: spec.patientEmail
          ? (userIdByEmail.get(spec.patientEmail) ?? null)
          : null,
        patientName: spec.patientName,
        patientPhone: spec.patientPhone,
        patientAge: spec.patientAge,
        patientGender: spec.patientGender,
        notes: spec.notes,
        slotStart: spec.slotStartIso,
        slotEnd: spec.slotEndIso,
        type: spec.type,
        status: spec.status,
        bookingMode: spec.bookingMode,
        fee: spec.fee,
        currency: "BDT",
        doctorNote: null,
        createdAt: now,
        updatedAt: now,
      });
  }

  // Demo reviews — doc id mirrors @@unique([doctorId, patientId]).
  for (const r of SEED_REVIEWS) {
    const doctorId = doctorIdBySlug.get(r.doctorSlug)!;
    await fs
      .collection("reviews")
      .doc(`${doctorId}_${userIdByEmail.get(r.patientEmail)!}`)
      .set({
        doctorId,
        patientId: userIdByEmail.get(r.patientEmail)!,
        rating: r.rating,
        comment: r.comment,
        createdAt: now,
      });
  }

  const after = await collectionCounts();
  console.log("✅ Firestore seed complete:", after);
  console.log(
    `   wrote ${ruleCount} availability rules, ${auditCount} verification audit entries`
  );
  console.log("   Demo logins (same accounts as the local SQLite seed):");
  console.log("   admin@medbriq.dev / Admin@Medbriq123");
  console.log("   doctor@medbriq.dev / Doctor@123   (Dr. Ayesha Rahman, VERIFIED)");
  console.log("   patient@medbriq.dev / Patient@123 (Rahim Uddin)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Firestore seed failed:", err);
    process.exit(1);
  });
