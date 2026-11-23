"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import {
  HeartPulse,
  ShieldCheck,
  CalendarCheck,
  Wallet,
  ArrowLeft,
  Loader2,
  Stethoscope,
  UserRound,
  Languages,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet, apiPost, ApiCallError } from "@/lib/api-client";
import { getPreloadedBoot } from "@/lib/boot-data";
import { googlePopupSignIn } from "@/lib/firebase";
import { legalDocTitle } from "@/content/legal";
import { PortalLink } from "@/components/portal/shared";
import type {
  AuthConfig,
  SessionUser,
  SpecialtyInfo,
} from "@/lib/types";
import { LANGS } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { BrandLogo } from "@/components/app/shared/brand";
import { useT, dhakaToday } from "@/components/app/shared/ui-kit";

/**
 * Find Medi Doctor authentication (master prompt §3.1-8 + §8 flows).
 *
 * Production sign-in methods:
 *  - Email + password (all roles)
 *  - Phone + OTP (patients; dev mode returns the code in the response)
 *  - Google (Firebase Auth popup, verified server-side with the
 *    firebase-admin service account)
 */

type RegisterRole = "PATIENT" | "DOCTOR" | "HOSPITAL";

export default function AuthScreen({
  notice,
  onBack,
  backLabel,
}: {
  /** Optional banner (e.g. pending-booking context) rendered over the wall. */
  notice?: React.ReactNode;
  /** When provided, renders a “back to site” affordance in the top bar. */
  onBack?: () => void;
  backLabel?: string;
}) {
  const { t } = useT();
  const { authView, setAuthView, setUser, lang, setLang } = useAppStore();
  const { toast } = useToast();

  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyInfo[]>([]);

  useEffect(() => {
    // PERF: the bootstrap request (app.tsx) already delivered these — only
    // fall back to individual fetches when the preloaded payload is absent
    // (e.g. the user sat on this screen past the freshness window).
    //
    // BUGFIX: /api/v1/auth/config returns the AuthConfig object directly
    // (ok(config)), not { config } — the old d.config read was always
    // undefined, silently disabling the Google button and OTP tab config.
    const pre = getPreloadedBoot();
    void (async () => {
      await Promise.resolve();
      if (pre?.authConfig) {
        setConfig(pre.authConfig);
      } else {
        apiGet<AuthConfig>("/api/v1/auth/config")
          .then((d) => setConfig(d))
          .catch(() =>
            // Safe fallback: if the config cannot load, hide phone OTP
            // (the API would refuse it in production anyway) rather than
            // showing a tab that then fails.
            setConfig({
              googleEnabled: false,
              googleClientId: null,
              phoneOtpEnabled: false,
              devOtpMode: true,
            })
          );
      }
      if (pre?.specialties) {
        setSpecialties(pre.specialties);
      } else {
        apiGet<{ items: SpecialtyInfo[] }>("/api/v1/specialties")
          .then((d) => setSpecialties(d.items))
          .catch(() => setSpecialties([]));
      }
    })();
  }, []);

  const onAuthenticated = (
    user: SessionUser,
    opts?: { viaRegister?: boolean }
  ) => {
    setUser(user);
    if (opts?.viaRegister) track("registration_complete");
    toast({ title: `Welcome, ${user.name.split(" ")[0]}!` });
  };

  const [googleBusy, setGoogleBusy] = useState(false);

  const googleSignIn = async () => {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const result = await googlePopupSignIn();
      if (!result.idToken) {
        if (result.reason !== "cancelled") {
          toast({
            title: "Google sign-in",
            description: result.reason,
            variant: "destructive",
          });
        }
        return;
      }
      const data = await apiPost<{ user: SessionUser }>(
        "/api/v1/auth/google",
        { credential: result.idToken }
      );
      onAuthenticated(data.user);
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description:
          err instanceof ApiCallError ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ── Full-screen cinematic video wall (fixed behind everything) ── */}
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        {/* Static fallback layers: base color + still frame under the video */}
        <div className="absolute inset-0 bg-[#0B1B30]" />
        <div className="absolute inset-0 bg-[url('/images/auth-side.png')] bg-cover bg-center" />
        <video
          className="absolute inset-0 h-full w-full object-cover animate-video-drift"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/images/auth-side.png"
        >
          <source src="/videos/login-wall.mp4" type="video/mp4" />
        </video>
        {/* Brand scrim keeps every overlaid word readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B1B30]/85 via-[#1769AA]/55 to-[#0B1B30]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1B30]/55 via-transparent to-[#0B1B30]/40" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#13A89E]/20 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-96 w-96 rounded-full bg-[#1769AA]/25 blur-3xl" />
      </div>

      {/* ── Overlay content (everything sits on the wall) ─────────── */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar: brand · back · language */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <button
            className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => (onBack ? onBack() : setAuthView("welcome"))}
            aria-label="Find Medi Doctor home"
          >
            <BrandLogo className="h-9 w-9 shrink-0 drop-shadow-md" />
            {/* Wall-specific wordmark: light tints readable on the dark video */}
            <span className="hidden text-xl font-bold tracking-tight drop-shadow-md sm:inline">
              <span className="text-white">Find </span>
              <span className="text-[#A9D6F5]">Medi </span>
              <span className="text-[#5EEAD4]">Doctor</span>
            </span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel ?? "Back to site"}
                title={backLabel ?? "Back to site"}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 shadow-sm backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:min-h-0 sm:px-3.5 sm:py-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{backLabel ?? "Back to site"}</span>
              </button>
            )}
            <div className="flex items-center gap-1 rounded-full border border-white/25 bg-white/10 p-1 shadow-sm backdrop-blur">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:px-3 sm:py-1.5 ${
                    lang === l.code
                      ? "bg-white text-[#1769AA] shadow"
                      : "text-white/85 hover:text-white"
                  }`}
                  aria-pressed={lang === l.code}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Pending-booking banner (rendered by the portal auth frame) */}
        {notice}

        {/* Main: headline + glass form card, both floating on the wall */}
        <main className="flex flex-1 items-center justify-center px-4 py-6 pb-safe-nav sm:px-6">
          <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_minmax(400px,470px)] lg:gap-12">
            {/* Headline column (compact on mobile, full on lg) */}
            <div className="text-center text-white lg:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 sm:text-xs">
                Bangladesh-first · Global-ready
              </p>
              <h2 className="mx-auto mt-2 max-w-xl text-2xl font-bold leading-snug drop-shadow-md sm:text-3xl lg:mx-0 lg:text-[2.75rem] lg:leading-[1.15]">
                Healthcare appointments, without the waiting room.
              </h2>
              <p className="mx-auto mt-3 hidden max-w-md text-sm leading-relaxed text-white/80 sm:block lg:mx-0 lg:text-base">
                Search verified doctors, compare transparent new/returning
                patient fees and book chamber visits — instant or with doctor
                approval.
              </p>
              <div className="mt-7 hidden gap-3 lg:grid lg:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Verified doctors",
                    text: "BMDC registration checked before profiles go live.",
                  },
                  {
                    icon: Wallet,
                    title: "Transparent fees",
                    text: "New & returning patient pricing set by each doctor.",
                  },
                  {
                    icon: CalendarCheck,
                    title: "Reliable booking",
                    text: "Real-time slots — no double booking, ever.",
                  },
                ].map((f) => (
                  <div
                    key={f.title}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                      <f.icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </span>
                    <p className="mt-2.5 text-sm font-semibold">{f.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/70">
                      {f.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Glass card carrying the auth flow (login/register/OTP/forgot) */}
            <div className="mx-auto w-full max-w-md lg:max-w-none">
              <div className="animate-rise-in rounded-3xl border border-white/40 bg-white/95 p-5 shadow-2xl shadow-[#0B1B30]/50 backdrop-blur-xl sm:p-8">
                {authView === "welcome" && <WelcomeView />}
                {authView === "login" && (
                  <LoginView
                    config={config}
                    onAuthenticated={onAuthenticated}
                    onGoogle={googleSignIn}
                    googleBusy={googleBusy}
                  />
                )}
                {authView === "register" && (
                  <RegisterView onAuthenticated={onAuthenticated} />
                )}
                {authView === "otp" && <OtpView onAuthenticated={onAuthenticated} />}
                {authView === "forgot" && <ForgotView />}
              </div>
            </div>
          </div>
        </main>

        {/* Legal line, floating at the bottom of the wall */}
        <div className="mx-auto w-full max-w-xl px-4 pb-5 sm:px-6">
          <p className="text-center text-[11px] leading-relaxed text-white/65">
            <LegalInlineLinks kind="terms-line" />
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the terms/privacy sentence with real, deep-linkable policy links
 * (the legal center lives at ?view=legal). Two shapes:
 *  - "terms-line" — the passive “by continuing…” line
 *  - "agree" — the explicit registration consent sentence
 */
function LegalInlineLinks({ kind }: { kind: "terms-line" | "agree" }) {
  const { t } = useT();
  const lang = useAppStore((s) => s.lang);
  const linkCls =
    "font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm";
  if (kind === "agree") {
    return (
      <>
        {t("auth.agreeLead")}{" "}
        <PortalLink view={{ name: "legal", doc: "terms" }} className={linkCls}>
          {legalDocTitle("terms", lang)}
        </PortalLink>{" "}
        {t("auth.agreeMid")}{" "}
        <PortalLink view={{ name: "legal", doc: "privacy" }} className={linkCls}>
          {legalDocTitle("privacy", lang)}
        </PortalLink>
        {t("auth.agreeTrail")}
      </>
    );
  }
  return (
    <>
      {t("auth.termsLead")}{" "}
      <PortalLink view={{ name: "legal", doc: "terms" }} className={linkCls}>
        {legalDocTitle("terms", lang)}
      </PortalLink>{" "}
      {t("auth.termsJoin")}{" "}
      <PortalLink view={{ name: "legal", doc: "privacy" }} className={linkCls}>
        {legalDocTitle("privacy", lang)}
      </PortalLink>
      {t("auth.termsTrail")}
    </>
  );
}

/* ── Welcome ──────────────────────────────────────────────────────── */
function WelcomeView() {
  const { t } = useT();
  const { setAuthView } = useAppStore();
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
        <HeartPulse className="h-3.5 w-3.5" />
        {t("app.tagline")}
      </span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        {t("auth.welcome")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

      {/* Patient-first onboarding: ONE account type at signup. */}
      <div className="mt-6 rounded-2xl border border-primary/25 bg-primary-soft/40 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("auth.createAccount")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t("auth.createAccountSubtitle")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <Button className="h-11" onClick={() => setAuthView("register")}>
            {t("auth.signUp")}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setAuthView("login")}
          >
            {t("auth.signIn")}
          </Button>
        </div>
      </div>

      {/* Doctors & hospitals apply AFTER login (master prompt §3.1). */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/40 p-3">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("auth.patientFirstNote")}
        </p>
      </div>
    </div>
  );
}

/* ── Login ────────────────────────────────────────────────────────── */
function LoginView({
  config,
  onAuthenticated,
  onGoogle,
  googleBusy,
}: {
  config: AuthConfig | null;
  onAuthenticated: (user: SessionUser) => void;
  onGoogle: () => void;
  googleBusy: boolean;
}) {
  const { t } = useT();
  const { setAuthView, setOtpPhone } = useAppStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{ user: SessionUser }>(
        "/api/v1/auth/login",
        { email, password }
      );
      onAuthenticated(data.user);
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{
        sent: boolean;
        expiresInSeconds?: number;
        devCode?: string;
      }>("/api/v1/auth/otp/request", { phone });
      setOtpPhone(phone);
      // Remember the code's expiry so the OTP view can count it down.
      lastOtpExpiryEpochMs =
        Date.now() +
        (typeof data.expiresInSeconds === "number"
          ? data.expiresInSeconds
          : OTP_TTL_FALLBACK_SECONDS) *
          1000;
      setAuthView("otp");
      toast({
        title: "Code sent",
        description: data.devCode
          ? `Sandbox OTP: ${data.devCode} (no SMS provider configured)`
          : `We sent a 6-digit code to ${phone}.`,
      });
    } catch (err) {
      toast({
        title: "Could not send code",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setAuthView("welcome")}
        className="mb-2 inline-flex items-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold tracking-tight">
        {t("auth.loginTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("auth.loginSubtitle")}
      </p>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "email" | "phone")}
        className="mt-5"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">{t("auth.email")}</TabsTrigger>
          {/* BUGFIX: also disable while the config is still loading
              (config === null) — a clickable tab that later 503s is worse
              than a briefly disabled one. */}
          <TabsTrigger
            value="phone"
            disabled={config === null || !config.phoneOtpEnabled}
          >
            {t("auth.phone")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {config && !config.phoneOtpEnabled ? (
        <p className="mt-2 text-xs text-muted-foreground">
          SMS sign-in is temporarily unavailable — please use email or Google.
        </p>
      ) : null}

      {tab === "email" ? (
        <form onSubmit={submitEmail} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t("auth.email")}</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t("auth.password")}</Label>
              <button
                type="button"
                onClick={() => setAuthView("forgot")}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t("auth.forgot")}
              </button>
            </div>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signIn")}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitPhone} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="login-phone">{t("auth.phone")}</Label>
            <Input
              id="login-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
            <p className="text-[11px] text-muted-foreground">
              Bangladeshi mobile number — we&apos;ll text a 6-digit code.
            </p>
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("common.continue")
            )}
          </Button>
        </form>
      )}

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted-foreground">
          {t("auth.orEmail")}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 gap-2"
        onClick={onGoogle}
        disabled={googleBusy}
      >
        {googleBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
          />
          </svg>
        )}
        {googleBusy ? "Connecting to Google…" : t("auth.google")}
      </Button>
      {config && !config.googleEnabled ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Google sign-in is not configured yet — use email or phone for now.
        </p>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <button
          className="font-semibold text-primary hover:underline"
          onClick={() => setAuthView("register")}
        >
          {t("auth.signUp")}
        </button>
      </p>
    </div>
  );
}

/* ── OTP ──────────────────────────────────────────────────────────── */

/**
 * Expiry (epoch ms) of the most recently requested LOGIN OTP. Set by
 * LoginView when it navigates here and refreshed by OtpView on resend —
 * module-scoped because both views live in this file and the app state
 * carries no request metadata.
 */
let lastOtpExpiryEpochMs = 0;

/** Fallback OTP lifetime (mirrors the server's OTP_TTL_SECONDS, 5 min). */
const OTP_TTL_FALLBACK_SECONDS = 300;
/** Cooldown before the OTP view offers a resend. */
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Bengali numerals — countdown labels localize digits for bn. */
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** "m:ss" countdown label; Bengali digits when the bn locale is active. */
function countdownLabel(seconds: number, lang: string): string {
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return lang === "bn"
    ? label.replace(/\d/g, (d) => BN_DIGITS[Number(d)])
    : label;
}

function OtpView({
  onAuthenticated,
}: {
  onAuthenticated: (user: SessionUser) => void;
}) {
  const { t, lang } = useT();
  const { setAuthView, otpPhone } = useAppStore();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  // Code lifetime (from the request response) + 60s resend cooldown.
  const [expiryLeft, setExpiryLeft] = useState(() =>
    lastOtpExpiryEpochMs > 0
      ? Math.max(0, Math.ceil((lastOtpExpiryEpochMs - Date.now()) / 1000))
      : OTP_TTL_FALLBACK_SECONDS
  );
  const [resendLeft, setResendLeft] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const isBn = lang === "bn";

  // BUGFIX: stale-state guard — the login view stores otpPhone before
  // switching here; if it is empty, bounce back to login instead of
  // rendering a form that would POST phone: "" and fail with a generic 400.
  useEffect(() => {
    if (!otpPhone) setAuthView("login");
  }, [otpPhone, setAuthView]);

  // One 1s ticker drives both countdowns (code expiry + resend cooldown).
  useEffect(() => {
    const id = setInterval(() => {
      setExpiryLeft((s) => Math.max(0, s - 1));
      setResendLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const verify = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true);
    try {
      const data = await apiPost<{ user: SessionUser; isNewAccount: boolean }>(
        "/api/v1/auth/otp/verify",
        {
          phone: otpPhone,
          code,
          ...(name.trim().length >= 2 ? { name: name.trim() } : {}),
        }
      );
      onAuthenticated(data.user);
    } catch (err) {
      toast({
        title: isBn ? "ভেরিফিকেশন ব্যর্থ হয়েছে" : "Verification failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resending || resendLeft > 0) return;
    setResending(true);
    try {
      const data = await apiPost<{
        devCode?: string;
        expiresInSeconds?: number;
      }>("/api/v1/auth/otp/request", { phone: otpPhone });
      const ttl =
        typeof data.expiresInSeconds === "number"
          ? data.expiresInSeconds
          : OTP_TTL_FALLBACK_SECONDS;
      lastOtpExpiryEpochMs = Date.now() + ttl * 1000;
      setExpiryLeft(ttl);
      setResendLeft(OTP_RESEND_COOLDOWN_SECONDS);
      toast({
        title: isBn ? "কোড আবার পাঠানো হয়েছে" : "Code resent",
        description: data.devCode ? `Sandbox OTP: ${data.devCode}` : undefined,
      });
    } catch (err) {
      toast({
        title: isBn ? "আবার পাঠানো যায়নি" : "Could not resend",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (!otpPhone) return null;

  return (
    <div className="text-center">
      <button
        onClick={() => setAuthView("login")}
        className="mb-2 inline-flex items-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold tracking-tight">
        {t("auth.otpTitle")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("auth.otpSubtitle", { phone: otpPhone })}
      </p>

      <div className="mt-6 flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          onComplete={verify}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {/* Code lifetime hint — the server stays authoritative; the countdown
          is a UX affordance so users know when to hit resend instead. */}
      <p
        className={
          expiryLeft > 0
            ? "mt-3 text-xs text-muted-foreground"
            : "mt-3 text-xs font-medium text-destructive"
        }
      >
        {expiryLeft > 0
          ? isBn
            ? `কোডের মেয়াদ ${countdownLabel(expiryLeft, lang)} পরে শেষ`
            : `Code expires in ${countdownLabel(expiryLeft, lang)}`
          : isBn
            ? "কোডের মেয়াদ শেষ — নতুন কোড নিন।"
            : "This code has expired — request a new one."}
      </p>

      <div className="mt-4 space-y-1.5 text-left">
        <Label htmlFor="otp-name">
          {t("auth.name")}{" "}
          <span className="text-muted-foreground">
            ({t("common.optional")} — new accounts)
          </span>
        </Label>
        <Input
          id="otp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
        />
      </div>

      <Button
        className="mt-4 w-full h-11"
        onClick={verify}
        disabled={busy || code.length !== 6}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.confirm")}
      </Button>

      {resendLeft > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {isBn
            ? `আবার পাঠানো যাবে ${countdownLabel(resendLeft, lang)} পরে`
            : `Resend in ${countdownLabel(resendLeft, lang)}`}
        </p>
      ) : (
        <button
          onClick={resend}
          disabled={resending}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
        >
          {resending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {t("auth.otpResend")}
        </button>
      )}
    </div>
  );
}

/* ── Forgot password ──────────────────────────────────────────────── */
function ForgotView() {
  const { t, lang } = useT();
  const { setAuthView } = useAppStore();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const isBn = lang === "bn";

  // BUGFIX: the flow used to dead-end after "code sent" (back to login,
  // nowhere to enter the code). Step 2 now collects the reset code + a new
  // password and completes the flow via POST /api/v1/auth/reset-password.
  const [step, setStep] = useState<"request" | "reset">("request");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiPost<{
        sent: boolean;
        expiresInSeconds?: number;
        devCode?: string;
      }>("/api/v1/auth/forgot-password", { phone });
      setDevCode(data.devCode ?? null);
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setFormError(null);
      setStep("reset");
      toast({
        title: isBn ? "রিসেট কোড পাঠানো হয়েছে" : "Reset code sent",
        description: data.devCode
          ? `Sandbox reset code: ${data.devCode}`
          : isBn
            ? "নম্বরটি নিবন্ধিত থাকলে একটি রিসেট কোড পাঠানো হয়েছে।"
            : "If the number is registered, a reset code is on its way.",
      });
    } catch (err) {
      toast({
        title: isBn ? "কোড পাঠানো যায়নি" : "Could not send code",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    if (code.length !== 6) {
      setFormError(
        isBn
          ? "ফোনে পাঠানো ৬ সংখ্যার কোডটি লিখুন।"
          : "Enter the 6-digit code sent to your phone."
      );
      return;
    }
    if (newPassword.length < 8) {
      setFormError(
        isBn
          ? "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।"
          : "Password must be at least 8 characters."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError(
        isBn ? "পাসওয়ার্ড দুটি মেলেনি।" : "Passwords do not match."
      );
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/v1/auth/reset-password", {
        phone,
        code,
        newPassword,
      });
      toast({
        title: isBn ? "পাসওয়ার্ড রিসেট হয়েছে" : "Password reset",
        description: isBn
          ? "নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন।"
          : "Sign in with your new password.",
      });
      setAuthView("login");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : isBn
            ? "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।"
            : "Something went wrong. Please try again."
      );
      toast({
        title: isBn ? "রিসেট হয়নি" : "Reset failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (step === "request") {
    return (
      <div>
        <button
          onClick={() => setAuthView("login")}
          className="mb-2 inline-flex items-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("common.back")}
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{t("auth.forgot")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isBn
            ? "আপনার নিবন্ধিত মোবাইল নম্বর লিখুন — আমরা একটি রিসেট কোড পাঠাব।"
            : "Enter your registered mobile number — we&apos;ll send a reset code."}
        </p>
        <form onSubmit={request} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-phone">{t("auth.phone")}</Label>
            <Input
              id="forgot-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.continue")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setStep("request")}
        className="mb-2 inline-flex items-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold tracking-tight">
        {isBn ? "নতুন পাসওয়ার্ড দিন" : "Set a new password"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isBn
          ? `${phone} নম্বরে পাঠানো ৬ সংখ্যার কোডটি লিখুন এবং একটি নতুন পাসওয়ার্ড দিন।`
          : `Enter the 6-digit code sent to ${phone} and choose a new password.`}
      </p>
      {devCode ? (
        <p className="mt-3 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Sandbox reset code: <span className="font-semibold">{devCode}</span>{" "}
          (no SMS provider configured)
        </p>
      ) : null}
      <form onSubmit={submitReset} className="mt-5 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="reset-code">{isBn ? "রিসেট কোড" : "Reset code"}</Label>
          <div className="flex justify-center pt-1.5">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-new-password">
            {isBn ? "নতুন পাসওয়ার্ড" : "New password"}
          </Label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={100}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={isBn ? "কমপক্ষে ৮ অক্ষর" : "At least 8 characters"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm-password">
            {isBn ? "নতুন পাসওয়ার্ড আবার লিখুন" : "Confirm new password"}
          </Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {formError ? (
          <p className="text-xs font-medium break-words text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="w-full h-11" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            isBn ? "পাসওয়ার্ড রিসেট করুন" : "Reset password"
          )}
        </Button>
      </form>
    </div>
  );
}


/* ── Register (patient-first unified signup, master prompt §3.1) ──── */
function RegisterView({
  onAuthenticated,
}: {
  onAuthenticated: (
    user: SessionUser,
    opts?: { viaRegister?: boolean }
  ) => void;
}) {
  const { t } = useT();
  const { setAuthView } = useAppStore();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  // Every account starts as a user/patient — doctors and hospitals apply
  // from the dashboard after signing in (see auth.patientFirstNote).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [presentAddress, setPresentAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [sameAddress, setSameAddress] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const canSubmit =
    name.trim().length >= 2 && !!email && password.length >= 8 && agreed;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{ user: SessionUser }>(
        "/api/v1/auth/register",
        {
          role: "PATIENT",
          name: name.trim(),
          email,
          password,
          phone: phone.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          presentAddress: presentAddress.trim() || undefined,
          permanentAddress: (sameAddress ? presentAddress : permanentAddress)
            .trim() || undefined,
          agreed: true,
        }
      );
      onAuthenticated(data.user, { viaRegister: true });
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setAuthView("welcome")}
        className="mb-2 inline-flex items-center gap-1 rounded-md py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold tracking-tight">
        {t("auth.createAccount")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("auth.createAccountSubtitle")}
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reg-name">{t("auth.name")}</Label>
            <Input
              id="reg-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-dob">{t("auth.dob")}</Label>
            <Input
              id="reg-dob"
              type="date"
              required
              // BUGFIX: the UTC "today" string (toISOString) lets users pick
              // tomorrow during Dhaka evening hours — clamp to the local
              // Dhaka date instead (shared ui-kit helper).
              max={dhakaToday()}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="reg-email">{t("auth.email")}</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-phone">
              {t("auth.phone")}{" "}
              <span className="text-muted-foreground">
                ({t("common.optional")})
              </span>
            </Label>
            <Input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-password">{t("auth.password")}</Label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-present-addr">
            {t("auth.presentAddress")}{" "}
            <span className="text-muted-foreground">
              ({t("common.optional")})
            </span>
          </Label>
          <Input
            id="reg-present-addr"
            value={presentAddress}
            onChange={(e) => setPresentAddress(e.target.value)}
            placeholder="House, road, area, city"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-perm-addr">
            {t("auth.permanentAddress")}{" "}
            <span className="text-muted-foreground">
              ({t("common.optional")})
            </span>
          </Label>
          <Input
            id="reg-perm-addr"
            disabled={sameAddress}
            value={sameAddress ? presentAddress : permanentAddress}
            onChange={(e) => setPermanentAddress(e.target.value)}
            placeholder="Village/thana, district"
          />
          <label
            htmlFor="reg-same-addr"
            className="flex cursor-pointer items-center gap-2 pt-0.5 text-xs text-muted-foreground"
          >
            <Checkbox
              id="reg-same-addr"
              checked={sameAddress}
              onCheckedChange={(v) => setSameAddress(v === true)}
            />
            {t("auth.sameAddress")}
          </label>
        </div>

        {/* Explicit agreement — required (master prompt §3.1). */}
        <label
          htmlFor="reg-agree"
          className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3"
        >
          <Checkbox
            id="reg-agree"
            className="mt-0.5"
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            aria-required="true"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            <LegalInlineLinks kind="agree" />
          </span>
        </label>

        <Button type="submit" className="w-full h-11" disabled={busy || !canSubmit}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("auth.createAccount")
          )}
        </Button>
      </form>

      {/* Doctor / hospital onboarding happens AFTER login. */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/40 p-3">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("auth.patientFirstNote")}
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <button
          className="font-semibold text-primary hover:underline"
          onClick={() => setAuthView("login")}
        >
          {t("auth.signIn")}
        </button>
      </p>
    </div>
  );
}
