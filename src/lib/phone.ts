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
