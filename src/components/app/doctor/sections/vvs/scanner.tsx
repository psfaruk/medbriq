"use client";

/**
 * VvsScanner — doctor-side QR verification.
 *
 * Camera scanning (jsQR + getUserMedia) with an explicit manual fallback
 * (reference code + printed manual code) for damaged QRs or camera-less
 * devices. Verification itself happens server-side (POST /api/v2/vvs/verify);
 * this UI never trusts the QR alone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  BadgeCheck,
  Camera,
  CameraOff,
  CheckCircle2,
  KeyRound,
  Loader2,
  ScanLine,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  SectionCard,
  useT,
  fmtDateLong,
  fmtTime,
} from "@/components/app/shared/ui-kit";
import { apiPost } from "@/lib/api-client";
import type { VvsVerifyResult, VvsVisit } from "@/lib/vvs-types";

export default function VvsScanner({ onCompleted }: { onCompleted: () => void }) {
  const { t } = useT();
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<VvsVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refCode, setRefCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // completion state
  const [consultNote, setConsultNote] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completedVisit, setCompletedVisit] = useState<VvsVisit | null>(null);
  const [patientCode, setPatientCode] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastCredentialRef = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setScanning(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitVerification = useCallback(
    async (payload: { payload?: string; referenceCode?: string; code?: string }) => {
      setVerifying(true);
      setError(null);
      setResult(null);
      setCompletedVisit(null);
      try {
        const d = await apiPost<VvsVerifyResult>("/api/v2/vvs/verify", payload);
        setResult(d);
        setConsultNote("");
        setPatientCode("");
        setCodeMessage(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("vvs.doctor.verifyFail"));
      } finally {
        setVerifying(false);
      }
    },
    [t]
  );

  // scan loop — jsQR over video frames
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, {
      inversionAttempts: "dontInvert",
    });
    if (code?.data && code.data !== lastCredentialRef.current) {
      lastCredentialRef.current = code.data;
      stopCamera();
      void submitVerification({ payload: code.data });
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stopCamera, submitVerification]);

  const startCamera = async () => {
    setCameraError(null);
    setError(null);
    setResult(null);
    lastCredentialRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      setScanning(true);
      // wait for the <video> element to mount with the stream
      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().then(() => {
          rafRef.current = requestAnimationFrame(tick);
        });
      });
    } catch {
      setCameraOn(false);
      setScanning(false);
      setCameraError(t("vvs.doctor.cameraDenied"));
    }
  };

  const verifyManual = () => {
    if (!refCode.trim() || !manualCode.trim()) return;
    void submitVerification({
      referenceCode: refCode.trim().toUpperCase(),
      code: manualCode.trim().toUpperCase(),
    });
  };

  const completeVisit = async () => {
    if (!result) return;
    setCompleting(true);
    try {
      const credential = lastCredentialRef.current ?? manualCode.trim().toUpperCase();
      const hasCredential = !!credential;
      const d = await apiPost<{ visit: VvsVisit; alreadyCompleted: boolean }>(
        `/api/v2/vvs/complete/${result.appointment.id}`,
        {
          ...(hasCredential
            ? {
                credential,
                ...(lastCredentialRef.current
                  ? {}
                  : { referenceCode: result.appointment.referenceCode }),
              }
            : {}),
          ...(consultNote.trim() ? { consultationNote: consultNote.trim() } : {}),
        }
      );
      // Keep the recorded visit on screen — the credential is now burned,
      // so re-verifying it would only show "already used".
      setCompletedVisit(d.visit);
      setConsultNote("");
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCompleting(false);
    }
  };

  const submitPatientCode = async () => {
    if (!result || !patientCode.trim()) return;
    setCodeBusy(true);
    setCodeMessage(null);
    try {
      await apiPost(
        `/api/v2/vvs/patient-confirmation/${result.appointment.id}`,
        { code: patientCode.trim() }
      );
      setCodeMessage(t("vvs.doctor.confirmConfirmed"));
      onCompleted();
    } catch (err) {
      setCodeMessage(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCodeBusy(false);
    }
  };

  const a = result?.appointment;
  const visit = completedVisit ?? result?.visit ?? null;

  return (
    <div className="space-y-4">
      {/* camera scanner */}
      <SectionCard title={t("vvs.doctor.scanTitle")}>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {t("vvs.doctor.scanHint")}
        </p>
        <div className="overflow-hidden rounded-xl border bg-neutral-900">
          {cameraOn ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="h-64 w-full object-cover sm:h-80"
                playsInline
                muted
                aria-label={t("vvs.doctor.scanning")}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                {t("vvs.doctor.scanning")}
              </span>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-neutral-400 sm:h-56">
              <ScanLine className="h-8 w-8" aria-hidden="true" />
              <p className="text-xs">{cameraError ?? t("vvs.doctor.scanTitle")}</p>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {cameraOn ? (
            <Button variant="outline" onClick={stopCamera}>
              <CameraOff className="h-4 w-4" aria-hidden="true" />
              {t("vvs.doctor.cameraStop")}
            </Button>
          ) : (
            <Button onClick={startCamera}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {t("vvs.doctor.cameraStart")}
            </Button>
          )}
        </div>
        {cameraError ? (
          <p
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600"
            role="alert"
          >
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {cameraError}
          </p>
        ) : null}
      </SectionCard>

      {/* manual verification */}
      <SectionCard title={t("vvs.doctor.manualTitle")}>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          {t("vvs.doctor.manualHint")}
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label htmlFor="vvs-ref" className="sr-only">
              {t("vvs.doctor.reference")}
            </Label>
            <input
              id="vvs-ref"
              className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm uppercase"
              placeholder={t("vvs.doctor.reference")}
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Label htmlFor="vvs-code" className="sr-only">
              {t("vvs.doctor.manualCode")}
            </Label>
            <input
              id="vvs-code"
              className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-sm uppercase"
              placeholder={t("vvs.doctor.manualCode")}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            />
          </div>
          <Button
            onClick={verifyManual}
            disabled={verifying || !refCode.trim() || !manualCode.trim()}
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            {t("vvs.doctor.verifyBtn")}
          </Button>
        </div>
      </SectionCard>

      {/* result */}
      {verifying && !result ? (
        <SectionCard>
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("common.loading")}
          </div>
        </SectionCard>
      ) : null}

      {error ? (
        <SectionCard>
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-destructive">
                {t("vvs.doctor.verifyFail")}
              </p>
              <p className="mt-0.5 text-xs text-destructive/90">{error}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {result && a ? (
        <SectionCard
          title={t("vvs.doctor.verified")}
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {result.method.replace("_", " ")}
            </span>
          }
        >
          <div className="space-y-3">
            <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              <Info label={t("common.patient")} value={a.patientName} />
              <Info label="Phone" value={a.patientPhone} mono />
              <Info
                label={t("common.date")}
                value={`${fmtDateLong(a.slotStart)} · ${fmtTime(a.slotStart)}`}
              />
              <Info label={t("booking.selectChamber")} value={a.chamberName ?? "—"} />
              <Info label={t("booking.reference")} value={a.referenceCode} mono />
              <Info label={t("vvs.serial")} value={`#${result.verification.serialNumber}`} />
            </div>

            {visit ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:bg-emerald-950/40">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {t("vvs.card.visitRecorded")} · {visit.receiptNumber}
                </p>
                {visit.patientConfirmationStatus === "PENDING" ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      {t("vvs.doctor.patientCodeHint")}
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="h-9 w-32 rounded-lg border bg-background px-3 font-mono text-sm tracking-widest"
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        value={patientCode}
                        onChange={(e) => setPatientCode(e.target.value.replace(/\D/g, ""))}
                        aria-label={t("vvs.doctor.patientCodeTitle")}
                      />
                      <Button
                        size="sm"
                        onClick={submitPatientCode}
                        disabled={codeBusy || patientCode.length !== 6}
                      >
                        {codeBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        {t("vvs.doctor.patientCodeBtn")}
                      </Button>
                    </div>
                    {codeMessage ? (
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300" role="status">
                        {codeMessage}
                      </p>
                    ) : null}
                  </div>
                ) : visit.patientConfirmationStatus === "CONFIRMED" ? (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                    {t("vvs.doctor.confirmConfirmed")} · {visit.patientConfirmedVia}
                  </p>
                ) : null}
              </div>
            ) : result.allowed.canComplete || completedVisit ? (
              <div className="space-y-3 rounded-xl border bg-muted/40 px-4 py-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vvs-note">{t("vvs.doctor.consultNote")}</Label>
                  <Textarea
                    id="vvs-note"
                    rows={2}
                    value={consultNote}
                    onChange={(e) => setConsultNote(e.target.value.slice(0, 2000))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.allowed.canCheckIn && !result.verification.checkInAt ? (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await apiPost(`/api/v2/vvs/check-in/${a.id}`, {}).catch(() => {});
                        await submitVerification(
                          lastCredentialRef.current
                            ? { payload: lastCredentialRef.current }
                            : { referenceCode: a.referenceCode, code: manualCode.trim().toUpperCase() }
                        );
                      }}
                    >
                      {t("vvs.doctor.checkIn")}
                    </Button>
                  ) : null}
                  <Button onClick={completeVisit} disabled={completing}>
                    {completing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    {t("vvs.doctor.complete")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                {t("vvs.doctor.alreadyCompleted")}
              </p>
            )}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`truncate text-sm font-semibold ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
