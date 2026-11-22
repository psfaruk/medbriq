"use client";

import { useCallback, useState, type ComponentType, type ReactNode } from "react";
import {
  ToggleLeft,
  Video,
  CreditCard,
  FolderOpen,
  Star,
  Percent,
  Mail,
  Phone,
  Globe2,
  Stethoscope,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiGet, apiPut } from "@/lib/api-client";
import type { SpecialtyInfo } from "@/lib/types";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
} from "@/components/app/shared/ui-kit";
import type { FeatureFlagItem, PlatformPayload } from "../types";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Platform settings — feature flags (PUT /api/v2/admin/flags), commission
 * percent + support contacts (PUT /api/v2/admin/platform), the country
 * table and the read-only specialization list.
 */

const FLAG_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  telehealth: Video,
  onlinePayments: CreditCard,
  patientRecords: FolderOpen,
  reviews: Star,
};

type PlatformData = {
  flags: FeatureFlagItem[];
  platform: PlatformPayload;
  specialties: SpecialtyInfo[];
};

function CommissionEditor({
  initial,
  onSaved,
}: {
  initial: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const pct = Number(value);
    if (value.trim() === "" || !Number.isFinite(pct) || pct < 0 || pct > 50) {
      setError("Commission must be a number between 0 and 50 percent.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiPut("/api/v2/admin/platform", {
        key: "commissionPercent",
        value: String(pct),
      });
      toast({
        title: "Commission updated",
        description: `Platform commission is now ${pct}%.`,
      });
      onSaved();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="commission" className="text-xs">
        Platform commission (0–50%)
      </Label>
      <div className="flex gap-2">
        <div className="relative w-28">
          <Percent className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="commission"
            type="number"
            min={0}
            max={50}
            step="0.5"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            className="h-9 pr-8 tabular-nums"
            aria-invalid={error ? true : undefined}
          />
        </div>
        <Button
          size="sm"
          className="h-9 gap-1.5"
          disabled={busy || value === (initial ?? "")}
          onClick={() => void save()}
        >
          <Save className="h-3.5 w-3.5" />
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Applied to every completed consultation when computing doctor payouts.
        </p>
      )}
    </div>
  );
}

function SupportContactEditor({
  settingKey,
  label,
  icon,
  initial,
  onSaved,
}: {
  settingKey: "supportEmail" | "supportPhone";
  label: string;
  icon: ReactNode;
  initial: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setError(`Enter a valid ${label.toLowerCase()}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiPut("/api/v2/admin/platform", { key: settingKey, value: trimmed });
      toast({ title: "Support contact updated", description: label });
      onSaved();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`setting-${settingKey}`} className="flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={`setting-${settingKey}`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          className="h-9"
          aria-invalid={error ? true : undefined}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5"
          disabled={busy || value === (initial ?? "")}
          onClick={() => void save()}
        >
          <Save className="h-3.5 w-3.5" />
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

export default function PlatformSection() {
  const { toast } = useToast();
  const [flagBusy, setFlagBusy] = useState<string | null>(null);

  const loader = useCallback(async (): Promise<PlatformData> => {
    const [flags, platform, specialties] = await Promise.all([
      apiGet<{ items: FeatureFlagItem[] }>("/api/v2/admin/flags"),
      apiGet<PlatformPayload>("/api/v2/admin/platform"),
      apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties"),
    ]);
    return {
      flags: flags.items,
      platform,
      specialties: specialties.items,
    };
  }, []);
  const { data, error, loading, reload } = useAdminData(loader);

  const toggleFlag = async (flag: FeatureFlagItem, next: boolean) => {
    setFlagBusy(flag.key);
    try {
      await apiPut("/api/v2/admin/flags", { key: flag.key, enabled: next });
      toast({
        title: next ? "Feature enabled" : "Feature disabled",
        description: `${flag.key} is now ${next ? "ON" : "OFF"} — audit-logged.`,
      });
      reload();
    } catch (err) {
      toast({
        title: "Could not update the flag",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setFlagBusy(null);
    }
  };

  const settings = data?.platform.settings ?? [];
  const getSetting = (key: string) =>
    settings.find((s) => s.key === key)?.value ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform settings"
        subtitle="Feature gates, monetization and support configuration. Every change is audit-logged."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* ── Feature flags ─────────────────────────────────── */}
            <SectionCard title="Feature flags">
              <ul className="space-y-3">
                {data.flags.map((flag) => {
                  const Icon = FLAG_ICONS[flag.key] ?? ToggleLeft;
                  const isTelehealth = flag.key === "telehealth";
                  return (
                    <li
                      key={flag.key}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-xl border px-3 py-3",
                        isTelehealth && !flag.enabled
                          ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30"
                          : "border-border bg-background/40"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {flag.key}
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-medium",
                              flag.enabled
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-100 text-slate-600"
                            )}
                          >
                            {flag.enabled ? "On" : "Off"}
                          </Badge>
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {flag.description ?? "No description."}
                          {isTelehealth && !flag.enabled ? (
                            <span className="mt-1 block font-medium text-amber-700 dark:text-amber-400">
                              Disabled until DGHS telemedicine compliance review
                              passes — this is intentional, not a fault.
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <Switch
                        checked={flag.enabled}
                        disabled={flagBusy === flag.key}
                        onCheckedChange={(next) => void toggleFlag(flag, next)}
                        aria-label={`Toggle ${flag.key}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            {/* ── Monetization + support ────────────────────────── */}
            <SectionCard title="Monetization & support">
              <div className="space-y-5">
                <CommissionEditor
                  key={getSetting("commissionPercent") ?? "none"}
                  initial={getSetting("commissionPercent")}
                  onSaved={reload}
                />
                <Separator />
                <SupportContactEditor
                  key={`email-${getSetting("supportEmail") ?? ""}`}
                  settingKey="supportEmail"
                  label="Support email"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  initial={getSetting("supportEmail")}
                  onSaved={reload}
                />
                <SupportContactEditor
                  key={`phone-${getSetting("supportPhone") ?? ""}`}
                  settingKey="supportPhone"
                  label="Support hotline"
                  icon={<Phone className="h-3.5 w-3.5" />}
                  initial={getSetting("supportPhone")}
                  onSaved={reload}
                />
                <Separator />
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  Setting updates are validated (commission 0–50%) and written to
                  the audit trail with your admin identity.
                </p>
              </div>
            </SectionCard>
          </div>

          {/* ── Countries ───────────────────────────────────────── */}
          <SectionCard
            title={`Operating countries (${data.platform.countries.length})`}
            contentClassName="p-0"
          >
            {/* Desktop table (mobile gets stacked rows below) */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card hover:bg-card">
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Phone code</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.platform.countries.map((c) => (
                    <TableRow key={c.id} className="text-sm">
                      <TableCell className="font-mono font-semibold text-foreground">
                        {c.code}
                      </TableCell>
                      <TableCell className="flex items-center gap-1.5 text-muted-foreground">
                        <Globe2 className="h-3.5 w-3.5" />
                        {c.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.currency}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {c.phoneCode}
                      </TableCell>
                      <TableCell>
                        {c.isActive ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-slate-200 bg-slate-100 font-medium text-slate-500"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile stacked rows */}
            <ul className="divide-y divide-border/70 md:hidden">
              {data.platform.countries.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="font-mono">{c.code}</span>
                      <span className="truncate">{c.name}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {c.currency} · {c.phoneCode}
                    </p>
                  </div>
                  {c.isActive ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-emerald-200 bg-emerald-50 font-medium text-emerald-700"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-slate-200 bg-slate-100 font-medium text-slate-500"
                    >
                      Inactive
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* ── Specializations ────────────────────────────────── */}
          <SectionCard
            title={`Specializations (${data.specialties.length})`}
            contentClassName="p-0"
          >
            <ul className="divide-y divide-border/70">
              {data.specialties.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Stethoscope className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {s.name}
                      </span>
                      {s.nameBn ? (
                        <span className="block text-xs text-muted-foreground">
                          {s.nameBn}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {s.doctorCount} doctor{s.doctorCount === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-border/70 px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
              Read-only directory taxonomy — specialties are managed in the
              database, not from this console.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  );
}
