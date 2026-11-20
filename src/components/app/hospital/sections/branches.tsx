"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ApiCallError,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  fmtDate,
  useT,
} from "@/components/app/shared/ui-kit";
import { useToast } from "@/hooks/use-toast";
import type { HospitalBranch } from "../types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

/** Add/edit branch form (mounted inside DialogContent so it resets on close). */
function BranchFormFields({
  initial,
  onDone,
}: {
  initial: HospitalBranch | null;
  onDone: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [isMain, setIsMain] = useState(initial?.isMain ?? false);
  const [saving, setSaving] = useState(false);

  const valid =
    name.trim().length >= 2 && address.trim().length >= 5 && city.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || undefined,
        isMain,
      };
      if (initial) {
        await apiPatch(`/api/v2/hospital/branches/${initial.id}`, body);
        toast({ title: "Branch updated", description: body.name });
      } else {
        await apiPost("/api/v2/hospital/branches", body);
        toast({ title: "Branch added", description: body.name });
      }
      onDone();
    } catch (err) {
      toast({
        title: initial ? "Could not update branch" : "Could not add branch",
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
        <Label htmlFor="branch-name">Branch name</Label>
        <Input
          id="branch-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Uttara Branch"
          maxLength={120}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="branch-address">Address</Label>
        <Input
          id="branch-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="House / road / area"
          maxLength={200}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="branch-city">City</Label>
          <Input
            id="branch-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Dhaka"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branch-phone">
            Phone <span className="text-muted-foreground">({t("common.optional")})</span>
          </Label>
          <Input
            id="branch-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+880 2-XXXXXXX"
            maxLength={30}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Main branch</p>
          <p className="text-xs text-muted-foreground">
            The primary location shown on your public profile.
          </p>
        </div>
        <Switch
          checked={isMain}
          onCheckedChange={setIsMain}
          aria-label="Set as main branch"
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

/** Controlled add/edit dialog; fields remount per open so state stays fresh. */
function BranchFormDialog({
  open,
  initial,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  initial: HospitalBranch | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit branch" : "Add a branch"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update this practice location's details."
              : "Add another practice location for your hospital."}
          </DialogDescription>
        </DialogHeader>
        <BranchFormFields
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

/** One branch card with edit + delete (delete asks for confirmation). */
function BranchCard({
  branch,
  onEdit,
  onDeleted,
}: {
  branch: HospitalBranch;
  onEdit: () => void;
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
      await apiDelete(`/api/v2/hospital/branches/${branch.id}`);
      toast({ title: "Branch deleted", description: branch.name });
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
    <article className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {branch.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Added {fmtDate(branch.createdAt)}
          </p>
        </div>
        {branch.isMain ? (
          <Badge className="border-transparent bg-primary-soft text-primary">
            Main
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span>
            {branch.address}
            <span className="block font-medium text-foreground/80">
              {branch.city}
            </span>
          </span>
        </p>
        {branch.phone ? (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            {branch.phone}
          </p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("common.edit")}
        </Button>
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("common.delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this branch?</AlertDialogTitle>
              <AlertDialogDescription>
                {`${branch.name} (${branch.city}) will be removed from your hospital. This cannot be undone.`}
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
      </div>
    </article>
  );
}

export default function BranchesSection() {
  const { t } = useT();
  const [items, setItems] = useState<HospitalBranch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<HospitalBranch | "new" | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ items: HospitalBranch[] }>("/api/v2/hospital/branches")
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
        title={t("hospitalNav.branches")}
        subtitle="Practice locations patients can visit for consultations."
        action={
          <Button className="gap-1.5" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Add branch
          </Button>
        }
      />

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => setReload((n) => n + 1)}
        />
      ) : items === null ? (
        <LoadingCard rows={2} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No branches yet"
          hint="Add your hospital's practice locations so patients know where to visit."
          action={
            <Button className="gap-1.5" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              Add your first branch
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((b) => (
            <BranchCard
              key={b.id}
              branch={b}
              onEdit={() => setEditing(b)}
              onDeleted={() => setReload((n) => n + 1)}
            />
          ))}
        </div>
      )}

      <BranchFormDialog
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
