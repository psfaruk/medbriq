"use client";

/**
 * ProfessionalApplySection — patient-first onboarding, step 2 (master prompt §3.1).
 *
 * Every account starts as a user/patient. Doctors and hospitals apply for
 * their professional role AFTER signing in, from right here on the dashboard:
 *  - "Join as a doctor"  → POST /api/v2/auth/apply-doctor
 *  - "Register hospital" → POST /api/v2/auth/apply-hospital
 *
 * On success the API returns the upgraded SessionUser (role DOCTOR/HOSPITAL,
 * verification PENDING) — setUser() swaps the shell to the matching
 * dashboard instantly. Admin verification then takes over (docs/VVS.md).
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet, apiPost, ApiCallError } from "@/lib/api-client";
import { getPreloadedBoot } from "@/lib/boot-data";
import type { SessionUser, SpecialtyInfo } from "@/lib/types";
import { useT } from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";

export default function ProfessionalApplySection() {
  const { t } = useT();
  const { toast } = useToast();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const [dialog, setDialog] = useState<"doctor" | "hospital" | null>(null);

  // Only patients see the application cards — doctors/hospitals/admins don't.
  if (!user || user.role !== "PATIENT") return null;

  const onApplied = (updated: SessionUser, note: string) => {
    setUser(updated);
    setDialog(null);
    toast({
      title:
        updated.role === "DOCTOR"
          ? t("home.applyTitle")
          : t("home.applyHospitalTitle"),
      description: note,
    });
  };

  return (
    <section aria-label={t("home.professionalTitle")} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground">
            {t("home.professionalTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("home.professionalSubtitle")}
          </p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-transparent bg-secondary/10 text-secondary"
        >
          <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
          {t("common.verified")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDialog("doctor")}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:border-primary/50 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Stethoscope className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t("home.joinAsDoctor")}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {t("home.joinAsDoctorDesc")}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setDialog("hospital")}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:border-secondary/60 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-colors group-hover:bg-secondary group-hover:text-white">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              {t("home.registerHospital")}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {t("home.registerHospitalDesc")}
            </span>
          </span>
        </button>
      </div>

      <DoctorApplyDialog
        open={dialog === "doctor"}
        onOpenChange={(v) => (v ? null : setDialog(null))}
        onApplied={onApplied}
      />
      <HospitalApplyDialog
        open={dialog === "hospital"}
        onOpenChange={(v) => (v ? null : setDialog(null))}
        onApplied={onApplied}
      />
    </section>
  );
}

/* ── Doctor application ───────────────────────────────────────────── */

function DoctorApplyDialog({
  open,
  onOpenChange,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (user: SessionUser, note: string) => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<SpecialtyInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const [specialtySlug, setSpecialtySlug] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [experienceYears, setExperienceYears] = useState("5");
  const [consultationFee, setConsultationFee] = useState("1000");
  const [city, setCity] = useState("Dhaka");

  useEffect(() => {
    if (!open) return;
    const pre = getPreloadedBoot();
    if (pre?.specialties) {
      setSpecialties(pre.specialties);
      return;
    }
    apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
      .then((d) => setSpecialties(d.items))
      .catch(() => setSpecialties([]));
  }, [open]);

  const canSubmit =
    !!specialtySlug &&
    regNumber.trim().length >= 3 &&
    Number(consultationFee) > 0 &&
    city.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{ user: SessionUser }>(
        "/api/v2/auth/apply-doctor",
        {
          specialtySlug,
          regNumber: regNumber.trim(),
          experienceYears: Number(experienceYears) || 0,
          consultationFee: Number(consultationFee),
          followUpFee: 0,
          city: city.trim(),
        }
      );
      onApplied(
        data.user,
        "Application submitted — admin verifies your BMDC registration before your profile goes public."
      );
    } catch (err) {
      toast({
        title: "Application failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" aria-hidden="true" />
            {t("home.applyTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("home.joinAsDoctorDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("search.specialty")}</Label>
            <Select value={specialtySlug} onValueChange={setSpecialtySlug}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("search.anySpecialty")} />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-reg">BMDC Reg. No.</Label>
              <Input
                id="apply-reg"
                required
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="BMDC-A-12345"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-city">City</Label>
              <Input
                id="apply-city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-exp">{t("doctor.experience")} (years)</Label>
              <Input
                id="apply-exp"
                type="number"
                min={0}
                max={60}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-fee">
                {t("booking.consultationFee")} (৳)
              </Label>
              <Input
                id="apply-fee"
                type="number"
                min={100}
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
              />
            </div>
          </div>
          <p className="rounded-lg bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Your profile starts unverified (PENDING) — an admin reviews the BMDC
            registration before it appears in public search.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={busy || !canSubmit}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.confirm")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Hospital application ─────────────────────────────────────────── */

function HospitalApplyDialog({
  open,
  onOpenChange,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplied: (user: SessionUser, note: string) => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [hospitalName, setHospitalName] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const canSubmit = hospitalName.trim().length >= 3 && city.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{ user: SessionUser }>(
        "/api/v2/auth/apply-hospital",
        {
          hospitalName: hospitalName.trim(),
          city: city.trim(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        }
      );
      onApplied(
        data.user,
        "Hospital registered (pending verification) — add branches and departments once verified."
      );
    } catch (err) {
      toast({
        title: "Application failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-secondary" aria-hidden="true" />
            {t("home.applyHospitalTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("home.registerHospitalDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="apply-hname">Hospital / clinic name</Label>
            <Input
              id="apply-hname"
              required
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              placeholder="e.g. Shapla Health Complex"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="apply-hcity">City</Label>
              <Input
                id="apply-hcity"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apply-hphone">
                {t("auth.phone")}{" "}
                <span className="text-muted-foreground">
                  ({t("common.optional")})
                </span>
              </Label>
              <Input
                id="apply-hphone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apply-haddr">
              Address{" "}
              <span className="text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <Input
              id="apply-haddr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, area"
            />
          </div>
          <p className="rounded-lg bg-muted/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Your hospital starts PENDING — the platform admin verifies before
            the dashboard goes live.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={busy || !canSubmit}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.confirm")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
