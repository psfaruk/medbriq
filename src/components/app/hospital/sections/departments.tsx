"use client";

import { useEffect, useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ApiCallError,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  fmtDate,
  useT,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import type { HospitalDepartment } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

/** Add/edit department form (mounted inside DialogContent → resets on close). */
function DepartmentFormFields({
  initial,
  onDone,
}: {
  initial: HospitalDepartment | null;
  onDone: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        about: about.trim() || undefined,
      };
      if (initial) {
        await apiPatch(`/api/v2/hospital/departments/${initial.id}`, body);
        toast({ title: "Department updated", description: body.name });
      } else {
        await apiPost("/api/v2/hospital/departments", body);
        toast({ title: "Department added", description: body.name });
      }
      onDone();
    } catch (err) {
      toast({
        title: initial
          ? "Could not update department"
          : "Could not add department",
        description: err instanceof ApiCallError ? err.message : ERROR_FALLBACK,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="dept-name">Department name</Label>
        <Input
          id="dept-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Cardiology"
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dept-about">
          About <span className="text-muted-foreground">({t("common.optional")})</span>
        </Label>
        <Textarea
          id="dept-about"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Services this department offers"
          rows={3}
          maxLength={400}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!valid || saving}>
          {saving ? "Saving…" : initial ? t("common.saveChanges") : t("common.add")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DepartmentFormDialog({
  open,
  initial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial: HospitalDepartment | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit department" : "Add a department"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? "Update this clinical service line."
              : "Departments describe the clinical services your hospital offers."}
          </DialogDescription>
        </DialogHeader>
        <DepartmentFormFields
          initial={initial}
          onDone={() => {
            onOpenChange(false);
            onSaved();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Delete button with confirmation dialog. */
function DeleteDepartmentButton({
  department,
  onDeleted,
}: {
  department: HospitalDepartment;
  onDeleted: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/v2/hospital/departments/${department.id}`);
      toast({ title: "Department deleted", description: department.name });
      onDeleted();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof ApiCallError ? err.message : ERROR_FALLBACK,
        variant: "destructive",
      });
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-destructive hover:bg-destructive/5 hover:text-destructive"
          aria-label={`Delete ${department.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this department?</AlertDialogTitle>
          <AlertDialogDescription>
            {`${department.name} will be removed from your hospital's department list. This cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void confirmDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting…" : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function DepartmentsSection() {
  const { t } = useT();
  const [items, setItems] = useState<HospitalDepartment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<HospitalDepartment | "new" | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ items: HospitalDepartment[] }>("/api/v2/hospital/departments")
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiCallError ? err.message : ERROR_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hospitalNav.departments")}
        subtitle="Clinical service lines listed on your hospital's public profile."
        action={
          <Button className="gap-1.5" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Add department
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : items === null ? (
        <LoadingCard rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-6 w-6" />}
          title="No departments yet"
          hint="Add departments such as Cardiology or Pediatrics so patients understand your services."
          action={
            <Button className="gap-1.5" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              Add your first department
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>About</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {d.about ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {fmtDate(d.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={`Edit ${d.name}`}
                            onClick={() => setEditing(d)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <DeleteDepartmentButton
                            department={d}
                            onDeleted={() => setReload((n) => n + 1)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((d) => (
              <article
                key={d.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {d.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Created {fmtDate(d.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      aria-label={`Edit ${d.name}`}
                      onClick={() => setEditing(d)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteDepartmentButton
                      department={d}
                      onDeleted={() => setReload((n) => n + 1)}
                    />
                  </div>
                </div>
                {d.about ? (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {d.about}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </>
      )}

      <DepartmentFormDialog
        open={editing !== null}
        initial={editing === "new" || editing === null ? null : editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        onSaved={() => setReload((n) => n + 1)}
      />
    </div>
  );
}
