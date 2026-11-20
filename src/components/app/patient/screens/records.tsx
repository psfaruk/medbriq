"use client";

/**
 * records.tsx — visit history (completed appointments) + family member
 * management (add / edit / delete) with a privacy note (new style).
 */

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FileText,
  FolderHeart,
  Lock,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiDelete, apiGet } from "@/lib/api-client";
import type { AppointmentDto } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  Money,
  PageHeader,
  PatientTypeBadge,
  SectionCard,
  useT,
  fmtDateLong,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import {
  FamilyMember,
  FamilyMemberDialog,
  genderLabel,
  relationLabel,
  useApiData,
} from "./shared";

export default function RecordsScreen() {
  const { t } = useT();
  const { toast } = useToast();
  const pushPatient = useAppStore((s) => s.pushPatient);

  const appointments = useApiData<{ items: AppointmentDto[] }>(
    () => apiGet<{ items: AppointmentDto[] }>("/api/v1/appointments"),
    []
  );
  const family = useApiData<{ items: FamilyMember[] }>(
    () => apiGet<{ items: FamilyMember[] }>("/api/v2/patient/family"),
    []
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visits = useMemo(
    () =>
      (appointments.data?.items ?? [])
        .filter((a) => a.status === "COMPLETED")
        .sort((a, b) => b.slotStart.localeCompare(a.slotStart)),
    [appointments.data]
  );

  const openAdd = () => {
    setEditMember(null);
    setDialogOpen(true);
  };

  const openEdit = (m: FamilyMember) => {
    setEditMember(m);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v2/patient/family/${deleteTarget.id}`);
      toast({ title: t("records.memberRemoved"), description: deleteTarget.name });
      setDeleteTarget(null);
      family.reload();
    } catch (err) {
      toast({
        title: t("records.removeFailed"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const members = family.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title={t("records.title")} />

      {/* ── visit history ───────────────────────────────────────── */}
      <SectionCard title={t("records.visitHistory")}>
        {appointments.loading && !appointments.data ? (
          <LoadingCard rows={3} />
        ) : appointments.error && !appointments.data ? (
          <ErrorState message={appointments.error} onRetry={appointments.reload} />
        ) : visits.length === 0 ? (
          <EmptyState
            icon={<FolderHeart className="h-6 w-6" />}
            title={t("records.noVisits")}
            hint={t("records.reportsSoon")}
            action={
              <Button
                size="sm"
                onClick={() => pushPatient({ name: "doctors" })}
              >
                {t("home.findDoctor")}
              </Button>
            }
          />
        ) : (
          <ul className="app-scroll max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {visits.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => pushPatient({ name: "appointment", id: v.id })}
                  className="w-full rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {v.doctor?.name ?? t("common.doctor")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDateLong(v.slotStart)}
                        {v.chamberName ? ` · ${v.chamberName}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-foreground">
                        <Money amount={v.fee} currency={v.currency} />
                      </p>
                      {v.patientType ? (
                        <div className="mt-1">
                          <PatientTypeBadge type={v.patientType} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {v.consultationNote ? (
                    <p className="mt-2 line-clamp-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
                      <FileText
                        className="mr-1 inline h-3 w-3"
                        aria-hidden="true"
                      />
                      {v.consultationNote}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── family members ──────────────────────────────────────── */}
      <SectionCard
        title={t("records.family")}
        action={
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("records.addMember")}
          </Button>
        }
      >
        {family.loading && !family.data ? (
          <LoadingCard rows={2} />
        ) : family.error && !family.data ? (
          <ErrorState message={family.error} onRetry={family.reload} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title={t("records.noMembers")}
            hint={t("records.noMembersHint")}
            action={
              <Button size="sm" onClick={openAdd}>
                {t("records.addMember")}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {m.name}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {relationLabel(m.relation)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      m.age != null
                        ? t("common.ageYears", { years: m.age })
                        : null,
                      m.gender ? genderLabel(m.gender) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {m.phone ? (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" aria-hidden="true" />
                      {m.phone}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => openEdit(m)}
                    aria-label={`${t("common.edit")} ${m.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteTarget(m)}
                    aria-label={`${t("common.delete")} ${m.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("records.privacyNote")}
        </p>
      </SectionCard>

      <FamilyMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editMember}
        onSaved={() => family.reload()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("records.removeMember", { name: deleteTarget?.name ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("records.removeHint")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("common.removing") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
