/**
 * Human-readable labels for the doctor-wise fee system
 * (docs/FEE_SYSTEM.md). Shared by the booking flow, the doctor dashboard,
 * appointment lists and doctor profiles so wording stays consistent.
 */

/** "NEW" → "New patient", "RETURNING" → "Returning patient", etc. */
export function patientTypeLabel(type: string): string {
  switch (type) {
    case "NEW":
      return "New patient";
    case "RETURNING":
      return "Returning patient";
    case "FOLLOW_UP":
      return "Follow-up";
    default:
      return type;
  }
}

/** Bengali secondary labels (small-text accent, primary language is English). */
export const PATIENT_TYPE_BN: Record<string, string> = {
  NEW: "নতুন রোগী",
  RETURNING: "পুরাতন রোগী",
  FOLLOW_UP: "ফলো-আপ",
};

/** 6 + MONTHS → "6 months"; 1 + DAYS → "1 day". */
export function validityLabel(
  value: number,
  unit: "DAYS" | "MONTHS"
): string {
  const unitLabel = unit === "DAYS" ? "day" : "month";
  return `${value} ${value === 1 ? unitLabel : `${unitLabel}s`}`;
}

/** Payment-status axis label (docs/ARCHITECTURE_CORRECTIONS.md #12). */
export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "NOT_REQUIRED":
      return "Pay at chamber";
    case "PENDING":
      return "Unpaid";
    case "PAID":
      return "Paid";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}
