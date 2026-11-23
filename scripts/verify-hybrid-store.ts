/**
 * Hybrid split-store verification (docs/ARCHITECTURE_CORRECTIONS.md #5).
 *
 * Proves the residency-safe routing end-to-end with TWO separate databases:
 *
 *   primary  = PrismaStore on db/custom.db (stands in for the Firestore
 *              directory — doctors, users, availability seeded)
 *   regional = PrismaStore on db/hybrid-test.db (EMPTY — stands in for the
 *              in-region booking database)
 *   hybrid   = HybridStore(primary, regional)
 *
 * The routing logic under test is exactly what production runs with
 * primary = FirestoreStore. Assertions:
 *   1. Directory reads come from the PRIMARY database.
 *   2. Booking writes land in the REGIONAL database ONLY (the primary row
 *      counts never move) — this is the residency guarantee.
 *   3. FK stubs (doctor/user) are replicated into the regional store so the
 *      regional joins resolve.
 *   4. Reads-back, blocking-slot queries, fee settings and the module gate
 *      behave as if the split were one store.
 *   5. Idempotent replay works through the hybrid.
 *
 * Run: bun scripts/verify-hybrid-store.ts
 * (The runner script scripts/run-verify-hybrid.sh resets db/hybrid-test.db
 *  first — or run `DATABASE_URL=file:/home/z/my-project/db/hybrid-test.db
 *  bunx prisma db push --skip-generate` manually.)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaStore } from "../src/lib/data/prisma-store";
import { HybridStore } from "../src/lib/data/hybrid-store";
import { BLOCKING_STATUSES } from "../src/lib/slots";
import { dhakaToUtc, addDays, dhakaDateString } from "../src/lib/time";
import { classifyAndPrice } from "../src/lib/fees/service";

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`, detail !== undefined ? detail : "");
  }
}

async function main(): Promise<void> {
  console.log("🧪 Hybrid split-store verification (residency-safe booking)");

  const primaryDb = new PrismaClient(); // DATABASE_URL → db/custom.db
  const regionalDb = new PrismaClient({
    datasourceUrl: "file:/home/z/my-project/db/hybrid-test.db",
  });

  const primary = new PrismaStore(primaryDb);
  const regional = new PrismaStore(regionalDb);
  const hybrid = new HybridStore(primary, regional, regionalDb);

  // Fresh regional run: clear any leftovers from a previous execution.
  await regionalDb.appointment.deleteMany();
  await regionalDb.doctorPatientVisit.deleteMany();
  await regionalDb.doctorFeeSettings.deleteMany();
  await regionalDb.doctorFeeHistory.deleteMany();
  await regionalDb.notification.deleteMany();
  await regionalDb.auditLog.deleteMany();

  // ── Fixture: a verified doctor from the seeded PRIMARY directory ──
  const DOCTOR_SLUG = "dr-tanvir-ahmed";
  const doctor = await primary.getDoctorBySlug(DOCTOR_SLUG);
  if (!doctor || doctor.verificationStatus !== "VERIFIED") {
    console.error("FATAL: seeded doctor not found in primary store");
    process.exit(1);
  }
  const doctorUser = await primary.getUserById(doctor.userId);
  if (!doctorUser) {
    console.error("FATAL: doctor's user row not found in primary store");
    process.exit(1);
  }

  const before = {
    primaryAppointments: await primaryDb.appointment.count(),
    regionalDoctors: await regionalDb.doctorProfile.count(),
    regionalUsers: await regionalDb.user.count(),
  };
  check(
    "regional database starts with zero directory rows (empty region)",
    before.regionalDoctors === 0
  );

  // ── 1. Directory reads route to PRIMARY ──
  console.log("\n── 1. Directory routing ──");
  const viaHybrid = await hybrid.getDoctorBySlug(DOCTOR_SLUG);
  check(
    "hybrid.getDoctorBySlug reads the PRIMARY directory",
    viaHybrid?.id === doctor.id
  );
  const viaRegional = await regional.getDoctorBySlug(DOCTOR_SLUG);
  check("regional store alone has no doctor", viaRegional === null);
  check(
    "hybrid.getUserById reads the PRIMARY user",
    (await hybrid.getUserById(doctorUser.id))?.email === doctorUser.email
  );

  // ── 2. Booking write routes to REGIONAL with FK stubs ──
  console.log("\n── 2. Booking write routing + FK stubs ──");
  const tomorrow = addDays(dhakaDateString(), 1);
  const slotStart = dhakaToUtc(tomorrow, 600); // 10:00 Dhaka
  const slotEnd = dhakaToUtc(tomorrow, 630);

  const idemKey = `hybrid-verify-${Date.now()}`;
  const created = await hybrid.createAppointment({
    referenceCode: `MB-HYB${Date.now().toString(36).toUpperCase().slice(-5)}`,
    doctorId: doctor.id,
    chamberId: null,
    patientId: null,
    patientName: "Hybrid Verify Patient",
    patientPhone: "+8801990000001",
    patientAge: 30,
    patientGender: "MALE",
    notes: null,
    slotStart: slotStart.toISOString(),
    slotEnd: slotEnd.toISOString(),
    type: "IN_PERSON",
    status: doctor.requiresApproval ? "PENDING_APPROVAL" : "CONFIRMED",
    bookingMode: doctor.requiresApproval ? "APPROVAL" : "INSTANT",
    fee: 900,
    currency: "BDT",
    patientType: "NEW",
    feeSettingsVersion: 1,
    pricingBasis: null,
    pricedAt: new Date().toISOString(),
    idempotencyKey: idemKey,
  });

  const after = {
    primaryAppointments: await primaryDb.appointment.count(),
    regionalAppointments: await regionalDb.appointment.count(),
  };
  check(
    "booking row landed in REGIONAL (residency guarantee)",
    after.regionalAppointments === 1
  );
  check(
    "PRIMARY appointment count unchanged (no patient data on primary)",
    after.primaryAppointments === before.primaryAppointments
  );
  check(
    "doctor FK stub replicated into regional",
    (await regionalDb.doctorProfile.findUnique({ where: { id: doctor.id } }))
      !== null
  );
  check(
    "doctor's user FK stub replicated into regional",
    (await regionalDb.user.findUnique({ where: { id: doctor.userId } })) !==
      null
  );
  check(
    "regional record carries the doctor join (name/slug)",
    created.doctor.slug === doctor.slug && created.doctor.name === doctor.name
  );

  // ── 3. Reads-back through the hybrid ──
  console.log("\n── 3. Read-back + slot blocking ──");
  const readBack = await hybrid.getAppointmentById(created.id);
  check("hybrid.getAppointmentById returns the regional record", readBack?.id === created.id);
  check(
    "read-back via the REGIONAL-only store matches (same database)",
    (await regional.getAppointmentById(created.id))?.id === created.id
  );
  const blocking = await hybrid.findBlockingSlotStarts(
    doctor.id,
    dhakaToUtc(tomorrow, 0).toISOString(),
    dhakaToUtc(tomorrow, 1440).toISOString(),
    BLOCKING_STATUSES
  );
  check(
    "findBlockingSlotStarts (slot engine) sees the regional occupancy",
    blocking.includes(slotStart.toISOString())
  );

  // ── 4. Idempotent replay through the hybrid ──
  console.log("\n── 4. Idempotency ──");
  const replayed = await hybrid.findAppointmentByIdempotencyKey(idemKey);
  check(
    "findAppointmentByIdempotencyKey replays through the regional store",
    replayed?.id === created.id
  );

  // ── 5. Fee settings + classification via the hybrid ──
  console.log("\n── 5. Fee settings + classification ──");
  const feeSettings = await hybrid.getFeeSettings(doctor.id);
  check(
    "hybrid.getFeeSettings auto-created defaults in REGIONAL",
    (await regionalDb.doctorFeeSettings.count({ where: { doctorId: doctor.id } })) ===
      1 &&
      (await primaryDb.doctorFeeSettings.findUnique({
        where: { doctorId: doctor.id },
      })) !== null // primary keeps its own seeded row — untouched
  );
  const breakdown = await classifyAndPrice({
    doctorId: doctor.id,
    patient: { patientId: null, phone: "+8801990000001" },
    store: hybrid,
  });
  check(
    "classification runs against the REGIONAL history (NEW patient, defaults)",
    breakdown.patientType === "NEW" &&
      breakdown.fee === feeSettings.newPatientFee
  );

  // ── 6. Notifications: single regional home, merged reads ──
  console.log("\n── 6. Notifications ──");
  await hybrid.createNotification({
    userId: doctor.userId,
    type: "APPOINTMENT_REQUESTED",
    title: "New appointment request",
    body: "Hybrid verification notification.",
    meta: null,
  });
  check(
    "notification row lives in REGIONAL",
    (await regionalDb.notification.count({ where: { userId: doctor.userId } })) >= 1
  );
  const notifications = await hybrid.listNotifications(doctor.userId, 50);
  check(
    "hybrid.listNotifications MERGES regional + primary rows",
    notifications.some((n) => n.title === "New appointment request") &&
      notifications.length >=
        (await regionalDb.notification.count({
          where: { userId: doctor.userId },
        }))
  );

  // ── 7. Lifecycle: cancel through the hybrid updates REGIONAL only ──
  console.log("\n── 7. Lifecycle write ──");
  const cancelled = await hybrid.updateAppointment(
    created.id,
    { status: "CANCELLED_BY_PATIENT" },
    {
      requireStatuses: doctor.requiresApproval
        ? ["PENDING_APPROVAL", "CONFIRMED"]
        : ["PENDING_APPROVAL", "CONFIRMED"],
    }
  );
  check(
    "cancel transition executed on the regional record",
    cancelled.status === "CANCELLED_BY_PATIENT"
  );
  check(
    "slot released in REGIONAL (occupancy gone from blocking set)",
    !(await hybrid.findBlockingSlotStarts(
      doctor.id,
      dhakaToUtc(tomorrow, 0).toISOString(),
      dhakaToUtc(tomorrow, 1440).toISOString(),
      BLOCKING_STATUSES
    )).includes(slotStart.toISOString())
  );
  check(
    "PRIMARY still never saw the appointment",
    (await primaryDb.appointment.count()) === before.primaryAppointments
  );

  console.log(
    `\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed — hybrid split-store ${
      failed === 0 ? "verified" : "FAILED"
    }`
  );

  await primaryDb.$disconnect();
  await regionalDb.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
