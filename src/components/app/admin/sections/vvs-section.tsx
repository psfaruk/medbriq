"use client";

/**
 * VvsAdminSection — admin controls for the Verified Visit System:
 * the platform verification policy (Mode A/B/C) and the dispute queue
 * (dismiss or correct; corrections append audited events, never delete).
 */

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Flag,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  SectionCard,
  fmtDateTime,
  useT,
} from "@/components/app/shared/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/api-client";
import type { VvsDispute } from "@/lib/vvs-types";

type PolicyInfo = { key: "A" | "B" | "C"; en: string; bn: string; description: string };

export default function VvsAdminSection() {
  const { t } = useT();
  const [policy, setPolicy] = useState<"A" | "B" | "C" | null>(null);
  const [policies, setPolicies] = useState<PolicyInfo[]>([]);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [disputes, setDisputes] = useState<VvsDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [resolveFor, setResolveFor] = useState<VvsDispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [action, setAction] = useState<"DISMISS" | "CORRECT">("DISMISS");
  const [resolving, setResolving] = useState(false);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiGet<{ policy: "A" | "B" | "C"; policies: PolicyInfo[] }>(
        "/api/v2/vvs/settings"
      ),
      apiGet<{ items: VvsDispute[] }>("/api/v2/vvs/disputes"),
    ])
      .then(([settings, disputeData]) => {
        if (!alive) return;
        setPolicy(settings.policy);
        setPolicies(
          Object.values(settings.policies) as PolicyInfo[]
        );
        setDisputes(disputeData.items);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : t("common.error"));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey, t]);

  const setPolicyValue = async (value: "A" | "B" | "C") => {
    if (value === policy) return;
    setSavingPolicy(true);
    try {
      await apiPost("/api/v2/vvs/settings", { policy: value });
      setPolicy(value);
    } catch {
      /* keep previous value; reload shows the truth */
    } finally {
      setSavingPolicy(false);
    }
  };

  const openResolve = (d: VvsDispute, act: "DISMISS" | "CORRECT") => {
    setResolveFor(d);
    setAction(act);
    setResolution("");
  };

  const submitResolve = async () => {
    if (!resolveFor) return;
    setResolving(true);
    try {
      await apiPost(`/api/v2/vvs/disputes/${resolveFor.id}/resolve`, {
        action,
        resolution: resolution.trim(),
      });
      setResolveFor(null);
      reload();
    } catch {
      /* dialog stays open; admin can retry */
    } finally {
      setResolving(false);
    }
  };

  if (loading) return <LoadingCard rows={4} />;
  if (error && !policies.length) return <ErrorState message={error} onRetry={reload} />;

  const openDisputes = (disputes ?? []).filter((d) => d.status !== "RESOLVED");

  return (
    <div className="space-y-5">
      {/* verification policy */}
      <SectionCard title={t("vvs.admin.policyTitle")}>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("vvs.admin.policyHint")}
        </p>
        <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label={t("vvs.admin.policyTitle")}>
          {policies.map((p) => (
            <button
              key={p.key}
              role="radio"
              aria-checked={policy === p.key}
              disabled={savingPolicy}
              onClick={() => setPolicyValue(p.key)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                policy === p.key
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-background hover:border-primary/50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  policy === p.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {policy === p.key ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
                  Mode {p.key} · {p.en}
                  <span className="text-xs font-medium text-muted-foreground">
                    {p.bn}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {p.description}
                </span>
              </span>
            </button>
          ))}
        </div>
        {savingPolicy ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {t("common.loading")}
          </p>
        ) : null}
      </SectionCard>

      {/* disputes */}
      <SectionCard
        title={t("vvs.admin.disputesTitle")}
        action={
          openDisputes.length > 0 ? (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
              {openDisputes.length}
            </Badge>
          ) : undefined
        }
      >
        {!disputes || disputes.length === 0 ? (
          <EmptyState
            icon={<Flag className="h-6 w-6" />}
            title={t("vvs.admin.disputesEmpty")}
            hint={t("vvs.card.reportHint")}
          />
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold">
                        {t("vvs.admin.reportedBy")}: {d.reporterName}
                      </span>
                      {d.visit ? (
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {d.visit.receiptNumber}
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className={
                          d.status === "RESOLVED"
                            ? "text-[11px] text-emerald-700"
                            : "text-[11px] text-amber-700"
                        }
                      >
                        {d.status}
                      </Badge>
                    </div>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                      “{d.reason}”
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {fmtDateTime(d.createdAt)}
                      {d.resolution ? ` · ${d.resolution}` : ""}
                    </p>
                  </div>
                  {d.status !== "RESOLVED" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResolve(d, "DISMISS")}
                      >
                        {t("vvs.admin.dismiss")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openResolve(d, "CORRECT")}
                        className="bg-amber-600 text-white hover:bg-amber-700"
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                        {t("vvs.admin.correct")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* resolve dialog */}
      <Dialog open={!!resolveFor} onOpenChange={(o) => !o && setResolveFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              {action === "DISMISS"
                ? t("vvs.admin.dismiss")
                : t("vvs.admin.correct")}
            </DialogTitle>
            <DialogDescription>
              {action === "CORRECT" ? t("vvs.admin.correctHint") : undefined}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="vvs-resolution">{t("vvs.admin.resolutionNote")}</Label>
            <Textarea
              id="vvs-resolution"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value.slice(0, 1000))}
              placeholder="e.g. Confirmed with the doctor — the visit did take place."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveFor(null)}
              disabled={resolving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={submitResolve}
              disabled={resolving || resolution.trim().length < 3}
              className={
                action === "CORRECT"
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : undefined
              }
            >
              {resolving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("vvs.admin.resolve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
