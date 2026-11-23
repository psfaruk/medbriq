/**
 * Verification harness — Doctor-wise New & Returning Patient Fee System.
 *
 * Pins every scenario from the feature specification + the corrections doc
 * (see docs/FEE_SYSTEM.md §8 for the test matrix). NOT a unit-test runner:
 * this is an executable specification that exercises the REAL store
 * (Prisma/SQLite), the REAL fee engine, and — when the dev server is up —
 * the REAL HTTP booking flow.
 *
 * Run: bun run verify:fees
 *
 * Fixtures are isolated (own doctors/patients, +880199 test phones) and
 * removed afterwards; seeded demo data is never touched.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaStore } from "../src/lib/data/prisma-store";
import { SlotConflictError } from "../src/lib/data/types";
import {
  classifyPatient,
  validateFeeSettings,
  defaultFeeSettings,
  type FeeSettingsLike,
} from "../src/lib/fees/engine";
import { classifyAndPrice } from "../src/lib/fees/service";
import {
  addDays,
  addMonthsClamped,
  localDateKey,
  parseLocalDateKey,
  toDhakaLocalDate,
} from "../src/lib/fees/validity";

const db = new PrismaClient();
const store = new PrismaStore();

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n━━ ${title} ${"━".repeat(Math.max(1, 64 - title.length))}`);
}

// ─── Fixture helpers ────────────────────────────────────────────────────

const TEST_PHONE_PREFIX = "+8801990";
let fixtureCounter = 0;
const testDoctorIds: string[] = [];
const testPatientIds: string[] = [];

function daysAgoUtc(days: number, hourDhaka = 17): Date {
  // 17:00 Dhaka == 11:00 UTC
  const now = new Date(Date.now() + 6 * 3600_000);
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days, hourDhaka - 6, 0, 0)
  );
  return d;
}

async function mkDoctor(opts: {
  slug: string;
  email: string;
  feeSettings: FeeSettingsLike;
  requiresApproval?: boolean;
}): Promise<string> {
  const user = await db.user.create({
    data: {
      email: opts.email,
      passwordHash: "x",
      name: `Fee Test ${opts.slug}`,
      role: "DOCTOR",
    },
  });
  const profile = await db.doctorProfile.create({
    data: {
      userId: user.id,
      slug: opts.slug,
      bio: "fee-system verification fixture",
      experienceYears: 5,
      consultationFee: opts.feeSettings.newPatientFee,
      followUpFee: opts.feeSettings.followUpEnabled ? opts.feeSettings.followUpFee : 0,
      regNumber: "BMDC-FEE-TEST",
      verificationStatus: "VERIFIED",
      verifiedAt: new Date(),
      city: "Dhaka",
      languages: "bn,en",
      supportsVideo: false,
      requiresApproval: opts.requiresApproval ?? false,
    },
  });
  // Availability every day 18:00-20:00 Dhaka so future slots always exist.
  for (let day = 0; day < 7; day++) {
    await db.availabilityRule.create({
      data: { doctorId: profile.id, dayOfWeek: day, startMinute: 1080, endMinute: 1200, isActive: true },
    });
  }
  await db.doctorFeeSettings.create({
    data: {
      doctorId: profile.id,
      newPatientFee: opts.feeSettings.newPatientFee,
      returningPatientFee: opts.feeSettings.returningPatientFee,
      returningValidityValue: opts.feeSettings.returningValidityValue,
      returningValidityUnit: opts.feeSettings.returningValidityUnit,
      followUpEnabled: opts.feeSettings.followUpEnabled,
      followUpFee: opts.feeSettings.followUpFee,
      followUpValidityValue: opts.feeSettings.followUpValidityValue,
      followUpValidityUnit: opts.feeSettings.followUpValidityUnit,
      version: 1,
    },
  });
  await db.doctorFeeHistory.create({
    data: {
      doctorId: profile.id,
      version: 1,
      newPatientFee: opts.feeSettings.newPatientFee,
      returningPatientFee: opts.feeSettings.returningPatientFee,
      returningValidityValue: opts.feeSettings.returningValidityValue,
      returningValidityUnit: opts.feeSettings.returningValidityUnit,
      followUpEnabled: opts.feeSettings.followUpEnabled,
      followUpFee: opts.feeSettings.followUpFee,
      followUpValidityValue: opts.feeSettings.followUpValidityValue,
      followUpValidityUnit: opts.feeSettings.followUpValidityUnit,
      changeReason: "verification fixture",
      changedBy: null,
    },
  });
  testDoctorIds.push(profile.id);
  return profile.id;
}

async function mkPatient(n: number): Promise<{ id: string; phone: string }> {
  fixtureCounter += 1;
  const phone = `${TEST_PHONE_PREFIX}${String(n).padStart(5, "0")}`;
  const user = await db.user.create({
    data: {
      email: `fee-test-p${n}-${Date.now()}@findmedidoctor.test`,
      passwordHash: "x",
      name: `Fee Test Patient ${n}`,
      phone,
      role: "PATIENT",
    },
  });
  testPatientIds.push(user.id);
  return { id: user.id, phone };
}

/** Insert a visit-history row directly (simulating a past completed visit). */
async function addVisit(doctorId: string, patient: { id: string | null; phone: string }, completedAt: Date, qualifying = true): Promise<string> {
  const appt = await db.appointment.create({
    data: {
      referenceCode: `MB-TST${Date.now().toString(36).toUpperCase()}${fixtureCounter++}`,
      doctorId,
      patientId: patient.id,
      patientName: "Fee Test Patient",
      patientPhone: patient.phone,
      slotStart: completedAt,
      slotEnd: new Date(completedAt.getTime() + 30 * 60_000),
      type: "IN_PERSON",
      status: "COMPLETED",
      bookingMode: "INSTANT",
      fee: 0,
      consultationStatus: "COMPLETED",
      patientType: "NEW",
    },
  });
  await db.doctorPatientVisit.create({
    data: {
      doctorId,
      appointmentId: appt.id,
      patientId: patient.id,
      patientPhone: patient.phone.replace(/[\s\-()]/g, ""),
      slotStart: completedAt,
      completedAt,
      qualifying,
      paymentStatusAtCompletion: "NOT_REQUIRED",
    },
  });
  return appt.id;
}

async function cleanupFixtures(): Promise<void> {
  for (const doctorId of testDoctorIds) {
    await db.appointment.deleteMany({ where: { doctorId } });
    await db.availabilityRule.deleteMany({ where: { doctorId } });
  }
  await db.doctorPatientVisit.deleteMany({ where: { doctorId: { in: testDoctorIds } } });
  await db.doctorFeeHistory.deleteMany({ where: { doctorId: { in: testDoctorIds } } });
  await db.doctorFeeSettings.deleteMany({ where: { doctorId: { in: testDoctorIds } } });
  await db.doctorProfile.deleteMany({ where: { id: { in: testDoctorIds } } });
  await db.user.deleteMany({ where: { id: { in: testPatientIds } } });
  await db.user.deleteMany({ where: { email: { contains: "@findmedidoctor.test" } } });
  // NOTE: never delete "all rows with an idempotencyKey" here — the booking
  // UI mints one for EVERY real submission. Fixture appointments are already
  // covered: store-level ones belong to testDoctorIds (deleted above), and
  // Part C removes its HTTP-created rows by referenceCode/idempotencyKey.
}

// ─── Part A: pure validity arithmetic (docs/FEE_SYSTEM.md §2.3) ─────────

function partA(): void {
  section("A. Validity arithmetic (pure, normative boundary)");

  // Month-end clamping
  check("addMonthsClamped: 2026-01-31 + 1 month = 2026-02-28 (non-leap)", localDateKey(addMonthsClamped(parseLocalDateKey("2026-01-31"), 1)) === "2026-02-28");
  check("addMonthsClamped: 2028-01-31 + 1 month = 2028-02-29 (leap)", localDateKey(addMonthsClamped(parseLocalDateKey("2028-01-31"), 1)) === "2028-02-29");
  check("addMonthsClamped: 2026-03-31 + 1 month = 2026-04-30", localDateKey(addMonthsClamped(parseLocalDateKey("2026-03-31"), 1)) === "2026-04-30");
  check("addMonthsClamped: 2026-02-12 + 6 months = 2026-08-12", localDateKey(addMonthsClamped(parseLocalDateKey("2026-02-12"), 6)) === "2026-08-12");
  check("addDays: 2026-02-09 + 7 = 2026-02-16", localDateKey(addDays(parseLocalDateKey("2026-02-09"), 7)) === "2026-02-16");

  // Dhaka timezone conversion: 18:30 UTC on Jan 30 == 00:30 Dhaka on Jan 31
  check("timezone: 2026-01-30T18:30Z is 2026-01-31 in Dhaka", localDateKey(toDhakaLocalDate("2026-01-30T18:30:00.000Z")) === "2026-01-31");
  check("timezone: 2026-01-30T12:00Z is 2026-01-30 in Dhaka (18:00 local)", localDateKey(toDhakaLocalDate("2026-01-30T12:00:00.000Z")) === "2026-01-30");

  // Classification boundary: MONTHS — visit 2026-02-12, 6-month validity
  const settingsM = { ...defaultFeeSettings(), newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 6, returningValidityUnit: "MONTHS" as const, version: 1 };
  const visitM = { id: "v1", completedAt: "2026-02-12T12:00:00.000Z" }; // 18:00 Dhaka, Feb 12
  const at = (iso: string) => classifyPatient({ doctorId: "d", patient: { patientId: null, phone: "+880" }, settings: settingsM, latestQualifyingVisit: visitM, now: new Date(iso) });
  check("MONTHS: eval 2026-08-12 (expiry date itself) → RETURNING", at("2026-08-12T16:00:00.000Z").patientType === "RETURNING"); // 22:00 Dhaka Aug 12
  check("MONTHS: eval 2026-08-13 (day after expiry) → NEW", at("2026-08-13T02:00:00.000Z").patientType === "NEW"); // 08:00 Dhaka Aug 13

  // Classification boundary: DAYS — visit Monday 2026-02-09, 7-day validity → through Mon 2026-02-16
  const settingsD = { ...defaultFeeSettings(), newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 7, returningValidityUnit: "DAYS" as const, version: 1 };
  const visitD = { id: "v2", completedAt: "2026-02-09T12:00:00.000Z" };
  const atD = (iso: string) => classifyPatient({ doctorId: "d", patient: { patientId: null, phone: "+880" }, settings: settingsD, latestQualifyingVisit: visitD, now: new Date(iso) });
  check("DAYS: eval day-7 (2026-02-16) → RETURNING", atD("2026-02-16T16:00:00.000Z").patientType === "RETURNING");
  check("DAYS: eval day-8 (2026-02-17) → NEW", atD("2026-02-17T02:00:00.000Z").patientType === "NEW");

  // Midnight boundary: classification flips with the Dhaka calendar day
  check("boundary: 23:59 Dhaka on expiry day → RETURNING", at("2026-08-12T17:59:59.000Z").patientType === "RETURNING");
  check("boundary: 00:01 Dhaka after expiry day → NEW", at("2026-08-12T18:01:00.000Z").patientType === "NEW");

  // Timezone anchor: completed 2026-01-30T18:30Z (Jan 31 Dhaka) + 1 month → through Feb 28
  const settingsT = { ...defaultFeeSettings(), returningValidityValue: 1, returningValidityUnit: "MONTHS" as const, version: 1 };
  const visitT = { id: "v3", completedAt: "2026-01-30T18:30:00.000Z" };
  const atT = (iso: string) => classifyPatient({ doctorId: "d", patient: { patientId: null, phone: "+880" }, settings: settingsT, latestQualifyingVisit: visitT, now: new Date(iso) });
  check("tz+clamp: anchor Jan 31 (Dhaka), eval Feb 28 → RETURNING", atT("2026-02-28T05:00:00.000Z").patientType === "RETURNING");
  check("tz+clamp: eval Mar 1 → NEW", atT("2026-03-01T05:00:00.000Z").patientType === "NEW");
  check("tz+clamp: anchor date recorded as 2026-01-31", atT("2026-02-28T05:00:00.000Z").basis.anchorDate === "2026-01-31");

  // No visit → NEW
  check("no visit → NEW / NO_PRIOR_COMPLETED_VISIT", classifyPatient({ doctorId: "d", patient: { patientId: null, phone: "+880" }, settings: settingsM, latestQualifyingVisit: null, now: new Date() }).basis.rule === "NO_PRIOR_COMPLETED_VISIT");

  // Follow-up precedence over returning
  const settingsF = { ...defaultFeeSettings(), newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 6, returningValidityUnit: "MONTHS" as const, followUpEnabled: true, followUpFee: 350, followUpValidityValue: 15, followUpValidityUnit: "DAYS" as const, version: 1 };
  const cf = classifyPatient({ doctorId: "d", patient: { patientId: null, phone: "+880" }, settings: settingsF, latestQualifyingVisit: { id: "v4", completedAt: daysAgoUtc(10).toISOString() }, now: new Date() });
  check("follow-up window (10d ago, 15d window) → FOLLOW_UP @ 350", cf.patientType === "FOLLOW_UP" && cf.fee === 350);
}

// ─── Part B: store-backed classification ────────────────────────────────

async function partB(): Promise<void> {
  section("B. Store-backed classification (real Prisma store)");

  // Doctors with deliberately different configurations
  const d1 = await mkDoctor({
    slug: `fee-test-d1-${Date.now().toString(36)}`,
    email: `fee-test-d1-${Date.now()}@findmedidoctor.test`,
    feeSettings: { newPatientFee: 1200, returningPatientFee: 700, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: true, followUpFee: 350, followUpValidityValue: 15, followUpValidityUnit: "DAYS", version: 1 },
  });
  const d2 = await mkDoctor({
    slug: `fee-test-d2-${Date.now().toString(36)}`,
    email: `fee-test-d2-${Date.now()}@findmedidoctor.test`,
    feeSettings: { newPatientFee: 900, returningPatientFee: 500, returningValidityValue: 7, returningValidityUnit: "DAYS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS", version: 1 },
  });

  const p1 = await mkPatient(1);
  const p2 = await mkPatient(2);
  const p3 = await mkPatient(3);
  const p4 = await mkPatient(4);
  const p5 = await mkPatient(5);

  // (1) First visit → NEW @ newPatientFee
  const c1 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p1.id, phone: p1.phone } });
  check("first visit → NEW @ 1200", c1.patientType === "NEW" && c1.fee === 1200, c1);

  // (2) Returning visit (60 days ago, 6-month validity) → RETURNING
  await addVisit(d1, p1, daysAgoUtc(60));
  const c2 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p1.id, phone: p1.phone } });
  check("visit 60d ago → RETURNING @ 700", c2.patientType === "RETURNING" && c2.fee === 700, c2);

  // (3) Expiry (240 days ago > 6 months) → NEW
  await addVisit(d1, p2, daysAgoUtc(240));
  const c3 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p2.id, phone: p2.phone } });
  check("visit 240d ago → expired → NEW @ 1200", c3.patientType === "NEW" && c3.basis.rule === "VALIDITY_EXPIRED", c3);

  // (4) Custom DAY duration on d2 (7-day validity)
  await addVisit(d2, p3, daysAgoUtc(7));
  const c4a = await classifyAndPrice({ doctorId: d2, patient: { patientId: p3.id, phone: p3.phone } });
  check("7-DAY validity: day 7 (inclusive) → RETURNING @ 500", c4a.patientType === "RETURNING" && c4a.fee === 500, c4a);
  const p3b = await mkPatient(6);
  await addVisit(d2, p3b, daysAgoUtc(8));
  const c4b = await classifyAndPrice({ doctorId: d2, patient: { patientId: p3b.id, phone: p3b.phone } });
  check("7-DAY validity: day 8 → NEW", c4b.patientType === "NEW", c4b);

  // (5) Calendar-month duration (6 MONTHS) — boundary via injected `now`
  const anchor = daysAgoUtc(60);
  const c5 = await classifyAndPrice({
    doctorId: d1,
    patient: { patientId: p1.id, phone: p1.phone },
    now: new Date(anchor.getTime() + 183 * 24 * 3600_000), // far future → beyond expiry
  });
  check("6-MONTH validity: eval +183d → NEW", c5.patientType === "NEW", c5);

  // (6) Different doctors: p1's visit with d1 must NOT affect d2
  const c6 = await classifyAndPrice({ doctorId: d2, patient: { patientId: p1.id, phone: p1.phone } });
  check("visit with doctor A does not affect doctor B → NEW", c6.patientType === "NEW" && c6.fee === 900, c6);

  // (7) Multiple chambers/locations: second (newer) visit renews the anchor
  await addVisit(d1, p1, daysAgoUtc(30)); // newer visit supersedes the 60d one
  const c7 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p1.id, phone: p1.phone } });
  const anchorKey = toDhakaLocalDate(daysAgoUtc(30));
  check("newer visit (30d ago) renews anchor (any chamber/location of same doctor)", c7.basis.anchorDate === localDateKey(anchorKey), c7.basis);

  // (8) Cancelled appointment never establishes eligibility
  const cancelled = await store.createAppointment({
    referenceCode: `MB-TSTC${Date.now().toString(36).toUpperCase()}`,
    doctorId: d1,
    patientId: p4.id,
    patientName: "Fee Test Patient 4",
    patientPhone: p4.phone,
    patientAge: null,
    patientGender: null,
    notes: null,
    slotStart: new Date(Date.now() + 86400_000).toISOString(),
    slotEnd: new Date(Date.now() + 86400_000 + 1800_000).toISOString(),
    type: "IN_PERSON",
    status: "CONFIRMED",
    bookingMode: "INSTANT",
    fee: 1200,
    currency: "BDT",
    patientType: "NEW",
    feeSettingsVersion: 1,
    pricingBasis: "{}",
  });
  await store.updateAppointment(cancelled.id, { status: "CANCELLED_BY_PATIENT" });
  const c8 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p4.id, phone: p4.phone } });
  check("cancelled appointment → no eligibility → NEW", c8.patientType === "NEW", c8);

  // (9) No-show never establishes eligibility
  const noshow = await store.createAppointment({
    referenceCode: `MB-TSTN${Date.now().toString(36).toUpperCase()}`,
    doctorId: d1,
    patientId: p4.id,
    patientName: "Fee Test Patient 4",
    patientPhone: p4.phone,
    patientAge: null,
    patientGender: null,
    notes: null,
    slotStart: new Date(Date.now() + 2 * 86400_000).toISOString(),
    slotEnd: new Date(Date.now() + 2 * 86400_000 + 1800_000).toISOString(),
    type: "IN_PERSON",
    status: "CONFIRMED",
    bookingMode: "INSTANT",
    fee: 1200,
    currency: "BDT",
    patientType: "NEW",
    feeSettingsVersion: 1,
  });
  await store.updateAppointment(noshow.id, { status: "NO_SHOW", consultationStatus: "NOT_HELD" });
  const c9 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p4.id, phone: p4.phone } });
  check("no-show appointment → no eligibility → NEW", c9.patientType === "NEW", c9);

  // (10) Completed appointment DOES establish eligibility (transaction writes the visit)
  const toComplete = await store.createAppointment({
    referenceCode: `MB-TSTM${Date.now().toString(36).toUpperCase()}`,
    doctorId: d1,
    patientId: p4.id,
    patientName: "Fee Test Patient 4",
    patientPhone: p4.phone,
    patientAge: null,
    patientGender: null,
    notes: null,
    slotStart: new Date(Date.now() - 3600_000).toISOString(),
    slotEnd: new Date(Date.now() - 1800_000).toISOString(),
    type: "IN_PERSON",
    status: "CONFIRMED",
    bookingMode: "INSTANT",
    fee: 1200,
    currency: "BDT",
    patientType: "NEW",
    feeSettingsVersion: 1,
  });
  const completed = await store.completeAppointmentWithVisit(toComplete.id, { consultationNote: null });
  check("completion sets status + consultationStatus", completed.status === "COMPLETED" && completed.consultationStatus === "COMPLETED");
  const c10 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p4.id, phone: p4.phone } });
  // The visit completed "now": D1 has a 15-day follow-up window enabled, so
  // the correct classification is FOLLOW_UP @ 350 — and crucially the rule
  // references the visit (eligibility ESTABLISHED, not NO_PRIOR_COMPLETED_VISIT).
  check("completed visit establishes eligibility → FOLLOW_UP @ 350 (fresh visit, within 15-day window)", c10.patientType === "FOLLOW_UP" && c10.fee === 350 && c10.basis.rule === "WITHIN_FOLLOW_UP_WINDOW", c10);

  // (11) Fee changes after booking never mutate the existing appointment
  const booked = await store.createAppointment({
    referenceCode: `MB-TSTF${Date.now().toString(36).toUpperCase()}`,
    doctorId: d1,
    patientId: p5.id,
    patientName: "Fee Test Patient 5",
    patientPhone: p5.phone,
    patientAge: null,
    patientGender: null,
    notes: null,
    slotStart: new Date(Date.now() + 3 * 86400_000).toISOString(),
    slotEnd: new Date(Date.now() + 3 * 86400_000 + 1800_000).toISOString(),
    type: "IN_PERSON",
    status: "CONFIRMED",
    bookingMode: "INSTANT",
    fee: 1200,
    currency: "BDT",
    patientType: "NEW",
    feeSettingsVersion: 1,
    pricingBasis: '{"rule":"NO_PRIOR_COMPLETED_VISIT"}',
    pricedAt: new Date().toISOString(),
  });
  await store.updateFeeSettings(d1, {
    newPatientFee: 1500,
    returningPatientFee: 900,
    returningValidityValue: 6,
    returningValidityUnit: "MONTHS",
    followUpEnabled: true,
    followUpFee: 400,
    followUpValidityValue: 15,
    followUpValidityUnit: "DAYS",
    changeReason: "verification: raise fees",
  }, null);
  const after = await store.getAppointmentById(booked.id);
  check("fee snapshot preserved after settings change (fee 1200, version 1)", after?.fee === 1200 && after?.feeSettingsVersion === 1 && after?.patientType === "NEW", after);
  const c11 = await classifyAndPrice({ doctorId: d1, patient: { patientId: null, phone: "+88019909999" } });
  check("new bookings priced under v2 (1500)", c11.fee === 1500 && c11.basis.feeSettingsVersion === 2, c11);

  // (12) Duplicate accounts: same phone (new account id) still matches history
  const c12 = await classifyAndPrice({ doctorId: d1, patient: { patientId: null, phone: p4.phone } });
  check("duplicate account, same phone → phone match → follow-up pricing still applies", c12.patientType === "FOLLOW_UP", c12);
  const c12b = await classifyAndPrice({ doctorId: d1, patient: { patientId: p5.id, phone: "+88019908888" } });
  check("different phone, no history → NEW (documented account-scope limitation)", c12b.patientType === "NEW", c12b);

  // (13) Unpaid (payment required) completion → non-qualifying visit
  const unpaidAppt = await store.createAppointment({
    referenceCode: `MB-TSTU${Date.now().toString(36).toUpperCase()}`,
    doctorId: d1,
    patientId: p5.id,
    patientName: "Fee Test Patient 5",
    patientPhone: p5.phone,
    patientAge: null,
    patientGender: null,
    notes: null,
    slotStart: new Date(Date.now() - 7200_000).toISOString(),
    slotEnd: new Date(Date.now() - 5400_000).toISOString(),
    type: "IN_PERSON",
    status: "CONFIRMED",
    bookingMode: "INSTANT",
    fee: 1500,
    currency: "BDT",
  });
  await db.appointment.update({ where: { id: unpaidAppt.id }, data: { paymentStatus: "PENDING" } });
  await store.completeAppointmentWithVisit(unpaidAppt.id, { consultationNote: null });
  const unpaidVisit = await db.doctorPatientVisit.findFirst({ where: { appointmentId: unpaidAppt.id } });
  check("unpaid completion → visit recorded but qualifying=false", unpaidVisit?.qualifying === false, unpaidVisit);
  const c13 = await classifyAndPrice({ doctorId: d1, patient: { patientId: p5.id, phone: p5.phone } });
  check("unpaid visit does not establish eligibility → NEW", c13.patientType === "NEW", c13);

  // (14) Concurrent bookings for the same slot → exactly one winner
  const slotStart = new Date(Date.now() + 5 * 86400_000).toISOString();
  const slotEnd = new Date(Date.now() + 5 * 86400_000 + 1800_000).toISOString();
  const mkPayload = () => store.createAppointment({
    referenceCode: `MB-TSTR${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    doctorId: d1,
    patientId: p5.id,
    patientName: "Fee Test Patient 5",
    patientPhone: p5.phone,
    patientAge: null,
    patientGender: null,
    notes: null,
    slotStart,
    slotEnd,
    type: "IN_PERSON",
    status: "CONFIRMED",
    bookingMode: "INSTANT",
    fee: 1500,
    currency: "BDT",
  });
  const results = await Promise.allSettled([mkPayload(), mkPayload()]);
  const wins = results.filter((r) => r.status === "fulfilled").length;
  const conflicts = results.filter((r) => r.status === "rejected" && r.reason instanceof SlotConflictError).length;
  check("concurrent same-slot booking → exactly 1 win + 1 SlotConflictError", wins === 1 && conflicts === 1, { wins, conflicts });

  // (15) Fee settings validation rules
  const v1 = validateFeeSettings({ newPatientFee: 1000, returningPatientFee: 1200, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" });
  check("validation: returning > new rejected", !v1.ok);
  const v2 = validateFeeSettings({ newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 400, returningValidityUnit: "DAYS", followUpEnabled: false, followUpFee: 0, followUpValidityValue: 15, followUpValidityUnit: "DAYS" });
  check("validation: 400-day returning validity rejected", !v2.ok);
  const v3 = validateFeeSettings({ newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 12, returningValidityUnit: "MONTHS", followUpEnabled: true, followUpFee: 2000, followUpValidityValue: 15, followUpValidityUnit: "DAYS" });
  check("validation: follow-up fee > new fee rejected", !v3.ok);
  const v4 = validateFeeSettings({ newPatientFee: 1000, returningPatientFee: 600, returningValidityValue: 6, returningValidityUnit: "MONTHS", followUpEnabled: true, followUpFee: 400, followUpValidityValue: 15, followUpValidityUnit: "DAYS" });
  check("validation: sane settings accepted", v4.ok);

  // (16) Fee history is versioned and immutable
  const history = await store.listFeeSettingsHistory(d1, 10);
  check("fee history: v2 (1500/900) then v1 (1200/700), newest first", history.length >= 2 && history[0].version === 2 && history[0].newPatientFee === 1500 && history[1].version === 1 && history[1].newPatientFee === 1200, history.map((h) => [h.version, h.newPatientFee]));
  const audit = await db.auditLog.findFirst({ where: { entity: "DoctorFeeSettings", entityId: d1, action: "FEE_SETTINGS_UPDATED" } });
  check("fee settings change is audit-logged", audit !== null);

  // (17) Doctor-scoped visit history API surface
  const visits = await store.listPatientVisitsForDoctor(d1, { patientId: p1.id, phone: p1.phone });
  const visitsOther = await store.listPatientVisitsForDoctor(d2, { patientId: p1.id, phone: p1.phone });
  check("visit history is doctor-scoped (d1 has p1 visits, d2 has none)", visits.length === 2 && visitsOther.length === 0, { d1: visits.length, d2: visitsOther.length });
}

// ─── Part C: HTTP end-to-end (dev server) ───────────────────────────────

type HttpResult = { status: number; body: any };

async function call(path: string, method: string, body?: unknown): Promise<HttpResult> {
  const res = await fetch(`http://localhost:3000${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, body: parsed };
}

async function partC(): Promise<void> {
  section("C. HTTP end-to-end (live dev server)");

  let reachable = false;
  try {
    reachable = (await call("/api/v1/meta", "GET")).status === 200;
  } catch {
    reachable = false;
  }
  if (!reachable) {
    console.log("  ⏭ dev server not reachable — skipped (start it with `bun run dev`)");
    return;
  }

  // A future date that has free slots for the instant-booking seeded doctor
  // (Dr. Tanvir Ahmed — instant booking, every day 18:00-20:00 Dhaka except
  // Thu/Fri). Scan the next 10 days until one has a free slot.
  let dateStr = "";
  let slot: { startIso: string; taken: boolean; past: boolean } | undefined;
  let slot2: { startIso: string; taken: boolean; past: boolean } | undefined;
  for (let i = 1; i <= 10 && !slot2; i++) {
    const candidate = new Date(Date.now() + i * 24 * 3600_000 + 6 * 3600_000)
      .toISOString()
      .slice(0, 10);
    const slotsRes = await call(`/api/v1/doctors/dr-tanvir-ahmed/slots?date=${candidate}`, "GET");
    const slots: { startIso: string; taken: boolean; past: boolean }[] = slotsRes.body?.data?.slots ?? [];
    const free = slots.filter((s) => !s.taken && !s.past);
    slot = slot ?? free[0];
    slot2 = slot2 ?? free[1];
    if (slot || slot2) dateStr = candidate;
  }
  if (!slot) {
    console.log("  ⏭ no free future slot found for the HTTP test — skipped");
    return;
  }

  const phone = "+88019907777";
  const base = {
    doctorSlug: "dr-tanvir-ahmed",
    date: dateStr,
    slotStartIso: slot.startIso,
    type: "IN_PERSON",
    patientName: "HTTP Verify Patient",
    patientPhone: phone,
  };

  // Preview → NEW @ 900 (Tanvir: 900/500, 30 DAYS)
  const preview = await call("/api/v1/booking/price-preview", "POST", { doctorSlug: "dr-tanvir-ahmed", patientPhone: phone });
  check("HTTP preview: NEW @ 900 for Dr. Tanvir", preview.status === 200 && preview.body?.data?.preview?.patientType === "NEW" && preview.body?.data?.preview?.fee === 900, preview.body);

  // Stale expectedFee → 409 PRICE_CHANGED (no booking created)
  const stale = await call("/api/v1/appointments", "POST", { ...base, expectedFee: 12345 });
  check("HTTP booking: stale expectedFee → 409 PRICE_CHANGED", stale.status === 409 && stale.body?.error?.code === "PRICE_CHANGED", stale.body);

  // VIDEO → telehealth module disabled → 503
  const video = await call("/api/v1/appointments", "POST", { ...base, type: "VIDEO" });
  check("HTTP booking: VIDEO → 503 MODULE_DISABLED (telehealth gate)", video.status === 503 && video.body?.error?.code === "MODULE_DISABLED", video.body);

  // Correct booking with idempotency key
  const idemKey = `verify-${Date.now()}-feetest`;
  const book = await call("/api/v1/appointments", "POST", { ...base, expectedFee: 900, expectedPatientType: "NEW", idempotencyKey: idemKey });
  const appt = book.body?.data?.appointment;
  check("HTTP booking: created with snapshot (NEW, 900, version)", book.status === 200 && appt?.patientType === "NEW" && appt?.fee === 900 && appt?.feeSettingsVersion === 1, appt);
  check("HTTP booking: priceBreakdown returned", book.body?.data?.priceBreakdown?.patientType === "NEW");

  // Idempotent replay
  const replay = await call("/api/v1/appointments", "POST", { ...base, expectedFee: 900, idempotencyKey: idemKey });
  check("HTTP booking: idempotent replay returns the same appointment", replay.status === 200 && replay.body?.data?.idempotentReplay === true && replay.body?.data?.appointment?.id === appt?.id, replay.body);

  // Concurrent same-slot booking by another patient → exactly one winner
  if (slot2) {
    const concurrent = await Promise.all([
      call("/api/v1/appointments", "POST", { ...base, slotStartIso: slot2.startIso, patientPhone: "+88019906666", patientName: "Racer A" }),
      call("/api/v1/appointments", "POST", { ...base, slotStartIso: slot2.startIso, patientPhone: "+88019905555", patientName: "Racer B" }),
    ]);
    const okCount = concurrent.filter((r) => r.status === 200 && !r.body?.data?.idempotentReplay).length;
    const conflictCount = concurrent.filter((r) => r.status === 409 && r.body?.error?.code === "SLOT_TAKEN").length;
    check("HTTP booking: concurrent same-slot → exactly 1 success + 1 SLOT_TAKEN", okCount === 1 && conflictCount === 1, concurrent.map((r) => [r.status, r.body?.error?.code]));

    // Cleanup the HTTP-created appointments (keep the demo DB tidy)
    const refs = [...concurrent]
      .map((r) => r.body?.data?.referenceCode)
      .filter(Boolean) as string[];
    if (refs.length) await db.appointment.deleteMany({ where: { referenceCode: { in: refs } } });
  } else {
    console.log("  ⏭ only one free slot available — HTTP concurrency check skipped");
  }
  await db.appointment.deleteMany({ where: { idempotencyKey: idemKey } });
  const ref = book.body?.data?.referenceCode;
  if (ref) await db.appointment.deleteMany({ where: { referenceCode: ref } });
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🧪 Doctor-wise New & Returning Patient Fee System — verification harness");
  console.log("   spec: docs/FEE_SYSTEM.md §8 · corrections: docs/ARCHITECTURE_CORRECTIONS.md");

  partA();
  await partB();
  await partC();

  console.log("\n" + "═".repeat(72));
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("Failed checks:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("All fee-system verification checks passed ✅");
  }
}

main()
  .catch((e) => {
    console.error("Harness crashed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupFixtures();
    await db.$disconnect();
  });
