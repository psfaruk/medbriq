"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Search,
  UserRound,
  Ban,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api-client";
import type { AdminUserItem } from "@/lib/types";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  UserAvatar,
  fmtDate,
} from "@/components/app/shared/ui-kit";
import { ProviderBadge, AccountStatusBadge } from "../parts";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Patients — directory of PATIENT-role accounts with client-side search
 * and suspend / reactivate moderation (POST /api/v1/admin/users/:id/status).
 */
export default function PatientsSection() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<AdminUserItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loader = useCallback(
    () =>
      apiGet<{ items: AdminUserItem[] }>("/api/v1/admin/users?role=PATIENT"),
    []
  );
  const { data, error, loading, reload } = useAdminData(loader);

  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [items, query]);

  const suspended = items.filter((u) => u.status === "SUSPENDED").length;

  const submitStatus = async (user: AdminUserItem, status: "ACTIVE" | "SUSPENDED") => {
    setBusy(true);
    try {
      await apiPost(`/api/v1/admin/users/${user.id}/status`, { status });
      toast({
        title: status === "SUSPENDED" ? "Patient suspended" : "Patient reactivated",
        description: `${user.name} — ${status === "SUSPENDED" ? "sign-in blocked" : "sign-in restored"}.`,
      });
      setTarget(null);
      reload();
    } catch (err) {
      toast({
        title: "Could not update the account",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patients"
        subtitle="Every patient account on the platform, with sign-in provider and status."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <SectionCard
          title={`${filtered.length} patient${filtered.length === 1 ? "" : "s"}${
            suspended > 0 ? ` · ${suspended} suspended` : ""
          }`}
          action={
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or email"
                className="h-9 pl-8"
                aria-label="Search patients by name or email"
              />
            </div>
          }
          contentClassName="p-0"
        >
          {filtered.length === 0 ? (
            <EmptyState
              icon={<UserRound className="h-6 w-6" />}
              title={
                items.length === 0
                  ? "No patient accounts yet"
                  : "No patients match your search"
              }
              hint={
                items.length === 0
                  ? "Patients appear here as soon as they register."
                  : "Try a different name or email."
              }
              className="m-4"
            />
          ) : (
            <>
              {/* ── Desktop table ────────────────────────────────── */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-card hover:bg-card">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.id} className="text-sm">
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <UserAvatar name={u.name} className="h-8 w-8" />
                            <span className="font-medium text-foreground">
                              {u.name}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {u.phone ?? "—"}
                        </TableCell>
                        <TableCell>
                          <ProviderBadge provider={u.provider} />
                        </TableCell>
                        <TableCell>
                          <AccountStatusBadge status={u.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {fmtDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={u.status === "ACTIVE" ? "outline" : "default"}
                            size="sm"
                            className={
                              u.status === "ACTIVE"
                                ? "gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                : "gap-1.5"
                            }
                            onClick={() => setTarget(u)}
                          >
                            {u.status === "ACTIVE" ? (
                              <>
                                <Ban className="h-3.5 w-3.5" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-3.5 w-3.5" />
                                Activate
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ── Mobile card list ─────────────────────────────── */}
              <ul className="space-y-3 p-4 md:hidden">
                {filtered.map((u) => (
                  <li
                    key={u.id}
                    className="rounded-2xl border border-border bg-background/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} className="h-9 w-9" />
                        <span>
                          <span className="block text-sm font-semibold text-foreground">
                            {u.name}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </span>
                        </span>
                      </span>
                      <AccountStatusBadge status={u.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <ProviderBadge provider={u.provider} />
                      {u.phone ? (
                        <span className="flex items-center gap-1 tabular-nums">
                          <Phone className="h-3 w-3" />
                          {u.phone}
                        </span>
                      ) : null}
                      <span>Joined {fmtDate(u.createdAt)}</span>
                    </div>
                    <Button
                      variant={u.status === "ACTIVE" ? "outline" : "default"}
                      size="sm"
                      className={
                        u.status === "ACTIVE"
                          ? "mt-3 w-full gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          : "mt-3 w-full gap-1.5"
                      }
                      onClick={() => setTarget(u)}
                    >
                      {u.status === "ACTIVE" ? (
                        <>
                          <Ban className="h-3.5 w-3.5" />
                          Suspend account
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5" />
                          Reactivate account
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SectionCard>
      )}

      {/* ── Suspend / activate confirmation ─────────────────────── */}
      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.status === "ACTIVE"
                ? `Suspend ${target?.name}?`
                : `Reactivate ${target?.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.status === "ACTIVE"
                ? "The patient will be blocked from signing in and booking new appointments. Existing appointments are kept. You can reactivate the account at any time."
                : "The patient will be able to sign in and book appointments again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={
                target?.status === "ACTIVE"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
              onClick={(e) => {
                if (!target) return;
                e.preventDefault(); // keep the dialog open while busy
                void submitStatus(
                  target,
                  target.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"
                );
              }}
            >
              {busy ? (
                "Working…"
              ) : target?.status === "ACTIVE" ? (
                "Suspend account"
              ) : (
                "Reactivate account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Status changes are audit-logged. Admin accounts are protected and cannot
        be suspended from this console.
      </p>
    </div>
  );
}
