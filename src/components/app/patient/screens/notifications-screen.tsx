"use client";

/**
 * NotificationsScreen — full notification center: unread highlight,
 * mark-all-read and tap-through to the related appointment.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/app-state";
import { apiGet, apiPost } from "@/lib/api-client";
import type { NotificationItem } from "@/lib/types";
import {
  EmptyState,
  ErrorState,
  LoadingCard,
  PageHeader,
  useT,
} from "@/components/app/shared/ui-kit";
import { useApiData } from "../parts";

function metaAppointmentId(meta: string | null): string | null {
  if (!meta) return null;
  try {
    const parsed = JSON.parse(meta) as { appointmentId?: string };
    return typeof parsed.appointmentId === "string" ? parsed.appointmentId : null;
  } catch {
    return null;
  }
}

export default function NotificationsScreen() {
  const { t } = useT();
  const pushPatient = useAppStore((s) => s.pushPatient);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, loading, error, reload } = useApiData<{
    items: NotificationItem[];
    unreadCount: number;
  }>(() => apiGet<{ items: NotificationItem[]; unreadCount: number }>("/api/v1/notifications"), []);

  const openItem = async (n: NotificationItem) => {
    if (!n.readAt) {
      setBusyId(n.id);
      try {
        await apiPost(`/api/v1/notifications/${n.id}/read`);
      } catch {
        /* non-blocking */
      }
      setBusyId(null);
      reload();
    }
    const appointmentId = metaAppointmentId(n.meta);
    if (appointmentId) {
      pushPatient({ name: "appointment", id: appointmentId });
    }
  };

  const markAll = async () => {
    setBusyId("__all__");
    try {
      await apiPost("/api/v1/notifications/read-all");
      reload();
    } catch {
      /* non-blocking */
    }
    setBusyId(null);
  };

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        subtitle={
          data ? (unread > 0 ? `${unread} unread` : "All caught up") : undefined
        }
        action={
          unread > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={markAll}
              disabled={busyId === "__all__"}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {loading && !data ? (
        <LoadingCard rows={4} />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications yet"
          hint="Booking updates, approvals and payment receipts will appear here."
        />
      ) : (
        <ul className="max-h-[36rem] space-y-2 overflow-y-auto app-scroll pr-1">
          {items.map((n) => {
            const unreadItem = !n.readAt;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  disabled={busyId === n.id}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors",
                    unreadItem
                      ? "border-primary/30 bg-primary-soft/40"
                      : "border-border bg-card",
                    "hover:border-primary/50"
                  )}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        unreadItem
                          ? "font-bold text-foreground"
                          : "font-medium text-foreground/80"
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {unreadItem ? (
                        <Badge
                          variant="outline"
                          className="border-transparent bg-primary text-primary-foreground text-[10px]"
                        >
                          New
                        </Badge>
                      ) : null}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Dhaka",
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {n.body}
                  </span>
                  {metaAppointmentId(n.meta) ? (
                    <span className="mt-1 text-[11px] font-medium text-primary">
                      View appointment →
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
