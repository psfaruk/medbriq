"use client";

import { useCallback, useState } from "react";
import { ScrollText, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api-client";
import type { AuditLogItem } from "@/lib/types";
import {
  PageHeader,
  SectionCard,
  LoadingCard,
  ErrorState,
  EmptyState,
  fmtDateTime,
} from "@/components/app/shared/ui-kit";
import { AuditActionBadge, prettyMeta } from "../parts";
import { useAdminData } from "../use-admin-data";

/**
 * Audit — the platform audit trail (GET /api/v1/admin/audit-logs?limit=100).
 * Each row's meta payload opens in a dialog with pretty-printed JSON.
 */
export default function AuditSection() {
  const [selected, setSelected] = useState<AuditLogItem | null>(null);

  const loader = useCallback(
    () => apiGet<{ items: AuditLogItem[] }>("/api/v1/admin/audit-logs?limit=100"),
    []
  );
  const { data, error, loading, reload } = useAdminData(loader);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit logs"
        subtitle="The last 100 admin and platform events — verifications, refunds, flag changes and more."
      />

      {loading ? (
        <LoadingCard rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-6 w-6" />}
          title="No audit entries yet"
          hint="Platform actions will be recorded here with actor, entity and metadata."
        />
      ) : (
        <SectionCard
          title={`${items.length} most recent events`}
          contentClassName="p-0"
        >
          <div className="max-h-[32rem] overflow-y-auto app-scroll">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-card hover:bg-card">
                    <TableHead>Time (Dhaka)</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Meta preview</TableHead>
                    <TableHead className="w-20 text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((log) => (
                    <TableRow key={log.id} className="text-sm">
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {fmtDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {log.actorName ?? "System"}
                      </TableCell>
                      <TableCell>
                        <AuditActionBadge action={log.action} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.entity}
                        {log.entityId ? (
                          <span className="ml-1 font-mono text-[10px] text-muted-foreground/80">
                            …{log.entityId.slice(-6)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-56">
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {log.meta ? log.meta : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.meta ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 px-2.5"
                            onClick={() => setSelected(log)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <ul className="divide-y divide-border/70 md:hidden">
              {items.map((log) => (
                <li key={log.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <AuditActionBadge action={log.action} />
                        <span className="text-xs font-medium text-foreground">
                          {log.actorName ?? "System"}
                        </span>
                      </span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {log.entity} · {fmtDateTime(log.createdAt)}
                      </span>
                    </span>
                    {log.meta ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-11 shrink-0 gap-1.5 px-3 sm:h-8 sm:px-2.5"
                        onClick={() => setSelected(log)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Meta
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="border-t border-border/70 px-4 py-2.5 text-[11px] text-muted-foreground sm:px-5">
            Rows are newest-first. Select an event with metadata to inspect the
            full JSON payload it recorded.
          </p>
        </SectionCard>
      )}

      {/* ── Meta JSON dialog ─────────────────────────────────────── */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
              {selected ? <AuditActionBadge action={selected.action} /> : null}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.actorName ?? "System"} · ${selected.entity}${
                    selected.entityId ? ` …${selected.entityId.slice(-6)}` : ""
                  } · ${fmtDateTime(selected.createdAt)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-[11px] leading-relaxed text-foreground app-scroll">
            {prettyMeta(selected?.meta ?? null)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
