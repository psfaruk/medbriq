/**
 * Phone number normalization.
 *
 * Extracted from src/app/api/v1/_lib/booking.ts so that both the API route
 * helpers and the data stores (src/lib/data/*) can share one implementation
 * without import cycles. Numbers are stored as given; lookups compare both
 * sides normalized.
 */

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

/**
 * Canonical patient identity key for every booking-boundary comparison and
 * write (docs/FEE_SYSTEM.md §2.1). Bangladeshi mobiles collapse to E.164
 * ("+8801XXXXXXXXX") — matching the auth module's stored format — so
 * "01712345678", "8801712345678" and "+8801712345678" resolve to ONE patient
 * identity (visit history, classification, guest lookups). Non-BD numbers
 * fall back to separator stripping.
 */
export function canonicalPhone(input: string): string {
  return normalizeBdPhone(input) ?? normalizePhone(input);
}

/**
 * Normalize a Bangladeshi mobile number to the canonical E.164-ish form
 * "+8801XXXXXXXXX" (13 digits after +). Accepts the common local spellings:
 *   01XXXXXXXXX  (11 digits, leading 0)
 *   8801XXXXXXXXX (13 digits, leading 880)
 *   +8801XXXXXXXXX (already canonical)
 * BD mobiles use the operator prefixes 013-019, so the national significant
 * number is always "01" + 9 digits. Returns null when the input cannot be a
 * valid BD mobile number.
 */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string;
  if (digits.startsWith("+880")) {
    national = "0" + digits.slice(4);
  } else if (digits.startsWith("880")) {
    national = "0" + digits.slice(3);
  } else if (digits.startsWith("0")) {
    national = digits;
  } else {
    // bare operator prefix, e.g. "1712345678"
    national = "0" + digits;
  }
  if (!/^01[3-9]\d{8}$/.test(national)) return null;
  return "+880" + national.slice(1);
}
