"use client";

import { useCallback, useMemo, useState } from "react";
import { LifeBuoy, MessageSquareText, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiGet, apiPatch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { TicketStatusBadge, PriorityBadge } from "../parts";
import type { SupportTicketItem } from "../types";
import { useAdminData, errMessage } from "../use-admin-data";
import { useToast } from "@/hooks/use-toast";

/**
 * Support tickets — GET /api/v2/support/list (admins see every ticket) with
 * a reply / status / priority update dialog (PATCH /api/v2/support/{id}).
 */

const STATUS_TABS = [
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CLOSED", label: "Closed" },
  { key: "ALL", label: "All" },
] as const;

export default function TicketsSection({
  onMutate,
}: {
  onMutate?: () => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("OPEN");
  const [target, setTarget] = useState<SupportTicketItem | null>(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<string>("OPEN");
  const [priority, setPriority] = useState<string>("NORMAL");
  const [busy, setBusy] = useState(false);

  const loader = useCallback(
    () => apiGet<{ items: SupportTicketItem[] }>("/api/v2/support/list"),
    []
  );
  const { data, error, loading, reload } = useAdminData(loader);

  const items = data?.items ?? [];
  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: items.length };
    for (const t of items) map[t.status] = (map[t.status] ?? 0) + 1;
    return map;
  }, [items]);
  const filtered = useMemo(
    () => (tab === "ALL" ? items : items.filter((t) => t.status === tab)),
    [items, tab]
  );

  const openTicket = (ticket: SupportTicketItem) => {
    setTarget(ticket);
    setReply(ticket.reply ?? "");
    setStatus(ticket.status);
    setPriority(ticket.priority);
  };

  const submitUpdate = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await apiPatch(`/api/v2/support/${target.id}`, {
        status,
        priority,
        ...(reply.trim() ? { reply: reply.trim() } : {}),
      });
      toast({
        title: "Ticket updated",
        description: `${target.subject} — ${status.replaceAll("_", " ").toLowerCase()}.`,
      });
      setTarget(null);
      reload();
      onMutate?.();
    } catch (err) {
      toast({
        title: "Could not update the ticket",
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
        title="Support tickets"
        subtitle="Every help request from patients, doctors and hospital managers, with reply and triage controls."
      />

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <Tabs value={tab} onValueChange={setTab}>
            <div className="overflow-x-auto pb-1">
              <TabsList className="h-auto w-max gap-1">
                {STATUS_TABS.map((s) => (
                  <TabsTrigger
                    key={s.key}
                    value={s.key}
                    className="gap-1.5 px-3 py-1.5 text-xs"
                  >
                    {s.label}
                    <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                      {counts[s.key] ?? 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          <SectionCard
            title={`${filtered.length} ticket${filtered.length === 1 ? "" : "s"}`}
            contentClassName="p-4 sm:p-5"
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={<LifeBuoy className="h-6 w-6" />}
                title={`No ${tab === "ALL" ? "" : STATUS_TABS.find((s) => s.key === tab)?.label.toLowerCase() + " "}tickets`}
                hint="New support requests land here in real time."
                className="border-0 bg-transparent shadow-none"
              />
            ) : (
              <ul className="space-y-3">
                {filtered.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-2xl border border-border bg-background/40 p-4"
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => openTicket(t)}
                      aria-label={`Open ticket: ${t.subject}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {t.subject}
                        </span>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] uppercase"
                        >
                          {t.category}
                        </Badge>
                        <span className="ml-auto flex items-center gap-1.5">
                          <TicketStatusBadge status={t.status} />
                          <PriorityBadge priority={t.priority} />
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {t.message}
                      </p>
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {t.requesterName}
                        </span>
                        {t.requesterEmail ? <span>{t.requesterEmail}</span> : null}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {fmtDateTime(t.createdAt)}
                        </span>
                        {t.reply ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <MessageSquareText className="h-3 w-3" />
                            Replied
                          </span>
                        ) : null}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}

      {/* ── Ticket detail + reply dialog ─────────────────────────── */}
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="pr-6">{target?.subject}</DialogTitle>
            <DialogDescription>
              {target?.requesterName}
              {target?.requesterEmail ? ` · ${target.requesterEmail}` : ""} ·{" "}
              {target ? fmtDateTime(target.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-44 overflow-y-auto app-scroll rounded-xl bg-muted/50 p-3">
              <p className="text-sm leading-relaxed text-foreground">
                {target?.message}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9" aria-label="Ticket status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9" aria-label="Ticket priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-reply" className="text-xs">
                Reply to the requester
              </Label>
              <Textarea
                id="ticket-reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a response the requester will see in their support inbox…"
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground">
                Saved with the ticket — visible to the requester.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitUpdate()} disabled={busy} className="gap-1.5">
              {busy ? "Saving…" : "Save update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
