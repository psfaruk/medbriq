"use client";

/**
 * Patients — phone-number lookup of a patient's COMPLETED visit history
 * with the signed-in doctor only (privacy-scoped server-side).
 */

import { useState } from "react";
import { Lock, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DemoNotice,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  SectionCard,
  fmtDate,
  fmtDateLong,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { apiGet } from "@/lib/api-client";
import type { VisitHistoryItem } from "@/lib/types";
import { errMessage, normalizeBdPhoneLocal } from "../helpers";

type VisitsResult = {
  patientName: string | null;
  phone: string;
  items: VisitHistoryItem[];
};

export default function PatientsSection() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<VisitsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    const normalized = normalizeBdPhoneLocal(phone);
    if (!normalized) {
      setError("Enter a valid Bangladeshi mobile number, e.g. 01811-000001.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<VisitsResult>(
        `/api/v1/doctor/patients/visits?phone=${encodeURIComponent(normalized)}`
      );
      setResult(data);
    } catch (err) {
      setError(errMessage(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Patient visit history"
        subtitle="Look up a patient's completed visits with you by mobile number — useful before classifying a new booking as new or returning."
      />

      <SectionCard title="Search by phone number">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            doSearch();
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
              className="pl-9"
              inputMode="tel"
              aria-label="Patient phone number"
            />
          </div>
          <Button type="submit" disabled={loading} className="sm:w-32">
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Accepts local (01…), +880 and 880 spellings — it is normalized
          automatically. Try the demo numbers 01811-000001 or +880 1911-000002.
        </p>
        {error ? (
          <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </SectionCard>

      {result ? (
        <SectionCard
          title={`${result.patientName ?? "Unknown patient"} · ${result.phone}`}
          action={
            result.items.length > 0 ? (
              <Badge variant="outline" className="bg-primary-soft text-primary">
                {result.items.length} visit{result.items.length === 1 ? "" : "s"} with you
              </Badge>
            ) : undefined
          }
        >
          {result.items.length === 0 ? (
            <EmptyState
              icon={<UserRound className="h-6 w-6" />}
              title="No visit history with you for this number"
              hint="There are no completed consultations between this patient and you. If they book now, they will be priced as a new patient."
            />
          ) : (
            <ul className="space-y-2">
              {result.items.map((visit) => (
                <li
                  key={visit.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/70 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {fmtDateLong(visit.slotStart)} · {fmtTime(visit.slotStart)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Completed {fmtDate(visit.completedAt)} ·{" "}
                      {visit.paymentStatusAtCompletion === "PAID"
                        ? "paid online at completion"
                        : "pay at chamber"}
                    </p>
                  </div>
                  {visit.qualifying ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                    >
                      Qualifying visit
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      Not qualifying
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {result && result.items.length > 0 ? (
        <SectionCard title="What this means for pricing">
          <p className="text-sm leading-relaxed text-muted-foreground">
            A <strong className="text-foreground">qualifying visit</strong> is a
            completed consultation with settled payment. Bookings made within
            your returning-patient validity window after the latest qualifying
            visit are priced at the returning fee (see Fee settings). Only
            completed consultations count — cancelled or missed appointments
            never establish eligibility.
          </p>
        </SectionCard>
      ) : null}

      <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Privacy:</strong> this search only
          returns visits that happened with <em>you</em>. Consultations this
          patient had with other doctors are never visible here.
        </p>
      </div>

      <DemoNotice>
        <strong className="text-foreground">Demo tip.</strong> Salma Khatun
        (+880 1811-000002) has a confirmed booking with you but no completed
        visits — her history with other doctors is private. Rahim Uddin
        (01811-000001) has one qualifying completed visit with you (
        <Money amount={600} /> paid online).
      </DemoNotice>
    </div>
  );
}
