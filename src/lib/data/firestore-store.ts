import { randomUUID } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { normalizePhone } from "@/lib/phone";
import type {
  AppointmentPatch,
  AppointmentRecord,
  AuditLogRecord,
  AuthUser,
  AuthUserWithCredentials,
  AvailabilityRuleRecord,
  CreateAppointmentInput,
  CreateAuditLogInput,
  CreateDoctorAccountInput,
  CreatePatientUserInput,
  DataStore,
  DoctorProfilePatch,
  DoctorRecord,
  ListDoctorsOptions,
  NewAvailabilityRule,
  ReferenceMeta,
  ReviewRecord,
  SearchDoctorsFilters,
  SessionRecord,
  SpecialtyRecord,
} from "./types";
import { ReferenceCodeCollisionError, SlotConflictError } from "./types";

/**
 * Medbriq production data store — Firebase Firestore (firebase-admin v14).
 *
 * Collection modeling (docs/database.md §8):
 *   users/{uuid}              {email, passwordHash, name, phone, role, status, createdAt, updatedAt}
 *   sessions/{token}          token IS the doc id → unique by construction
 *   specialties/{uuid}        {name, nameBn, slug, icon}
 *   hospitals/{uuid}          {name, slug, city, address, phone, about}
 *   doctors/{uuid}            profile scalars + hospitalId + specialtyIds: string[]
 *   availability_rules/{doctorId}_{dayOfWeek}_{startMinute}   → mirrors @@unique([doctorId, dayOfWeek, startMinute])
 *   appointments/{doctorId}_{slotStartISO}                    → THE double-booking guard, mirrors @@unique([doctorId, slotStart]).
 *                             The stable logical id lives INSIDE the doc (`id` field) so it survives reschedule.
 *   reviews/{doctorId}_{patientId}                            → mirrors @@unique([doctorId, patientId])
 *   audit_logs/{uuid}         {actorId, action, entity, entityId, meta, createdAt}
 *
 * TRADEOFF (deliberate, demo-scale): Firestore composite indexes are NOT
 * available for this project, so list/search methods use at most ONE indexed
 * equality / array-contains filter (e.g. where('doctorId','==',x)) and do the
 * remaining filtering, sorting and pagination in JavaScript. With the demo
 * dataset (12 doctors / 17 users / a handful of appointments and reviews) this
 * costs a few dozen document reads per request. At real scale this must move
 * to composite indexes + denormalized counters (see docs/database.md §8).
 *
 * All timestamps are stored as ISO-8601 UTC strings — consistent, sortable,
 * and identical to the JSON the API already returns.
 */

// ─────────────────────────── Firestore bootstrap ───────────────────────────

/**
 * Read + parse FIREBASE_SERVICE_ACCOUNT. Returns null when the variable is
 * absent or not valid JSON (callers fall back to the local Prisma store).
 */
export function parseServiceAccountEnv(): object | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed !== null && typeof parsed === "object" ? (parsed as object) : null;
  } catch (err) {
    console.error(
      "[medbriq-store] FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON — falling back to Prisma/SQLite.",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Initialize (or reuse) the admin app and return the Firestore client for the
 * named database. The database id comes from FIREBASE_DATABASE_ID (default
 * "default"). NOTE: `admin.firestore()` / `admin.credential.cert` do not exist
 * in firebase-admin v14 — use the modular imports below.
 */
export function getFirestoreFromEnv(): Firestore {
  const serviceAccount = parseServiceAccountEnv();
  if (!serviceAccount) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set or invalid — cannot initialize the Firestore store."
    );
  }
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
      });
  const databaseId = process.env.FIREBASE_DATABASE_ID || "default";
  return getFirestore(app, databaseId);
}

/** Firestore status-code classification (ALREADY_EXISTS = 6) for create() guards. */
function isAlreadyExistsError(err: unknown): boolean {
  const e = err as { code?: number | string; message?: string };
  return (
    e?.code === 6 ||
    e?.code === "ALREADY_EXISTS" ||
    (typeof e?.message === "string" && e.message.toLowerCase().includes("already exists"))
  );
}

// ─────────────────────────── Document shapes ───────────────────────────

type UserDoc = {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
  role: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
};

type SpecialtyDoc = {
  name: string;
  nameBn?: string | null;
  slug: string;
  icon?: string | null;
};

type HospitalDoc = {
  name: string;
  slug: string;
  city: string;
  address?: string | null;
};

type DoctorDoc = {
  userId: string;
  slug: string;
  bio?: string | null;
  experienceYears: number;
  consultationFee: number;
  followUpFee: number;
  videoConsultFee?: number | null;
  regNumber?: string | null;
  verificationStatus: string;
  verificationNote?: string | null;
  verifiedAt?: string | null;
  city: string;
  country?: string;
  chamberAddress?: string | null;
  languages?: string | null;
  supportsVideo?: boolean;
  requiresApproval?: boolean;
  photoUrl?: string | null;
  hospitalId?: string | null;
  specialtyIds?: string[];
  createdAt: string;
  updatedAt: string;
};

type AppointmentDoc = {
  id: string; // stable logical id (survives reschedule)
  referenceCode: string;
  doctorId: string;
  patientId?: string | null;
  patientName: string;
  patientPhone: string;
  patientAge?: number | null;
  patientGender?: string | null;
  notes?: string | null;
  slotStart: string;
  slotEnd: string;
  type: string;
  status: string;
  bookingMode: string;
  fee: number;
  currency: string;
  doctorNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AvailabilityRuleDoc = {
  doctorId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
  createdAt: string;
};

type ReviewDoc = {
  doctorId: string;
  patientId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

type AuditLogDoc = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: string | null;
  createdAt: string;
};

/** Doc id of an appointment = the (doctorId, slotStart) uniqueness guard. */
function appointmentDocId(doctorId: string, slotStartIso: string): string {
  return `${doctorId}_${slotStartIso}`;
}

// ─────────────────────────── The store ───────────────────────────

export class FirestoreStore implements DataStore {
  private client: Firestore | null = null;

  private get fs(): Firestore {
    if (!this.client) this.client = getFirestoreFromEnv();
    return this.client;
  }

  /**
   * Directory context: whole small collections read once per call so doctor
   * records can be "joined" in memory (Firestore has no server-side joins and
   * this project has no composite indexes). Demo-scale tradeoff — see header.
   */
  private async loadDirectoryContext() {
    const [usersSnap, specialtiesSnap, hospitalsSnap, reviewsSnap] =
      await Promise.all([
        this.fs.collection("users").get(),
        this.fs.collection("specialties").get(),
        this.fs.collection("hospitals").get(),
        this.fs.collection("reviews").get(),
      ]);
    const users = new Map<string, UserDoc>();
    for (const doc of usersSnap.docs) users.set(doc.id, doc.data() as UserDoc);
    const specialties = new Map<string, SpecialtyDoc>();
    for (const doc of specialtiesSnap.docs)
      specialties.set(doc.id, doc.data() as SpecialtyDoc);
    const hospitals = new Map<string, HospitalDoc>();
    for (const doc of hospitalsSnap.docs)
      hospitals.set(doc.id, doc.data() as HospitalDoc);
    const reviewRatingsByDoctor = new Map<string, number[]>();
    for (const doc of reviewsSnap.docs) {
      const review = doc.data() as ReviewDoc;
      const list = reviewRatingsByDoctor.get(review.doctorId) ?? [];
      list.push(review.rating);
      reviewRatingsByDoctor.set(review.doctorId, list);
    }
    return { users, specialties, hospitals, reviewRatingsByDoctor };
  }

  private assembleDoctorRecord(
    id: string,
    doc: DoctorDoc,
    ctx: Awaited<ReturnType<FirestoreStore["loadDirectoryContext"]>>
  ): DoctorRecord {
    const user = ctx.users.get(doc.userId);
    const specialties = (doc.specialtyIds ?? [])
      .map((specialtyId) => ctx.specialties.get(specialtyId))
      .filter((s): s is SpecialtyDoc => s !== undefined)
      .map((s) => ({ name: s.name, slug: s.slug }));
    const hospital = doc.hospitalId
      ? ctx.hospitals.get(doc.hospitalId)
      : undefined;
    return {
      id,
      userId: doc.userId,
      slug: doc.slug,
      bio: doc.bio ?? null,
      experienceYears: doc.experienceYears ?? 0,
      consultationFee: doc.consultationFee,
      followUpFee: doc.followUpFee ?? 0,
      videoConsultFee: doc.videoConsultFee ?? null,
      regNumber: doc.regNumber ?? null,
      verificationStatus: doc.verificationStatus,
      verificationNote: doc.verificationNote ?? null,
      verifiedAt: doc.verifiedAt ?? null,
      city: doc.city,
      country: doc.country ?? "Bangladesh",
      chamberAddress: doc.chamberAddress ?? null,
      languages: doc.languages ?? null,
      supportsVideo: doc.supportsVideo ?? false,
      requiresApproval: doc.requiresApproval ?? true,
      photoUrl: doc.photoUrl ?? null,
      hospitalId: doc.hospitalId ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? null,
      specialties,
      hospital: hospital
        ? {
            name: hospital.name,
            slug: hospital.slug,
            city: hospital.city,
            address: hospital.address ?? null,
          }
        : null,
      reviewRatings: ctx.reviewRatingsByDoctor.get(id) ?? [],
    };
  }

  /** Doctor join for a single appointment (≤4 reads). */
  private async loadDoctorJoin(doctorId: string): Promise<AppointmentRecord["doctor"]> {
    const doctorSnap = await this.fs.collection("doctors").doc(doctorId).get();
    if (!doctorSnap.exists) {
      throw new Error(`Doctor profile ${doctorId} not found (data integrity).`);
    }
    const doctor = doctorSnap.data() as DoctorDoc;
    const specialtySnaps = await Promise.all(
      (doctor.specialtyIds ?? []).map((specialtyId) =>
        this.fs.collection("specialties").doc(specialtyId).get()
      )
    );
    const userSnap = await this.fs.collection("users").doc(doctor.userId).get();
    const user = userSnap.exists ? (userSnap.data() as UserDoc) : undefined;
    return {
      userId: doctor.userId,
      slug: doctor.slug,
      city: doctor.city,
      consultationFee: doctor.consultationFee,
      requiresApproval: doctor.requiresApproval ?? true,
      name: user?.name ?? "",
      specialties: specialtySnaps
        .filter((snap) => snap.exists)
        .map((snap) => (snap.data() as SpecialtyDoc).name),
    };
  }

  private assembleAppointmentRecord(
    doc: AppointmentDoc
  ): Omit<AppointmentRecord, "doctor"> & { doctorId: string } {
    return {
      id: doc.id,
      referenceCode: doc.referenceCode,
      doctorId: doc.doctorId,
      patientId: doc.patientId ?? null,
      patientName: doc.patientName,
      patientPhone: doc.patientPhone,
      patientAge: doc.patientAge ?? null,
      patientGender: doc.patientGender ?? null,
      notes: doc.notes ?? null,
      slotStart: doc.slotStart,
      slotEnd: doc.slotEnd,
      type: doc.type,
      status: doc.status,
      bookingMode: doc.bookingMode,
      fee: doc.fee,
      currency: doc.currency,
      doctorNote: doc.doctorNote ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /** Fetch one appointment doc by its stable logical id. */
  private async getAppointmentDoc(id: string) {
    const snap = await this.fs
      .collection("appointments")
      .where("id", "==", id)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { ref: snap.docs[0].ref, data: snap.docs[0].data() as AppointmentDoc };
  }

  private async withDoctorJoin(doc: AppointmentDoc): Promise<AppointmentRecord> {
    const join = await this.loadDoctorJoin(doc.doctorId);
    return { ...this.assembleAppointmentRecord(doc), doctor: join };
  }

  // ── Auth / users / sessions ──────────────────────────────────────────

  async findUserByEmail(email: string): Promise<AuthUserWithCredentials | null> {
    const snap = await this.fs
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const user = doc.data() as UserDoc;
    // Resolve the 1:1 doctor profile (single indexed equality).
    const profileSnap = await this.fs
      .collection("doctors")
      .where("userId", "==", doc.id)
      .limit(1)
      .get();
    const profile = profileSnap.empty
      ? null
      : (profileSnap.docs[0].data() as DoctorDoc);
    return {
      id: doc.id,
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name,
      phone: user.phone ?? null,
      role: user.role,
      status: user.status ?? "ACTIVE",
      doctorSlug: profile?.slug ?? null,
      verificationStatus: profile?.verificationStatus ?? null,
    };
  }

  async createPatientUser(input: CreatePatientUserInput): Promise<AuthUser> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.fs
      .collection("users")
      .doc(id)
      .set({
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        phone: input.phone,
        role: "PATIENT",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
    return {
      id,
      email: input.email,
      name: input.name,
      phone: input.phone,
      role: "PATIENT",
      status: "ACTIVE",
      doctorSlug: null,
      verificationStatus: null,
    };
  }

  async createDoctorAccount(input: CreateDoctorAccountInput): Promise<AuthUser> {
    const userId = randomUUID();
    const doctorId = randomUUID();
    const now = new Date().toISOString();
    // Atomic batch: user + profile + specialty link (mirrors the Prisma
    // nested create). Email uniqueness was checked by the caller; Firestore
    // has no native unique field at demo scale (documented tradeoff).
    const batch = this.fs.batch();
    batch.set(this.fs.collection("users").doc(userId), {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      phone: input.phone,
      role: "DOCTOR",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });
    batch.set(this.fs.collection("doctors").doc(doctorId), {
      userId,
      slug: input.profile.slug,
      bio: input.profile.bio,
      experienceYears: input.profile.experienceYears,
      consultationFee: input.profile.consultationFee,
      followUpFee: input.profile.followUpFee,
      videoConsultFee: input.profile.videoConsultFee,
      regNumber: input.profile.regNumber,
      verificationStatus: input.profile.verificationStatus,
      verificationNote: null,
      verifiedAt: null,
      city: input.profile.city,
      country: "Bangladesh",
      chamberAddress: input.profile.chamberAddress,
      languages: input.profile.languages,
      supportsVideo: input.profile.supportsVideo,
      requiresApproval: input.profile.requiresApproval,
      photoUrl: null,
      hospitalId: input.profile.hospitalId,
      specialtyIds: [input.specialtyId],
      createdAt: now,
      updatedAt: now,
    });
    await batch.commit();
    return {
      id: userId,
      email: input.email,
      name: input.name,
      phone: input.phone,
      role: "DOCTOR",
      status: "ACTIVE",
      doctorSlug: input.profile.slug,
      verificationStatus: input.profile.verificationStatus,
    };
  }

  async createSession(token: string, userId: string, expiresAtIso: string): Promise<void> {
    // token IS the doc id → unique by construction. create() (not set()) so a
    // token collision surfaces as an error, like the Prisma unique column.
    await this.fs
      .collection("sessions")
      .doc(token)
      .create({ userId, expiresAt: expiresAtIso, createdAt: new Date().toISOString() });
  }

  async getSessionUser(token: string): Promise<SessionRecord | null> {
    const snap = await this.fs.collection("sessions").doc(token).get();
    if (!snap.exists) return null;
    const session = snap.data() as { userId: string; expiresAt: string; createdAt: string };
    const userSnap = await this.fs
      .collection("users")
      .doc(session.userId)
      .get();
    if (!userSnap.exists) return null;
    const user = userSnap.data() as UserDoc;
    const profileSnap = await this.fs
      .collection("doctors")
      .where("userId", "==", userSnap.id)
      .limit(1)
      .get();
    const profile = profileSnap.empty
      ? null
      : (profileSnap.docs[0].data() as DoctorDoc);
    // NOTE: in Firestore mode the session "id" is the token (= doc id).
    return {
      id: token,
      token,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      user: {
        id: userSnap.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status ?? "ACTIVE",
        doctorSlug: profile?.slug ?? null,
        verificationStatus: profile?.verificationStatus ?? null,
      },
    };
  }

  async deleteSessionById(id: string): Promise<void> {
    // In Firestore mode the session doc id is the token (see getSessionUser).
    await this.fs.collection("sessions").doc(id).delete();
  }

  async deleteSessionsByToken(token: string): Promise<void> {
    await this.fs.collection("sessions").doc(token).delete();
  }

  // ── Reference data ───────────────────────────────────────────────────

  async findSpecialtyBySlug(slug: string): Promise<SpecialtyRecord | null> {
    const snap = await this.fs
      .collection("specialties")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const specialty = doc.data() as SpecialtyDoc;
    return {
      id: doc.id,
      name: specialty.name,
      nameBn: specialty.nameBn ?? null,
      slug: specialty.slug,
      icon: specialty.icon ?? null,
    };
  }

  async getSpecialtiesWithDoctorCounts(publicStatuses: string[]) {
    const [specialtiesSnap, doctorsSnap] = await Promise.all([
      this.fs.collection("specialties").get(),
      this.fs.collection("doctors").get(),
    ]);
    const publicDoctorSpecialties = doctorsSnap.docs
      .map((doc) => doc.data() as DoctorDoc)
      .filter((doc) => publicStatuses.includes(doc.verificationStatus))
      .flatMap((doc) => doc.specialtyIds ?? []);
    return specialtiesSnap.docs.map((doc) => {
      const specialty = doc.data() as SpecialtyDoc;
      return {
        id: doc.id,
        name: specialty.name,
        nameBn: specialty.nameBn ?? null,
        slug: specialty.slug,
        icon: specialty.icon ?? null,
        doctorCount: publicDoctorSpecialties.filter((sid) => sid === doc.id).length,
      };
    });
  }

  async getReferenceMeta(publicStatuses: string[]): Promise<ReferenceMeta> {
    const [doctorsSnap, specialtiesSnap, hospitalsSnap] = await Promise.all([
      this.fs.collection("doctors").get(),
      this.fs.collection("specialties").get(),
      this.fs.collection("hospitals").get(),
    ]);
    const doctors = doctorsSnap.docs.map((doc) => doc.data() as DoctorDoc);
    const cities = [
      ...new Set(
        doctors
          .filter((doc) => publicStatuses.includes(doc.verificationStatus))
          .map((doc) => doc.city)
      ),
    ];
    return {
      cities,
      verifiedDoctors: doctors.filter((d) => d.verificationStatus === "VERIFIED").length,
      pendingDoctors: doctors.filter((d) => d.verificationStatus === "PENDING").length,
      specialtyCount: specialtiesSnap.size,
      hospitalCount: hospitalsSnap.size,
    };
  }

  // ── Doctors ──────────────────────────────────────────────────────────

  async searchDoctors(filters: SearchDoctorsFilters): Promise<DoctorRecord[]> {
    const ctx = await this.loadDirectoryContext();
    // At most ONE indexed equality: when a single status is requested (the
    // "verified only" filter) push it to Firestore; otherwise read the (small)
    // collection and filter the statuses in JS.
    const doctorsSnap =
      filters.statuses.length === 1
        ? await this.fs
            .collection("doctors")
            .where("verificationStatus", "==", filters.statuses[0])
            .get()
        : await this.fs.collection("doctors").get();
    return doctorsSnap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as DoctorDoc }))
      .filter(({ data }) => {
        if (!filters.statuses.includes(data.verificationStatus)) return false;
        if (filters.supportsVideo && !(data.supportsVideo ?? false)) return false;
        if (
          filters.maxFee !== undefined &&
          data.consultationFee > filters.maxFee
        ) {
          return false;
        }
        if (filters.specialtySlug) {
          const matches = (data.specialtyIds ?? []).some(
            (specialtyId) =>
              ctx.specialties.get(specialtyId)?.slug === filters.specialtySlug
          );
          if (!matches) return false;
        }
        return true;
      })
      .map(({ id, data }) => this.assembleDoctorRecord(id, data, ctx));
  }

  async getDoctorBySlug(slug: string): Promise<DoctorRecord | null> {
    const snap = await this.fs
      .collection("doctors")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const ctx = await this.loadDirectoryContext();
    return this.assembleDoctorRecord(
      snap.docs[0].id,
      snap.docs[0].data() as DoctorDoc,
      ctx
    );
  }

  async getDoctorById(id: string): Promise<DoctorRecord | null> {
    const snap = await this.fs.collection("doctors").doc(id).get();
    if (!snap.exists) return null;
    const ctx = await this.loadDirectoryContext();
    return this.assembleDoctorRecord(id, snap.data() as DoctorDoc, ctx);
  }

  async getDoctorByUserId(userId: string): Promise<DoctorRecord | null> {
    const snap = await this.fs
      .collection("doctors")
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const ctx = await this.loadDirectoryContext();
    return this.assembleDoctorRecord(
      snap.docs[0].id,
      snap.docs[0].data() as DoctorDoc,
      ctx
    );
  }

  async getDoctorIdAndStatusBySlug(slug: string) {
    const snap = await this.fs
      .collection("doctors")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0].data() as DoctorDoc;
    return { id: snap.docs[0].id, verificationStatus: doc.verificationStatus };
  }

  async doctorSlugExists(slug: string): Promise<boolean> {
    const snap = await this.fs
      .collection("doctors")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async updateDoctorProfile(id: string, patch: DoctorProfilePatch): Promise<DoctorRecord> {
    const ref = this.fs.collection("doctors").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new Error(`Doctor profile ${id} not found.`);
    }
    // Only defined keys are applied; `null` clears the field (Prisma semantics).
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) updates[key] = value;
    }
    await ref.update(updates);
    return this.getDoctorById(id).then((doctor) => {
      if (!doctor) throw new Error(`Doctor profile ${id} disappeared during update.`);
      return doctor;
    });
  }

  async listDoctors(options: ListDoctorsOptions): Promise<DoctorRecord[]> {
    const snap = options.verificationStatus
      ? await this.fs
          .collection("doctors")
          .where("verificationStatus", "==", options.verificationStatus)
          .get()
      : await this.fs.collection("doctors").get();
    const ctx = await this.loadDirectoryContext();
    const records = snap.docs.map((doc) =>
      this.assembleDoctorRecord(doc.id, doc.data() as DoctorDoc, ctx)
    );
    records.sort((a, b) =>
      options.order === "createdAtDesc"
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt)
    );
    return records;
  }

  // ── Availability ─────────────────────────────────────────────────────

  private sortRules(
    rules: { id: string; data: AvailabilityRuleDoc }[]
  ): AvailabilityRuleRecord[] {
    return rules
      .sort(
        (a, b) =>
          a.data.dayOfWeek - b.data.dayOfWeek ||
          a.data.startMinute - b.data.startMinute
      )
      .map(({ id, data }) => ({
        id,
        doctorId: data.doctorId,
        dayOfWeek: data.dayOfWeek,
        startMinute: data.startMinute,
        endMinute: data.endMinute,
        isActive: data.isActive,
        createdAt: data.createdAt,
      }));
  }

  async findActiveRulesForDay(doctorId: string, dayOfWeek: number) {
    // ONE indexed equality (doctorId); isActive/dayOfWeek filtered in JS.
    const snap = await this.fs
      .collection("availability_rules")
      .where("doctorId", "==", doctorId)
      .get();
    const rules = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as AvailabilityRuleDoc }))
      .filter(
        ({ data }) => data.isActive === true && data.dayOfWeek === dayOfWeek
      )
      .sort((a, b) => a.data.startMinute - b.data.startMinute);
    return rules.map(({ id, data }) => ({
      id,
      doctorId: data.doctorId,
      dayOfWeek: data.dayOfWeek,
      startMinute: data.startMinute,
      endMinute: data.endMinute,
      isActive: data.isActive,
      createdAt: data.createdAt,
    }));
  }

  async listAvailabilityRules(doctorId: string) {
    const snap = await this.fs
      .collection("availability_rules")
      .where("doctorId", "==", doctorId)
      .get();
    return this.sortRules(
      snap.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() as AvailabilityRuleDoc,
      }))
    );
  }

  async replaceAvailabilityRules(doctorId: string, rules: NewAvailabilityRule[]) {
    const collection = this.fs.collection("availability_rules");
    const existing = await collection.where("doctorId", "==", doctorId).get();
    const now = new Date().toISOString();
    // Atomic batch: delete the old docs + create the new ones with
    // deterministic ids `${doctorId}_${dayOfWeek}_${startMinute}` (the doc-id
    // equivalent of @@unique([doctorId, dayOfWeek, startMinute])).
    const batch = this.fs.batch();
    for (const doc of existing.docs) batch.delete(doc.ref);
    for (const rule of rules) {
      batch.set(collection.doc(`${doctorId}_${rule.dayOfWeek}_${rule.startMinute}`), {
        doctorId,
        dayOfWeek: rule.dayOfWeek,
        startMinute: rule.startMinute,
        endMinute: rule.endMinute,
        isActive: rule.isActive,
        createdAt: now,
      });
    }
    await batch.commit();
    return this.listAvailabilityRules(doctorId);
  }

  // ── Appointments ─────────────────────────────────────────────────────

  async createAppointment(input: CreateAppointmentInput): Promise<AppointmentRecord> {
    const collection = this.fs.collection("appointments");
    const docId = appointmentDocId(input.doctorId, input.slotStart);
    const ref = collection.doc(docId);
    const now = new Date().toISOString();
    const data: AppointmentDoc = {
      id: randomUUID(),
      referenceCode: input.referenceCode,
      doctorId: input.doctorId,
      patientId: input.patientId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      notes: input.notes,
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      type: input.type,
      status: input.status,
      bookingMode: input.bookingMode,
      fee: input.fee,
      currency: input.currency,
      doctorNote: null,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.fs.runTransaction(async (txn) => {
        // DB-LEVEL DOUBLE-BOOKING GUARD: the doc id IS (doctorId, slotStart).
        // If it already exists the slot is taken — regardless of status —
        // exactly like the SQLite unique index. txn.create() additionally
        // enforces create-semantics under concurrency (a losing racer's
        // transaction is retried and then fails the existence check below).
        const existing = await txn.get(ref);
        if (existing.exists) {
          throw new SlotConflictError(
            "This slot was just booked by someone else. Please choose another slot."
          );
        }
        const dup = await txn.get(
          collection.where("referenceCode", "==", input.referenceCode).limit(1)
        );
        if (!dup.empty) throw new ReferenceCodeCollisionError();
        txn.create(ref, data);
      });
    } catch (err) {
      if (err instanceof SlotConflictError || err instanceof ReferenceCodeCollisionError) {
        throw err;
      }
      if (isAlreadyExistsError(err)) {
        throw new SlotConflictError(
          "This slot was just booked by someone else. Please choose another slot."
        );
      }
      throw err;
    }
    return this.withDoctorJoin(data);
  }

  async getAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const doc = await this.getAppointmentDoc(id);
    if (!doc) return null;
    return this.withDoctorJoin(doc.data);
  }

  async listAppointmentsByPatient(patientId: string) {
    const snap = await this.fs
      .collection("appointments")
      .where("patientId", "==", patientId)
      .get();
    const docs = snap.docs
      .map((doc) => doc.data() as AppointmentDoc)
      .sort((a, b) => b.slotStart.localeCompare(a.slotStart))
      .slice(0, 100);
    return Promise.all(docs.map((doc) => this.withDoctorJoin(doc)));
  }

  async listAppointmentsByDoctor(doctorId: string) {
    const snap = await this.fs
      .collection("appointments")
      .where("doctorId", "==", doctorId)
      .get();
    const join = await this.loadDoctorJoin(doctorId);
    return snap.docs
      .map((doc) => doc.data() as AppointmentDoc)
      .map((doc) => ({ ...this.assembleAppointmentRecord(doc), doctor: join }));
  }

  async findAppointmentsByReferenceCode(referenceCode: string, phone: string) {
    // referenceCode is stored uppercase (generator + seed), so an exact
    // equality on the uppercased input is equivalent to the case-insensitive
    // comparison used by the Prisma store. Phone compared normalized in JS.
    const snap = await this.fs
      .collection("appointments")
      .where("referenceCode", "==", referenceCode.toUpperCase())
      .get();
    const normalized = normalizePhone(phone);
    const docs = snap.docs
      .map((doc) => doc.data() as AppointmentDoc)
      .filter((doc) => normalizePhone(doc.patientPhone) === normalized)
      .sort((a, b) => b.slotStart.localeCompare(a.slotStart))
      .slice(0, 100);
    return Promise.all(docs.map((doc) => this.withDoctorJoin(doc)));
  }

  async findBlockingSlotStarts(doctorId: string, fromIso: string, toIso: string, statuses: string[]) {
    // ONE indexed equality (doctorId); range + status filtered in JS.
    const snap = await this.fs
      .collection("appointments")
      .where("doctorId", "==", doctorId)
      .get();
    return snap.docs
      .map((doc) => doc.data() as AppointmentDoc)
      .filter(
        (doc) =>
          statuses.includes(doc.status) &&
          doc.slotStart >= fromIso &&
          doc.slotStart < toIso
      )
      .map((doc) => doc.slotStart);
  }

  async updateAppointment(id: string, patch: AppointmentPatch) {
    const current = await this.getAppointmentDoc(id);
    if (!current) throw new Error(`Appointment ${id} not found.`);
    // Read-modify-write; the API layer guards the status transitions.
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.doctorNote !== undefined) updates.doctorNote = patch.doctorNote;
    await current.ref.update(updates);
    return this.withDoctorJoin({ ...current.data, ...(updates as Partial<AppointmentDoc>) });
  }

  async rescheduleAppointment(
    id: string,
    slotStartIso: string,
    slotEndIso: string,
    resetToPendingApproval: boolean
  ) {
    const current = await this.getAppointmentDoc(id);
    if (!current) throw new Error(`Appointment ${id} not found.`);
    const newDocId = appointmentDocId(current.data.doctorId, slotStartIso);
    const now = new Date().toISOString();

    if (newDocId === current.ref.id) {
      // Defensive: same slot — update in place (route already rejects this).
      return this.updateAppointment(id, {
        ...(resetToPendingApproval ? { status: "PENDING_APPROVAL" } : {}),
      });
    }

    const newRef = this.fs.collection("appointments").doc(newDocId);
    const updated: AppointmentDoc = {
      ...current.data,
      slotStart: slotStartIso,
      slotEnd: slotEndIso,
      updatedAt: now,
      ...(resetToPendingApproval ? { status: "PENDING_APPROVAL" } : {}),
    };
    try {
      await this.fs.runTransaction(async (txn) => {
        // The new slot's doc id is the uniqueness guard: if it exists the
        // target slot is taken (SLOT_TAKEN), mirroring the Prisma P2002.
        const existing = await txn.get(newRef);
        if (existing.exists) {
          throw new SlotConflictError(
            "This slot was just booked by someone else. Please choose another slot."
          );
        }
        txn.create(newRef, updated); // create-semantics under concurrency
        txn.delete(current.ref); // free the old slot
      });
    } catch (err) {
      if (err instanceof SlotConflictError) throw err;
      if (isAlreadyExistsError(err)) {
        throw new SlotConflictError(
          "This slot was just booked by someone else. Please choose another slot."
        );
      }
      throw err;
    }
    return this.withDoctorJoin(updated);
  }

  // ── Reviews ──────────────────────────────────────────────────────────

  async listReviewsByDoctor(doctorId: string): Promise<ReviewRecord[]> {
    const snap = await this.fs
      .collection("reviews")
      .where("doctorId", "==", doctorId)
      .get();
    const reviews = snap.docs
      .map((doc) => ({ id: doc.id, data: doc.data() as ReviewDoc }))
      .sort((a, b) => b.data.createdAt.localeCompare(a.data.createdAt));
    const patientNames = new Map<string, string>();
    await Promise.all(
      reviews.map(async ({ data }) => {
        if (patientNames.has(data.patientId)) return;
        const userSnap = await this.fs
          .collection("users")
          .doc(data.patientId)
          .get();
        patientNames.set(
          data.patientId,
          userSnap.exists ? (userSnap.data() as UserDoc).name : ""
        );
      })
    );
    return reviews.map(({ id, data }) => ({
      id,
      doctorId: data.doctorId,
      patientId: data.patientId,
      rating: data.rating,
      comment: data.comment ?? null,
      createdAt: data.createdAt,
      patientName: patientNames.get(data.patientId) ?? "",
    }));
  }

  // ── Admin ────────────────────────────────────────────────────────────

  async getAdminStats() {
    const [usersSnap, doctorsSnap, appointmentsSnap] = await Promise.all([
      this.fs.collection("users").get(),
      this.fs.collection("doctors").get(),
      this.fs.collection("appointments").get(),
    ]);
    const users = usersSnap.docs.map((doc) => doc.data() as UserDoc);
    const doctors = doctorsSnap.docs.map((doc) => doc.data() as DoctorDoc);
    const appointments = appointmentsSnap.docs.map(
      (doc) => doc.data() as AppointmentDoc
    );
    return {
      totalUsers: users.length,
      totalPatients: users.filter((u) => u.role === "PATIENT").length,
      totalDoctors: doctors.length,
      verifiedDoctors: doctors.filter((d) => d.verificationStatus === "VERIFIED").length,
      pendingDoctors: doctors.filter((d) =>
        ["PENDING", "UNDER_REVIEW", "MORE_INFO"].includes(d.verificationStatus)
      ).length,
      totalAppointments: appointments.length,
      confirmedAppointments: appointments.filter((a) => a.status === "CONFIRMED").length,
      pendingApprovals: appointments.filter((a) => a.status === "PENDING_APPROVAL").length,
    };
  }

  async listAuditLogs(limit: number): Promise<AuditLogRecord[]> {
    // orderBy on a single field (+ limit) uses the automatic single-field index.
    const snap = await this.fs
      .collection("audit_logs")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    const logs = snap.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as AuditLogDoc,
    }));
    const actorNames = new Map<string, string>();
    await Promise.all(
      logs.map(async ({ data }) => {
        if (!data.actorId || actorNames.has(data.actorId)) return;
        const userSnap = await this.fs.collection("users").doc(data.actorId).get();
        actorNames.set(
          data.actorId,
          userSnap.exists ? (userSnap.data() as UserDoc).name : ""
        );
      })
    );
    return logs.map(({ id, data }) => ({
      id,
      actorId: data.actorId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      meta: data.meta ?? null,
      createdAt: data.createdAt,
      actorName: data.actorId ? actorNames.get(data.actorId) ?? null : null,
    }));
  }

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    await this.fs
      .collection("audit_logs")
      .doc(randomUUID())
      .set({
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta,
        createdAt: new Date().toISOString(),
      });
  }
}
