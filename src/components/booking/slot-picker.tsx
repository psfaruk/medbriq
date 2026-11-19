"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  CalendarOff,
  MoonStar,
  RefreshCw,
  Sun,
  Sunrise,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { SlotInfoDto, ApiResult } from "@/lib/types";
import {
  DAY_SHORT,
  addDays,
  dhakaDateString,
  dhakaDayOfWeek,
  formatDateLabel,
} from "@/lib/time";

/** Number of bookable days shown in the strip (today + 13). */
const DAYS_AHEAD = 14;

/** Dhaka minute-of-day for a slot start ISO (slots are generated in Asia/Dhaka). */
function dhakaMinuteOfDay(startIso: string): number {
  const d = new Date(startIso);
  return (d.getUTCHours() * 60 + d.getUTCMinutes() + 6 * 60) % 1440;
}

type SlotGroup = {
  key: "morning" | "afternoon" | "evening";
  title: string;
  icon: ElementType;
  slots: SlotInfoDto[];
};

/** Morning < 12:00, Afternoon 12:00-17:00, Evening >= 17:00 (Dhaka time). */
function groupSlots(slots: SlotInfoDto[]): SlotGroup[] {
  const morning: SlotInfoDto[] = [];
  const afternoon: SlotInfoDto[] = [];
  const evening: SlotInfoDto[] = [];
  for (const s of slots) {
    const m = dhakaMinuteOfDay(s.startIso);
    if (m < 720) morning.push(s);
    else if (m < 1020) afternoon.push(s);
    else evening.push(s);
  }
  return (
    [
      { key: "morning", title: "Morning", icon: Sunrise, slots: morning },
      { key: "afternoon", title: "Afternoon", icon: Sun, slots: afternoon },
      { key: "evening", title: "Evening", icon: MoonStar, slots: evening },
    ] as SlotGroup[]
  ).filter((g) => g.slots.length > 0);
}

/** Two-line chip label: "Today" / "Tomorrow" / weekday, plus "Feb 14". */
function chipLabels(date: string, index: number): { title: string; sub: string } {
  const formatted = formatDateLabel(date); // e.g. "Sat, Feb 14"
  const sub = formatted.split(", ")[1] ?? date.slice(5);
  const title =
    index === 0
      ? "Today"
      : index === 1
        ? "Tomorrow"
        : DAY_SHORT[dhakaDayOfWeek(date)];
  return { title, sub };
}

export default function SlotPicker({
  doctorSlug,
  selectedSlot,
  onSelectSlot,
  refreshKey = 0,
}: {
  doctorSlug: string;
  selectedSlot: SlotInfoDto | null;
  onSelectSlot: (slot: SlotInfoDto | null) => void;
  /**
   * Increment to force a refetch of the currently selected date's slots —
   * e.g. after a 409 SLOT_TAKEN so the user immediately sees the fresh
   * availability. (Optional extension of the base contract.)
   */
  refreshKey?: number;
}) {
  const today = useMemo(() => dhakaDateString(new Date()), []);
  const dates = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today]
  );

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [slotsByDate, setSlotsByDate] = useState<Record<string, SlotInfoDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Fetch (or refetch) the slots for the selected date. Data is always
  // revalidated on selection change so taken/past flags stay fresh — the
  // database unique constraint, not this UI, is the real booking guard.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // Reset fetch state asynchronously — setState must not run synchronously
    // inside an effect body (react-hooks/set-state-in-effect).
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);
    })();

    fetch(
      `/api/v1/doctors/${encodeURIComponent(doctorSlug)}/slots?date=${selectedDate}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((json: ApiResult<{ date: string; slots: SlotInfoDto[] }>) => {
        if (!json.ok) {
          throw new Error(json.error?.message ?? "Failed to load slots.");
        }
        if (!active) return;
        setSlotsByDate((prev) => ({ ...prev, [selectedDate]: json.data.slots }));
      })
      .catch((err: unknown) => {
        if (!active || (err instanceof Error && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Failed to load slots.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [doctorSlug, selectedDate, refreshKey, reloadTick]);

  const pickDate = (date: string) => {
    if (date === selectedDate) return;
    // Auto-deselect when changing date — the old slot belongs to another day.
    onSelectSlot(null);
    setSelectedDate(date);
  };

  const slots = slotsByDate[selectedDate];
  const groups = useMemo(() => (slots ? groupSlots(slots) : []), [slots]);

  return (
    <div className="space-y-4">
      {/* Date strip */}
      <div
        className="flex gap-2 overflow-x-auto medbriq-scroll pb-2"
        role="tablist"
        aria-label="Select a date"
      >
        {dates.map((date, i) => {
          const { title, sub } = chipLabels(date, i);
          const isSelected = date === selectedDate;
          const daySlots = slotsByDate[date];
          // Disable a chip only once we know the day has no bookable slot.
          const soldOut =
            daySlots !== undefined && daySlots.every((s) => s.taken || s.past);
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={soldOut}
              onClick={() => pickDate(date)}
              title={soldOut ? "No available slots on this day" : undefined}
              className={cn(
                "flex min-h-[52px] min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-center transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "hover:border-primary/50 hover:bg-accent",
                soldOut && "cursor-not-allowed opacity-40"
              )}
            >
              <span className="text-xs font-semibold leading-none">{title}</span>
              <span
                className={cn(
                  "mt-1 text-[11px] leading-none",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slot grid */}
      {error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setReloadTick((t) => t + 1)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      ) : loading && !slots ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        </div>
      ) : !slots || slots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <CalendarOff className="h-8 w-8" />
          <p className="text-sm">No chambers available on this day.</p>
        </div>
      ) : (
        <div
          className={cn(
            "max-h-[24rem] space-y-4 overflow-y-auto medbriq-scroll pr-1 transition-opacity",
            loading && "opacity-60"
          )}
        >
          {groups.map((group) => (
            <section key={group.key} aria-label={group.title}>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <group.icon className="h-4 w-4" />
                {group.title}
                <span className="text-xs font-normal">
                  ({group.slots.filter((s) => !s.taken && !s.past).length} available)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.slots.map((slot) => {
                  const isSelected = selectedSlot?.startIso === slot.startIso;
                  const unavailable = slot.taken || slot.past;
                  return (
                    <Button
                      key={slot.startIso}
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      disabled={unavailable}
                      aria-pressed={isSelected}
                      title={
                        slot.taken
                          ? "Already booked"
                          : slot.past
                            ? "This time has passed"
                            : slot.label
                      }
                      onClick={() => onSelectSlot(isSelected ? null : slot)}
                      className={cn("h-10", unavailable && "line-through opacity-50")}
                    >
                      {slot.label}
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
