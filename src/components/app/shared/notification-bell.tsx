"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiGet, apiPost } from "@/lib/api-client";
import {
  isPushSupported,
  listenForForegroundPush,
  subscribeToPush,
} from "@/lib/firebase";
import type { NotificationItem } from "@/lib/types";
import { useAppStore } from "@/lib/app-state";
import { cn } from "@/lib/utils";

/** Relative-time labels: "just now", "5m ago", "2h ago", "3d ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * NotificationBell for the new app shell. Polls /api/v1/notifications,
 * shows the unread badge, marks items read on click and "mark all read".
 */
export default function NotificationBell({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [open, setOpen] = useState(false);
  const pushPatient = useAppStore((s) => s.pushPatient);

  // ── Web push (FCM) ──────────────────────────────────────────────
  // permission === "granted" already → silently keep the token
  // registered (handles FCM token rotation) and display foreground
  // messages. Otherwise show an inline "enable" affordance in the panel.
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);
    if (Notification.permission === "granted") {
      // Idempotent — refreshes the server registration (token rotation).
      void subscribeToPush();
      void listenForForegroundPush();
    }
  }, []);

  const enablePush = async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        setPushPermission("granted");
        void listenForForegroundPush();
      } else {
        const messages: Record<string, string> = {
          unsupported: "Push is not supported by this browser.",
          "no-config": "Push is not configured on the server yet.",
          "permission-denied": "Notification permission was blocked — allow it in browser settings.",
          "no-token": "Could not obtain a push token. Try again.",
          "registration-failed": "Could not save the push subscription. Try again.",
        };
        setPushError(messages[result.reason ?? ""] ?? "Could not enable push notifications.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchNow = () => {
      apiGet<{ items: NotificationItem[] }>("/api/v1/notifications?limit=15")
        .then((d) => {
          if (active) setItems(d.items);
        })
        .catch(() => {
          if (active) setItems([]);
        });
    };
    fetchNow();
    const timer = setInterval(fetchNow, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const unread = items?.filter((n) => !n.readAt).length ?? 0;

  const openItem = async (id: string, meta: string | null) => {
    try {
      await apiPost(`/api/v1/notifications/${id}/read`);
    } catch {
      /* non-blocking */
    }
    let appointmentId: string | undefined;
    try {
      appointmentId = meta ? JSON.parse(meta).appointmentId : undefined;
    } catch {
      appointmentId = undefined;
    }
    if (appointmentId) {
      pushPatient({ name: "appointment", id: appointmentId });
      onNavigate?.();
    }
    setOpen(false);
    // refresh the list after the interaction (not inside an effect)
    apiGet<{ items: NotificationItem[] }>("/api/v1/notifications?limit=15")
      .then((d) => setItems(d.items))
      .catch(() => undefined);
  };

  const markAll = async () => {
    try {
      await apiPost("/api/v1/notifications/read-all");
      apiGet<{ items: NotificationItem[] }>("/api/v1/notifications?limit=15")
        .then((d) => setItems(d.items))
        .catch(() => undefined);
    } catch {
      /* non-blocking */
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative rounded-full", className)}
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 ? (
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto app-scroll">
          {items === null ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n.id, n.meta)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-4 py-3 text-left last:border-0 hover:bg-muted/50 transition-colors",
                  !n.readAt && "bg-primary-soft/40"
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs",
                      n.readAt
                        ? "font-medium text-foreground/80"
                        : "font-semibold text-foreground"
                    )}
                  >
                    {n.title}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </span>
                </span>
                <span className="line-clamp-2 text-[11px] text-muted-foreground">
                  {n.body}
                </span>
              </button>
            ))
          )}
        </div>
        {pushPermission === "granted" ? (
          <p className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
            <BellRing className="h-3.5 w-3.5 text-primary" />
            Push notifications enabled
          </p>
        ) : pushPermission === "unsupported" ? null : (
          <div className="border-t border-border px-4 py-3">
            <button
              onClick={enablePush}
              disabled={pushBusy}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary-soft px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary-soft/70 disabled:opacity-60"
            >
              <BellRing className="h-3.5 w-3.5" />
              {pushBusy ? "Enabling…" : "Enable push notifications"}
            </button>
            {pushError ? (
              <p className="mt-1.5 text-center text-[11px] text-destructive">{pushError}</p>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
