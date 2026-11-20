import { Prisma, PrismaClient } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";
import { ROLES } from "@/lib/constants";
import type {
  ActiveOtpCode,
  AdminUserRecord,
  AppointmentPatch,
  AppointmentRecord,
  AuditLogRecord,
  AuthUser,
  AuthUserWithCredentials,
  AvailabilityRuleRecord,
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
  HospitalRecord,
  ListDoctorsOptions,
  ModerationReviewRecord,
  NewAvailabilityRule,
  NotificationRecord,
  ReferenceMeta,
  ReviewRecord,
  SearchDoctorsFilters,
  SessionRecord,
  SpecialtyRecord,
  UpsertGoogleUserInput,
  UserProfilePatch,
} from "./types";
import { ReferenceCodeCollisionError, SlotConflictError } from "./types";

/**
 * Medbriq local data store — Prisma + SQLite (development default).
 *
 * All query logic here was moved VERBATIM out of the v1 API routes,
 * src/lib/auth.ts and src/lib/slots.ts during the dual-store refactor; the
 * PrismaClient is constructed lazily on first use (replicating the caching
 * behaviour of src/lib/db.ts, which this module intentionally does not import
 * so that Firestore deployments never instantiate a Prisma client).
 */

const globalForPrisma = globalThis as unknown as {
  __medbriqPrismaStoreClient: PrismaClient | undefined;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.__medbriqPrismaStoreClient) {
    globalForPrisma.__medbriqPrismaStoreClient = new PrismaClient({
      log: ["query"],
    });
  }
  return globalForPrisma.__medbriqPrismaStoreClient;
}

/** Prisma include resolving everything the DoctorRecord needs. */
const DOCTOR_INCLUDE = {
  user: { select: { name: true, email: true, phone: true } },
  specialties: {
    include: { specialty: { select: { name: true, slug: true } } },
  },
  hospital: { select: { name: true, slug: true, city: true, address: true } },
  // Ratings are averaged in memory — simplest correct approach for the
  // MVP dataset size (avoids groupBy + join gymnastics in SQLite).
  reviews: { select: { rating: true } },
} satisfies Prisma.DoctorProfileInclude;

type DoctorRow = Prisma.DoctorProfileGetPayload<{ include: typeof DOCTOR_INCLUDE }>;

/**
 * Prisma include resolving everything the AppointmentRecord needs, plus the
 * ownership fields used by the permission checks (doctor.userId,
 * doctor.requiresApproval).
 */
const APPOINTMENT_INCLUDE = {
  doctor: {
    select: {
      userId: true,
      slug: true,
      city: true,
      consultationFee: true,
      requiresApproval: true,
      user: { select: { name: true } },
      specialties: { select: { specialty: { select: { name: true } } } },
    },
  },
} satisfies Prisma.AppointmentInclude;

type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

/** True when the error is a Prisma P2002 (unique constraint violation). */
function isP2002(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

/**
 * True when a P2002 was raised by the (doctorId, slotStart) unique constraint —
 * i.e. the slot was double-booked concurrently. The DB-level guard is the
 * single source of truth for double-booking; this classifier turns the
 * constraint violation into a domain SlotConflictError (→ 409 instead of 500).
 */
function isSlotTakenError(err: unknown): boolean {
  if (!isP2002(err)) return false;
  const meta = err.meta as { target?: unknown } | undefined;
  const target = meta?.target;
  const parts: string[] = Array.isArray(target)
    ? target.map((t) => String(t))
    : typeof target === "string"
      ? [target]
      : [];
  const haystack = [...parts, err.message].join(" ").toLowerCase();
  return haystack.includes("slotstart");
}

export class PrismaStore implements DataStore {
  private get db(): PrismaClient {
    return getClient();
  }

  // ── mapping helpers ──────────────────────────────────────────────────

  private toDoctorRecord(row: DoctorRow): DoctorRecord {
    return {
      id: row.id,
      userId: row.userId,
      slug: row.slug,
      bio: row.bio,
      experienceYears: row.experienceYears,
      consultationFee: row.consultationFee,
      followUpFee: row.followUpFee,
      videoConsultFee: row.videoConsultFee,
      regNumber: row.regNumber,
      verificationStatus: row.verificationStatus,
      verificationNote: row.verificationNote,
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
      city: row.city,
      country: row.country,
      chamberAddress: row.chamberAddress,
      languages: row.languages,
      supportsVideo: row.supportsVideo,
      requiresApproval: row.requiresApproval,
      photoUrl: row.photoUrl,
      hospitalId: row.hospitalId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      name: row.user.name,
      email: row.user.email,
      phone: row.user.phone,
      specialties: row.specialties.map((ds) => ({
        name: ds.specialty.name,
        slug: ds.specialty.slug,
      })),
      hospital: row.hospital
        ? {
            name: row.hospital.name,
            slug: row.hospital.slug,
            city: row.hospital.city,
            address: row.hospital.address,
          }
        : null,
      reviewRatings: row.reviews.map((review) => review.rating),
    };
  }

  private toAppointmentRecord(row: AppointmentRow): AppointmentRecord {
    return {
      id: row.id,
      referenceCode: row.referenceCode,
      doctorId: row.doctorId,
      patientId: row.patientId,
      patientName: row.patientName,
      patientPhone: row.patientPhone,
      patientAge: row.patientAge,
      patientGender: row.patientGender,
      notes: row.notes,
      slotStart: row.slotStart.toISOString(),
      slotEnd: row.slotEnd.toISOString(),
      type: row.type,
      status: row.status,
      bookingMode: row.bookingMode,
      fee: row.fee,
      currency: row.currency,
      doctorNote: row.doctorNote,
      consultationNote: row.consultationNote,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      doctor: {
        userId: row.doctor.userId,
        slug: row.doctor.slug,
        city: row.doctor.city,
        consultationFee: row.doctor.consultationFee,
        requiresApproval: row.doctor.requiresApproval,
        name: row.doctor.user.name,
        specialties: row.doctor.specialties.map((s) => s.specialty.name),
      },
    };
  }

  // ── Auth / users / sessions ──────────────────────────────────────────

  async findUserByEmail(email: string): Promise<AuthUserWithCredentials | null> {
    const user = await this.db.user.findUnique({
      where: { email },
      include: {
        doctorProfile: { select: { slug: true, verificationStatus: true } },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      provider: user.provider,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
      doctorSlug: user.doctorProfile?.slug ?? null,
      verificationStatus: user.doctorProfile?.verificationStatus ?? null,
    };
  }

  async findUserByPhone(phone: string): Promise<AuthUserWithCredentials | null> {
    const normalized = normalizePhone(phone);
    // Phones are stored as given; compare normalized on both sides (bounded scan
    // mirrors findAppointmentsByReferenceCode).
    const candidates = await this.db.user.findMany({
      where: { phone: { not: null } },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        provider: true,
        phoneVerified: true,
        avatarUrl: true,
        doctorProfile: { select: { slug: true, verificationStatus: true } },
      },
      take: 5000,
    });
    const user = candidates.find((c) => normalizePhone(c.phone!) === normalized);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      provider: user.provider,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
      doctorSlug: user.doctorProfile?.slug ?? null,
      verificationStatus: user.doctorProfile?.verificationStatus ?? null,
    };
  }

  private toAuthUser(
    user: Prisma.UserGetPayload<{
      include: { doctorProfile: { select: { slug: true; verificationStatus: true } } };
    }>
  ): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      provider: user.provider,
      phoneVerified: user.phoneVerified,
      avatarUrl: user.avatarUrl,
      doctorSlug: user.doctorProfile?.slug ?? null,
      verificationStatus: user.doctorProfile?.verificationStatus ?? null,
    };
  }

  private USER_INCLUDE = {
    doctorProfile: { select: { slug: true, verificationStatus: true } },
  } satisfies Prisma.UserInclude;

  async createPatientUser(input: CreatePatientUserInput): Promise<AuthUser> {
    const user = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        phone: input.phone,
        role: ROLES.PATIENT,
      },
      include: this.USER_INCLUDE,
    });
    return this.toAuthUser(user);
  }

  async findOrCreatePhoneUser(input: CreatePhoneUserInput): Promise<{ user: AuthUser; created: boolean }> {
    const existing = await this.findUserByPhone(input.phone);
    if (existing) {
      // Keep profile basics in sync on later OTP logins (phone always verified).
      const updated = await this.db.user.update({
        where: { id: existing.id },
        data: { phoneVerified: true },
        include: this.USER_INCLUDE,
      });
      return { user: this.toAuthUser(updated), created: false };
    }
    const user = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash: "", // no password until the user sets one
        name: input.name,
        phone: input.phone,
        role: ROLES.PATIENT,
        provider: "phone",
        phoneVerified: true,
      },
      include: this.USER_INCLUDE,
    });
    return { user: this.toAuthUser(user), created: true };
  }

  async upsertGoogleUser(input: UpsertGoogleUserInput): Promise<{ user: AuthUser; created: boolean }> {
    const existing = await this.findUserByEmail(input.email);
    if (existing) {
      // Link Google to the existing account (Google has verified the email).
      const updated = await this.db.user.update({
        where: { id: existing.id },
        data: { provider: "google", avatarUrl: input.avatarUrl },
        include: this.USER_INCLUDE,
      });
      return { user: this.toAuthUser(updated), created: false };
    }
    const user = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash: "", // no password until the user sets one
        name: input.name,
        role: ROLES.PATIENT,
        provider: "google",
        avatarUrl: input.avatarUrl,
      },
      include: this.USER_INCLUDE,
    });
    return { user: this.toAuthUser(user), created: true };
  }

  async updateUserProfile(userId: string, patch: UserProfilePatch): Promise<AuthUser> {
    const updated = await this.db.user.update({
      where: { id: userId },
      data: patch,
      include: this.USER_INCLUDE,
    });
    return this.toAuthUser(updated);
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async setUserPhoneVerified(userId: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { phoneVerified: true } });
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { status } });
  }

  async createDoctorAccount(input: CreateDoctorAccountInput): Promise<AuthUser> {
    const user = await this.db.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        phone: input.phone,
        role: ROLES.DOCTOR,
        doctorProfile: {
          create: {
            slug: input.profile.slug,
            verificationStatus: input.profile.verificationStatus,
            bio: input.profile.bio,
            experienceYears: input.profile.experienceYears,
            consultationFee: input.profile.consultationFee,
            followUpFee: input.profile.followUpFee,
            videoConsultFee: input.profile.videoConsultFee,
            regNumber: input.profile.regNumber,
            city: input.profile.city,
            chamberAddress: input.profile.chamberAddress,
            languages: input.profile.languages,
            supportsVideo: input.profile.supportsVideo,
            requiresApproval: input.profile.requiresApproval,
            hospitalId: input.profile.hospitalId,
            specialties: {
              create: { specialtyId: input.specialtyId },
            },
          },
        },
      },
      include: {
        doctorProfile: {
          select: { slug: true, verificationStatus: true },
        },
      },
    });
    return this.toAuthUser(user);
  }

  async createSession(token: string, userId: string, expiresAtIso: string): Promise<void> {
    await this.db.session.create({
      data: { token, userId, expiresAt: new Date(expiresAtIso) },
    });
  }

  async getSessionUser(token: string): Promise<SessionRecord | null> {
    const session = await this.db.session.findUnique({
      where: { token },
      include: {
        user: {
          include: { doctorProfile: { select: { slug: true, verificationStatus: true } } },
        },
      },
    });
    if (!session) return null;
    return {
      id: session.id,
      token: session.token,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
        provider: session.user.provider,
        phone: session.user.phone,
        phoneVerified: session.user.phoneVerified,
        avatarUrl: session.user.avatarUrl,
        doctorSlug: session.user.doctorProfile?.slug ?? null,
        verificationStatus: session.user.doctorProfile?.verificationStatus ?? null,
      },
    };
  }

  async deleteSessionById(id: string): Promise<void> {
    await this.db.session.delete({ where: { id } });
  }

  async deleteSessionsByToken(token: string): Promise<void> {
    await this.db.session.deleteMany({ where: { token } });
  }

  // ── Reference data ───────────────────────────────────────────────────

  async findSpecialtyBySlug(slug: string): Promise<SpecialtyRecord | null> {
    const specialty = await this.db.specialty.findUnique({ where: { slug } });
    if (!specialty) return null;
    return {
      id: specialty.id,
      name: specialty.name,
      nameBn: specialty.nameBn,
      slug: specialty.slug,
      icon: specialty.icon,
    };
  }

  async getSpecialtiesWithDoctorCounts(publicStatuses: string[]) {
    const rows = await this.db.specialty.findMany({
      include: {
        _count: {
          select: {
            doctors: {
              where: {
                doctor: { verificationStatus: { in: publicStatuses } },
              },
            },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameBn: row.nameBn,
      slug: row.slug,
      icon: row.icon,
      doctorCount: row._count.doctors,
    }));
  }

  async getReferenceMeta(publicStatuses: string[]): Promise<ReferenceMeta> {
    const [cityRows, verifiedDoctors, pendingDoctors, specialties, hospitals] =
      await Promise.all([
        this.db.doctorProfile.findMany({
          where: { verificationStatus: { in: publicStatuses } },
          select: { city: true },
          distinct: ["city"],
        }),
        this.db.doctorProfile.count({ where: { verificationStatus: "VERIFIED" } }),
        this.db.doctorProfile.count({ where: { verificationStatus: "PENDING" } }),
        this.db.specialty.count(),
        this.db.hospital.count(),
      ]);
    return {
      cities: cityRows.map((row) => row.city),
      verifiedDoctors,
      pendingDoctors,
      specialtyCount: specialties,
      hospitalCount: hospitals,
    };
  }

  // ── Doctors ──────────────────────────────────────────────────────────

  async searchDoctors(filters: SearchDoctorsFilters): Promise<DoctorRecord[]> {
    const rows = await this.db.doctorProfile.findMany({
      where: {
        verificationStatus:
          filters.statuses.length === 1
            ? filters.statuses[0]
            : { in: filters.statuses },
        ...(filters.supportsVideo ? { supportsVideo: true } : {}),
        ...(filters.maxFee !== undefined
          ? { consultationFee: { lte: filters.maxFee } }
          : {}),
        ...(filters.specialtySlug
          ? { specialties: { some: { specialty: { slug: filters.specialtySlug } } } }
          : {}),
      },
      include: DOCTOR_INCLUDE,
    });
    return rows.map((row) => this.toDoctorRecord(row));
  }

  async getDoctorBySlug(slug: string): Promise<DoctorRecord | null> {
    const row = await this.db.doctorProfile.findUnique({
      where: { slug },
      include: DOCTOR_INCLUDE,
    });
    return row ? this.toDoctorRecord(row) : null;
  }

  async getDoctorById(id: string): Promise<DoctorRecord | null> {
    const row = await this.db.doctorProfile.findUnique({
      where: { id },
      include: DOCTOR_INCLUDE,
    });
    return row ? this.toDoctorRecord(row) : null;
  }

  async getDoctorByUserId(userId: string): Promise<DoctorRecord | null> {
    const row = await this.db.doctorProfile.findUnique({
      where: { userId },
      include: DOCTOR_INCLUDE,
    });
    return row ? this.toDoctorRecord(row) : null;
  }

  async getDoctorIdAndStatusBySlug(slug: string) {
    const doctor = await this.db.doctorProfile.findUnique({
      where: { slug },
      select: { id: true, verificationStatus: true },
    });
    return doctor ?? null;
  }

  async doctorSlugExists(slug: string): Promise<boolean> {
    const existing = await this.db.doctorProfile.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null;
  }

  async updateDoctorProfile(id: string, patch: DoctorProfilePatch): Promise<DoctorRecord> {
    const updated = await this.db.doctorProfile.update({
      where: { id },
      data: patch,
      include: DOCTOR_INCLUDE,
    });
    return this.toDoctorRecord(updated);
  }

  async listDoctors(options: ListDoctorsOptions): Promise<DoctorRecord[]> {
    const rows = await this.db.doctorProfile.findMany({
      where: options.verificationStatus
        ? { verificationStatus: options.verificationStatus }
        : undefined,
      include: DOCTOR_INCLUDE,
      orderBy:
        options.order === "createdAtDesc"
          ? { createdAt: "desc" }
          : { createdAt: "asc" },
    });
    return rows.map((row) => this.toDoctorRecord(row));
  }

  // ── Availability ─────────────────────────────────────────────────────

  private toRuleRecord(
    row: Prisma.AvailabilityRuleGetPayload<Record<string, never>>
  ): AvailabilityRuleRecord {
    return {
      id: row.id,
      doctorId: row.doctorId,
      dayOfWeek: row.dayOfWeek,
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async findActiveRulesForDay(doctorId: string, dayOfWeek: number) {
    const rules = await this.db.availabilityRule.findMany({
      where: { doctorId, isActive: true, dayOfWeek },
      orderBy: { startMinute: "asc" },
    });
    return rules.map((rule) => this.toRuleRecord(rule));
  }

  async listAvailabilityRules(doctorId: string) {
    const rules = await this.db.availabilityRule.findMany({
      where: { doctorId },
      orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    });
    return rules.map((rule) => this.toRuleRecord(rule));
  }

  async replaceAvailabilityRules(doctorId: string, rules: NewAvailabilityRule[]) {
    // Replace-all inside a transaction: delete then recreate every rule.
    await this.db.$transaction([
      this.db.availabilityRule.deleteMany({ where: { doctorId } }),
      this.db.availabilityRule.createMany({
        data: rules.map((rule) => ({
          doctorId,
          dayOfWeek: rule.dayOfWeek,
          startMinute: rule.startMinute,
          endMinute: rule.endMinute,
          isActive: rule.isActive,
        })),
      }),
    ]);
    return this.listAvailabilityRules(doctorId);
  }

  // ── Appointments ─────────────────────────────────────────────────────

  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord> {
    try {
      const created = await this.db.appointment.create({
        data: {
          referenceCode: input.referenceCode,
          doctorId: input.doctorId,
          patientId: input.patientId,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          patientAge: input.patientAge,
          patientGender: input.patientGender,
          notes: input.notes,
          slotStart: new Date(input.slotStart),
          slotEnd: new Date(input.slotEnd),
          type: input.type,
          status: input.status,
          bookingMode: input.bookingMode,
          fee: input.fee,
          currency: input.currency,
        },
        include: APPOINTMENT_INCLUDE,
      });
      return this.toAppointmentRecord(created);
    } catch (err) {
      if (isSlotTakenError(err)) {
        throw new SlotConflictError(
          "This slot was just booked by someone else. Please choose another slot."
        );
      }
      if (isP2002(err)) {
        // P2002 on referenceCode — astronomically unlikely (32^6 space);
        // the caller retries with a freshly generated code.
        throw new ReferenceCodeCollisionError();
      }
      throw err;
    }
  }

  async getAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const row = await this.db.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    return row ? this.toAppointmentRecord(row) : null;
  }

  async listAppointmentsByPatient(patientId: string) {
    const rows = await this.db.appointment.findMany({
      where: { patientId },
      orderBy: { slotStart: "desc" },
      take: 100,
      include: APPOINTMENT_INCLUDE,
    });
    return rows.map((row) => this.toAppointmentRecord(row));
  }

  async listAppointmentsByDoctor(doctorId: string) {
    const rows = await this.db.appointment.findMany({
      where: { doctorId },
      include: APPOINTMENT_INCLUDE,
    });
    return rows.map((row) => this.toAppointmentRecord(row));
  }

  async findAppointmentsByReferenceCode(referenceCode: string, phone: string) {
    // referenceCode is unique, so at most one appointment can match; the
    // lightweight scan lets us compare the phone normalized and the code
    // case-insensitively (SQLite has no case-insensitive equality and phones
    // are stored as given). Bounded for safety.
    const normalizedPhone = normalizePhone(phone);
    const codeUpper = referenceCode.toUpperCase();
    const candidates = await this.db.appointment.findMany({
      select: { id: true, referenceCode: true, patientPhone: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    const matchedIds = candidates
      .filter(
        (a) =>
          a.referenceCode.toUpperCase() === codeUpper &&
          normalizePhone(a.patientPhone) === normalizedPhone
      )
      .map((a) => a.id);

    if (matchedIds.length === 0) return [];

    const rows = await this.db.appointment.findMany({
      where: { id: { in: matchedIds } },
      orderBy: { slotStart: "desc" },
      take: 100,
      include: APPOINTMENT_INCLUDE,
    });
    return rows.map((row) => this.toAppointmentRecord(row));
  }

  async findBlockingSlotStarts(doctorId: string, fromIso: string, toIso: string, statuses: string[]) {
    const booked = await this.db.appointment.findMany({
      where: {
        doctorId,
        slotStart: { gte: new Date(fromIso), lt: new Date(toIso) },
        status: { in: statuses },
      },
      select: { slotStart: true },
    });
    return booked.map((a) => a.slotStart.toISOString());
  }

  async updateAppointment(id: string, patch: AppointmentPatch) {
    const updated = await this.db.appointment.update({
      where: { id },
      data: patch,
      include: APPOINTMENT_INCLUDE,
    });
    return this.toAppointmentRecord(updated);
  }

  async rescheduleAppointment(
    id: string,
    slotStartIso: string,
    slotEndIso: string,
    resetToPendingApproval: boolean
  ) {
    try {
      const updated = await this.db.$transaction(async (tx) => {
        return tx.appointment.update({
          where: { id },
          data: {
            slotStart: new Date(slotStartIso),
            slotEnd: new Date(slotEndIso),
            // Approval-mode doctors must re-approve a moved appointment.
            ...(resetToPendingApproval
              ? { status: "PENDING_APPROVAL" }
              : {}),
          },
          include: APPOINTMENT_INCLUDE,
        });
      });
      return this.toAppointmentRecord(updated);
    } catch (err) {
      if (isSlotTakenError(err)) {
        throw new SlotConflictError(
          "This slot was just booked by someone else. Please choose another slot."
        );
      }
      throw err;
    }
  }

  // ── Reviews ──────────────────────────────────────────────────────────

  async listReviewsByDoctor(doctorId: string): Promise<ReviewRecord[]> {
    const reviews = await this.db.review.findMany({
      where: { doctorId },
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
    return reviews.map((review) => ({
      id: review.id,
      doctorId: review.doctorId,
      patientId: review.patientId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      patientName: review.patient.name,
    }));
  }

  // ── Admin ────────────────────────────────────────────────────────────

  async getAdminStats() {
    const [
      totalUsers,
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments,
      confirmedAppointments,
      pendingApprovals,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { role: ROLES.PATIENT } }),
      this.db.doctorProfile.count(),
      this.db.doctorProfile.count({ where: { verificationStatus: "VERIFIED" } }),
      this.db.doctorProfile.count({
        where: {
          verificationStatus: { in: ["PENDING", "UNDER_REVIEW", "MORE_INFO"] },
        },
      }),
      this.db.appointment.count(),
      this.db.appointment.count({ where: { status: "CONFIRMED" } }),
      this.db.appointment.count({ where: { status: "PENDING_APPROVAL" } }),
    ]);
    return {
      totalUsers,
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments,
      confirmedAppointments,
      pendingApprovals,
    };
  }

  async listAuditLogs(limit: number): Promise<AuditLogRecord[]> {
    const logs = await this.db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { name: true } } },
    });
    return logs.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      meta: log.meta,
      createdAt: log.createdAt.toISOString(),
      actorName: log.actor?.name ?? null,
    }));
  }

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    await this.db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta,
      },
    });
  }

  // ── Phone OTP codes ─────────────────────────────────────────────

  async createOtpCode(input: CreateOtpCodeInput): Promise<void> {
    // Invalidate previous active codes for this (phone, purpose), then create.
    await this.db.$transaction([
      this.db.otpCode.updateMany({
        where: {
          phone: input.phone,
          purpose: input.purpose,
          consumed: false,
        },
        data: { consumed: true },
      }),
      this.db.otpCode.create({
        data: {
          phone: input.phone,
          codeHash: input.codeHash,
          purpose: input.purpose,
          expiresAt: new Date(input.expiresAtIso),
        },
      }),
    ]);
  }

  async findActiveOtpCode(phone: string, purpose: string): Promise<ActiveOtpCode | null> {
    const rows = await this.db.otpCode.findMany({
      where: { phone, purpose, consumed: false },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const row = rows[0];
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    return {
      id: row.id,
      codeHash: row.codeHash,
      attempts: row.attempts,
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    const row = await this.db.otpCode.findUnique({ where: { id }, select: { attempts: true } });
    await this.db.otpCode.update({
      where: { id },
      data: { attempts: (row?.attempts ?? 0) + 1 },
    });
  }

  async consumeOtpCode(id: string): Promise<void> {
    await this.db.otpCode.update({ where: { id }, data: { consumed: true } });
  }

  // ── Notifications ─────────────────────────────────────────────

  async createNotification(input: CreateNotificationInput): Promise<void> {
    await this.db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        meta: input.meta,
      },
    });
  }

  async listNotifications(userId: string, limit: number): Promise<NotificationRecord[]> {
    const rows = await this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      meta: row.meta,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async countUnreadNotifications(userId: string): Promise<number> {
    return this.db.notification.count({ where: { userId, readAt: null } });
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const result = await this.db.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    const result = await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return result.count;
  }

  // ── Reviews (write + moderation) ───────────────────────

  async findReviewByDoctorAndPatient(doctorId: string, patientId: string): Promise<ReviewRecord | null> {
    const review = await this.db.review.findUnique({
      where: { doctorId_patientId: { doctorId, patientId } },
      include: { patient: { select: { name: true } } },
    });
    if (!review) return null;
    return {
      id: review.id,
      doctorId: review.doctorId,
      patientId: review.patientId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      patientName: review.patient.name,
    };
  }

  async createReview(input: CreateReviewInput): Promise<ReviewRecord> {
    const review = await this.db.review.create({
      data: {
        doctorId: input.doctorId,
        patientId: input.patientId,
        rating: input.rating,
        comment: input.comment,
      },
      include: { patient: { select: { name: true } } },
    });
    return {
      id: review.id,
      doctorId: review.doctorId,
      patientId: review.patientId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      patientName: review.patient.name,
    };
  }

  async listRecentReviews(limit: number): Promise<ModerationReviewRecord[]> {
    const reviews = await this.db.review.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        patient: { select: { name: true } },
        doctor: {
          select: { slug: true, user: { select: { name: true } } },
        },
      },
    });
    return reviews.map((review) => ({
      id: review.id,
      doctorId: review.doctorId,
      patientId: review.patientId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      patientName: review.patient.name,
      doctorSlug: review.doctor.slug,
      doctorName: review.doctor.user.name,
    }));
  }

  async deleteReview(id: string): Promise<boolean> {
    const result = await this.db.review.deleteMany({ where: { id } });
    return result.count > 0;
  }

  // ── Hospitals (public directory) ───────────────────────

  async listHospitals(): Promise<HospitalRecord[]> {
    const hospitals = await this.db.hospital.findMany({
      orderBy: [{ city: "asc" }, { name: "asc" }],
      include: {
        doctors: {
          where: { verificationStatus: { in: ["VERIFIED", "PENDING"] } },
          select: { id: true },
        },
      },
    });
    return hospitals.map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      slug: hospital.slug,
      city: hospital.city,
      address: hospital.address,
      phone: hospital.phone,
      about: hospital.about,
      doctorCount: hospital.doctors.length,
    }));
  }

  // ── Admin user directory ───────────────────────

  async listUsers(filters: { role?: string; q?: string }): Promise<AdminUserRecord[]> {
    const q = filters.q?.trim().toLowerCase();
    const users = await this.db.user.findMany({
      where: {
        ...(filters.role ? { role: filters.role } : {}),
      },
      include: {
        doctorProfile: { select: { slug: true, verificationStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return users
      .filter((user) =>
        q
          ? user.name.toLowerCase().includes(q) ||
            user.email.toLowerCase().includes(q) ||
            (user.phone ?? "").toLowerCase().includes(q)
          : true
      )
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        provider: user.provider,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt.toISOString(),
        doctorSlug: user.doctorProfile?.slug ?? null,
        verificationStatus: user.doctorProfile?.verificationStatus ?? null,
      }));
  }
}
