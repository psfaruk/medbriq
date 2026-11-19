"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { formatDhaka } from "@/lib/time";
import type {
  AdminStats,
  AuditLogItem,
  VerificationItem,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarCheck,
  CalendarDays,
  FileQuestion,
  Hourglass,
  Loader2,
  LockKeyhole,
  Phone,
  RotateCw,
  ScrollText,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRound,
  Users,
  X,
} from "lucide-react";

/**
 * AdminView — platform console: verification queue, doctor directory and the
 * audit trail.
 */

type QueueFilter = "PENDING" | "MORE_INFO" | "REJECTED" | "VERIFIED";

type AdminDoctorRow = {
  id: string;
  slug: string;
  name: string;
  email: string;
  city: string;
  verificationStatus: string;
  consultationFee: number;
  experienceYears: number;
  createdAt: string;
  specialties: string[];
};

const QUEUE_FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "MORE_INFO", label: "Needs info" },
  { value: "REJECTED", label: "Rejected" },
  { value: "VERIFIED", label: "Verified" },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  MORE_INFO: "Needs info",
  REJECTED: "Rejected",
  VERIFIED: "Verified",
};

/** fetch wrapper that never throws; returns normalized result. */
async function jsonFetch(
  url: string,
  init?: RequestInit
): Promise<
  { ok: true; data: unknown } | { ok: false; message: string; status: number }
> {
  try {
    const res = await fetch(url, init);
    const json: unknown = await res.json().catch(() => null);
    if (res.ok && isApiSuccess(json)) return { ok: true, data: json.data };
    if (isApiError(json)) {
      return { ok: false, message: json.error.message, status: res.status };
    }
    return {
      ok: false,
      message: `Request failed (${res.status}).`,
      status: res.status,
    };
  } catch {
    return {
      ok: false,
      message: "Network error. Check your connection.",
      status: 0,
    };
  }
}

function isApiSuccess(v: unknown): v is { ok: true; data: unknown } {
  return (
    typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true
  );
}

function isApiError(
  v: unknown
): v is { ok: false; error: { message: string; code: string } } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { ok?: unknown }).ok === false &&
    typeof (v as { error?: { message?: unknown } }).error?.message === "string"
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "VERIFIED") {
    return (
      <Badge className="bg-success text-success-foreground hover:bg-success">
        Verified
      </Badge>
    );
  }
  if (status === "REJECTED") {
    return (
      <Badge variant="outline" className="border-destructive/50 text-destructive">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-warning/50 text-warning">
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function dateOnlyLabel(iso: string): string {
  return formatDhaka(new Date(iso), { hour: undefined, minute: undefined });
}

// ---------------------------------------------------------------------------
// Gate (auth + role) + inner console
// ---------------------------------------------------------------------------

export default function AdminView() {
  const { user, userLoaded, navigate, setAuthReturnView } = useAppStore();

  if (!userLoaded) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Sign in required</h2>
              <p className="text-sm text-muted-foreground">
                The admin console is only available to signed-in
                administrators.
              </p>
            </div>
            <Button
              onClick={() => {
                setAuthReturnView({ name: "admin" });
                navigate({ name: "auth" });
              }}
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Admin console</h2>
              <p className="text-sm text-muted-foreground">
                This area is not available for your account.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate({ name: "home" })}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  const { toast } = useToast();

  const [tab, setTab] = useState("queue");
  const [refreshing, setRefreshing] = useState(false);

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Verification queue
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("PENDING");
  const [queue, setQueue] = useState<VerificationItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Doctors directory
  const [doctors, setDoctors] = useState<AdminDoctorRow[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Audit log
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Decision state
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    item: VerificationItem;
    decision: "REJECTED" | "MORE_INFO";
  } | null>(null);
  const [noteText, setNoteText] = useState("");

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const result = await jsonFetch("/api/v1/admin/stats");
    if (result.ok) {
      setStats(result.data as AdminStats);
      setStatsError(null);
    } else {
      setStatsError(result.message);
    }
    setStatsLoading(false);
  }, []);

  const loadQueue = useCallback(async (filter: QueueFilter) => {
    setQueueLoading(true);
    const result = await jsonFetch(
      `/api/v1/admin/verifications?status=${filter}`
    );
    if (result.ok) {
      setQueue((result.data as { items: VerificationItem[] }).items);
      setQueueError(null);
    } else {
      setQueueError(result.message);
    }
    setQueueLoading(false);
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    const result = await jsonFetch("/api/v1/admin/doctors");
    if (result.ok) {
      setDoctors((result.data as { items: AdminDoctorRow[] }).items);
      setDoctorsError(null);
    } else {
      setDoctorsError(result.message);
    }
    setDoctorsLoading(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    const result = await jsonFetch("/api/v1/admin/audit-logs?limit=100");
    if (result.ok) {
      setLogs((result.data as { items: AuditLogItem[] }).items);
      setLogsError(null);
    } else {
      setLogsError(result.message);
    }
    setLogsLoading(false);
  }, []);

  useEffect(() => {
    // Async kick-off: loaders set loading flags synchronously, which must
    // not happen directly in an effect body (react-hooks/set-state-in-effect).
    void (async () => {
      await Promise.resolve();
      loadStats();
      loadQueue("PENDING");
      loadDoctors();
      loadLogs();
    })();
  }, [loadStats, loadQueue, loadDoctors, loadLogs]);

  // Refetch the queue whenever the status filter changes.
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      loadQueue(queueFilter);
    })();
  }, [queueFilter, loadQueue]);

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      loadQueue(queueFilter),
      loadDoctors(),
      loadLogs(),
    ]);
    setRefreshing(false);
  }

  async function postDecision(
    item: VerificationItem,
    decision: "VERIFIED" | "REJECTED" | "MORE_INFO",
    note?: string
  ) {
    const busyKey = `${item.doctorId}:${decision}`;
    setDecisionBusy(busyKey);
    const result = await jsonFetch(
      `/api/v1/admin/verifications/${item.doctorId}/decision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note !== undefined ? { decision, note } : { decision }),
      }
    );
    setDecisionBusy(null);
    if (result.ok) {
      toast({
        title:
          decision === "VERIFIED"
            ? "Doctor verified"
            : decision === "REJECTED"
              ? "Application rejected"
              : "More information requested",
        description: `${item.name} · ${item.email}`,
      });
      await Promise.all([loadQueue(queueFilter), loadStats(), loadDoctors()]);
    } else {
      toast({
        title: "Decision failed",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  async function submitDialogDecision() {
    if (!dialog) return;
    const note = noteText.trim();
    if (note.length < 3) {
      toast({
        title: "Note required",
        description: "Write at least 3 characters so the doctor can act on it.",
        variant: "destructive",
      });
      return;
    }
    const target = dialog;
    await postDecision(target.item, target.decision, note);
    setDialog(null);
    setNoteText("");
  }

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        d.specialties.some((s) => s.toLowerCase().includes(q))
    );
  }, [doctors, search]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify doctors, monitor the platform and review the audit trail.
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={refreshAll}
          disabled={refreshing}
          aria-label="Refresh admin data"
        >
          <RotateCw className={refreshing ? "animate-spin" : ""} />
        </Button>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : statsError ? (
        <Alert variant="destructive" className="mt-6">
          <X />
          <AlertTitle>Could not load stats</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <span>{statsError}</span>
            <Button size="sm" variant="outline" onClick={loadStats}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : stats ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Users"
            value={String(stats.totalUsers)}
            icon={<Users className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Doctors"
            value={String(stats.totalDoctors)}
            icon={<Stethoscope className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Verified doctors"
            value={String(stats.verifiedDoctors)}
            icon={<ShieldCheck className="h-4 w-4 text-success" />}
          />
          <StatCard
            label="Pending verifications"
            value={String(stats.pendingDoctors)}
            icon={<Hourglass className="h-4 w-4 text-warning" />}
          />
          <StatCard
            label="Appointments"
            value={String(stats.totalAppointments)}
            icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            label="Confirmed"
            value={String(stats.confirmedAppointments)}
            icon={<CalendarCheck className="h-4 w-4 text-success" />}
          />
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="h-auto w-full flex-wrap sm:w-fit">
          <TabsTrigger value="queue" className="h-9 flex-1 sm:flex-none">
            Verification Queue
          </TabsTrigger>
          <TabsTrigger value="doctors" className="h-9 flex-1 sm:flex-none">
            Doctors
          </TabsTrigger>
          <TabsTrigger value="audit" className="h-9 flex-1 sm:flex-none">
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* ----------------------- Verification queue ----------------------- */}
        <TabsContent value="queue" className="mt-4 space-y-4">
          <Tabs value={queueFilter} onValueChange={(v) => setQueueFilter(v as QueueFilter)}>
            <TabsList>
              {QUEUE_FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {queueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : queueError ? (
            <Alert variant="destructive">
              <X />
              <AlertTitle>Could not load the queue</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{queueError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadQueue(queueFilter)}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : queue.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">
                  No {QUEUE_FILTERS.find((f) => f.value === queueFilter)?.label.toLowerCase()} applications
                </p>
                <p className="text-sm text-muted-foreground">
                  Applications with this status will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            queue.map((item) => (
              <Card key={item.doctorId}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.email}
                        {item.phone && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {item.phone}
                          </span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDhaka(new Date(item.submittedAt))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.specialties.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">{item.city}</span>
                    {item.regNumber && (
                      <Badge variant="outline">{item.regNumber}</Badge>
                    )}
                    <span>{item.experienceYears} yrs experience</span>
                    <span className="font-medium">৳ {item.consultationFee}</span>
                  </div>

                  {item.bio && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {item.bio}
                    </p>
                  )}

                  {(item.verificationStatus === "MORE_INFO" ||
                    item.verificationStatus === "REJECTED") &&
                    item.verificationNote && (
                      <p className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-warning-foreground">
                        Previous note: {item.verificationNote}
                      </p>
                    )}

                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground shadow-xs hover:bg-success/90"
                      disabled={decisionBusy !== null}
                      onClick={() => postDecision(item, "VERIFIED")}
                    >
                      {decisionBusy === `${item.doctorId}:VERIFIED` ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <ShieldCheck />
                      )}
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={decisionBusy !== null}
                      onClick={() => {
                        setDialog({ item, decision: "REJECTED" });
                        setNoteText("");
                      }}
                    >
                      <X />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-warning/50 text-warning hover:bg-warning/10 hover:text-warning"
                      disabled={decisionBusy !== null}
                      onClick={() => {
                        setDialog({ item, decision: "MORE_INFO" });
                        setNoteText("");
                      }}
                    >
                      <FileQuestion />
                      Request info
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ---------------------------- Doctors ---------------------------- */}
        <TabsContent value="doctors" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city or specialty..."
              className="pl-9"
              aria-label="Search doctors"
            />
          </div>

          {doctorsLoading ? (
            <Skeleton className="h-64" />
          ) : doctorsError ? (
            <Alert variant="destructive">
              <X />
              <AlertTitle>Could not load doctors</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{doctorsError}</span>
                <Button size="sm" variant="outline" onClick={loadDoctors}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Doctor</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead className="pr-4">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDoctors.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No doctors match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDoctors.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2.5">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{d.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {d.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {d.specialties.length === 0
                              ? "—"
                              : d.specialties.map((s) => (
                                  <Badge key={s} variant="secondary">
                                    {s}
                                  </Badge>
                                ))}
                          </div>
                        </TableCell>
                        <TableCell>{d.city}</TableCell>
                        <TableCell>
                          <StatusBadge status={d.verificationStatus} />
                        </TableCell>
                        <TableCell>৳ {d.consultationFee}</TableCell>
                        <TableCell>{d.experienceYears} yrs</TableCell>
                        <TableCell className="pr-4">
                          {dateOnlyLabel(d.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ---------------------------- Audit log ---------------------------- */}
        <TabsContent value="audit" className="mt-4">
          {logsLoading ? (
            <Skeleton className="h-96" />
          ) : logsError ? (
            <Alert variant="destructive">
              <X />
              <AlertTitle>Could not load the audit log</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{logsError}</span>
                <Button size="sm" variant="outline" onClick={loadLogs}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <ScrollText className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No audit entries yet</p>
                <p className="text-sm text-muted-foreground">
                  Platform activity will be recorded here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-[70vh] divide-y overflow-y-auto rounded-lg border medbriq-scroll">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <ActionBadge action={log.action} />
                    <span className="text-sm font-medium">
                      {log.actorName ?? "System"}
                    </span>
                    <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                      {log.entity}
                      {log.entityId ? ` · ${log.entityId}` : ""}
                    </span>
                    {log.meta && (
                      <span className="line-clamp-1 max-w-[320px] font-mono text-xs text-muted-foreground">
                        {log.meta}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDhaka(new Date(log.createdAt))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject / request-info dialog */}
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setNoteText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.decision === "REJECTED"
                ? "Reject verification"
                : "Request more information"}
            </DialogTitle>
            <DialogDescription>
              {dialog
                ? `${dialog.item.name} · ${dialog.item.email}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision-note">
              Note{" "}
              <span className="text-muted-foreground">
                (required, shared with the doctor)
              </span>
            </Label>
            <Textarea
              id="decision-note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={
                dialog?.decision === "REJECTED"
                  ? "Why is this application rejected?"
                  : "What additional information or documents are needed?"
              }
              maxLength={300}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialog(null);
                setNoteText("");
              }}
              disabled={decisionBusy !== null}
            >
              Cancel
            </Button>
            <Button
              variant={dialog?.decision === "REJECTED" ? "destructive" : "default"}
              onClick={submitDialogDecision}
              disabled={noteText.trim().length < 3 || decisionBusy !== null}
            >
              {decisionBusy !== null && <Loader2 className="animate-spin" />}
              {dialog?.decision === "REJECTED" ? "Reject" : "Request info"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionBadge({ action }: { action: string }) {
  if (action.includes("VERIFIED")) {
    return (
      <Badge className="bg-success text-success-foreground hover:bg-success">
        {action}
      </Badge>
    );
  }
  if (action.includes("REJECTED")) {
    return <Badge variant="destructive">{action}</Badge>;
  }
  return <Badge variant="secondary">{action}</Badge>;
}
