"use client";

/**
 * Fee settings (CRITICAL FEATURE) — current doctor-wise fee structure,
 * edit dialog with validity presets, immutable version history table.
 * PUT bumps the version; existing confirmed bookings keep their snapshot.
 */

import { useCallback, useEffect, useState } from "react";
import { BadgeDollarSign, History, Info, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DemoNotice,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  SectionCard,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { apiGet, apiPut } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import type { FeeHistoryItem, FeeSettingsDto } from "@/lib/types";
import { errMessage, validityLabel } from "../helpers";

const VALIDITY_PRESETS = [1, 2, 3, 6, 12];

type FeeForm = {
  newPatientFee: string;
  returningPatientFee: string;
  retValue: string;
  retUnit: "DAYS" | "MONTHS";
  followUpEnabled: boolean;
  followUpFee: string;
  fuValue: string;
  fuUnit: "DAYS" | "MONTHS";
  changeReason: string;
};

function toForm(s: FeeSettingsDto): FeeForm {
  return {
    newPatientFee: String(s.newPatientFee),
    returningPatientFee: String(s.returningPatientFee),
    retValue: String(s.returningValidityValue),
    retUnit: s.returningValidityUnit,
    followUpEnabled: s.followUpEnabled,
    followUpFee: String(s.followUpFee),
    fuValue: String(s.followUpValidityValue),
    fuUnit: s.followUpValidityUnit,
    changeReason: "",
  };
}

export default function FeesSection() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<FeeSettingsDto | null>(null);
  const [history, setHistory] = useState<FeeHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FeeForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<{ settings: FeeSettingsDto }>("/api/v1/doctor/fee-settings"),
      apiGet<{ items: FeeHistoryItem[] }>(
        "/api/v1/doctor/fee-settings/history"
      ),
    ])
      .then(([a, b]) => {
        if (!alive) return;
        setSettings(a.settings);
        setHistory(b.items);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(errMessage(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  const openEdit = () => {
    if (!settings) return;
    setForm(toForm(settings));
    setFormError(null);
    setEditOpen(true);
  };

  const validate = (f: FeeForm): string | null => {
    const newFee = Number(f.newPatientFee);
    const retFee = Number(f.returningPatientFee);
    const fuFee = Number(f.followUpFee);
    const retValue = Number(f.retValue);
    const fuValue = Number(f.fuValue);
    if (!Number.isInteger(newFee) || newFee < 0 || newFee > 100000)
      return "New patient fee must be a whole number between 0 and 100,000 BDT.";
    if (!Number.isInteger(retFee) || retFee < 0 || retFee > 100000)
      return "Returning patient fee must be a whole number between 0 and 100,000 BDT.";
    if (retFee > newFee)
      return "Returning patient fee cannot exceed the new patient fee (returning is a discount).";
    if (!Number.isInteger(retValue) || retValue < 1)
      return "Returning validity must be at least 1.";
    if (f.retUnit === "DAYS" && retValue > 365)
      return "Returning validity cannot exceed 365 days.";
    if (f.retUnit === "MONTHS" && retValue > 36)
      return "Returning validity cannot exceed 36 months.";
    if (f.followUpEnabled) {
      if (!Number.isInteger(fuFee) || fuFee < 0 || fuFee > 100000)
        return "Follow-up fee must be a whole number between 0 and 100,000 BDT.";
      if (fuFee > newFee)
        return "Follow-up fee cannot exceed the new patient fee.";
      if (!Number.isInteger(fuValue) || fuValue < 1)
        return "Follow-up validity must be at least 1.";
      if (f.fuUnit === "DAYS" && fuValue > 90)
        return "Follow-up validity cannot exceed 90 days.";
      if (f.fuUnit === "MONTHS" && fuValue > 12)
        return "Follow-up validity cannot exceed 12 months.";
    }
    if (f.changeReason.length > 200)
      return "Change reason must be at most 200 characters.";
    return null;
  };

  const save = async () => {
    if (!form || !settings) return;
    const problem = validate(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    try {
      const data = await apiPut<{ settings: FeeSettingsDto }>(
        "/api/v1/doctor/fee-settings",
        {
          newPatientFee: Number(form.newPatientFee),
          returningPatientFee: Number(form.returningPatientFee),
          returningValidityValue: Number(form.retValue),
          returningValidityUnit: form.retUnit,
          followUpEnabled: form.followUpEnabled,
          followUpFee: Number(form.followUpFee),
          followUpValidityValue: Number(form.fuValue),
          followUpValidityUnit: form.fuUnit,
          ...(form.changeReason.trim()
            ? { changeReason: form.changeReason.trim() }
            : {}),
        }
      );
      toast({
        title: "Fee settings updated",
        description: `New bookings use v${data.settings.version}. Existing confirmed bookings keep their price.`,
      });
      setEditOpen(false);
      reload();
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={4} />
        <LoadingCard rows={3} />
      </div>
    );
  }

  if (error && !settings) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Fee settings"
        subtitle="Your doctor-wise fee structure. Every change creates a new immutable version — existing bookings keep the price they were booked at."
        action={
          <Button onClick={openEdit} className="gap-2">
            <PencilLine className="h-4 w-4" />
            Edit fee settings
          </Button>
        }
      />

      {/* Current settings */}
      <SectionCard
        title="Current fee structure"
        action={
          <Badge variant="outline" className="bg-primary-soft font-semibold text-primary">
            Version {settings?.version}
          </Badge>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-primary-soft/50 px-4 py-3">
            <p className="text-xs font-medium text-primary">New patient</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {settings ? <Money amount={settings.newPatientFee} /> : "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              First completed visit with you
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-accent px-4 py-3">
            <p className="text-xs font-medium text-accent-foreground">
              Returning patient
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {settings ? <Money amount={settings.returningPatientFee} /> : "—"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Within {settings ? validityLabel(settings.returningValidityValue, settings.returningValidityUnit) : "—"} of a completed visit
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/60 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Follow-up {settings?.followUpEnabled ? "" : "(disabled)"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {settings?.followUpEnabled ? (
                <Money amount={settings.followUpFee} />
              ) : (
                "—"
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {settings?.followUpEnabled
                ? `Within ${validityLabel(settings.followUpValidityValue, settings.followUpValidityUnit)} of a completed visit`
                : "Follow-up pricing is off"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Last updated {settings ? fmtDateTime(settings.updatedAt) : "—"} ·
          Version {settings?.version}
        </p>
      </SectionCard>

      {/* Classification note */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Classification:</strong> a
          patient&apos;s first completed visit with you is priced as{" "}
          <strong className="text-foreground">New</strong>. Bookings within your
          validity window after a completed visit are priced as{" "}
          <strong className="text-foreground">Returning</strong>. Only completed
          consultations count — cancelled or missed appointments never create
          eligibility.
        </p>
      </div>

      {/* History */}
      <SectionCard
        title="Fee version history"
        action={
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Immutable audit trail
          </span>
        }
      >
        {!history || history.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No versions recorded yet.
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[70px]">Version</TableHead>
                    <TableHead className="text-right">New</TableHead>
                    <TableHead className="text-right">Returning</TableHead>
                    <TableHead>Returning validity</TableHead>
                    <TableHead className="text-right">Follow-up</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-[150px]">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row, i) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          v{row.version}
                          {i === 0 ? (
                            <Badge className="bg-primary text-[10px] hover:bg-primary">
                              current
                            </Badge>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Money amount={row.newPatientFee} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Money amount={row.returningPatientFee} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {validityLabel(row.returningValidityValue, row.returningValidityUnit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.followUpEnabled ? (
                          <>
                            <Money amount={row.followUpFee} />{" "}
                            <span className="text-[11px]">
                              / {validityLabel(row.followUpValidityValue, row.followUpValidityUnit)}
                            </span>
                          </>
                        ) : (
                          "Disabled"
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {row.changeReason ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fmtDateTime(row.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Mobile cards */}
            <ul className="space-y-2 md:hidden">
              {history.map((row, i) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-border/70 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">Version {row.version}</span>
                    {i === 0 ? (
                      <Badge className="bg-primary text-[10px] hover:bg-primary">
                        current
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDateTime(row.createdAt)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    New <Money amount={row.newPatientFee} /> · Returning{" "}
                    <Money amount={row.returningPatientFee} /> /{" "}
                    {validityLabel(row.returningValidityValue, row.returningValidityUnit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.followUpEnabled
                      ? `Follow-up ${row.followUpFee} BDT / ${validityLabel(row.followUpValidityValue, row.followUpValidityUnit)}`
                      : "Follow-up disabled"}
                  </p>
                  {row.changeReason ? (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      “{row.changeReason}”
                    </p>
                  ) : null}
                  {i !== 0 ? null : (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Updated {fmtDateTime(row.createdAt)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      <DemoNotice>
        <strong className="text-foreground">Versioning.</strong> Each save
        creates version v+1 — patients booking afterwards see the new fees,
        while already-confirmed bookings keep the price they were quoted.
      </DemoNotice>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => !open && setEditOpen(false)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              Edit fee settings
            </DialogTitle>
            <DialogDescription>
              Saving creates version {(settings?.version ?? 0) + 1}. Existing
              confirmed bookings keep their current price.
            </DialogDescription>
          </DialogHeader>

          {form ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fee-new">New patient fee (৳)</Label>
                  <Input
                    id="fee-new"
                    type="number"
                    min={0}
                    max={100000}
                    value={form.newPatientFee}
                    onChange={(e) =>
                      setForm({ ...form, newPatientFee: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fee-ret">Returning patient fee (৳)</Label>
                  <Input
                    id="fee-ret"
                    type="number"
                    min={0}
                    max={100000}
                    value={form.returningPatientFee}
                    onChange={(e) =>
                      setForm({ ...form, returningPatientFee: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <Label>Returning validity window</Label>
                <div className="flex flex-wrap gap-1.5">
                  {VALIDITY_PRESETS.map((m) => {
                    const active =
                      form.retUnit === "MONTHS" && Number(form.retValue) === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            retValue: String(m),
                            retUnit: "MONTHS",
                          })
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
                        }`}
                      >
                        {m} {m === 1 ? "month" : "months"}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="ret-custom" className="text-xs">
                      Custom value
                    </Label>
                    <Input
                      id="ret-custom"
                      type="number"
                      min={1}
                      value={form.retValue}
                      onChange={(e) =>
                        setForm({ ...form, retValue: e.target.value })
                      }
                    />
                  </div>
                  <Select
                    value={form.retUnit}
                    onValueChange={(v: "DAYS" | "MONTHS") =>
                      setForm({ ...form, retUnit: v })
                    }
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHS">months</SelectItem>
                      <SelectItem value="DAYS">days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  After a completed visit, bookings within{" "}
                  {validityLabel(Number(form.retValue) || 0, form.retUnit)} are
                  priced at the returning fee.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="fu-switch">Follow-up pricing</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Short-window follow-up visits at a lower fee
                    </p>
                  </div>
                  <Switch
                    id="fu-switch"
                    checked={form.followUpEnabled}
                    onCheckedChange={(v) => setForm({ ...form, followUpEnabled: v })}
                  />
                </div>
                {form.followUpEnabled ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="fee-fu">Follow-up fee (৳)</Label>
                        <Input
                          id="fee-fu"
                          type="number"
                          min={0}
                          max={100000}
                          value={form.followUpFee}
                          onChange={(e) =>
                            setForm({ ...form, followUpFee: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="fu-validity">Follow-up validity</Label>
                        <div className="flex gap-2">
                          <Input
                            id="fu-validity"
                            type="number"
                            min={1}
                            value={form.fuValue}
                            onChange={(e) =>
                              setForm({ ...form, fuValue: e.target.value })
                            }
                          />
                          <Select
                            value={form.fuUnit}
                            onValueChange={(v: "DAYS" | "MONTHS") =>
                              setForm({ ...form, fuUnit: v })
                            }
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DAYS">days</SelectItem>
                              <SelectItem value="MONTHS">months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fee-reason">
                  Change reason (optional, kept in history)
                </Label>
                <Textarea
                  id="fee-reason"
                  rows={2}
                  maxLength={200}
                  value={form.changeReason}
                  onChange={(e) =>
                    setForm({ ...form, changeReason: e.target.value })
                  }
                  placeholder="e.g. Adjusting for new chamber costs"
                />
              </div>

              {formError ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save fee settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
