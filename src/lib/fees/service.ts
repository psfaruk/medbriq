/**
 * Store-backed fee services (docs/FEE_SYSTEM.md §6) — thin wrappers that pair
 * the pure engine with DataStore reads. All pricing decisions funnel through
 * here so there is exactly ONE place where classification happens.
 */

import { getStore, type DataStore } from "@/lib/data";
import {
  classifyPatient,
  describeClassification,
  type PatientKey,
  type PriceBreakdown,
} from "./engine";

/**
 * Classify a patient for a doctor and compute the applicable fee at `now`.
 * Reads current fee settings (auto-created with platform defaults when the
 * doctor has none) and the latest qualifying completed visit.
 *
 * NEVER trust fee or patient-type input from the frontend — this function is
 * the only pricing authority, and it is re-run at booking confirmation.
 */
export async function classifyAndPrice(opts: {
  doctorId: string;
  patient: PatientKey;
  now?: Date;
  store?: DataStore;
}): Promise<PriceBreakdown> {
  const store = opts.store ?? getStore();
  const now = opts.now ?? new Date();

  const [settings, latestVisit] = await Promise.all([
    store.getFeeSettings(opts.doctorId),
    store.findLatestQualifyingVisit(opts.doctorId, opts.patient),
  ]);

  const result = classifyPatient({
    doctorId: opts.doctorId,
    patient: opts.patient,
    settings: {
      newPatientFee: settings.newPatientFee,
      returningPatientFee: settings.returningPatientFee,
      returningValidityValue: settings.returningValidityValue,
      returningValidityUnit: settings.returningValidityUnit as "DAYS" | "MONTHS",
      followUpEnabled: settings.followUpEnabled,
      followUpFee: settings.followUpFee,
      followUpValidityValue: settings.followUpValidityValue,
      followUpValidityUnit: settings.followUpValidityUnit as "DAYS" | "MONTHS",
      version: settings.version,
    },
    latestQualifyingVisit: latestVisit
      ? { id: latestVisit.id, completedAt: latestVisit.completedAt }
      : null,
    now,
  });

  return {
    ...result,
    explanation: describeClassification(result),
    feeSettings: {
      newPatientFee: settings.newPatientFee,
      returningPatientFee: settings.returningPatientFee,
      returningValidityValue: settings.returningValidityValue,
      returningValidityUnit: settings.returningValidityUnit as "DAYS" | "MONTHS",
      followUpEnabled: settings.followUpEnabled,
      followUpFee: settings.followUpFee,
      followUpValidityValue: settings.followUpValidityValue,
      followUpValidityUnit: settings.followUpValidityUnit as "DAYS" | "MONTHS",
    },
  };
}
