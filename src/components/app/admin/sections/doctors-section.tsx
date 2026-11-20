"use client";

import { useCallback, useState } from "react";
import {
  Stethoscope,
  BadgeCheck,
  XCircle,
  MessageSquareWarning,
  Inbox,
  MapPin,
  GraduationCap,
  Banknote,
  FileText,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { VerificationItem } from "@/lib/types";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  Money,
  UserAvatar,
  VerificationBadge,
  fmtDate,
} from "@/components/app/shared/ui-kit";
import type { AdminDoctorItem } from "../types";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Doctors — two tabs:
 *  1. "All doctors": the full doctor directory (/api/v1/admin/doctors).
 *  2. "Verification queue": pending applications with Approve / Reject /
 *     Request-more-info decisions. Decisions POST
 *     /api/v1/admin/verifications/{doctorId}/decision with
 *     { decision: VERIFIED | REJECTED | MORE_INFO, note? } — the note is
 *     required (3–300 chars) for REJECTED and MORE_INFO.
 */

type DoctorDecision = "VERIFIED" | "REJECTED" | "MORE_INFO";

function AllDoctorsTable({ items }: { items: AdminDoctorItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Stethoscope className="h-6 w-6" />}
        title="No doctor profiles yet"
        hint="Doctors appear here once they register on the platform."
        className="m-4"
      />
    );
  }
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-card hover:bg-card">
              <TableHead>Doctor</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Consultation fee</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Verification</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.id} className="text-sm">
                <TableCell>
                  <span className="flex items-center gap-2.5">
                    <UserAvatar name={d.name} className="h-8 w-8" />
                    <span>
                      <span className="block font-medium text-foreground">
                        {d.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {d.email}
                      </span>
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.specialties.length > 0 ? d.specialties.join(", ") : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{d.city}</TableCell>
                <TableCell>
                  <Money amount={d.consultationFee} className="font-medium" />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {d.experienceYears} yrs
                </TableCell>
                <TableCell>
                  <VerificationBadge status={d.verificationStatus} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {fmtDate(d.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <ul className="space-y-3 p-4 md:hidden">
        {items.map((d) => (
          <li
            key={d.id}
            className="rounded-2xl border border-border bg-background/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <UserAvatar name={d.name} className="h-9 w-9" />
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {d.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {d.specialties.length > 0 ? d.specialties.join(", ") : "—"} ·{" "}
                    {d.city}
                  </span>
                </span>
              </span>
              <VerificationBadge status={d.verificationStatus} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <Money amount={d.consultationFee} className="font-medium text-foreground" />
              <span>{d.experienceYears} yrs experience</span>
              <span>Joined {fmtDate(d.createdAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function DoctorsSection({
  onMutate,
}: {
  onMutate?: () => void;
}) {
  const { toast } = useToast();
  const [decision, setDecision] = useState<{
    item: VerificationItem;
    kind: DoctorDecision;
  } | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState<VerificationItem | null>(
    null
  );

  const loader = useCallback(async () => {
    const [doctors, verifications] = await Promise.all([
      apiGet<{ items: AdminDoctorItem[] }>("/api/v1/admin/doctors"),
      apiGet<{ items: VerificationItem[] }>(
        "/api/v1/admin/verifications?status=PENDING"
      ),
    ]);
    return { doctors: doctors.items, queue: verifications.items };
  }, []);
  const { data, error, loading, reload } = useAdminData(loader);

  const submitDecision = async (
    item: VerificationItem,
    kind: DoctorDecision,
    withNote: string | null
  ) => {
    setBusy(true);
    try {
      await apiPost(`/api/v1/admin/verifications/${item.doctorId}/decision`, {
        decision: kind,
        ...(withNote ? { note: withNote } : {}),
      });
      toast({
        title:
          kind === "VERIFIED"
            ? "Doctor verified"
            : kind === "REJECTED"
              ? "Application rejected"
              : "More information requested",
        description: `${item.name} — ${item.specialties.join(", ")}.`,
      });
      setDecision(null);
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

  const openNoteDialog = (item: VerificationItem, kind: DoctorDecision) => {
    setNote("");
    setNoteError(null);
    setDecision({ item, kind });
  };

  const submitNoteDialog = () => {
    if (!decision) return;
    const trimmed = note.trim();
    if (trimmed.length < 3) {
      setNoteError("A note of at least 3 characters is required.");
      return;
    }
    if (trimmed.length > 300) {
      setNoteError("The note must be at most 300 characters.");
      return;
    }
    void submitDecision(decision.item, decision.kind, trimmed);
  };

  const queue = data?.queue ?? [];
  const doctors = data?.doctors ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Doctors"
        subtitle="Manage every doctor profile and review pending verification applications."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Tabs defaultValue="queue">
          <TabsList className="mb-1">
            <TabsTrigger value="queue" className="gap-1.5">
              Verification queue
              {queue.length > 0 ? (
                <Badge className="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                  {queue.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="all">All doctors ({doctors.length})</TabsTrigger>
          </TabsList>

          {/* ── Verification queue ──────────────────────────────── */}
          <TabsContent value="queue" className="mt-4 space-y-4">
            <p className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Heads-up:</strong> approving an
              application makes the doctor&apos;s profile public in the patient
              directory immediately. Rejections and more-info requests require a
              note (3–300 characters) which is shown to the doctor.
            </p>
            {queue.length === 0 ? (
              <EmptyState
                icon={<BadgeCheck className="h-6 w-6" />}
                title="Verification queue is clear"
                hint="No pending doctor applications right now. New submissions appear here oldest-first."
              />
            ) : (
              <ul className="space-y-4">
                {queue.map((item) => (
                  <li key={item.doctorId}>
                    <SectionCard>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <UserAvatar name={item.name} className="h-11 w-11" />
                          <span>
                            <span className="block text-sm font-bold text-foreground">
                              {item.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {item.email}
                              {item.phone ? ` · ${item.phone}` : ""}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              {item.specialties.map((s) => (
                                <Badge
                                  key={s}
                                  variant="secondary"
                                  className="font-medium"
                                >
                                  {s}
                                </Badge>
                              ))}
                            </span>
                          </span>
                        </span>
                        <span className="text-right">
                          <VerificationBadge status={item.verificationStatus} />
                          <span className="mt-1.5 block text-[11px] text-muted-foreground">
                            Submitted {fmtDate(item.submittedAt)}
                          </span>
                        </span>
                      </div>

                      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="h-3 w-3" /> BMDC reg
                          </dt>
                          <dd className="mt-0.5 font-medium text-foreground">
                            {item.regNumber ?? "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" /> City
                          </dt>
                          <dd className="mt-0.5 font-medium text-foreground">
                            {item.city}
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <GraduationCap className="h-3 w-3" /> Experience
                          </dt>
                          <dd className="mt-0.5 font-medium text-foreground">
                            {item.experienceYears} years
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-muted-foreground">
                            <Banknote className="h-3 w-3" /> Consultation fee
                          </dt>
                          <dd className="mt-0.5 font-medium text-foreground">
                            <Money amount={item.consultationFee} />
                          </dd>
                        </div>
                      </dl>

                      {item.bio ? (
                        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                          {item.bio}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => setConfirmApprove(item)}
                        >
                          <BadgeCheck className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => openNoteDialog(item, "REJECTED")}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          onClick={() => openNoteDialog(item, "MORE_INFO")}
                        >
                          <MessageSquareWarning className="h-4 w-4" />
                          Request more info
                        </Button>
                      </div>
                    </SectionCard>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ── All doctors ─────────────────────────────────────── */}
          <TabsContent value="all" className="mt-4">
            <SectionCard
              title={`Doctor directory (${doctors.length})`}
              contentClassName="p-0"
            >
              <AllDoctorsTable items={doctors} />
            </SectionCard>
          </TabsContent>
        </Tabs>
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
            <AlertDialogTitle>
              Approve {confirmApprove?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The profile will be marked VERIFIED and listed publicly in the
              patient directory (booking enabled). This action is audit-logged
              and can be reversed by setting a different decision later.
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
                void submitDecision(confirmApprove, "VERIFIED", null);
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              {busy ? "Approving…" : "Approve doctor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reject / more-info dialog with note ──────────────────── */}
      <Dialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.kind === "REJECTED"
                ? `Reject ${decision?.item.name}`
                : `Request more info from ${decision?.item.name}`}
            </DialogTitle>
            <DialogDescription>
              {decision?.kind === "REJECTED"
                ? "The application will be rejected. Explain what failed review — the doctor sees this note."
                : "The application stays open while the doctor provides the missing documents. Describe what is needed."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="decision-note">
              Review note{" "}
              <span className="text-destructive">(required, 3–300 chars)</span>
            </Label>
            <Textarea
              id="decision-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (noteError) setNoteError(null);
              }}
              placeholder={
                decision?.kind === "REJECTED"
                  ? "e.g. BMDC registration number could not be matched in the registry."
                  : "e.g. Please upload a clearer copy of your BMDC certificate."
              }
              rows={4}
              aria-invalid={noteError ? true : undefined}
            />
            {noteError ? (
              <p className="text-xs font-medium text-destructive">{noteError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={submitNoteDialog}
              disabled={busy}
              className={
                decision?.kind === "REJECTED"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }
            >
              {busy
                ? "Submitting…"
                : decision?.kind === "REJECTED"
                  ? "Reject application"
                  : "Request more info"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Inbox className="h-3.5 w-3.5" />
        Queue is ordered oldest-first so the earliest submissions get reviewed
        first. All decisions are audit-logged.
      </p>
    </div>
  );
}
