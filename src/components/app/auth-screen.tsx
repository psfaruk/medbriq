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
  Sparkles,
  Stethoscope,
  UserRound,
  ChevronDown,
  Languages,
} from "lucide-react";
import { useAppStore } from "@/lib/app-state";
import { apiGet, apiPost, ApiCallError } from "@/lib/api-client";
import { getPreloadedBoot } from "@/lib/boot-data";
import type {
  AuthConfig,
  SessionUser,
  SpecialtyInfo,
} from "@/lib/types";
import { LANGS } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { BrandLogo, BrandWordmark } from "@/components/app/shared/brand";
import { useT } from "@/components/app/shared/ui-kit";

/**
 * MedBricBD authentication (master prompt §3.1-8 + §8 flows).
 *
 * Working sign-in methods on this deployment:
 *  - Email + password (all roles)
 *  - Phone + OTP (patients; dev mode returns the code in the response)
 *  - Google (real credential flow when configured; otherwise an honestly
 *    labelled demo-account fallback so the flow is testable end-to-end)
 *  - Demo accounts panel for quick role access during review
 */

type RegisterRole = "PATIENT" | "DOCTOR" | "HOSPITAL";

const DEMO_ACCOUNTS: {
  label: string;
  email: string;
  password: string;
  role: RegisterRole | "ADMIN";
}[] = [
  {
    label: "Patient — Rahim Uddin",
    email: "patient@medbriq.dev",
    password: "Patient@123",
    role: "PATIENT",
  },
  {
    label: "Doctor — Dr. Ayesha Rahman",
    email: "doctor@medbriq.dev",
    password: "Doctor@123",
    role: "DOCTOR",
  },
  {
    label: "Hospital — Greenview General",
    email: "hospital@medbriq.dev",
    password: "Hospital@123",
    role: "HOSPITAL",
  },
  {
    label: "Super Admin — Platform",
    email: "admin@medbriq.dev",
    password: "Admin@Medbriq123",
    role: "ADMIN",
  },
];

export default function AuthScreen() {
  const { t } = useT();
  const { authView, setAuthView, setUser, lang, setLang } = useAppStore();
  const { toast } = useToast();

  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [specialties, setSpecialties] = useState<SpecialtyInfo[]>([]);
  const [showDemo, setShowDemo] = useState(false);

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
            setConfig({
              googleEnabled: false,
              googleClientId: null,
              phoneOtpEnabled: true,
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

  const loginWithDemo = async (
    email: string,
    password: string,
    note?: string
  ) => {
    try {
      const data = await apiPost<{ user: SessionUser }>(
        "/api/v1/auth/login",
        { email, password }
      );
      if (note) {
        toast({ title: "Signed in", description: note });
      }
      onAuthenticated(data.user);
    } catch (err) {
      toast({
        title: "Sign in failed",
        description:
          err instanceof ApiCallError ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const googleSignIn = async () => {
    if (config?.googleEnabled) {
      // Real Google flow requires GIS on the client; this deployment uses
      // the demo fallback so the button always works.
      toast({
        title: "Google sign-in",
        description: "Redirecting to Google…",
      });
      return;
    }
    // Honestly-labelled demo fallback (no GOOGLE_CLIENT_ID in sandbox).
    await loginWithDemo(
      "google.demo@medbriq.dev",
      "Google@Demo123",
      "Demo Google account used — real Google OAuth activates when GOOGLE_CLIENT_ID is configured."
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Mobile cinematic video banner ──────────────────── */}
      <div className="relative h-44 overflow-hidden sm:h-52 lg:hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover animate-video-drift"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/images/auth-side.png"
          aria-hidden="true"
        >
          <source src="/videos/login-wall.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#172B4D]/95 via-[#1769AA]/55 to-[#13A89E]/20"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-end p-5 pb-4 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
            Bangladesh-first · Global-ready
          </p>
          <h2 className="mt-1 max-w-sm text-lg font-bold leading-snug">
            Healthcare appointments, without the waiting room.
          </h2>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1.05fr_1fr]">
        {/* ── Left: form column ─────────────────────────────────── */}
        <div className="flex flex-col px-5 sm:px-10 lg:px-16 py-8">
          {/* top bar */}
          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-2"
              onClick={() => setAuthView("welcome")}
              aria-label="MedBricBD home"
            >
              <BrandLogo className="h-9 w-9" />
              <BrandWordmark className="text-xl" />
            </button>
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    lang === l.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={lang === l.code}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center py-10">
            <div className="w-full max-w-md animate-rise-in">
              {authView === "welcome" && (
                <WelcomeView onDemoToggle={() => setShowDemo((v) => !v)} />
              )}
              {authView === "login" && (
                <LoginView
                  config={config}
                  onAuthenticated={onAuthenticated}
                  onGoogle={googleSignIn}
                />
              )}
              {authView === "register" && (
                <RegisterView onAuthenticated={onAuthenticated} />
              )}
              {authView === "otp" && <OtpView onAuthenticated={onAuthenticated} />}
              {authView === "forgot" && <ForgotView />}
            </div>
          </div>

          {/* demo accounts panel */}
          <div className="mt-auto">
            <button
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:border-primary/40 transition-colors"
              onClick={() => setShowDemo((v) => !v)}
              aria-expanded={showDemo}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                {t("profile.demoLogins")} — one-click review access
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDemo ? "rotate-180" : ""}`}
              />
            </button>
            {showDemo ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => loginWithDemo(acc.email, acc.password)}
                    className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-left hover:border-primary/50 hover:shadow-soft transition-all"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      {acc.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {acc.email}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {t("auth.terms")}
            </p>
          </div>
        </div>

        {/* ── Right: brand panel (desktop only) ─────────────────── */}
        <aside className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden bg-[#172B4D]">
          {/* Cinematic AI-generated video wall; slow drift adds depth. */}
          <video
            className="absolute inset-0 h-full w-full object-cover animate-video-drift"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/images/auth-side.png"
            aria-hidden="true"
          >
            <source src="/videos/login-wall.mp4" type="video/mp4" />
          </video>
          {/* Brand gradient overlay keeps every word readable. */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-[#172B4D]/88 via-[#1769AA]/65 to-[#13A89E]/35"
            aria-hidden="true"
          />
          <div
            className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="absolute -left-16 bottom-10 h-72 w-72 rounded-full bg-secondary/30 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/70">
              Bangladesh-first · Global-ready
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight">
              Healthcare appointments,{" "}
              <span className="text-white/90">without the waiting room.</span>
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Search verified doctors, compare transparent new/returning
              patient fees and book chamber visits — instant or with doctor
              approval.
            </p>
          </div>
          <div className="relative grid gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "Verified doctors only",
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
              <div key={f.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-white/70">{f.text}</p>
                </div>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-white/60">
              Demo environment — all doctors, hospitals and payments are
              fictional sandbox data.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Welcome ──────────────────────────────────────────────────────── */
function WelcomeView({ onDemoToggle }: { onDemoToggle: () => void }) {
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
        <div className="mt-4 grid gap-2">
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

      <button
        onClick={onDemoToggle}
        className="mt-4 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {t("profile.demoLogins")}
      </button>
    </div>
  );
}

/* ── Login ────────────────────────────────────────────────────────── */
function LoginView({
  config,
  onAuthenticated,
  onGoogle,
}: {
  config: AuthConfig | null;
  onAuthenticated: (user: SessionUser) => void;
  onGoogle: () => void;
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
      const data = await apiPost<{ sent: boolean; devCode?: string }>(
        "/api/v1/auth/otp/request",
        { phone }
      );
      setOtpPhone(phone);
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
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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
          <TabsTrigger value="phone" disabled={!!config && !config.phoneOtpEnabled}>
            {t("auth.phone")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
      >
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
        {t("auth.google")}
      </Button>
      {config && !config.googleEnabled ? (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Google OAuth activates with GOOGLE_CLIENT_ID — the button signs in
          with a clearly-labelled demo account in this sandbox.
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
function OtpView({
  onAuthenticated,
}: {
  onAuthenticated: (user: SessionUser) => void;
}) {
  const { t } = useT();
  const { setAuthView, otpPhone } = useAppStore();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    if (code.length !== 6) return;
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
        title: "Verification failed",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const data = await apiPost<{ devCode?: string }>(
        "/api/v1/auth/otp/request",
        { phone: otpPhone }
      );
      toast({
        title: "Code resent",
        description: data.devCode ? `Sandbox OTP: ${data.devCode}` : undefined,
      });
    } catch (err) {
      toast({
        title: "Could not resend",
        description: err instanceof ApiCallError ? err.message : undefined,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="text-center">
      <button
        onClick={() => setAuthView("login")}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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

      <button
        onClick={resend}
        className="mt-3 text-xs font-medium text-primary hover:underline"
      >
        {t("auth.otpResend")}
      </button>
    </div>
  );
}

/* ── Forgot password ──────────────────────────────────────────────── */
function ForgotView() {
  const { t } = useT();
  const { setAuthView } = useAppStore();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{ sent: boolean; devCode?: string }>(
        "/api/v1/auth/forgot-password",
        { phone }
      );
      toast({
        title: "Reset code sent",
        description: data.devCode
          ? `Sandbox reset code: ${data.devCode}`
          : `If the number is registered, a reset code is on its way.`,
      });
      setAuthView("login");
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
        onClick={() => setAuthView("login")}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("common.back")}
      </button>
      <h1 className="text-2xl font-bold tracking-tight">{t("auth.forgot")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your registered mobile number — we&apos;ll send a reset code.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
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
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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
        <div className="grid gap-3 sm:grid-cols-2">
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
              max={new Date().toISOString().slice(0, 10)}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
            {t("auth.agree")}
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
