"use client";

/**
 * Schedule — weekly availability editor. Seven day rows, each with one or
 * more 30-minute-granular time ranges (06:00–22:00), per-day active toggle.
 * PUT replaces all rules; the chips row shows the currently active weekly
 * schedule as saved on the server.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Info, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DAY_LABELS,
  DemoNotice,
  ErrorState,
  LoadingCard,
  PageHeader,
  SectionCard,
} from "@/components/app/shared/ui-kit";
import { apiGet, apiPut } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { errMessage, minuteHHMM, minuteLabel } from "../helpers";

type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  isActive: boolean;
};

type DayDraft = {
  ranges: { start: number; end: number }[];
  active: boolean;
};

const START_MIN = 360; // 06:00
const END_MAX = 1320; // 22:00
const STEP = 30;

function baseOptions(): number[] {
  const out: number[] = [];
  for (let m = START_MIN; m <= END_MAX; m += STEP) out.push(m);
  return out;
}

/** Options for a select, always including the currently selected minute. */
function optionsFor(current: number): number[] {
  const opts = baseOptions();
  if (!opts.includes(current)) opts.push(current);
  return opts.sort((a, b) => a - b);
}

function emptyDrafts(): DayDraft[] {
  return Array.from({ length: 7 }, () => ({ ranges: [], active: false }));
}

function draftsFromRules(rules: AvailabilityRule[]): DayDraft[] {
  const drafts = emptyDrafts();
  for (const rule of rules) {
    const day = drafts[rule.dayOfWeek];
    day.ranges.push({ start: rule.startMinute, end: rule.endMinute });
    if (rule.isActive) day.active = true;
  }
  for (const day of drafts) {
    day.ranges.sort((a, b) => a.start - b.start);
    if (day.ranges.length > 0 && !day.active) {
      // rules exist but all inactive — keep the ranges, day stays off
    }
  }
  return drafts;
}

export default function ScheduleSection() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DayDraft[] | null>(null);
  const [savedRules, setSavedRules] = useState<AvailabilityRule[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiGet<{ items: AvailabilityRule[] }>("/api/v1/doctor/availability")
      .then((d) => {
        if (!alive) return;
        setSavedRules(d.items);
        setDrafts(draftsFromRules(d.items));
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

  const setDay = (dayIdx: number, next: DayDraft) => {
    setDrafts((prev) => {
      if (!prev) return prev;
      const copy = [...prev];
      copy[dayIdx] = next;
      return copy;
    });
  };

  const validationError = useMemo(() => {
    if (!drafts) return null;
    for (let d = 0; d < 7; d++) {
      const { ranges } = drafts[d];
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (r.start >= r.end) {
          return `${DAY_LABELS[d]}: start time must be before end time.`;
        }
        if (r.start < 0 || r.end > 1440) {
          return `${DAY_LABELS[d]}: times must be between 06:00 and 22:00.`;
        }
      }
      const sorted = [...ranges].sort((a, b) => a.start - b.start);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].start === sorted[i].start) {
          return `${DAY_LABELS[d]}: two ranges share the same start time.`;
        }
        if (sorted[i - 1].end > sorted[i].start) {
          return `${DAY_LABELS[d]}: time ranges overlap.`;
        }
      }
    }
    return null;
  }, [drafts]);

  const dirty = useMemo(() => {
    if (!drafts || !savedRules) return false;
    const current = JSON.stringify(
      drafts.flatMap((day, dayOfWeek) =>
        day.ranges.map((r) => ({
          dayOfWeek,
          startMinute: r.start,
          endMinute: r.end,
          isActive: day.active,
        }))
      ).sort((a, b) =>
        `${a.dayOfWeek}-${a.startMinute}`.localeCompare(
          `${b.dayOfWeek}-${b.startMinute}`
        )
      )
    );
    const saved = JSON.stringify(
      savedRules
        .map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          isActive: r.isActive,
        }))
        .sort((a, b) =>
          `${a.dayOfWeek}-${a.startMinute}`.localeCompare(
            `${b.dayOfWeek}-${b.startMinute}`
          )
        )
    );
    return current !== saved;
  }, [drafts, savedRules]);

  const save = async () => {
    if (!drafts || validationError) return;
    const rules = drafts.flatMap((day, dayOfWeek) =>
      day.ranges.map((r) => ({
        dayOfWeek,
        startMinute: r.start,
        endMinute: r.end,
        isActive: day.active,
      }))
    );
    setSaving(true);
    try {
      const data = await apiPut<{ items: AvailabilityRule[] }>(
        "/api/v1/doctor/availability",
        { rules }
      );
      setSavedRules(data.items);
      setDrafts(draftsFromRules(data.items));
      toast({
        title: "Schedule saved",
        description:
          "Your weekly availability is live — patients can now book these slots.",
      });
    } catch (err) {
      toast({
        title: "Could not save schedule",
        description: errMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const activeChips = useMemo(() => {
    if (!savedRules) return [];
    return savedRules
      .filter((r) => r.isActive)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startMinute - b.startMinute)
      .map(
        (r) =>
          `${DAY_LABELS[r.dayOfWeek]} ${minuteHHMM(r.startMinute)}–${minuteHHMM(r.endMinute)}`
      );
  }, [savedRules]);

  if (loading && !drafts) {
    return (
      <div className="space-y-4">
        <LoadingCard rows={5} />
      </div>
    );
  }

  if (error && !drafts) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Weekly schedule"
        subtitle="Set the hours patients can book you. Every slot is 30 minutes long and follows these weekly rules."
        action={
          <Button
            onClick={save}
            disabled={saving || !!validationError || !dirty}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save schedule"}
          </Button>
        }
      />

      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 text-primary" />
            Live schedule:
          </span>
          {activeChips.map((chip) => (
            <Badge
              key={chip}
              variant="outline"
              className="bg-primary-soft font-medium text-primary"
            >
              {chip}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          No active weekly hours yet — add time ranges below so patients can
          book you.
        </div>
      )}

      <SectionCard title="Edit weekly hours">
        <div className="space-y-2.5">
          {drafts?.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className={`rounded-xl border px-3 py-3 transition-colors sm:px-4 ${
                day.active
                  ? "border-border bg-card"
                  : "border-border/60 bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Label
                    htmlFor={`day-switch-${dayIdx}`}
                    className="text-sm font-bold"
                  >
                    {DAY_LABELS[dayIdx]}
                  </Label>
                  {day.ranges.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      Unavailable
                    </span>
                  ) : day.active ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-[10px] font-semibold text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                    >
                      {day.ranges.length} range{day.ranges.length === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Off (ranges kept)
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <Switch
                    id={`day-switch-${dayIdx}`}
                    checked={day.active}
                    onCheckedChange={(v) =>
                      setDay(dayIdx, {
                        ranges:
                          v && day.ranges.length === 0
                            ? [{ start: 1020, end: 1140 }]
                            : day.ranges,
                        active: v,
                      })
                    }
                  />
                </div>
              </div>

              {day.ranges.length > 0 ? (
                <ul className="mt-2.5 space-y-2">
                  {day.ranges.map((range, rangeIdx) => (
                    <li
                      key={rangeIdx}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Select
                        value={String(range.start)}
                        onValueChange={(v) => {
                          const start = Number(v);
                          const ranges = [...day.ranges];
                          ranges[rangeIdx] = { ...range, start };
                          setDay(dayIdx, { ...day, ranges });
                        }}
                      >
                        <SelectTrigger size="sm" className="w-[110px]" aria-label={`${DAY_LABELS[dayIdx]} range ${rangeIdx + 1} start`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {optionsFor(range.start)
                            .filter((m) => m < END_MAX)
                            .map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {minuteHHMM(m)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">to</span>
                      <Select
                        value={String(range.end)}
                        onValueChange={(v) => {
                          const end = Number(v);
                          const ranges = [...day.ranges];
                          ranges[rangeIdx] = { ...range, end };
                          setDay(dayIdx, { ...day, ranges });
                        }}
                      >
                        <SelectTrigger size="sm" className="w-[110px]" aria-label={`${DAY_LABELS[dayIdx]} range ${rangeIdx + 1} end`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {optionsFor(range.end)
                            .filter((m) => m > START_MIN)
                            .map((m) => (
                              <SelectItem key={m} value={String(m)}>
                                {minuteHHMM(m)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <span className="text-[11px] text-muted-foreground">
                        {minuteLabel(range.start)} – {minuteLabel(range.end)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDay(dayIdx, {
                            ranges: day.ranges.filter((_, i) => i !== rangeIdx),
                            active:
                              day.ranges.length === 1 ? false : day.active,
                          })
                        }
                        aria-label={`Remove ${DAY_LABELS[dayIdx]} range`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                className="mt-2 gap-1.5 text-primary"
                onClick={() =>
                  setDay(dayIdx, {
                    ranges: [...day.ranges, { start: 1020, end: 1140 }],
                    active: true,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add time range
              </Button>
            </div>
          ))}
        </div>

        {validationError ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">
            {validationError}
          </p>
        ) : null}
      </SectionCard>

      <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Slots are <strong className="text-foreground">30 minutes</strong>{" "}
          long. Toggle a day off to pause its hours without losing the ranges —
          inactive days simply generate no bookable slots. Saving replaces your
          whole weekly schedule at once.
        </p>
      </div>

      <DemoNotice>
        <strong className="text-foreground">Scheduling.</strong> Availability
        rules drive the public booking calendar — patients can only book
        slots you publish here.
      </DemoNotice>
    </div>
  );
}
