"use client";

/**
 * PortalVerifyView — public landing for a scanned VVS QR (?view=verify&d=…).
 *
 * Anyone who scans a printed form with a phone camera lands here. The page
 * asks the backend whether the credential is genuine and shows ONLY
 * non-sensitive confirmation data (reference, doctor name, slot, whether a
 * visit is recorded) — never patient identifiers. Doctors are directed to
 * sign in and verify from their dashboard.
 */

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  Loader2,
  ShieldAlert,
  Stethoscope,
  XCircle,
} from "lucide-react";
import { useT, fmtDateLong, fmtTime } from "@/components/app/shared/ui-kit";
import { apiPost } from "@/lib/api-client";
import type { VvsPublicVerify } from "@/lib/vvs-types";

export default function PortalVerifyView({ payload }: { payload: string }) {
  const { t } = useT();
  const [result, setResult] = useState<VvsPublicVerify | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    apiPost<VvsPublicVerify>("/api/v2/vvs/public-verify", { payload })
      .then((d) => {
        if (alive) setResult(d);
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof Error ? err.message : t("common.error"));
        }
      });
    return () => {
      alive = false;
    };
     
  }, [payload]);

  return (
    <main id="main" className="mx-auto w-full max-w-xl px-4 py-10 sm:py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-soft sm:p-8">
        <h1 className="text-xl font-extrabold tracking-tight text-foreground">
          {t("vvs.verify.title")}
        </h1>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-bold text-destructive">
                {t("vvs.verify.invalidTitle")}
              </p>
              <p className="mt-1 text-xs text-destructive/90">{error}</p>
            </div>
          </div>
        ) : !result ? (
          <div
            className="mt-6 flex items-center justify-center gap-2 rounded-xl border bg-muted/40 py-10 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("vvs.verify.checking")}
          </div>
        ) : result.valid ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 dark:bg-emerald-950/40">
              <BadgeCheck
                className="h-6 w-6 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  {t("vvs.verify.validTitle")}
                </p>
                <p className="mt-0.5 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  {result.referenceCode}
                </p>
              </div>
            </div>
            <dl className="space-y-2.5 rounded-xl border bg-muted/40 px-4 py-4 text-sm">
              {result.doctorName ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Stethoscope className="h-4 w-4" aria-hidden="true" />
                    {t("common.doctor")}
                  </dt>
                  <dd className="font-semibold">{result.doctorName}</dd>
                </div>
              ) : null}
              {result.slotStart ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    {t("common.date")}
                  </dt>
                  <dd className="font-semibold">
                    {fmtDateLong(result.slotStart)} · {fmtTime(result.slotStart)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("vvs.card.visitTitle")}</dt>
                <dd className="font-semibold">
                  {result.visitRecorded
                    ? t("vvs.verify.visitRecorded")
                    : t("vvs.verify.noVisit")}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4">
            <XCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-bold text-destructive">
                {t("vvs.verify.invalidTitle")}
              </p>
              {result.reason ? (
                <p className="mt-1 text-xs text-destructive/90">{result.reason}</p>
              ) : null}
            </div>
          </div>
        )}

        <p className="mt-6 rounded-xl bg-primary-soft px-4 py-3 text-xs leading-relaxed text-foreground/80">
          {t("vvs.verify.doctorAction")}
        </p>
      </div>
    </main>
  );
}
