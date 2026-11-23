/**
 * Patient classification & pricing engine (docs/FEE_SYSTEM.md §2).
 *
 * PURE functions only — no database access — so every boundary is directly
 * testable with an injected clock (scripts/verify-fee-system.ts). The
 * store-backed wrappers live in src/lib/fees/service.ts.
 */

import {
  FEE_DEFAULTS,
  FEE_LIMITS,
  PATIENT_TYPE,
  type PatientType,
  type ValidityUnit,
} from "@/lib/constants";
import {
  computeExpiryDate,
  compareLocalDates,
  localDateKey,
  toDhakaLocalDate,
  type LocalDate,
} from "./validity";

// ─────────────────────────── Settings shape ───────────────────────────

/** The subset of fee settings the engine needs (mirrors FeeSettingsRecord). */
export type FeeSettingsLike = {
  newPatientFee: number;
  returningPatientFee: number;
  returningValidityValue: number;
  returningValidityUnit: ValidityUnit;
  followUpEnabled: boolean;
  followUpFee: number;
  followUpValidityValue: number;
  followUpValidityUnit: ValidityUnit;
  version: number;
};

/** Platform defaults (spec: new BDT 1000, returning BDT 600, 6 months). */
export function defaultFeeSettings(): FeeSettingsLike {
  return {
    newPatientFee: FEE_DEFAULTS.NEW_PATIENT_FEE,
    returningPatientFee: FEE_DEFAULTS.RETURNING_PATIENT_FEE,
    returningValidityValue: FEE_DEFAULTS.RETURNING_VALIDITY_VALUE,
    returningValidityUnit: FEE_DEFAULTS.RETURNING_VALIDITY_UNIT,
    followUpEnabled: FEE_DEFAULTS.FOLLOW_UP_ENABLED,
    followUpFee: FEE_DEFAULTS.FOLLOW_UP_FEE,
    followUpValidityValue: FEE_DEFAULTS.FOLLOW_UP_VALIDITY_VALUE,
    followUpValidityUnit: FEE_DEFAULTS.FOLLOW_UP_VALIDITY_UNIT,
    version: 0, // "implicit defaults" version — never persisted as a snapshot
  };
}

// ─────────────────────────── Validation ───────────────────────────

export type FeeSettingsValidation =
  | { ok: true; value: FeeSettingsLike }
  | { ok: false; error: string };

/**
 * Server-side validation of a fee-settings update. Returns a normalized
 * FeeSettingsLike (without version) on success — the store layer assigns the
 * version. Mirrors the limits in FEE_LIMITS and the business rules in
 * docs/FEE_SYSTEM.md §1.
 */
export function validateFeeSettings(input: {
  newPatientFee: number;
  returningPatientFee: number;
  returningValidityValue: number;
  returningValidityUnit: ValidityUnit;
  followUpEnabled: boolean;
  followUpFee: number;
  followUpValidityValue: number;
  followUpValidityUnit: ValidityUnit;
}): FeeSettingsValidation {
  const int = (n: number, label: string): number | null =>
    Number.isInteger(n) ? n : null;

  const newFee = int(input.newPatientFee, "new patient fee");
  const retFee = int(input.returningPatientFee, "returning patient fee");
  const fuFee = int(input.followUpFee, "follow-up fee");
  if (newFee === null || retFee === null || fuFee === null) {
    return { ok: false, error: "All fees must be whole numbers (BDT)." };
  }
  for (const [fee, label] of [
    [newFee, "New patient fee"],
    [retFee, "Returning patient fee"],
    [fuFee, "Follow-up fee"],
  ] as const) {
    if (fee < FEE_LIMITS.MIN_FEE || fee > FEE_LIMITS.MAX_FEE) {
      return {
        ok: false,
        error: `${label} must be between ${FEE_LIMITS.MIN_FEE} and ${FEE_LIMITS.MAX_FEE} BDT.`,
      };
    }
  }
  if (retFee > newFee) {
    return {
      ok: false,
      error:
        "Returning patient fee cannot exceed the new patient fee (returning is a discount).",
    };
  }
  if (input.followUpEnabled && fuFee > newFee) {
    return {
      ok: false,
      error: "Follow-up fee cannot exceed the new patient fee.",
    };
  }
  // The follow-up window is the SHORTER, sooner revisit window that takes
  // precedence over returning validity (classifyPatient). Two invariants
  // keep the ladder monotonic: a patient inside the follow-up window must
  // never pay MORE than after it expires (followUp ≤ returning), and the
  // follow-up window must not outlast the returning validity it nests in.
  if (input.followUpEnabled && fuFee > retFee) {
    return {
      ok: false,
      error:
        "Follow-up fee cannot exceed the returning patient fee — patients inside the follow-up window would pay more than after it expires.",
    };
  }
  if (input.followUpEnabled) {
    // Fixed mid-month anchor keeps the comparison pure (no clock) and
    // immune to month-end clamping (day 15 exists in every month).
    const ANCHOR: LocalDate = { y: 2024, m: 1, d: 15 };
    const followUpExpiry = computeExpiryDate(
      ANCHOR,
      input.followUpValidityValue,
      input.followUpValidityUnit
    );
    const returningExpiry = computeExpiryDate(
      ANCHOR,
      input.returningValidityValue,
      input.returningValidityUnit
    );
    if (compareLocalDates(followUpExpiry, returningExpiry) > 0) {
      return {
        ok: false,
        error:
          "Follow-up validity cannot exceed the returning-patient validity — the follow-up window must end within it.",
      };
    }
  }

  const unit = (u: ValidityUnit): ValidityUnit | null =>
    u === "DAYS" || u === "MONTHS" ? u : null;
  const retUnit = unit(input.returningValidityUnit);
  const fuUnit = unit(input.followUpValidityUnit);
  if (!retUnit || !fuUnit) {
    return { ok: false, error: "Validity unit must be DAYS or MONTHS." };
  }
  if (
    !Number.isInteger(input.returningValidityValue) ||
    input.returningValidityValue < 1
  ) {
    return { ok: false, error: "Returning validity must be at least 1." };
  }
  if (retUnit === "DAYS" && input.returningValidityValue > FEE_LIMITS.RETURNING_DAYS.MAX) {
    return {
      ok: false,
      error: `Returning validity cannot exceed ${FEE_LIMITS.RETURNING_DAYS.MAX} days.`,
    };
  }
  if (
    retUnit === "MONTHS" &&
    input.returningValidityValue > FEE_LIMITS.RETURNING_MONTHS.MAX
  ) {
    return {
      ok: false,
      error: `Returning validity cannot exceed ${FEE_LIMITS.RETURNING_MONTHS.MAX} months.`,
    };
  }
  if (input.followUpEnabled) {
    if (
      !Number.isInteger(input.followUpValidityValue) ||
      input.followUpValidityValue < 1
    ) {
      return { ok: false, error: "Follow-up validity must be at least 1." };
    }
    if (
      fuUnit === "DAYS" &&
      input.followUpValidityValue > FEE_LIMITS.FOLLOW_UP_DAYS.MAX
    ) {
      return {
        ok: false,
        error: `Follow-up validity cannot exceed ${FEE_LIMITS.FOLLOW_UP_DAYS.MAX} days.`,
      };
    }
    if (
      fuUnit === "MONTHS" &&
      input.followUpValidityValue > FEE_LIMITS.FOLLOW_UP_MONTHS.MAX
    ) {
      return {
        ok: false,
        error: `Follow-up validity cannot exceed ${FEE_LIMITS.FOLLOW_UP_MONTHS.MAX} months.`,
      };
    }
  }

  return {
    ok: true,
    value: {
      newPatientFee: newFee,
      returningPatientFee: retFee,
      returningValidityValue: input.returningValidityValue,
      returningValidityUnit: retUnit,
      followUpEnabled: input.followUpEnabled,
      followUpFee: fuFee,
      followUpValidityValue: input.followUpValidityValue,
      followUpValidityUnit: fuUnit,
      version: 0,
    },
  };
}

// ─────────────────────────── Classification ───────────────────────────

/** How the patient is resolved in visit history (docs/FEE_SYSTEM.md §2.1). */
export type PatientKey = {
  patientId: string | null;
  phone: string; // normalized
};

/** A qualifying completed visit (already filtered by the store query). */
export type QualifyingVisit = {
  id: string;
  completedAt: string; // ISO UTC
};

/** Machine-readable classification basis — snapshotted on the appointment. */
export type ClassificationBasis = {
  rule:
    | "NO_PRIOR_COMPLETED_VISIT"
    | "VALIDITY_EXPIRED"
    | "WITHIN_RETURNING_VALIDITY"
    | "WITHIN_FOLLOW_UP_WINDOW";
  doctorId: string;
  patientId: string | null;
  patientPhone: string;
  latestVisitId: string | null;
  latestVisitCompletedAt: string | null;
  /** Dhaka calendar date of the anchor visit (YYYY-MM-DD). */
  anchorDate: string | null;
  /** Last eligible day, inclusive (YYYY-MM-DD). */
  returningExpiryDate: string | null;
  followUpExpiryDate: string | null;
  /** Dhaka calendar date the classification was computed for. */
  evaluatedDate: string;
  evaluatedAt: string; // ISO UTC
  feeSettingsVersion: number;
};

export type ClassificationResult = {
  patientType: PatientType;
  fee: number;
  currency: "BDT";
  basis: ClassificationBasis;
};

/**
 * Classify a patient for one doctor and compute the applicable fee.
 * Pure: `now` is injected so tests can pin every boundary. See the module
 * docs in validity.ts for the normative expiry definition.
 */
export function classifyPatient(input: {
  doctorId: string;
  patient: PatientKey;
  settings: FeeSettingsLike;
  latestQualifyingVisit: QualifyingVisit | null;
  now: Date;
}): ClassificationResult {
  const { doctorId, patient, settings, latestQualifyingVisit, now } = input;

  const evaluatedAt = now.toISOString();
  const evaluatedDate = toDhakaLocalDate(now);
  const evaluatedKey = localDateKey(evaluatedDate);

  const base = (rule: ClassificationBasis["rule"], fee: number): ClassificationResult => ({
    patientType: rule === "NO_PRIOR_COMPLETED_VISIT" || rule === "VALIDITY_EXPIRED"
      ? PATIENT_TYPE.NEW
      : rule === "WITHIN_FOLLOW_UP_WINDOW"
        ? PATIENT_TYPE.FOLLOW_UP
        : PATIENT_TYPE.RETURNING,
    fee,
    currency: "BDT",
    basis: {
      rule,
      doctorId,
      patientId: patient.patientId,
      patientPhone: patient.phone,
      latestVisitId: latestQualifyingVisit?.id ?? null,
      latestVisitCompletedAt: latestQualifyingVisit?.completedAt ?? null,
      anchorDate: null,
      returningExpiryDate: null,
      followUpExpiryDate: null,
      evaluatedDate: evaluatedKey,
      evaluatedAt,
      feeSettingsVersion: settings.version,
    },
  });

  if (!latestQualifyingVisit) {
    return base("NO_PRIOR_COMPLETED_VISIT", settings.newPatientFee);
  }

  const anchor: LocalDate = toDhakaLocalDate(latestQualifyingVisit.completedAt);
  const returningExpiry = computeExpiryDate(
    anchor,
    settings.returningValidityValue,
    settings.returningValidityUnit
  );
  const followUpExpiry = settings.followUpEnabled
    ? computeExpiryDate(
        anchor,
        settings.followUpValidityValue,
        settings.followUpValidityUnit
      )
    : null;

  const withDates = (
    result: ClassificationResult
  ): ClassificationResult => ({
    ...result,
    basis: {
      ...result.basis,
      anchorDate: localDateKey(anchor),
      returningExpiryDate: localDateKey(returningExpiry),
      followUpExpiryDate: followUpExpiry ? localDateKey(followUpExpiry) : null,
    },
  });

  // Follow-up window (when enabled) takes precedence — it is the shorter,
  // post-visit revisit window with its own fee.
  if (
    followUpExpiry &&
    settings.followUpEnabled &&
    compareLocalDates(evaluatedDate, followUpExpiry) <= 0
  ) {
    return withDates(base("WITHIN_FOLLOW_UP_WINDOW", settings.followUpFee));
  }

  if (compareLocalDates(evaluatedDate, returningExpiry) <= 0) {
    return withDates(base("WITHIN_RETURNING_VALIDITY", settings.returningPatientFee));
  }

  return withDates(base("VALIDITY_EXPIRED", settings.newPatientFee));
}

/** Human-readable explanation of a classification (for previews + UI). */
export function describeClassification(result: ClassificationResult): string {
  const b = result.basis;
  switch (b.rule) {
    case "NO_PRIOR_COMPLETED_VISIT":
      return `No completed visit with this doctor on record — first visit is charged at the new patient fee.`;
    case "WITHIN_FOLLOW_UP_WINDOW":
      return `Last completed visit was on ${b.anchorDate} (Dhaka). You are within the follow-up window until ${b.followUpExpiryDate} — the follow-up fee applies.`;
    case "WITHIN_RETURNING_VALIDITY":
      return `Last completed visit was on ${b.anchorDate} (Dhaka). Returning-patient status is valid through ${b.returningExpiryDate} (inclusive).`;
    case "VALIDITY_EXPIRED":
      return `Returning-patient validity from the last visit (${b.anchorDate}) expired on ${b.returningExpiryDate} — the new patient fee applies.`;
  }
}

/**
 * Price breakdown returned by the preview endpoint. Everything a confirmation
 * needs to validate against — the client NEVER sets the price itself.
 */
export type PriceBreakdown = ClassificationResult & {
  explanation: string;
  feeSettings: {
    newPatientFee: number;
    returningPatientFee: number;
    returningValidityValue: number;
    returningValidityUnit: ValidityUnit;
    followUpEnabled: boolean;
    followUpFee: number;
    followUpValidityValue: number;
    followUpValidityUnit: ValidityUnit;
  };
};
