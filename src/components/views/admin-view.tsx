"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { formatDhaka } from "@/lib/time";
import type {
  AdminStats,
  AdminUserItem,
  AuditLogItem,
  ModerationReviewItem,
  VerificationItem,
} from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Ban,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  FileQuestion,
  Hourglass,
  Loader2,
  LockKeyhole,
  Phone,
  RotateCw,
  ScrollText,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  Trash2,
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

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function roleLabel(role: string): string {
  if (role === "DOCTOR") return "Doctor";
  if (role === "ADMIN") return "Admin";
  return "Patient";
}

function providerLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "phone") return "Phone";
  return "Email";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating ? "fill-warning text-warning" : "text-muted-foreground"
          }`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
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
  const navigate = useAppStore((state) => state.navigate);
  const currentUserId = useAppStore((state) => state.user?.id ?? null);

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

  // Users directory
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusBusy, setUserStatusBusy] = useState(false);
  const [userStatusTarget, setUserStatusTarget] = useState<AdminUserItem | null>(
    null
  );

  // Reviews moderation
  const [reviews, setReviews] = useState<ModerationReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [deleteReviewTarget, setDeleteReviewTarget] =
    useState<ModerationReviewItem | null>(null);
  const [deleteReviewBusy, setDeleteReviewBusy] = useState(false);

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

  const loadUsers = useCallback(async (role: string, q: string) => {
    setUsersLoading(true);
    const params = new URLSearchParams();
    if (role !== "all") params.set("role", role);
    if (q.trim() !== "") params.set("q", q.trim());
    const qs = params.toString();
    const result = await jsonFetch(
      `/api/v1/admin/users${qs ? `?${qs}` : ""}`
    );
    if (result.ok) {
      setUsers((result.data as { items: AdminUserItem[] }).items);
      setUsersError(null);
    } else {
      setUsersError(result.message);
    }
    setUsersLoading(false);
  }, []);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    const result = await jsonFetch("/api/v1/admin/reviews");
    if (result.ok) {
      setReviews((result.data as { items: ModerationReviewItem[] }).items);
      setReviewsError(null);
    } else {
      setReviewsError(result.message);
    }
    setReviewsLoading(false);
  }, []);

  // Debounce the user search input (~300ms) before querying the server.
  useEffect(() => {
    const id = setTimeout(() => setUserSearch(userSearchInput), 300);
    return () => clearTimeout(id);
  }, [userSearchInput]);

  useEffect(() => {
    // Async kick-off: loaders set loading flags synchronously, which must
    // not happen directly in an effect body (react-hooks/set-state-in-effect).
    void (async () => {
      await Promise.resolve();
      loadStats();
      loadQueue("PENDING");
      loadDoctors();
      loadLogs();
      loadReviews();
    })();
  }, [loadStats, loadQueue, loadDoctors, loadLogs, loadReviews]);

  // Refetch the queue whenever the status filter changes.
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      loadQueue(queueFilter);
    })();
  }, [queueFilter, loadQueue]);

  // Fetch users whenever the role filter or debounced search changes.
  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      loadUsers(userRoleFilter, userSearch);
    })();
  }, [userRoleFilter, userSearch, loadUsers]);

  async function refreshAll() {
    setRefreshing(true);
    await Promise.all([
      loadStats(),
      loadQueue(queueFilter),
      loadDoctors(),
      loadLogs(),
      loadUsers(userRoleFilter, userSearch),
      loadReviews(),
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

  async function confirmUserStatus() {
    if (!userStatusTarget) return;
    const target = userStatusTarget;
    const nextStatus = target.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setUserStatusBusy(true);
    const result = await jsonFetch(
      `/api/v1/admin/users/${encodeURIComponent(target.id)}/status`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }
    );
    setUserStatusBusy(false);
    setUserStatusTarget(null);
    if (result.ok) {
      toast({
        title: nextStatus === "SUSPENDED" ? "User suspended" : "User reactivated",
        description: `${target.name} · ${target.email}`,
      });
      loadUsers(userRoleFilter, userSearch);
      loadStats();
    } else {
      toast({
        title: "Status change failed",
        description: result.message,
        variant: "destructive",
      });
    }
  }

  async function confirmDeleteReview() {
    if (!deleteReviewTarget || deleteReviewBusy) return;
    const target = deleteReviewTarget;
    setDeleteReviewBusy(true);
    const result = await jsonFetch(
      `/api/v1/admin/reviews/${encodeURIComponent(target.id)}`,
      { method: "DELETE" }
    );
    setDeleteReviewBusy(false);
    if (result.ok) {
      toast({
        title: "Review removed",
        description: `Deleted ${target.patientName}'s review of ${target.doctorName}.`,
      });
      setDeleteReviewTarget(null);
      loadReviews();
    } else {
      toast({
        title: "Could not remove review",
        description: result.message,
        variant: "destructive",
      });
    }
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
          <TabsTrigger value="users" className="h-9 flex-1 sm:flex-none">
            Users
          </TabsTrigger>
          <TabsTrigger value="reviews" className="h-9 flex-1 sm:flex-none">
            Reviews
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

        {/* ----------------------------- Users ----------------------------- */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userSearchInput}
                onChange={(e) => setUserSearchInput(e.target.value)}
                placeholder="Search by name, email or phone..."
                className="pl-9"
                aria-label="Search users"
              />
            </div>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Filter users by role"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="PATIENT">Patients</SelectItem>
                <SelectItem value="DOCTOR">Doctors</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {usersLoading ? (
            <Skeleton className="h-64" />
          ) : usersError ? (
            <Alert variant="destructive">
              <X />
              <AlertTitle>Could not load users</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{usersError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadUsers(userRoleFilter, userSearch)}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="medbriq-scroll max-h-[520px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No users match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => {
                      // Admins and the signed-in admin cannot be modified here.
                      const manageable =
                        u.role !== "ADMIN" && u.id !== currentUserId;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-secondary text-[10px] font-semibold">
                                  {initials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">
                            {u.email}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {u.phone ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.role === "DOCTOR" ? "secondary" : "outline"
                              }
                            >
                              {roleLabel(u.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {providerLabel(u.provider)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.status === "SUSPENDED" ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge className="bg-success text-success-foreground hover:bg-success">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {dateOnlyLabel(u.createdAt)}
                          </TableCell>
                          <TableCell className="pr-4">
                            {manageable ? (
                              u.status === "SUSPENDED" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-success/50 text-success hover:bg-success/10 hover:text-success"
                                  disabled={userStatusBusy}
                                  onClick={() => setUserStatusTarget(u)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Reactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={userStatusBusy}
                                  onClick={() => setUserStatusTarget(u)}
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Suspend
                                </Button>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ---------------------------- Reviews ---------------------------- */}
        <TabsContent value="reviews" className="mt-4">
          {reviewsLoading ? (
            <Skeleton className="h-64" />
          ) : reviewsError ? (
            <Alert variant="destructive">
              <X />
              <AlertTitle>Could not load reviews</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                <span>{reviewsError}</span>
                <Button size="sm" variant="outline" onClick={loadReviews}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <Star className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No reviews yet</p>
                <p className="text-sm text-muted-foreground">
                  Patient reviews will appear here for moderation.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="medbriq-scroll max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {reviews.map((review) => (
                <Card key={review.id} className="py-0">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() =>
                            navigate({ name: "doctor", slug: review.doctorSlug })
                          }
                        >
                          {review.doctorName}
                        </button>
                        <p className="text-xs text-muted-foreground">
                          reviewed by {review.patientName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-muted-foreground">
                          {dateOnlyLabel(review.createdAt)}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                    <div className="flex justify-end border-t pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteReviewTarget(review)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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

      {/* Suspend / reactivate user confirmation */}
      <AlertDialog
        open={userStatusTarget !== null}
        onOpenChange={(open) => {
          if (!open) setUserStatusTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userStatusTarget?.status === "SUSPENDED"
                ? "Reactivate this account?"
                : "Suspend this account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userStatusTarget
                ? userStatusTarget.status === "SUSPENDED"
                  ? `${userStatusTarget.name} (${userStatusTarget.email}) will be able to sign in and use the platform again.`
                  : `${userStatusTarget.name} (${userStatusTarget.email}) will be blocked from signing in until the account is reactivated.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={userStatusBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                userStatusTarget?.status === "SUSPENDED"
                  ? undefined
                  : buttonVariants({ variant: "destructive" })
              }
              disabled={userStatusBusy}
              onClick={(e) => {
                // Keep the dialog open until the request settles.
                e.preventDefault();
                void confirmUserStatus();
              }}
            >
              {userStatusBusy && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {userStatusTarget?.status === "SUSPENDED"
                ? "Reactivate"
                : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove review confirmation */}
      <AlertDialog
        open={deleteReviewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteReviewTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove review?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteReviewTarget
                ? `This permanently deletes ${deleteReviewTarget.patientName}'s ${deleteReviewTarget.rating}-star review of ${deleteReviewTarget.doctorName}. The action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteReviewBusy}>
              Keep review
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={deleteReviewBusy}
              onClick={(e) => {
                // Keep the dialog open until the request settles.
                e.preventDefault();
                void confirmDeleteReview();
              }}
            >
              {deleteReviewBusy && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Remove review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
