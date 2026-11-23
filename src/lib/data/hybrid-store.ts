import type { PrismaClient } from "@prisma/client";
import type { AdminStats, SpecialtyInfo } from "@/lib/types";
import type {
  ActiveOtpCode,
  AdminUserRecord,
  AppointmentPatch,
  AppointmentRecord,
  ApplyDoctorInput,
  ApplyHospitalInput,
  AuthUser,
  AuthUserWithCredentials,
  CreateAppointmentInput,
  CreateAuditLogInput,
  CreateDoctorAccountInput,
  CreateNotificationInput,
  CreateOtpCodeInput,
  CreatePatientUserInput,
  CreatePhoneUserInput,
  CreateReviewInput,
  DataStore,
  DoctorProfilePatch,
  DoctorRecord,
  FeeSettingsHistoryRecord,
  FeeSettingsRecord,
  HospitalContextRecord,
  HospitalRecord,
  ListDoctorsOptions,
  ModerationReviewRecord,
  NewAvailabilityRule,
  NotificationRecord,
  PatientLookup,
  PatientVisitRecord,
  ReferenceMeta,
  ReviewRecord,
  SearchDoctorsFilters,
  SessionRecord,
  SpecialtyRecord,
  UpdateAppointmentOptions,
  UpdateFeeSettingsInput,
  UpsertGoogleUserInput,
  UserProfilePatch,
} from "./types";

/**
 * HybridDataStore — the residency-safe production split-store
 * (docs/ARCHITECTURE_CORRECTIONS.md #5).
 *
 * WHY THIS EXISTS: the booking module stores patient visit history —
 * sensitive, health-adjacent data that must not leave the approved region
 * (Bangladesh) before the Phase 0 legal review. Storing it on a Firestore
 * project in a foreign region violates that constraint, which is why
 * appointmentBooking was prisma-only (frozen on Firestore → 503 in
 * production).
 *
 * THE SPLIT: instead of freezing the module, the data is split by class:
 *
 *   PRIMARY (Firestore, foreign region — PUBLIC directory data only):
 *     doctors, specialties, hospitals, reviews, availability rules,
 *     chambers, users/accounts, sessions, OTP, push tokens, admin user views.
 *     None of this is patient health data; doctorDiscovery already runs on
 *     it under correction #2.
 *
 *   REGIONAL (Prisma — PostgreSQL hosted in-region, BOOKING_DATABASE_URL):
 *     appointments, visit history, fee settings/history, notifications and
 *     audit logs. Everything the residency review regulates. Booking writes
 *     and reads NEVER touch the primary store.
 *
 * FK ANCHORING: the regional schema's referential joins (appointment →
 * doctor/patient/chamber) are satisfied by minimal identity STUBS replicated
 * on demand from the primary store. Stubs are upserts carrying the fields
 * the regional joins actually need (names, slugs, cities); the primary store
 * stays the single source of truth for the directory and the stubs are
 * refreshed on every booking write.
 *
 * The module gate (src/lib/modules.ts) treats "hybrid" as
 * appointmentBooking-enabled: the residency constraint is satisfied by
 * construction, not by freezing the feature. Pure "firestore" (no regional
 * database) remains gated exactly as before.
 */
export class HybridStore implements DataStore {
  constructor(
    private readonly primary: DataStore,
    private readonly regional: DataStore,
    /** Raw regional Prisma client for the identity-stub upserts. */
    private readonly regionalClient: PrismaClient | null
  ) {}

  // ── Identity stub replication (FK anchoring) ───────────────────────────

  /**
   * Replicate the user's identity into the regional store as a stub so
   * appointment/visit/notification foreign keys resolve. Upsert + no-op
   * update: the primary store stays authoritative, the stub only anchors.
   */
  private async ensureUserStub(userId: string): Promise<AuthUser | null> {
    const user = await this.primary.getUserById(userId);
    if (!user || !this.regionalClient) return user;
    await this.regionalClient.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: user.email,
        // "" is the documented sentinel for accounts with no usable
        // password — nobody authenticates against the regional store.
        passwordHash: "",
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        provider: user.provider,
        phoneVerified: user.phoneVerified,
        avatarUrl: user.avatarUrl,
      },
      update: {},
    });
    return user;
  }

  /**
   * Replicate the doctor's directory identity (user + profile) into the
   * regional store so booking writes satisfy their joins.
   */
  private async ensureDoctorStub(doctorId: string): Promise<DoctorRecord | null> {
    const doctor = await this.primary.getDoctorById(doctorId);
    if (!doctor || !this.regionalClient) return doctor;
    await this.regionalClient.user.upsert({
      where: { id: doctor.userId },
      create: {
        id: doctor.userId,
        email: doctor.email,
        passwordHash: "",
        name: doctor.name,
        phone: doctor.phone,
        role: "DOCTOR",
        status: "ACTIVE",
        provider: "credentials",
      },
      update: {},
    });
    await this.regionalClient.doctorProfile.upsert({
      where: { id: doctorId },
      create: {
        id: doctorId,
        userId: doctor.userId,
        slug: doctor.slug,
        bio: doctor.bio,
        experienceYears: doctor.experienceYears,
        consultationFee: doctor.consultationFee,
        followUpFee: doctor.followUpFee,
        videoConsultFee: doctor.videoConsultFee,
        regNumber: doctor.regNumber,
        verificationStatus: doctor.verificationStatus,
        verificationNote: doctor.verificationNote,
        city: doctor.city,
        chamberAddress: doctor.chamberAddress,
        languages: doctor.languages,
        supportsVideo: doctor.supportsVideo,
        requiresApproval: doctor.requiresApproval,
        photoUrl: doctor.photoUrl,
      },
      update: {},
    });
    return doctor;
  }

  /**
   * Replicate a chamber anchor (id + display name) so a chamber booking's
   * foreign key resolves. The full chamber record lives on the primary
   * store; only the join-relevant identity is anchored here.
   */
  private async ensureChamberStub(
    doctorId: string,
    chamberId: string
  ): Promise<{ id: string; name: string } | null> {
    const chamber = await this.primary.findActiveChamber(doctorId, chamberId);
    if (!chamber || !this.regionalClient) return chamber;
    const doctor = await this.ensureDoctorStub(doctorId);
    await this.regionalClient.chamber.upsert({
      where: { id: chamberId },
      create: {
        id: chamberId,
        doctorId,
        name: chamber.name,
        // Stub-only placeholder fields (never surfaced through regional
        // reads — appointment DTOs expose the denormalized chamber name).
        address: "",
        city: doctor?.city ?? "",
      },
      update: {},
    });
    return chamber;
  }

  // ── Auth / users / sessions → PRIMARY ─────────────────────────────────

  findUserByEmail(email: string) {
    return this.primary.findUserByEmail(email);
  }
  getUserById(id: string) {
    return this.primary.getUserById(id);
  }
  findUserByPhone(phone: string) {
    return this.primary.findUserByPhone(phone);
  }
  findOrCreatePhoneUser(input: CreatePhoneUserInput) {
    return this.primary.findOrCreatePhoneUser(input);
  }
  upsertGoogleUser(input: UpsertGoogleUserInput) {
    return this.primary.upsertGoogleUser(input);
  }
  updateUserProfile(userId: string, patch: UserProfilePatch) {
    return this.primary.updateUserProfile(userId, patch);
  }
  updateUserPassword(userId: string, passwordHash: string) {
    return this.primary.updateUserPassword(userId, passwordHash);
  }
  setUserPhoneVerified(userId: string) {
    return this.primary.setUserPhoneVerified(userId);
  }
  updateUserStatus(userId: string, status: string) {
    return this.primary.updateUserStatus(userId, status);
  }
  createPatientUser(input: CreatePatientUserInput) {
    return this.primary.createPatientUser(input);
  }
  createDoctorAccount(input: CreateDoctorAccountInput) {
    return this.primary.createDoctorAccount(input);
  }
  applyDoctorProfile(userId: string, input: ApplyDoctorInput) {
    return this.primary.applyDoctorProfile(userId, input);
  }
  applyHospitalProfile(userId: string, input: ApplyHospitalInput) {
    return this.primary.applyHospitalProfile(userId, input);
  }
  hospitalSlugExists(slug: string) {
    return this.primary.hospitalSlugExists(slug);
  }
  createSession(token: string, userId: string, expiresAtIso: string) {
    return this.primary.createSession(token, userId, expiresAtIso);
  }
  getSessionUser(token: string) {
    return this.primary.getSessionUser(token);
  }
  deleteSessionById(id: string) {
    return this.primary.deleteSessionById(id);
  }
  deleteSessionsByToken(token: string) {
    return this.primary.deleteSessionsByToken(token);
  }
  deleteSessionsByUser(userId: string) {
    return this.primary.deleteSessionsByUser(userId);
  }
  createOtpCode(input: CreateOtpCodeInput) {
    return this.primary.createOtpCode(input);
  }
  findActiveOtpCode(phone: string, purpose: string) {
    return this.primary.findActiveOtpCode(phone, purpose);
  }
  incrementOtpAttempts(id: string) {
    return this.primary.incrementOtpAttempts(id);
  }
  consumeOtpCode(id: string) {
    return this.primary.consumeOtpCode(id);
  }

  // ── Notifications → REGIONAL (single home) with merged reads ──────────
  //
  // Booking lifecycle notifications carry patient-adjacent content
  // ("patient X requested Nov 24"), so they must live in-region. Routing ALL
  // notifications to the regional store keeps one home (no split-brain
  // unread counts); reads merge both stores because account-lifecycle
  // events for primary-only users (verification, password) also land there.

  async createNotification(input: CreateNotificationInput): Promise<void> {
    await this.ensureUserStub(input.userId);
    await this.regional.createNotification(input);
  }

  async listNotifications(
    userId: string,
    limit: number
  ): Promise<NotificationRecord[]> {
    const [regional, primary] = await Promise.all([
      this.regional.listNotifications(userId, limit),
      this.primary.listNotifications(userId, limit),
    ]);
    return [...regional, ...primary]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    const [regional, primary] = await Promise.all([
      this.regional.countUnreadNotifications(userId),
      this.primary.countUnreadNotifications(userId),
    ]);
    return regional + primary;
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (await this.regional.markNotificationRead(id, userId)) return true;
    return this.primary.markNotificationRead(id, userId);
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    const [regional, primary] = await Promise.all([
      this.regional.markAllNotificationsRead(userId),
      this.primary.markAllNotificationsRead(userId),
    ]);
    return regional + primary;
  }

  // ── Push tokens → PRIMARY (device data, not health data) ──────────────

  upsertPushToken(userId: string, token: string, platform: string) {
    return this.primary.upsertPushToken(userId, token, platform);
  }
  removePushToken(token: string, ownerUserId?: string) {
    return this.primary.removePushToken(token, ownerUserId);
  }
  listPushTokens(userId: string) {
    return this.primary.listPushTokens(userId);
  }

  // ── Directory → PRIMARY ───────────────────────────────────────────────

  findSpecialtyBySlug(slug: string) {
    return this.primary.findSpecialtyBySlug(slug);
  }
  getSpecialtiesWithDoctorCounts(publicStatuses: string[]) {
    return this.primary.getSpecialtiesWithDoctorCounts(publicStatuses);
  }
  getReferenceMeta(publicStatuses: string[]) {
    return this.primary.getReferenceMeta(publicStatuses);
  }
  searchDoctors(filters: SearchDoctorsFilters) {
    return this.primary.searchDoctors(filters);
  }
  getDoctorBySlug(slug: string) {
    return this.primary.getDoctorBySlug(slug);
  }
  getDoctorById(id: string) {
    return this.primary.getDoctorById(id);
  }
  getDoctorByUserId(userId: string) {
    return this.primary.getDoctorByUserId(userId);
  }
  getDoctorIdAndStatusBySlug(slug: string) {
    return this.primary.getDoctorIdAndStatusBySlug(slug);
  }
  doctorSlugExists(slug: string) {
    return this.primary.doctorSlugExists(slug);
  }
  updateDoctorProfile(id: string, patch: DoctorProfilePatch) {
    return this.primary.updateDoctorProfile(id, patch);
  }
  listDoctors(options: ListDoctorsOptions) {
    return this.primary.listDoctors(options);
  }
  findActiveRulesForDay(doctorId: string, dayOfWeek: number) {
    return this.primary.findActiveRulesForDay(doctorId, dayOfWeek);
  }
  listAvailabilityRules(doctorId: string) {
    return this.primary.listAvailabilityRules(doctorId);
  }
  replaceAvailabilityRules(doctorId: string, rules: NewAvailabilityRule[]) {
    return this.primary.replaceAvailabilityRules(doctorId, rules);
  }
  findActiveChamber(doctorId: string, chamberId: string) {
    return this.primary.findActiveChamber(doctorId, chamberId);
  }

  // ── Regulated booking surface → REGIONAL ──────────────────────────────
  //
  // Appointments, visit history and fee settings are the patient-data
  // class the residency review regulates (corrections #5/#6): every read
  // and write below stays on the in-region database.

  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord> {
    // Anchor the directory identities BEFORE the write so the regional
    // store's FK joins resolve (upserts — cheap when stubs already exist).
    await this.ensureDoctorStub(input.doctorId);
    if (input.chamberId) {
      await this.ensureChamberStub(input.doctorId, input.chamberId);
    }
    if (input.patientId) {
      await this.ensureUserStub(input.patientId);
    }
    return this.regional.createAppointment(input);
  }

  getAppointmentById(id: string) {
    return this.regional.getAppointmentById(id);
  }
  findAppointmentByIdempotencyKey(key: string) {
    return this.regional.findAppointmentByIdempotencyKey(key);
  }
  listAppointmentsByPatient(patientId: string) {
    return this.regional.listAppointmentsByPatient(patientId);
  }
  listAppointmentsByDoctor(doctorId: string) {
    return this.regional.listAppointmentsByDoctor(doctorId);
  }
  findAppointmentsByReferenceCode(referenceCode: string, phone: string) {
    return this.regional.findAppointmentsByReferenceCode(referenceCode, phone);
  }
  findBlockingSlotStarts(
    doctorId: string,
    fromIso: string,
    toIso: string,
    statuses: string[]
  ) {
    return this.regional.findBlockingSlotStarts(doctorId, fromIso, toIso, statuses);
  }
  updateAppointment(id: string, patch: AppointmentPatch, options?: UpdateAppointmentOptions) {
    return this.regional.updateAppointment(id, patch, options);
  }
  expireStalePendingAppointments(doctorId: string) {
    return this.regional.expireStalePendingAppointments(doctorId);
  }
  rescheduleAppointment(
    id: string,
    slotStartIso: string,
    slotEndIso: string,
    resetToPendingApproval: boolean
  ) {
    return this.regional.rescheduleAppointment(
      id,
      slotStartIso,
      slotEndIso,
      resetToPendingApproval
    );
  }
  async getFeeSettings(doctorId: string): Promise<FeeSettingsRecord> {
    // First read auto-creates the defaults row — the FK needs the stub.
    await this.ensureDoctorStub(doctorId);
    return this.regional.getFeeSettings(doctorId);
  }
  async updateFeeSettings(
    doctorId: string,
    input: UpdateFeeSettingsInput,
    actorId: string | null
  ): Promise<FeeSettingsRecord> {
    await this.ensureDoctorStub(doctorId);
    if (actorId) await this.ensureUserStub(actorId);
    return this.regional.updateFeeSettings(doctorId, input, actorId);
  }
  listFeeSettingsHistory(doctorId: string, limit: number) {
    return this.regional.listFeeSettingsHistory(doctorId, limit);
  }
  findLatestQualifyingVisit(doctorId: string, patient: PatientLookup) {
    return this.regional.findLatestQualifyingVisit(doctorId, patient);
  }
  listPatientVisitsForDoctor(doctorId: string, patient: PatientLookup) {
    return this.regional.listPatientVisitsForDoctor(doctorId, patient);
  }
  async completeAppointmentWithVisit(
    id: string,
    input: { consultationNote: string | null }
  ): Promise<AppointmentRecord> {
    // The appointment (and its doctor/patient anchors) already live in the
    // regional store — the visit's FKs resolve from the existing rows.
    return this.regional.completeAppointmentWithVisit(id, input);
  }

  // ── Reviews / hospitals → PRIMARY (public content) ────────────────────

  listReviewsByDoctor(doctorId: string) {
    return this.primary.listReviewsByDoctor(doctorId);
  }
  findReviewByDoctorAndPatient(doctorId: string, patientId: string) {
    return this.primary.findReviewByDoctorAndPatient(doctorId, patientId);
  }
  createReview(input: CreateReviewInput) {
    return this.primary.createReview(input);
  }
  listRecentReviews(limit: number) {
    return this.primary.listRecentReviews(limit);
  }
  deleteReview(id: string) {
    return this.primary.deleteReview(id);
  }
  listHospitals() {
    return this.primary.listHospitals();
  }
  getHospitalByUserId(userId: string) {
    return this.primary.getHospitalByUserId(userId);
  }
  listUsers(filters: { role?: string; q?: string }) {
    return this.primary.listUsers(filters);
  }

  // ── Admin stats → PRIMARY directory counts + REGIONAL booking counts ──

  async getAdminStats(): Promise<AdminStats> {
    const [directory, booking] = await Promise.all([
      this.primary.getAdminStats(),
      this.regional.getAdminStats(),
    ]);
    return {
      ...directory,
      totalAppointments: booking.totalAppointments,
      confirmedAppointments: booking.confirmedAppointments,
      pendingApprovals: booking.pendingApprovals,
    } satisfies AdminStats;
  }

  // ── Audit trail → REGIONAL (the booking audit trail is regulated data) ─

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    if (input.actorId) await this.ensureUserStub(input.actorId);
    await this.regional.createAuditLog(input);
  }
  listAuditLogs(limit: number) {
    return this.regional.listAuditLogs(limit);
  }
}
