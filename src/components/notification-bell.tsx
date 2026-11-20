"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { jsonFetch } from "@/components/lib/api-client";
import { useAppStore } from "@/lib/store";
import type { NotificationItem } from "@/lib/types";

/**
 * NotificationBell — header bell for signed-in users.
 *
 * Polls GET /api/v1/notifications every 30 seconds (and on mount), shows the
 * unread count as a badge, and renders a popover list. Clicking an item marks
 * it read and navigates to the related view based on its meta payload.
 */

/** Relative-time labels: "just now", "5m ago", "2h ago", "3d ago", ... */
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
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** meta is a JSON string: { appointmentId?, referenceCode?, doctorSlug? }. */
type NotificationMeta = {
  appointmentId?: string;
  referenceCode?: string;
  doctorSlug?: string;
};

function parseMeta(meta: string | null): NotificationMeta {
  if (!meta) return {};
  try {
    const parsed: unknown = JSON.parse(meta);
    if (parsed && typeof parsed === "object") {
      return parsed as NotificationMeta;
    }
  } catch {
    // Malformed meta — treat as absent.
  }
  return {};
}

function iconForType(type: string): { icon: LucideIcon; className: string } {
  const t = type.toLowerCase();
  if (t.includes("reject") || t.includes("cancel")) {
    return { icon: CalendarX, className: "text-destructive" };
  }
  if (t.includes("complete")) {
    return { icon: CheckCircle2, className: "text-success" };
  }
  if (t.includes("reschedul")) {
    return { icon: CalendarClock, className: "text-primary" };
  }
  if (t.includes("review")) {
    return { icon: Star, className: "text-warning" };
  }
  if (t.includes("approve") || t.includes("confirm") || t.includes("request")) {
    return { icon: CalendarCheck, className: "text-primary" };
  }
  return { icon: Bell, className: "text-muted-foreground" };
}

export default function NotificationBell() {
  const user = useAppStore((state) => state.user);
  const navigate = useAppStore((state) => state.navigate);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await jsonFetch("/api/v1/notifications");
    if (result.ok) {
      const data = result.data as {
        items: NotificationItem[];
        unreadCount: number;
      };
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    }
    // Polling failures are silently ignored — the badge stays stale until the
    // next successful poll.
  }, []);

  // Fetch immediately on sign-in and then every 30 seconds. The initial fetch
  // is deferred to a macrotask so no setState runs synchronously in the effect.
  useEffect(() => {
    if (!user) return;
    const initial = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 30_000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, [user, load]);

  const markAllRead = async () => {
    if (busy) return;
    setBusy(true);
    const result = await jsonFetch("/api/v1/notifications/read-all", {
      method: "POST",
    });
    if (result.ok) {
      await load();
    }
    setBusy(false);
  };

  const openItem = (item: NotificationItem) => {
    const meta = parseMeta(item.meta);
    if (!item.readAt) {
      // Optimistic local update; the POST is fire-and-forget.
      setItems((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      void jsonFetch(
        `/api/v1/notifications/${encodeURIComponent(item.id)}/read`,
        { method: "POST" }
      );
    }
    setOpen(false);
    if (meta.doctorSlug) {
      navigate({ name: "doctor", slug: meta.doctorSlug });
    } else if (meta.appointmentId || meta.referenceCode) {
      navigate(
        user?.role === "DOCTOR"
          ? { name: "doctor-dashboard" }
          : { name: "appointments" }
      );
    }
  };

  // Only rendered for signed-in users (self-gating, mirrors the header logic).
  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => void markAllRead()}
            disabled={busy || unreadCount === 0}
          >
            {busy ? "Updating..." : "Mark all read"}
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <BellOff
              className="h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              Booking updates will appear here.
            </p>
          </div>
        ) : (
          <ul className="medbriq-scroll max-h-96 divide-y overflow-y-auto">
            {items.map((item) => {
              const { icon: Icon, className: iconClass } = iconForType(
                item.type
              );
              const unread = !item.readAt;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      unread ? "bg-primary-soft/30" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <Icon
                        className={`h-4 w-4 ${iconClass}`}
                        aria-hidden="true"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">
                            {timeAgo(item.createdAt)}
                          </span>
                          {unread && (
                            <span
                              className="h-2 w-2 rounded-full bg-primary"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </span>
                      {item.body && (
                        <span className="mt-0.5 block line-clamp-2 text-sm text-muted-foreground">
                          {item.body}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
