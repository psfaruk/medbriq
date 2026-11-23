import { Prisma, PrismaClient } from "@prisma/client";
import { canonicalPhone, normalizePhone } from "@/lib/phone";
import { ensureSqliteFile } from "@/lib/ensure-db";
import { FEE_DEFAULTS, ROLES } from "@/lib/constants";
import type {
  ActiveOtpCode,
  AdminUserRecord,
  AppointmentPatch,
  UpdateAppointmentOptions,
  AppointmentRecord,
  AuditLogRecord,
  AuthUser,
  AuthUserWithCredentials,
  AvailabilityRuleRecord,
  ApplyDoctorInput,
  ApplyHospitalInput,
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
  UpdateFeeSettingsInput,
  UpsertGoogleUserInput,
  UserProfilePatch,
} from "./types";
import { ReferenceCodeCollisionError, SlotConflictError, StatusTransitionError, isSlotBlockingStatus } from "./types";

/**
 * Find Medi Doctor local data store — Prisma + SQLite (development default).
 *
 * All query logic here was moved VERBATIM out of the v1 API routes,
 * src/lib/auth.ts and src/lib/slots.ts during the dual-store refactor; the
 * PrismaClient is constructed lazily on first use (replicating the caching
 * behaviour of src/lib/db.ts, which this module intentionally does not import
 * so that Firestore deployments never instantiate a Prisma client).
 */

const globalForPrisma = globalThis as unknown as {
  __fmdPrismaStoreClient: PrismaClient | undefined;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.__fmdPrismaStoreClient) {
    // Serverless bootstrap: copy the bundled demo SQLite file to the
    // writable /tmp target on Vercel (no-op locally / on Firestore).
    ensureSqliteFile();
    globalForPrisma.__fmdPrismaStoreClient = new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error"] : ["query"],
    });
  }
  return globalForPrisma.__fmdPrismaStoreClient;
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
  chamber: { select: { id: true, name: true, address: true, city: true } },
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
 * True when a P2002 was raised by the (doctorId, slotKey) unique constraint —
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
  // "slotkey" covers the current guard; "slotstart" kept for rows written
  // before the slotKey migration.
  return haystack.includes("slotkey") || haystack.includes("slotstart");
}

/** True when a P2002 was raised by the idempotencyKey unique constraint. */
function isIdempotencyKeyError(err: unknown): boolean {
  if (!isP2002(err)) return false;
  const meta = err.meta as { target?: unknown } | undefined;
  const target = meta?.target;
  const parts: string[] = Array.isArray(target)
    ? target.map((t) => String(t))
    : typeof target === "string"
      ? [target]
      : [];
  const haystack = [...parts, err.message].join(" ").toLowerCase();
  return haystack.includes("idempotencykey");
}

export class PrismaStore implements DataStore {
  /**
   * Optional client override. Defaults to the process-wide singleton client
   * (DATABASE_URL). The hybrid store's regional PrismaStore passes its own
   * client bound to BOOKING_DATABASE_URL so regulated booking data never
   * touches the primary store's database (docs/ARCHITECTURE_CORRECTIONS.md #5).
   */
  private readonly injectedClient?: PrismaClient;

  constructor(client?: PrismaClient) {
    this.injectedClient = client;
  }

  private get db(): PrismaClient {
    return this.injectedClient ?? getClient();
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
      chamberId: row.chamberId ?? null,
      chamberName: row.chamber?.name ?? null,
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
      paymentStatus: row.paymentStatus,
      consultationStatus: row.consultationStatus,
      refundStatus: row.refundStatus,
      patientType: row.patientType,
      feeSettingsVersion: row.feeSettingsVersion,
      pricingBasis: row.pricingBasis,
      pricedAt: row.pricedAt ? row.pricedAt.toISOString() : null,
      idempotencyKey: row.idempotencyKey,
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

  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await this.db.user.findUnique({
      where: { id },
      include: {
        doctorProfile: { select: { slug: true, verificationStatus: true } },
      },
    });
    if (!user) return null;
    return this.toAuthUser(user);
  }

  async findUserByPhone(phone: string): Promise<AuthUserWithCredentials | null> {
    const normalized = canonicalPhone(phone);
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
    const matches = candidates.filter(
      (c) => canonicalPhone(c.phone!) === normalized
    );
    if (matches.length === 0) return null;
    // Deterministic preference when (legacy) duplicate phones exist: an
    // ACTIVE, phone-verified account wins — OTP login and password reset
    // then operate on a predictable account instead of scan order.
    const ranked = [...matches].sort((a, b) => {
      const score = (u: typeof a) =>
        (u.phoneVerified ? 2 : 0) + (u.status === "ACTIVE" ? 1 : 0);
      return score(b) - score(a);
    });
    const user = ranked[0];
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
        dateOfBirth: input.dateOfBirth ?? null,
        presentAddress: input.presentAddress ?? null,
        permanentAddress: input.permanentAddress ?? null,
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

  async applyDoctorProfile(userId: string, input: ApplyDoctorInput): Promise<AuthUser> {
    const existing = await this.db.user.findUnique({
      where: { id: userId },
      include: { doctorProfile: { select: { id: true } } },
    });
    if (!existing) throw new Error("Account not found.");
    if (existing.doctorProfile) {
      throw new Error("This account already has a doctor profile.");
    }
    const user = await this.db.user.update({
      where: { id: userId },
      data: {
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

  async applyHospitalProfile(userId: string, input: ApplyHospitalInput): Promise<AuthUser> {
    const existing = await this.db.user.findUnique({
      where: { id: userId },
      include: { hospitalProfile: { select: { id: true } } },
    });
    if (!existing) throw new Error("Account not found.");
    if (existing.hospitalProfile) {
      throw new Error("This account already manages a hospital.");
    }
    const user = await this.db.user.update({
      where: { id: userId },
      data: {
        role: ROLES.HOSPITAL,
        hospitalProfile: {
          create: {
            name: input.name,
            slug: input.slug,
            city: input.city,
            address: input.address,
            phone: input.phone,
            verificationStatus: "PENDING",
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

  async deleteSessionsByUser(userId: string): Promise<number> {
    // Password change/reset revocation: drop every session of the account so
    // stale (possibly compromised) cookies stop working immediately.
    const result = await this.db.session.deleteMany({ where: { userId } });
    return result.count;
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

  async hospitalSlugExists(slug: string): Promise<boolean> {
    const existing = await this.db.hospital.findUnique({
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
      chamberId: row.chamberId ?? null,
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
          chamberId: rule.chamberId ?? null,
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
          chamberId: input.chamberId ?? null,
          patientId: input.patientId,
          patientName: input.patientName,
          patientPhone: input.patientPhone,
          patientAge: input.patientAge,
          patientGender: input.patientGender,
          notes: input.notes,
          slotStart: new Date(input.slotStart),
          slotEnd: new Date(input.slotEnd),
          // Occupancy key — equals slotStart while the appointment holds the
          // slot; the (doctorId, slotKey) unique index is the booking guard.
          slotKey: new Date(input.slotStart),
          type: input.type,
          status: input.status,
          bookingMode: input.bookingMode,
          fee: input.fee,
          currency: input.currency,
          // ── Fee system (docs/FEE_SYSTEM.md §3) ──
          patientType: input.patientType ?? null,
          feeSettingsVersion: input.feeSettingsVersion ?? null,
          pricingBasis: input.pricingBasis ?? null,
          pricedAt: input.pricedAt ? new Date(input.pricedAt) : null,
          idempotencyKey: input.idempotencyKey ?? null,
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
      if (isIdempotencyKeyError(err)) {
        // Two racing submits with the SAME key: the first insert won — replay
        // the winner (docs/FEE_SYSTEM.md §3.4) instead of surfacing a 500.
        if (input.idempotencyKey) {
          const winner = await this.findAppointmentByIdempotencyKey(
            input.idempotencyKey
          );
          if (winner) return winner;
        }
        throw err;
      }
      if (isP2002(err)) {
        // P2002 on referenceCode — astronomically unlikely (32^6 space);
        // the caller retries with a freshly generated code.
        throw new ReferenceCodeCollisionError();
      }
      throw err;
    }
  }

  async findAppointmentByIdempotencyKey(key: string): Promise<AppointmentRecord | null> {
    const row = await this.db.appointment.findUnique({
      where: { idempotencyKey: key },
      include: APPOINTMENT_INCLUDE,
    });
    return row ? this.toAppointmentRecord(row) : null;
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
    const normalizedPhone = canonicalPhone(phone);
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
          canonicalPhone(a.patientPhone) === normalizedPhone
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

  async findActiveChamber(doctorId: string, chamberId: string) {
    const chamber = await this.db.chamber.findFirst({
      where: { id: chamberId, doctorId, isActive: true },
      select: { id: true, name: true },
    });
    return chamber ?? null;
  }

  async updateAppointment(
    id: string,
    patch: AppointmentPatch,
    options?: UpdateAppointmentOptions
  ) {
    // Slot occupancy is derived from the TARGET status: released statuses
    // free the (doctorId, slotKey) slot so it becomes bookable again without
    // deleting the historical row (release-on-cancel fix).
    const data: Prisma.AppointmentUpdateInput = { ...patch };
    if (patch.status !== undefined) {
      data.slotKey = isSlotBlockingStatus(patch.status) ? undefined : null;
      // NOTE: undefined leaves the key untouched for blocking transitions
      // (the row keeps occupying its slot); null releases it.
    }

    try {
      if (options?.requireStatuses && options.requireStatuses.length > 0) {
        // CONDITIONAL TRANSITION: only apply when the row is still in one of
        // the expected statuses. count === 0 → a concurrent actor changed it.
        const result = await this.db.appointment.updateMany({
          where: { id, status: { in: options.requireStatuses } },
          data,
        });
        if (result.count === 0) {
          const current = await this.db.appointment.findUnique({
            where: { id },
            select: { status: true },
          });
          throw new StatusTransitionError(current?.status ?? "UNKNOWN");
        }
        const updated = await this.db.appointment.findUnique({
          where: { id },
          include: APPOINTMENT_INCLUDE,
        });
        if (!updated) throw new Error(`Appointment ${id} not found.`);
        return this.toAppointmentRecord(updated);
      }
      const updated = await this.db.appointment.update({
        where: { id },
        data,
        include: APPOINTMENT_INCLUDE,
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

  async expireStalePendingAppointments(doctorId: string): Promise<number> {
    // EXPIRED lifecycle: un-reviewed PENDING_APPROVAL requests whose slot has
    // passed are swept to EXPIRED (slot released) so they stop blocking the
    // calendar. Lazy sweep — called by slot/doctor-appointment reads.
    const result = await this.db.appointment.updateMany({
      where: {
        doctorId,
        status: "PENDING_APPROVAL",
        slotStart: { lt: new Date() },
      },
      data: { status: "EXPIRED", slotKey: null },
    });
    return result.count;
  }

  async rescheduleAppointment(
    id: string,
    slotStartIso: string,
    slotEndIso: string,
    resetToPendingApproval: boolean
  ) {
    try {
      const updated = await this.db.$transaction(async (tx) => {
        // CONDITIONAL MOVE: only PENDING_APPROVAL / CONFIRMED appointments
        // may move; anything else (completed, cancelled, …) is a race.
        const moved = await tx.appointment.updateMany({
          where: { id, status: { in: ["PENDING_APPROVAL", "CONFIRMED"] } },
          data: {
            slotStart: new Date(slotStartIso),
            slotEnd: new Date(slotEndIso),
            // The new slot is occupied under its own key (old key released by
            // the same write — a slot move, not a second occupancy).
            slotKey: new Date(slotStartIso),
            // Approval-mode doctors must re-approve a moved appointment.
            ...(resetToPendingApproval
              ? { status: "PENDING_APPROVAL" }
              : {}),
          },
        });
        if (moved.count === 0) {
          const current = await tx.appointment.findUnique({
            where: { id },
            select: { status: true },
          });
          throw new StatusTransitionError(current?.status ?? "UNKNOWN");
        }
        return tx.appointment.findUnique({
          where: { id },
          include: APPOINTMENT_INCLUDE,
        });
      });
      if (!updated) throw new Error(`Appointment ${id} not found.`);
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

  // ── Doctor-wise fee system (docs/FEE_SYSTEM.md) ─────────────────────

  private toFeeSettingsRecord(row: {
    id: string;
    doctorId: string;
    newPatientFee: number;
    returningPatientFee: number;
    returningValidityValue: number;
    returningValidityUnit: string;
    followUpEnabled: boolean;
    followUpFee: number;
    followUpValidityValue: number;
    followUpValidityUnit: string;
    version: number;
    updatedAt: Date;
  }): FeeSettingsRecord {
    return {
      id: row.id,
      doctorId: row.doctorId,
      newPatientFee: row.newPatientFee,
      returningPatientFee: row.returningPatientFee,
      returningValidityValue: row.returningValidityValue,
      returningValidityUnit: row.returningValidityUnit,
      followUpEnabled: row.followUpEnabled,
      followUpFee: row.followUpFee,
      followUpValidityValue: row.followUpValidityValue,
      followUpValidityUnit: row.followUpValidityUnit,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPatientVisitRecord(row: {
    id: string;
    doctorId: string;
    appointmentId: string;
    patientId: string | null;
    patientPhone: string;
    slotStart: Date;
    completedAt: Date;
    qualifying: boolean;
    paymentStatusAtCompletion: string;
    recordedAt: Date;
  }): PatientVisitRecord {
    return {
      id: row.id,
      doctorId: row.doctorId,
      appointmentId: row.appointmentId,
      patientId: row.patientId,
      patientPhone: row.patientPhone,
      slotStart: row.slotStart.toISOString(),
      completedAt: row.completedAt.toISOString(),
      qualifying: row.qualifying,
      paymentStatusAtCompletion: row.paymentStatusAtCompletion,
      recordedAt: row.recordedAt.toISOString(),
    };
  }

  /** (patientId OR normalized phone) filter for visit-history queries. */
  private patientVisitMatch(patient: PatientLookup): Prisma.DoctorPatientVisitWhereInput | null {
    const or: Prisma.DoctorPatientVisitWhereInput[] = [];
    if (patient.patientId) or.push({ patientId: patient.patientId });
    if (patient.phone) {
      // Visit rows store the CANONICAL phone (E.164 for BD mobiles) going
      // forward; legacy rows may carry any spelling. Match every
      // normalization variant so a patient's visit history can never fork
      // across phone spellings (docs/FEE_SYSTEM.md §2.1) — an exact-equality
      // match silently re-classified returning patients as NEW (overcharge).
      const variants = new Set(
        [
          canonicalPhone(patient.phone),
          normalizePhone(patient.phone),
          patient.phone.trim(),
        ].filter((v) => v.length > 0)
      );
      for (const variant of variants) or.push({ patientPhone: variant });
    }
    if (or.length === 0) return null;
    return { OR: or };
  }

  async getFeeSettings(doctorId: string): Promise<FeeSettingsRecord> {
    const existing = await this.db.doctorFeeSettings.findUnique({
      where: { doctorId },
    });
    if (existing) return this.toFeeSettingsRecord(existing);

    // First read for this doctor — auto-create with platform defaults
    // (spec: new BDT 1000, returning BDT 600, 6 months) and record v1 in
    // history so even implicit defaults are auditable.
    const created = await this.db.doctorFeeSettings.create({
      data: {
        doctorId,
        newPatientFee: FEE_DEFAULTS.NEW_PATIENT_FEE,
        returningPatientFee: FEE_DEFAULTS.RETURNING_PATIENT_FEE,
        returningValidityValue: FEE_DEFAULTS.RETURNING_VALIDITY_VALUE,
        returningValidityUnit: FEE_DEFAULTS.RETURNING_VALIDITY_UNIT,
        followUpEnabled: FEE_DEFAULTS.FOLLOW_UP_ENABLED,
        followUpFee: FEE_DEFAULTS.FOLLOW_UP_FEE,
        followUpValidityValue: FEE_DEFAULTS.FOLLOW_UP_VALIDITY_VALUE,
        followUpValidityUnit: FEE_DEFAULTS.FOLLOW_UP_VALIDITY_UNIT,
        version: 1,
      },
    });
    await this.db.doctorFeeHistory.create({
      data: {
        doctorId,
        version: 1,
        newPatientFee: created.newPatientFee,
        returningPatientFee: created.returningPatientFee,
        returningValidityValue: created.returningValidityValue,
        returningValidityUnit: created.returningValidityUnit,
        followUpEnabled: created.followUpEnabled,
        followUpFee: created.followUpFee,
        followUpValidityValue: created.followUpValidityValue,
        followUpValidityUnit: created.followUpValidityUnit,
        changeReason: "Auto-created with platform defaults",
        changedBy: null,
      },
    });
    return this.toFeeSettingsRecord(created);
  }

  async updateFeeSettings(
    doctorId: string,
    input: UpdateFeeSettingsInput,
    actorId: string | null
  ): Promise<FeeSettingsRecord> {
    const updated = await this.db.$transaction(async (tx) => {
      const current = await tx.doctorFeeSettings.findUnique({
        where: { doctorId },
      });
      if (!current) {
        throw new Error("Fee settings row missing; read settings first.");
      }
      const version = current.version + 1;
      const next = await tx.doctorFeeSettings.update({
        where: { doctorId },
        data: {
          newPatientFee: input.newPatientFee,
          returningPatientFee: input.returningPatientFee,
          returningValidityValue: input.returningValidityValue,
          returningValidityUnit: input.returningValidityUnit,
          followUpEnabled: input.followUpEnabled,
          followUpFee: input.followUpFee,
          followUpValidityValue: input.followUpValidityValue,
          followUpValidityUnit: input.followUpValidityUnit,
          version,
        },
      });

      // Immutable history row — confirmed appointments keep pointing at the
      // version they were priced under.
      await tx.doctorFeeHistory.create({
        data: {
          doctorId,
          version,
          newPatientFee: next.newPatientFee,
          returningPatientFee: next.returningPatientFee,
          returningValidityValue: next.returningValidityValue,
          returningValidityUnit: next.returningValidityUnit,
          followUpEnabled: next.followUpEnabled,
          followUpFee: next.followUpFee,
          followUpValidityValue: next.followUpValidityValue,
          followUpValidityUnit: next.followUpValidityUnit,
          changeReason: input.changeReason,
          changedBy: actorId,
        },
      });

      // Keep the legacy profile fields in sync so search/cards/admin keep
      // working unchanged (docs/FEE_SYSTEM.md §5).
      await tx.doctorProfile.update({
        where: { id: doctorId },
        data: {
          consultationFee: next.newPatientFee,
          followUpFee: next.followUpEnabled ? next.followUpFee : 0,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "FEE_SETTINGS_UPDATED",
          entity: "DoctorFeeSettings",
          entityId: doctorId,
          meta: JSON.stringify({
            version,
            before: {
              newPatientFee: current.newPatientFee,
              returningPatientFee: current.returningPatientFee,
              returningValidityValue: current.returningValidityValue,
              returningValidityUnit: current.returningValidityUnit,
              followUpEnabled: current.followUpEnabled,
              followUpFee: current.followUpFee,
              followUpValidityValue: current.followUpValidityValue,
              followUpValidityUnit: current.followUpValidityUnit,
            },
            after: {
              newPatientFee: next.newPatientFee,
              returningPatientFee: next.returningPatientFee,
              returningValidityValue: next.returningValidityValue,
              returningValidityUnit: next.returningValidityUnit,
              followUpEnabled: next.followUpEnabled,
              followUpFee: next.followUpFee,
              followUpValidityValue: next.followUpValidityValue,
              followUpValidityUnit: next.followUpValidityUnit,
            },
            reason: input.changeReason,
          }),
        },
      });

      return next;
    });
    return this.toFeeSettingsRecord(updated);
  }

  async listFeeSettingsHistory(doctorId: string, limit: number): Promise<FeeSettingsHistoryRecord[]> {
    const rows = await this.db.doctorFeeHistory.findMany({
      where: { doctorId },
      orderBy: [{ version: "desc" }],
      take: Math.max(1, Math.min(limit, 200)),
    });
    return rows.map((row) => ({
      id: row.id,
      doctorId: row.doctorId,
      version: row.version,
      newPatientFee: row.newPatientFee,
      returningPatientFee: row.returningPatientFee,
      returningValidityValue: row.returningValidityValue,
      returningValidityUnit: row.returningValidityUnit,
      followUpEnabled: row.followUpEnabled,
      followUpFee: row.followUpFee,
      followUpValidityValue: row.followUpValidityValue,
      followUpValidityUnit: row.followUpValidityUnit,
      changeReason: row.changeReason,
      changedBy: row.changedBy,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async findLatestQualifyingVisit(
    doctorId: string,
    patient: PatientLookup
  ): Promise<PatientVisitRecord | null> {
    const match = this.patientVisitMatch(patient);
    if (!match) return null;
    const row = await this.db.doctorPatientVisit.findFirst({
      where: { doctorId, qualifying: true, ...match },
      orderBy: { completedAt: "desc" },
    });
    return row ? this.toPatientVisitRecord(row) : null;
  }

  async listPatientVisitsForDoctor(
    doctorId: string,
    patient: PatientLookup
  ): Promise<PatientVisitRecord[]> {
    const match = this.patientVisitMatch(patient);
    if (!match) return [];
    const rows = await this.db.doctorPatientVisit.findMany({
      where: { doctorId, ...match },
      orderBy: { completedAt: "desc" },
      take: 100,
    });
    return rows.map((row) => this.toPatientVisitRecord(row));
  }

  async completeAppointmentWithVisit(
    id: string,
    input: { consultationNote: string | null }
  ): Promise<AppointmentRecord> {
    const updated = await this.db.$transaction(async (tx) => {
      const current = await tx.appointment.findUnique({
        where: { id },
        include: APPOINTMENT_INCLUDE,
      });
      if (!current) throw new Error(`Appointment ${id} not found.`);

      // CONDITIONAL TRANSITION (status machine guard): only a CONFIRMED
      // appointment may be completed. Without this, a race between complete
      // and cancel/no-show could resurrect a cancelled appointment or turn a
      // NO_SHOW into a money-qualifying visit (docs/FEE_SYSTEM.md §2.2).
      if (current.status !== "CONFIRMED") {
        throw new StatusTransitionError(current.status);
      }

      // Eligibility rule (docs/FEE_SYSTEM.md §2.2): only completed
      // consultations with settled payment qualify.
      const qualifying =
        current.paymentStatus === "NOT_REQUIRED" ||
        current.paymentStatus === "PAID";

      const next = await tx.appointment.updateMany({
        where: { id, status: "CONFIRMED" },
        data: {
          status: "COMPLETED",
          consultationStatus: "COMPLETED",
          ...(input.consultationNote !== null
            ? { consultationNote: input.consultationNote }
            : {}),
        },
      });
      if (next.count === 0) {
        throw new StatusTransitionError(current.status);
      }

      // Upsert by unique appointmentId — safe to re-run. The create branch
      // snapshots qualifying/paymentStatusAtCompletion; the update branch
      // intentionally does NOT rewrite history (later payment changes never
      // alter an already-recorded visit).
      await tx.doctorPatientVisit.upsert({
        where: { appointmentId: id },
        create: {
          doctorId: current.doctorId,
          appointmentId: id,
          patientId: current.patientId,
          patientPhone: canonicalPhone(current.patientPhone),
          slotStart: current.slotStart,
          completedAt: new Date(),
          qualifying,
          paymentStatusAtCompletion: current.paymentStatus,
        },
        update: {},
      });

      const refreshed = await tx.appointment.findUnique({
        where: { id },
        include: APPOINTMENT_INCLUDE,
      });
      if (!refreshed) throw new Error(`Appointment ${id} not found.`);
      return refreshed;
    });
    return this.toAppointmentRecord(updated);
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

  // ── Web-push (FCM) registration tokens ─────────────────────────────

  async upsertPushToken(userId: string, token: string, platform: string): Promise<void> {
    await this.db.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  async removePushToken(token: string, ownerUserId?: string): Promise<void> {
    // Owner-scoped: a user may only unregister their own devices.
    await this.db.pushToken.deleteMany({
      where: { token, ...(ownerUserId ? { userId: ownerUserId } : {}) },
    });
  }

  async listPushTokens(userId: string): Promise<string[]> {
    const rows = await this.db.pushToken.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { token: true },
    });
    return rows.map((row) => row.token);
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
      type: hospital.type,
      doctorCount: hospital.doctors.length,
    }));
  }

  async getHospitalByUserId(userId: string): Promise<HospitalContextRecord | null> {
    const hospital = await this.db.hospital.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        verificationStatus: true,
        verificationNote: true,
      },
    });
    return hospital ?? null;
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
