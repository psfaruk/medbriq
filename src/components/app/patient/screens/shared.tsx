"use client";

/**
 * shared.tsx — building blocks local to the new-style patient screens.
 *
 * Mirrors the visual conventions of home.tsx / doctors.tsx (rounded-2xl
 * cards, border-border, shadow-soft, card-lift) and reuses the shared
 * ui-kit primitives. Kept inside screens/ so this screen set stays
 * self-contained (the legacy ../parts.tsx module is intentionally unused).
 */

import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cn } from "@/lib/utils";
import { apiPatch, apiPost } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { SlotInfoDto } from "@/lib/types";
import {
  useT,
  dhakaToday,
  addDaysStr,
  DAY_LABELS,
} from "@/components/app/shared/ui-kit";

// ── small pure helpers ──────────────────────────────────────────────

/** "570" → "9:30" (weekly-schedule minute-of-day label). */
export function minutesLabel(m: number): string {
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** Dhaka (UTC+6, no DST) hour of an ISO timestamp. */
export function dhakaHour(iso: string): number {
  return (new Date(iso).getUTCHours() + 6) % 24;
}

/** Bangladeshi mobile number: 01XXXXXXXXX or +8801XXXXXXXXX (spaces/dashes ok). */
export function isValidBdPhone(raw: string): boolean {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  return /^(?:\+?880|0)1[3-9]\d{8}$/.test(cleaned);
}

/** Relative-time label: "just now" / "5m ago" / "2h ago" / "3d ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const RELATION_LABELS: Record<string, string> = {
  SELF: "Self",
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  SIBLING: "Sibling",
  OTHER: "Other",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
};

export function relationLabel(relation: string): string {
  return RELATION_LABELS[relation] ?? relation;
}

export function genderLabel(gender: string): string {
  return GENDER_LABELS[gender] ?? gender;
}

/** Map language codes used in the seed data to display labels. */
export function languageLabel(code: string): string {
  if (code === "bn") return "বাংলা";
  if (code === "en") return "English";
  return code;
}

// ── family member type (mirrors /api/v2/patient/family DTO) ─────────

export type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  createdAt: string;
};

// ── data-fetching hook (setState only inside async callbacks) ───────

export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[]
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [...deps, reloadKey]);

  const reload = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };

  return { data, loading, error, reload };
}

// ── small labelled row used in fee/summary cards ────────────────────

export function InfoRow({
  label,
  children,
  strong,
}: {
  label: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm text-foreground",
          strong && "text-base font-bold"
        )}
      >
        {children}
      </span>
    </div>
  );
}

// ── horizontal date strip (booking + reschedule) ────────────────────

export function DateStrip({
  value,
  onChange,
  days = 14,
}: {
  value: string;
  onChange: (date: string) => void;
  days?: number;
}) {
  const { t } = useT();
  const today = dhakaToday();
  const tomorrow = addDaysStr(today, 1);
  const dates = Array.from({ length: days }, (_, i) => addDaysStr(today, i));
  return (
    <div
      className="app-scroll flex gap-2 overflow-x-auto pb-1"
      role="listbox"
      aria-label={t("booking.selectDate")}
    >
      {dates.map((d) => {
        const selected = d === value;
        const dow = DAY_LABELS[new Date(`${d}T00:00:00Z`).getUTCDay()];
        const dayNum = Number(d.slice(8, 10));
        const top =
          d === today
            ? t("common.today")
            : d === tomorrow
              ? t("common.tomorrow")
              : dow;
        return (
          <button
            key={d}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(d)}
            className={cn(
              "flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-card text-foreground hover:border-primary/50"
            )}
          >
            <span
              className={cn(
                "text-[11px] font-medium",
                selected ? "text-primary-foreground/85" : "text-muted-foreground"
              )}
            >
              {top}
            </span>
            <span className="text-lg font-bold leading-tight tabular-nums">
              {dayNum}
            </span>
            <span
              className={cn(
                "text-[10px]",
                selected ? "text-primary-foreground/85" : "text-muted-foreground"
              )}
            >
              {dow}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── slot grid grouped by Dhaka daypart ──────────────────────────────

export function SlotGrid({
  slots,
  selectedIso,
  onSelect,
}: {
  slots: SlotInfoDto[];
  selectedIso: string | null;
  onSelect: (slot: SlotInfoDto) => void;
}) {
  const { t } = useT();
  const groups: { label: string; items: SlotInfoDto[] }[] = [];
  const morning = slots.filter((s) => dhakaHour(s.startIso) < 12);
  const afternoon = slots.filter(
    (s) => dhakaHour(s.startIso) >= 12 && dhakaHour(s.startIso) < 17
  );
  const evening = slots.filter((s) => dhakaHour(s.startIso) >= 17);
  if (morning.length) groups.push({ label: t("booking.morning"), items: morning });
  if (afternoon.length)
    groups.push({ label: t("booking.afternoon"), items: afternoon });
  if (evening.length) groups.push({ label: t("booking.evening"), items: evening });

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.items.map((slot) => {
              const disabled = slot.taken || slot.past;
              const selected = slot.startIso === selectedIso;
              return (
                <button
                  key={slot.startIso}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => onSelect(slot)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-sm font-medium tabular-nums transition-colors",
                    disabled &&
                      "cursor-not-allowed border-border/60 bg-muted/50 text-muted-foreground/60 line-through",
                    !disabled &&
                      selected &&
                      "border-primary bg-primary text-primary-foreground shadow-soft",
                    !disabled &&
                      !selected &&
                      "border-border bg-card text-foreground hover:border-primary/60 hover:bg-primary-soft/40"
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── add / edit family member dialog (booking step 3 + records) ──────

function FamilyMemberForm({
  member,
  onDone,
  onSaved,
}: {
  member?: FamilyMember | null;
  onDone: () => void;
  onSaved: (m: FamilyMember) => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [name, setName] = useState(member?.name ?? "");
  const [relation, setRelation] = useState<string>(member?.relation ?? "SPOUSE");
  const [age, setAge] = useState(member?.age != null ? String(member.age) : "");
  const [gender, setGender] = useState<string>(member?.gender ?? "none");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async () => {
    if (name.trim().length < 2) {
      setFormError(t("records.nameMin"));
      return;
    }
    setSaving(true);
    setFormError(null);
    const body: Record<string, unknown> = {
      name: name.trim(),
      relation,
    };
    if (age.trim() !== "") {
      const parsedAge = Number(age);
      if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
        setFormError(t("records.ageRange"));
        setSaving(false);
        return;
      }
      body.age = parsedAge;
    }
    if (gender !== "none") body.gender = gender;
    if (phone.trim() !== "") body.phone = phone.trim();
    try {
      const res = member
        ? await apiPatch<{ member: FamilyMember }>(
            `/api/v2/patient/family/${member.id}`,
            body
          )
        : await apiPost<{ member: FamilyMember }>("/api/v2/patient/family", body);
      toast({
        title: member
          ? t("records.memberUpdated")
          : t("records.memberSaved"),
        description: res.member.name,
      });
      onSaved(res.member);
      onDone();
    } catch {
      setFormError(t("records.memberSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="fm-name">{t("records.memberName")}</Label>
        <Input
          id="fm-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Amina Khatun"
          maxLength={80}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("records.relation")}</Label>
          <Select value={relation} onValueChange={setRelation}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(RELATION_LABELS)
                .filter(([key]) => key !== "SELF")
                .map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fm-age">
            {t("records.age")} ({t("common.optional")})
          </Label>
          <Input
            id="fm-age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 34"
            maxLength={3}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>
            {t("records.gender")} ({t("common.optional")})
          </Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-full">
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
        <div className="space-y-1.5">
          <Label htmlFor="fm-phone">
            {t("auth.phone")} ({t("common.optional")})
          </Label>
          <Input
            id="fm-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            maxLength={20}
          />
        </div>
      </div>
      {formError ? (
        <p className="text-xs font-medium break-words text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? t("common.loading") : t("common.save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FamilyMemberDialog({
  open,
  onOpenChange,
  member,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: FamilyMember | null;
  onSaved: (m: FamilyMember) => void;
}) {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {member ? t("records.editMember") : t("records.addMember")}
          </DialogTitle>
          <DialogDescription>{t("records.dialogSubtitle")}</DialogDescription>
        </DialogHeader>
        <FamilyMemberForm
          key={member?.id ?? "new"}
          member={member}
          onDone={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}
