/**
 * Cross-screen search preset (Specialties/Home → Doctors filtering).
 *
 * Mutations go through setters defined here (outside component scope) so the
 * react-hooks/immutability lint rule stays happy.
 */
export const searchPreset: { specialty?: string; q?: string } = {};

export function setSearchPreset(next: { specialty?: string; q?: string }) {
  Object.assign(searchPreset, next);
}

export function clearSearchPreset() {
  searchPreset.specialty = undefined;
  searchPreset.q = undefined;
}
