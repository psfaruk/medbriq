"use client";

/**
 * Chambers — practice locations: list with active badges, add/edit dialogs,
 * deactivate toggle (PATCH isActive), delete with AlertDialog confirmation
 * (server 409s while upcoming bookings reference the chamber).
 */

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  PencilLine,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/alert-dialog";
import {
  DemoNotice,
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  SectionCard,
  fmtDate,
} from "@/components/app/shared/ui-kit";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { errMessage } from "../helpers";

type Chamber = {
  id: string;
  name: string;
  address: string;
  city: string;
  area: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
};

type ChamberForm = {
  name: string;
  address: string;
  city: string;
  area: string;
  phone: string;
};

const EMPTY_FORM: ChamberForm = {
  name: "",
  address: "",
  city: "Dhaka",
  area: "",
  phone: "",
};

function validateForm(form: ChamberForm): string | null {
  if (form.name.trim().length < 2)
    return "Chamber name must be at least 2 characters.";
  if (form.address.trim().length < 5)
    return "Address must be at least 5 characters.";
  if (form.city.trim().length < 2) return "City must be at least 2 characters.";
  return null;
}

export default function ChambersSection() {
  const { toast } = useToast();
  const [items, setItems] = useState<Chamber[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Chamber | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chamber | null>(null);
  const [form, setForm] = useState<ChamberForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiGet<{ items: Chamber[] }>("/api/v2/doctor/chambers")
      .then((d) => {
        if (!alive) return;
        setItems(d.items);
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

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setAddOpen(true);
  };

  const openEdit = (chamber: Chamber) => {
    setForm({
      name: chamber.name,
      address: chamber.address,
      city: chamber.city,
      area: chamber.area ?? "",
      phone: chamber.phone ?? "",
    });
    setFormError(null);
    setEditTarget(chamber);
  };

  const submitAdd = async () => {
    const problem = validateForm(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setBusy(true);
    try {
      await apiPost<{ chamber: Chamber }>("/api/v2/doctor/chambers", {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        ...(form.area.trim() ? { area: form.area.trim() } : {}),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });
      toast({
        title: "Chamber added",
        description: "Patients can now select this location when booking.",
      });
      setAddOpen(false);
      reload();
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    const problem = validateForm(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    setBusy(true);
    try {
      await apiPatch<{ chamber: Chamber }>(
        `/api/v2/doctor/chambers/${editTarget.id}`,
        {
          name: form.name.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          area: form.area.trim(),
          phone: form.phone.trim(),
        }
      );
      toast({ title: "Chamber updated" });
      setEditTarget(null);
      reload();
    } catch (err) {
      setFormError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (chamber: Chamber) => {
    try {
      await apiPatch<{ chamber: Chamber }>(
        `/api/v2/doctor/chambers/${chamber.id}`,
        { isActive: !chamber.isActive }
      );
      toast({
        title: chamber.isActive
          ? "Chamber deactivated"
          : "Chamber activated",
        description: chamber.isActive
          ? "New bookings cannot select it — existing appointments keep their location."
          : "Patients can book this location again.",
      });
      reload();
    } catch (err) {
      toast({
        title: "Could not update chamber",
        description: errMessage(err),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await apiDelete(`/api/v2/doctor/chambers/${deleteTarget.id}`);
      toast({ title: "Chamber deleted" });
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast({
        title: "Could not delete chamber",
        description: errMessage(err),
        variant: "destructive",
      });
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  const dialogBody = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ch-name">Chamber name</Label>
          <Input
            id="ch-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Greenview Chamber (Dhanmondi)"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ch-address">Address</Label>
          <Input
            id="ch-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="House / road / building details"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ch-city">City</Label>
          <Input
            id="ch-city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ch-area">
            Area <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="ch-area"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            placeholder="e.g. Dhanmondi"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ch-phone">
            Chamber phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="ch-phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+880 2-XXXXXXX"
          />
        </div>
      </div>
      {formError ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chambers"
        subtitle="Your practice locations. Patients pick a chamber when booking — keep addresses and phones current."
        action={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add chamber
          </Button>
        }
      />

      {loading && !items ? (
        <LoadingCard rows={3} />
      ) : error && !items ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !items || items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title="No chambers yet"
          hint="Add your first practice location so patients can book in-person visits with you."
          action={
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add your first chamber
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((chamber) => (
            <SectionCard key={chamber.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-foreground">
                      {chamber.name}
                    </h3>
                    <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">
                        {chamber.address}
                        {chamber.area ? ` · ${chamber.area}` : ""} ·{" "}
                        {chamber.city}
                      </span>
                    </p>
                    {chamber.phone ? (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {chamber.phone}
                      </p>
                    ) : null}
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Added {fmtDate(chamber.createdAt)}
                    </p>
                  </div>
                </div>
                {chamber.isActive ? (
                  <Badge
                    variant="outline"
                    className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`chamber-active-${chamber.id}`}
                    checked={chamber.isActive}
                    onCheckedChange={() => toggleActive(chamber)}
                    aria-label={`Toggle ${chamber.name}`}
                  />
                  <Label
                    htmlFor={`chamber-active-${chamber.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    {chamber.isActive ? "Bookable" : "Not bookable"}
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openEdit(chamber)}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(chamber)}
                    aria-label={`Delete ${chamber.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      <DemoNotice>
        <strong className="text-foreground">Sandbox chambers.</strong> The demo
        doctor has two chambers (Dhanmondi + Mirpur). Chambers with upcoming
        bookings cannot be deleted — deactivate them instead.
      </DemoNotice>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && setAddOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a chamber</DialogTitle>
            <DialogDescription>
              A practice location patients can choose when booking you.
            </DialogDescription>
          </DialogHeader>
          {dialogBody}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitAdd} disabled={busy}>
              {busy ? "Adding…" : "Add chamber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit chamber</DialogTitle>
            <DialogDescription>
              Update the location details for {editTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          {dialogBody}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chamber?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} will be removed from your practice
              locations. This cannot be undone — if it has upcoming bookings the
              server will block the deletion and you should deactivate it
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep chamber</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {busy ? "Deleting…" : "Delete chamber"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
