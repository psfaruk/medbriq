"use client";

/**
 * booking-flow.tsx — the 4-step booking wizard (new style):
 * Chamber → Date & time → Patient details → Fee breakdown & confirm,
 * followed by a success screen (instant confirm vs pending-approval).
 *
 * Business rules preserved from the legacy implementation:
 * - Patient classification (NEW / RETURNING / FOLLOW_UP) and the fee are
 *   always fetched from POST /api/v1/booking/price-preview before the
 *   confirmation step — never computed client-side.
 * - The actual booking (POST /api/v1/appointments) sends only an
 *   *expectation* (expectedFee / expectedPatientType); the server
 *   recomputes the authoritative price and answers 409 PRICE_CHANGED on
 *   mismatch, which re-runs the preview.
 */

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  MapPin,
  Plus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/app-state";
import { ApiCallError, apiGet, apiPost } from "@/lib/api-client";
import type {
  AppointmentDto,
  DoctorDetail,
  PricePreviewDto,
  SlotInfoDto,
} from "@/lib/types";
import {
  DemoNotice,
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PaymentStatusBadge,
  PatientTypeBadge,
  UserAvatar,
  useT,
  dhakaToday,
  fmtDateLong,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import {
  DateStrip,
  FamilyMemberDialog,
  FamilyMember,
  InfoRow,
  SlotGrid,
  isValidBdPhone,
  relationLabel,
} from "./shared";

type PayMethod = "BKASH" | "NAGAD" | "CARD";
type BookingResult = { appointment: AppointmentDto; referenceCode: string };

const STEP_KEYS = [
  "booking.step.chamber",
  "booking.step.datetime",
  "booking.step.details",
  "booking.step.confirm",
];

// ── progress chips ──────────────────────────────────────────────────

function StepChips({ step }: { step: number }) {
  const { t } = useT();
  return (
    <ol
      className="app-scroll flex items-center gap-1 overflow-x-auto pb-1"
      aria-label={t("booking.progress")}
    >
      {STEP_KEYS.map((key, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <li key={key} className="flex items-center gap-1">
            <span
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active && "border-primary bg-primary text-primary-foreground",
                done && "border-primary/40 bg-primary-soft text-primary",
                !active && !done && "border-border bg-card text-muted-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold",
                    active ? "border-white/70" : "border-border"
                  )}
                >
                  {idx}
                </span>
              )}
              {t(key)}
            </span>
            {i < STEP_KEYS.length - 1 ? (
              <ArrowRight
                className="h-3 w-3 shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// ── selectable chamber card ─────────────────────────────────────────

function ChamberCard({
  name,
  address,
  selected,
  onClick,
}: {
  name: string;
  address: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
          : "border-border bg-background hover:border-primary/50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{name}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {address}
        </span>
      </span>
      {selected ? (
        <CheckCircle2
          className="mt-1 h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

// ── main wizard ─────────────────────────────────────────────────────

export default function BookingFlowScreen({ slug }: { slug: string }) {
  const { t } = useT();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const popPatient = useAppStore((s) => s.popPatient);
  const resetPatient = useAppStore((s) => s.resetPatient);

  const [step, setStep] = useState(1);
  const [detail, setDetail] = useState<DoctorDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [chamberId, setChamberId] = useState<string | null>(null);
  const [date, setDate] = useState(() => dhakaToday());
  const [slots, setSlots] = useState<SlotInfoDto[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsReloadKey, setSlotsReloadKey] = useState(0);
  const [slot, setSlot] = useState<SlotInfoDto | null>(null);

  const [forSelf, setForSelf] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [family, setFamily] = useState<FamilyMember[] | null>(null);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("none");
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  const [preview, setPreview] = useState<PricePreviewDto | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [payOnline, setPayOnline] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("BKASH");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  // ── doctor detail ─────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    apiGet<DoctorDetail>(`/api/v1/doctors/${slug}`)
      .then((d) => {
        if (!active) return;
        setDetail(d);
        setDetailError(null);
        setDetailLoading(false);
        // single chamber → auto-select; zero chambers → null (address fallback)
        if (d.chambers.length === 1) setChamberId(d.chambers[0].id);
      })
      .catch((err) => {
        if (!active) return;
        setDetailError(
          err instanceof Error ? err.message : t("common.error")
        );
        setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, reloadKey]);

  // ── family members (step 3) ───────────────────────────────────
  useEffect(() => {
    let active = true;
    apiGet<{ items: FamilyMember[] }>("/api/v2/patient/family")
      .then((d) => {
        if (active) setFamily(d.items);
      })
      .catch(() => {
        if (active) setFamily([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // ── slots for the selected date + chamber ─────────────────────
  // (loading state is flipped in the change handlers / retry button so the
  // effect body only starts the fetch — no synchronous setState here)
  useEffect(() => {
    if (!detail) return;
    let active = true;
    const params = new URLSearchParams({ date });
    if (chamberId) params.set("chamberId", chamberId);
    apiGet<{ slots: SlotInfoDto[] }>(
      `/api/v1/doctors/${slug}/slots?${params.toString()}`
    )
      .then((d) => {
        if (!active) return;
        setSlots(d.slots);
        setSlotsError(null);
        setSlotsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setSlotsError(
          err instanceof Error ? err.message : t("common.error")
        );
        setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [detail, date, chamberId, slug, slotsReloadKey]);

  const refreshSlots = () => {
    setSlotsLoading(true);
    setSlotsError(null);
    setSlotsReloadKey((k) => k + 1);
  };

  const selectedChamber = useMemo(
    () => detail?.chambers.find((c) => c.id === chamberId) ?? null,
    [detail, chamberId]
  );

  // ── step guards ───────────────────────────────────────────────
  const detailsValid =
    name.trim().length >= 2 && isValidBdPhone(phone.trim());
  const canContinue =
    step === 1
      ? Boolean(detail) &&
        (chamberId !== null || (detail?.chambers.length ?? 1) === 0)
      : step === 2
        ? slot !== null
        : step === 3
          ? detailsValid
          : Boolean(preview) && !submitting;

  const selectSelf = () => {
    setForSelf(true);
    setMemberId(null);
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setAge("");
    setGender("none");
    setValidation(null);
  };

  const selectMember = (m: FamilyMember) => {
    setForSelf(false);
    setMemberId(m.id);
    setName(m.name);
    setPhone(m.phone ?? "");
    setAge(m.age != null ? String(m.age) : "");
    setGender(m.gender ?? "none");
    setValidation(null);
  };

  const fetchPreview = async () => {
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const d = await apiPost<{ preview: PricePreviewDto }>(
        "/api/v1/booking/price-preview",
        { doctorSlug: slug, patientPhone: phone.trim() }
      );
      setPreview(d.preview);
    } catch (err) {
      setPreviewError(
        err instanceof Error
          ? err.message
          : t("common.error")
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const next = async () => {
    if (step === 1 && canContinue) {
      setStep(2);
      return;
    }
    if (step === 2 && slot) {
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!detailsValid) {
        setValidation(
          !isValidBdPhone(phone.trim())
            ? t("booking.validPhone")
            : t("booking.validName")
        );
        return;
      }
      setValidation(null);
      setStep(4);
      await fetchPreview();
      return;
    }
    if (step === 4 && preview) {
      await confirmBooking();
    }
  };

  const back = () => {
    if (step === 1) {
      popPatient();
      return;
    }
    setStep(step - 1);
    setValidation(null);
  };

  const confirmBooking = async () => {
    if (!detail || !slot || !preview) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        doctorSlug: slug,
        date,
        slotStartIso: slot.startIso,
        type: "IN_PERSON",
        patientName: name.trim(),
        patientPhone: phone.trim(),
        expectedFee: preview.fee,
        expectedPatientType: preview.patientType,
        idempotencyKey:
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      };
      if (chamberId) body.chamberId = chamberId;
      if (age.trim() !== "") {
        const parsedAge = Number(age);
        if (Number.isInteger(parsedAge) && parsedAge >= 0 && parsedAge <= 120) {
          body.patientAge = parsedAge;
        }
      }
      if (gender !== "none") body.patientGender = gender;
      if (notes.trim() !== "") body.notes = notes.trim();

      const res = await apiPost<BookingResult>("/api/v1/appointments", body);

      // optional online payment (booking already exists — never block)
      if (payOnline) {
        try {
          await apiPost("/api/v2/payments", {
            appointmentId: res.appointment.id,
            method: payMethod,
          });
          toast({ title: t("booking.paymentSuccess") });
        } catch (err) {
          toast({
            title: t("appointments.payFailed"),
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }
      setResult(res);
    } catch (err) {
      if (err instanceof ApiCallError && err.code === "PRICE_CHANGED") {
        toast({
          title: t("booking.priceChanged"),
          description: t("booking.priceChangedHint"),
          variant: "destructive",
        });
        await fetchPreview();
      } else {
        toast({
          title: t("booking.failed"),
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ────────────────────────────────────────────────────

  if (detailLoading && !detail) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={5} />
        <LoadingCard rows={3} />
      </div>
    );
  }

  if (detailError && !detail) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={t("doctor.bookAppointment")}
          onBack={popPatient}
        />
        <ErrorState
          message={detailError}
          onRetry={() => {
            setDetailLoading(true);
            setDetailError(null);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  if (!detail) return null;

  if (result) {
    return (
      <SuccessView
        result={result}
        doctorName={detail.name}
        specialties={detail.specialties.map((s) => s.name).join(", ")}
        onDone={() => resetPatient({ name: "bookings" })}
        onHome={() => resetPatient({ name: "home" })}
      />
    );
  }

  const bookableSlots = (slots ?? []).filter((s) => !s.taken && !s.past);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("doctor.bookAppointment")}
        subtitle={detail.name}
        onBack={back}
      />

      <StepChips step={step} />

      {/* ── step 1: chamber ─────────────────────────────────────── */}
      {step === 1 ? (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">
            {t("booking.selectChamber")}
          </h2>
          {detail.chambers.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("doctor.chambers")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {detail.chamberAddress ??
                    detail.hospital?.address ??
                    detail.city}
                </p>
              </div>
            </div>
          ) : detail.chambers.length === 1 ? (
            <ChamberCard
              name={detail.chambers[0].name}
              address={[
                detail.chambers[0].address,
                detail.chambers[0].city,
              ]
                .filter(Boolean)
                .join(", ")}
              selected
              onClick={() => setChamberId(detail.chambers[0].id)}
            />
          ) : (
            <div className="space-y-2.5">
              {detail.chambers.map((c) => (
                <ChamberCard
                  key={c.id}
                  name={c.name}
                  address={[c.address, c.area, c.city]
                    .filter(Boolean)
                    .join(", ")}
                  selected={chamberId === c.id}
                  onClick={() => {
                    setChamberId(c.id);
                    setSlot(null);
                    setSlotsLoading(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* ── step 2: date & time ─────────────────────────────────── */}
      {step === 2 ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {t("booking.selectDate")}
            </h2>
            <DateStrip
              value={date}
              onChange={(d) => {
                setDate(d);
                setSlot(null);
                setSlotsLoading(true);
              }}
            />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              {t("booking.selectTime")}
            </h2>
            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : slotsError ? (
              <ErrorState message={slotsError} onRetry={refreshSlots} />
            ) : bookableSlots.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-6 w-6" />}
                title={t("booking.noSlots")}
                hint={t("booking.noSlotsHint")}
              />
            ) : (
              <SlotGrid
                slots={slots ?? []}
                selectedIso={slot?.startIso ?? null}
                onSelect={setSlot}
              />
            )}
          </div>
          {selectedChamber ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {selectedChamber.name} · {selectedChamber.city}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── step 3: patient details ─────────────────────────────── */}
      {step === 3 ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h2 className="text-sm font-semibold text-foreground">
            {t("booking.patientDetails")}
          </h2>

          {/* self vs family */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={selectSelf}
              aria-pressed={forSelf}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                forSelf
                  ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  forSelf
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {t("booking.forMyself")}
              </span>
            </button>

            {(family ?? []).length > 0
              ? (family ?? []).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMember(m)}
                    aria-pressed={!forSelf && memberId === m.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                      !forSelf && memberId === m.id
                        ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                        : "border-border bg-background hover:border-primary/50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full",
                        !forSelf && memberId === m.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Users className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {m.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {relationLabel(m.relation)}
                        {m.age != null
                          ? ` · ${t("common.ageYears", { years: m.age })}`
                          : ""}
                      </span>
                    </span>
                  </button>
                ))
              : null}

            <button
              type="button"
              onClick={() => setFamilyDialogOpen(true)}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background p-3.5 text-left text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold">
                {t("records.addMember")}
              </span>
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bk-name">
                {t("booking.patientName")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder={t("auth.name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-phone">
                {t("booking.mobileNumber")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bk-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-age">
                {t("booking.ageOptional")}
              </Label>
              <Input
                id="bk-age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 34"
                maxLength={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bk-gender">{t("booking.genderOptional")}</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-full" id="bk-gender">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.notSet")}</SelectItem>
                  <SelectItem value="MALE">{t("gender.MALE")}</SelectItem>
                  <SelectItem value="FEMALE">{t("gender.FEMALE")}</SelectItem>
                  <SelectItem value="OTHER">{t("gender.OTHER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bk-notes">{t("booking.notesForDoctor")}</Label>
            <Textarea
              id="bk-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t("booking.notesPlaceholder")}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {notes.length}/500
            </p>
          </div>

          {validation ? (
            <p className="text-xs font-medium text-destructive" role="alert">
              {validation}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── step 4: fee breakdown + confirm ─────────────────────── */}
      {step === 4 ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {t("booking.feeBreakdown")}
            </h2>

            {previewLoading ? (
              <div className="mt-3 space-y-2">
                <div className="h-10 animate-pulse rounded-xl bg-muted" />
                <div className="h-10 animate-pulse rounded-xl bg-muted" />
              </div>
            ) : previewError ? (
              <div className="mt-3">
                <ErrorState message={previewError} onRetry={fetchPreview} />
              </div>
            ) : preview ? (
              <div className="mt-3">
                <div className="flex items-center gap-2 rounded-xl bg-primary-soft/60 px-3.5 py-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("booking.classifiedAs")}
                  </span>
                  <PatientTypeBadge type={preview.patientType} />
                  <span className="ml-auto text-base font-bold text-foreground">
                    <Money amount={preview.fee} currency={preview.currency} />
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {preview.explanation}
                </p>
                <div className="mt-3 divide-y divide-border/70">
                  <InfoRow label={t("booking.consultationFee")}>
                    <Money amount={preview.fee} currency={preview.currency} />
                  </InfoRow>
                  <InfoRow label={t("common.total")} strong>
                    <Money amount={preview.fee} currency={preview.currency} />
                  </InfoRow>
                </div>
              </div>
            ) : null}
          </div>

          {/* payment method */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {t("booking.paymentMethod")}
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={!payOnline}
                onClick={() => setPayOnline(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  !payOnline
                    ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                    : "border-border bg-background hover:border-primary/50"
                )}
              >
                <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {t("booking.payAtChamber")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("booking.cashOnVisit")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={payOnline}
                onClick={() => setPayOnline(true)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                  payOnline
                    ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                    : "border-border bg-background hover:border-primary/50"
                )}
              >
                <CreditCard className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {t("booking.payOnline")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("booking.payMethodsHint")}
                  </span>
                </span>
              </button>
            </div>
            {payOnline ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(["BKASH", "NAGAD", "CARD"] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={payMethod === m}
                    onClick={() => setPayMethod(m)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                      payMethod === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    )}
                  >
                    {m === "BKASH" ? "bKash" : m === "NAGAD" ? "Nagad" : "Card"}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-3">
              <DemoNotice>
                <strong className="text-foreground">
                  {t("booking.sandboxTitle")}
                </strong>{" "}
                {t("booking.sandboxPayments")}
              </DemoNotice>
            </div>
          </div>

          {/* summary */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {t("booking.summary")}
            </h2>
            <div className="mt-2 divide-y divide-border/70">
              <InfoRow label={t("common.doctor")}>{detail.name}</InfoRow>
              <InfoRow label={t("booking.step.datetime")}>
                {fmtDateLong(slot?.startIso ?? "")} ·{" "}
                {slot ? fmtTime(slot.startIso) : ""}
              </InfoRow>
              {selectedChamber ? (
                <InfoRow label={t("booking.selectChamber")}>
                  {selectedChamber.name}
                </InfoRow>
              ) : null}
              <InfoRow label={t("common.patient")}>{name.trim()}</InfoRow>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── wizard footer (sticky above the mobile tab bar) ─────── */}
      <div className="sticky bottom-24 z-30 -mx-4 px-4 md:bottom-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-soft-lg backdrop-blur">
          <Button variant="outline" onClick={back} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("common.back")}
          </Button>
          <Button onClick={next} disabled={!canContinue} className="min-w-32">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("booking.processing")}
              </>
            ) : step === 4 ? (
              t("booking.confirmBooking")
            ) : (
              <>
                {t("common.continue")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>

      <FamilyMemberDialog
        open={familyDialogOpen}
        onOpenChange={setFamilyDialogOpen}
        onSaved={(m) => {
          setFamily((prev) => (prev ? [...prev, m] : [m]));
          selectMember(m);
        }}
      />
    </div>
  );
}

// ── success screen ──────────────────────────────────────────────────

function SuccessView({
  result,
  doctorName,
  specialties,
  onDone,
  onHome,
}: {
  result: BookingResult;
  doctorName: string;
  specialties: string;
  onDone: () => void;
  onHome: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const appt = result.appointment;
  const pending = appt.status === "PENDING_APPROVAL";

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(appt.referenceCode);
      toast({ title: t("booking.copied"), description: appt.referenceCode });
    } catch {
      toast({
        title: t("booking.copyFailed"),
        description: appt.referenceCode,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 py-4 text-center">
      <div className="flex justify-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
          <CheckCircle2
            className="h-11 w-11 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">
          {pending ? t("booking.pendingApproval") : t("booking.bookingConfirmed")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {pending ? t("booking.pendingHint") : t("booking.confirmedHint")}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 bg-muted/60 px-3 py-1.5 font-mono text-sm"
        >
          {t("booking.reference")}: {appt.referenceCode}
        </Badge>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={copyRef}
          aria-label={t("booking.copyReference")}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-left shadow-soft">
        <div className="flex items-center gap-3 border-b border-border/70 pb-3">
          <UserAvatar name={doctorName} className="h-11 w-11" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {doctorName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {specialties}
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/70">
          <InfoRow label={t("booking.step.datetime")}>
            {fmtDateLong(appt.slotStart)} · {fmtTime(appt.slotStart)}
          </InfoRow>
          {appt.chamberName ? (
            <InfoRow label={t("booking.selectChamber")}>
              {appt.chamberName}
            </InfoRow>
          ) : null}
          <InfoRow label={t("booking.patientType")}>
            <PatientTypeBadge type={appt.patientType} />
          </InfoRow>
          <InfoRow label={t("booking.consultationFee")}>
            <Money amount={appt.fee} currency={appt.currency} />
          </InfoRow>
          <InfoRow label={t("common.payment")}>
            <PaymentStatusBadge status={appt.paymentStatus} />
          </InfoRow>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={onDone} className="h-11">
          {t("common.viewAppointment")}
        </Button>
        <Button variant="outline" onClick={onHome} className="h-11">
          {t("booking.backToHome")}
        </Button>
      </div>

      <DemoNotice />
    </div>
  );
}
