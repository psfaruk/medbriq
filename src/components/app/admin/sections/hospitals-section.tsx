"use client";

import { useCallback, useState } from "react";
import {
  Building2,
  MapPin,
  Stethoscope,
  GitBranch,
  UserRound,
  Mail,
  Phone,
  BadgeCheck,
  XCircle,
  Search,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "@/lib/api-client";
import type { HospitalInfo } from "@/lib/types";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  VerificationBadge,
} from "@/components/app/shared/ui-kit";
import type { AdminHospitalItem } from "../types";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Hospitals — verification review + directory.
 *
 * Primary source: GET /api/v2/admin/hospitals (manager, branch counts,
 * verification status). That endpoint currently fails server-side (it sorts
 * by a Hospital.createdAt column that does not exist in the Prisma schema),
 * so this section falls back to the public directory (GET /api/v1/hospitals)
 * and says so honestly — statuses show as "Unknown" instead of fake values.
 * The decision endpoint (POST /api/v2/admin/hospitals/{id}/decision) works,
 * so reviewing is still possible from either mode.
 */

type HospitalRow = AdminHospitalItem & {
  /** present in fallback mode (public directory row) */
  about?: string | null;
  /** true when verificationStatus is unknown (fallback mode, no override) */
  statusUnknown?: boolean;
};

type HospitalsPayload = {
  rows: HospitalRow[];
  source: "v2" | "fallback";
  v2Error: string | null;
};

type ReviewTarget = {
  id: string;
  name: string;
  details: HospitalRow;
  /** note captured in the review dialog, carried into the approve confirm */
  pendingNote: string | null;
};

export default function HospitalsSection({
  onMutate,
}: {
  onMutate?: () => void;
}) {
  const { toast } = useToast();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState<ReviewTarget | null>(null);
  /** status overrides learned from decision responses in fallback mode */
  const [overrides, setOverrides] = useState<
    Record<string, { status: string; note: string | null }>
  >({});

  const loader = useCallback(async (): Promise<HospitalsPayload> => {
    try {
      const res = await apiGet<{ items: AdminHospitalItem[] }>(
        "/api/v2/admin/hospitals"
      );
      return {
        rows: res.items.map((h) => ({ ...h, statusUnknown: false })),
        source: "v2",
        v2Error: null,
      };
    } catch (err) {
      // Fall back to the public directory — verification status is not part
      // of that payload, so rows are flagged statusUnknown.
      const pub = await apiGet<{ items: HospitalInfo[] }>("/api/v1/hospitals");
      const raw = err instanceof Error ? err.message : "Request failed.";
      return {
        rows: pub.items.map((h) => ({
          id: h.id,
          name: h.name,
          slug: h.slug,
          city: h.city,
          address: h.address,
          phone: h.phone,
          verificationStatus: "PENDING",
          verificationNote: null,
          managerName: null,
          managerEmail: null,
          doctorCount: h.doctorCount,
          branchCount: 0,
          about: h.about,
          statusUnknown: true,
        })),
        source: "fallback",
        v2Error:
          raw.length < 120 ? raw : "Endpoint returned a server error (500).",
      };
    }
  }, []);

  const { data, error, loading, reload } = useAdminData(loader);

  const submitDecision = async (
    hospitalId: string,
    name: string,
    status: "VERIFIED" | "REJECTED" | "UNDER_REVIEW",
    withNote: string | null
  ) => {
    setBusy(true);
    try {
      await apiPost(`/api/v2/admin/hospitals/${hospitalId}/decision`, {
        status,
        ...(withNote ? { note: withNote } : {}),
      });
      toast({
        title:
          status === "VERIFIED"
            ? "Hospital approved"
            : status === "REJECTED"
              ? "Hospital rejected"
              : "Marked under review",
        description: `${name} — the manager is notified.`,
      });
      setOverrides((prev) => ({
        ...prev,
        [hospitalId]: { status, note: withNote },
      }));
      setTarget(null);
      setConfirmApprove(null);
      setNote("");
      setNoteError(null);
      reload();
      onMutate?.();
    } catch (err) {
      toast({
        title: "Decision failed",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const rejectFromDialog = () => {
    if (!target) return;
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      setNoteError("A rejection note of at least 3 characters is required.");
      return;
    }
    void submitDecision(target.id, target.name, "REJECTED", trimmed);
  };

  const underReviewFromDialog = () => {
    if (!target) return;
    void submitDecision(
      target.id,
      target.name,
      "UNDER_REVIEW",
      note.trim().length >= 3 ? note.trim() : null
    );
  };
  const rows = (data?.rows ?? []).map((r) => {
    const override = overrides[r.id];
    if (override) {
      return {
        ...r,
        verificationStatus: override.status,
        verificationNote: override.note,
        statusUnknown: false,
      };
    }
    return r;
  });

  const pending = rows.filter((h) =>
    h.statusUnknown || ["PENDING", "UNDER_REVIEW", "MORE_INFO"].includes(h.verificationStatus)
  );
  const decided = rows.filter(
    (h) => !h.statusUnknown && ["VERIFIED", "REJECTED"].includes(h.verificationStatus)
  );

  const openReview = (row: HospitalRow) => {
    setNote("");
    setNoteError(null);
    setTarget({
      id: row.id,
      name: row.name,
      details: row,
      pendingNote: null,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hospitals"
        subtitle="Verify hospital accounts before they appear as booking partners, and monitor the directory."
      />

      {loading ? (
        <LoadingCard rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          {data?.source === "fallback" ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                <p className="font-semibold">
                  Admin hospitals endpoint failed — showing the public directory
                  instead.
                </p>
                <p className="mt-0.5">
                  Verification statuses are unknown in this view (no fake
                  values). Reviewing still works: open a hospital and post a
                  decision, which uses a separate, working endpoint. Server
                  said: <span className="font-mono">{data.v2Error}</span>
                </p>
              </div>
            </div>
          ) : null}

          {/* ── Review queue ─────────────────────────────────────── */}
          <SectionCard
            title={`Awaiting verification (${pending.length})`}
            contentClassName="p-4 sm:p-5"
          >
            {pending.length === 0 ? (
              <EmptyState
                icon={<BadgeCheck className="h-6 w-6" />}
                title="Nothing waiting for review"
                hint="Hospitals with pending or under-review status will appear here."
                className="border-0 bg-transparent shadow-none"
              />
            ) : (
              <ul className="space-y-3">
                {pending.map((h) => (
                  <li
                    key={h.id}
                    className="rounded-2xl border border-border bg-background/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                          <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {h.name}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {h.city}
                            </span>
                            {h.managerName ? (
                              <span className="flex items-center gap-1">
                                <UserRound className="h-3 w-3" />
                                {h.managerName}
                              </span>
                            ) : null}
                            {h.managerEmail ? (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {h.managerEmail}
                              </span>
                            ) : null}
                          </p>
                          {h.verificationNote && !h.statusUnknown ? (
                            <p className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                              <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                              Last note: {h.verificationNote}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {h.statusUnknown ? (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-slate-500"
                        >
                          Status unknown
                        </Badge>
                      ) : (
                        <VerificationBadge status={h.verificationStatus} />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Stethoscope className="h-3 w-3" />
                        {h.doctorCount} doctor{h.doctorCount === 1 ? "" : "s"}
                      </span>
                      {h.branchCount > 0 ? (
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          {h.branchCount} branch{h.branchCount === 1 ? "" : "es"}
                        </span>
                      ) : null}
                      {h.phone ? (
                        <span className="flex items-center gap-1 tabular-nums">
                          <Phone className="h-3 w-3" />
                          {h.phone}
                        </span>
                      ) : null}
                      <Button
                        size="sm"
                        className="ml-auto gap-1.5"
                        onClick={() => openReview(h)}
                      >
                        <Search className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* ── Verified / decided ───────────────────────────────── */}
          <SectionCard
            title={`Reviewed hospitals (${decided.length})`}
            contentClassName="p-0"
          >
            {decided.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No verified or rejected hospitals yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {decided.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {h.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {h.city}
                        {h.managerName ? ` · ${h.managerName}` : ""}
                        {` · ${h.doctorCount} doctors`}
                      </span>
                    </span>
                    <VerificationBadge status={h.verificationStatus} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => openReview(h)}
                    >
                      Re-review
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {/* ── Approve confirmation ─────────────────────────────────── */}
      <AlertDialog
        open={confirmApprove !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmApprove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve {confirmApprove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The hospital will be marked VERIFIED, its manager is notified, and
              it becomes a trusted partner on the platform. This action is
              audit-logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={(e) => {
                if (!confirmApprove) return;
                e.preventDefault();
                void submitDecision(
                  confirmApprove.id,
                  confirmApprove.name,
                  "VERIFIED",
                  confirmApprove.pendingNote
                );
              }}
            >
              <BadgeCheck className="h-4 w-4" />
              {busy ? "Approving…" : "Approve hospital"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Review dialog (details + reject / under-review + approve) ── */}
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{target?.name}</DialogTitle>
            <DialogDescription>
              {target?.details.statusUnknown
                ? "Verification status is unknown (directory fallback). Decide below — the status you set becomes effective immediately."
                : "Review the hospital record and record a verification decision."}
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-xs">
            <div>
              <dt className="text-muted-foreground">City</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {target?.details.city}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {target?.details.phone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Manager</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {target?.details.managerName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Manager email</dt>
              <dd className="mt-0.5 break-all font-medium text-foreground">
                {target?.details.managerEmail ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Doctors</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {target?.details.doctorCount ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Branches</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                {target?.details.branchCount ?? 0}
              </dd>
            </div>
          </dl>
          {target?.details.address ? (
            <p className="text-xs text-muted-foreground">
              {target.details.address}
            </p>
          ) : null}
          {target?.details.about ? (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {target.details.about}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="hospital-note">
              Review note{" "}
              <span className="text-muted-foreground">
                (required for rejection, optional otherwise, max 500)
              </span>
            </Label>
            <Textarea
              id="hospital-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError(null);
              }}
              placeholder="e.g. License documents verified against the DGHS registry."
              rows={3}
              aria-invalid={noteError ? true : undefined}
            />
            {noteError ? (
              <p className="text-xs font-medium text-destructive">{noteError}</p>
            ) : null}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                disabled={busy}
                onClick={rejectFromDialog}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                disabled={busy}
                onClick={underReviewFromDialog}
              >
                <Search className="h-4 w-4" />
                Under review
              </Button>
            </div>
            <Button
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={busy}
              onClick={() => {
                if (!target) return;
                const noteSnapshot = note.trim().length >= 3 ? note.trim() : null;
                setConfirmApprove({ ...target, pendingNote: noteSnapshot });
                setTarget(null);
              }}
            >
              <BadgeCheck className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
