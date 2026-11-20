"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES } from "@/lib/constants";
import { normalizeBdPhone } from "@/lib/phone";
import type { AuthConfig, SessionUser } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  Info,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Stethoscope,
  Timer,
  Zap,
} from "lucide-react";

/** Minimal typings for the Google Identity Services script we load on demand. */
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (r: { credential: string }) => void;
  }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

/** The official multicolor Google "G" mark (inline, no external asset). */
function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

/** Load the GIS client script once (idempotent across effect re-runs). */
function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("No window"));
      return;
    }
    const existing = document.getElementById("medbriq-gis-script");
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "medbriq-gis-script";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

/** mm:ss countdown label for OTP expiry. */
function countdownLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * AuthView — sign in / create account (patient or doctor).
 * Lives at the "auth" view of the single-page app shell.
 */

const CITIES = [
  "Dhaka",
  "Chattogram",
  "Sylhet",
  "Khulna",
  "Rajshahi",
  "Barishal",
  "Rangpur",
  "Mymensingh",
];

const DEMO_ACCOUNTS: { label: string; email: string; password: string }[] = [
  { label: "Admin", email: "admin@medbriq.dev", password: "Admin@Medbriq123" },
  { label: "Doctor", email: "doctor@medbriq.dev", password: "Doctor@123" },
  { label: "Patient", email: "patient@medbriq.dev", password: "Patient@123" },
];

type SpecialtyOption = { slug: string; name: string };

/** POST JSON and throw an Error carrying the server's message on failure. */
async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok || !isApiSuccess(json)) {
    throw new Error(
      isApiError(json) ? json.error.message : "Something went wrong. Try again."
    );
  }
  return json.data;
}

function isApiSuccess(v: unknown): v is { ok: true; data: unknown } {
  return (
    typeof v === "object" && v !== null && (v as { ok?: unknown }).ok === true
  );
}

function isApiError(
  v: unknown
): v is { ok: false; error: { message: string; code: string } } {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { ok?: unknown }).ok === false &&
    typeof (v as { error?: { message?: unknown } }).error?.message === "string"
  );
}

export default function AuthView() {
  const { user, userLoaded, authReturnView, navigate, setUser, setAuthReturnView } =
    useAppStore();
  const { toast } = useToast();

  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [role, setRole] = useState<"PATIENT" | "DOCTOR">("PATIENT");

  // Sign in
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  // Phone (OTP) sign in
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Google sign in
  const [googleState, setGoogleState] = useState<
    "loading" | "ready" | "unavailable" | "error"
  >("loading");
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleHelpOpen, setGoogleHelpOpen] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleCallbackRef = useRef<(credential: string) => void>(() => {});

  // Forgot-password dialog
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotDevCode, setForgotDevCode] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  // Register (shared)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  // Register (doctor)
  const [specialties, setSpecialties] = useState<SpecialtyOption[] | null>(null);
  const [specialtySlug, setSpecialtySlug] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [followUpFee, setFollowUpFee] = useState("");
  const [city, setCity] = useState("");
  const [chamberAddress, setChamberAddress] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState<string[]>(["bn", "en"]);
  const [supportsVideo, setSupportsVideo] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);

  // Load specialty options for the doctor registration form.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/specialties")
      .then((r) => r.json())
      .then((res: unknown) => {
        if (cancelled) return;
        if (!isApiSuccess(res)) throw new Error("failed");
        const d = res.data;
        // Tolerate { items } / { specialties } / bare array response shapes.
        const raw: unknown = Array.isArray(d)
          ? d
          : Array.isArray((d as { items?: unknown[] })?.items)
            ? (d as { items: unknown[] }).items
            : Array.isArray((d as { specialties?: unknown[] })?.specialties)
              ? (d as { specialties: unknown[] }).specialties
              : [];
        const options = (raw as Record<string, unknown>[])
          .filter((s) => typeof s?.slug === "string" && typeof s?.name === "string")
          .map((s) => ({ slug: s.slug as string, name: s.name as string }));
        setSpecialties(options);
      })
      .catch(() => {
        if (!cancelled) setSpecialties([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Store the session, greet, and route to the return view (or role home). */
  function handleAuthSuccess(sessionUser: SessionUser, isNewAccount: boolean) {
    setUser(sessionUser);
    const firstName = sessionUser.name.split(" ")[0] || "there";
    toast({
      title: isNewAccount
        ? `Welcome, ${firstName}`
        : `Welcome back, ${firstName}`,
      description: "You are signed in to Medbriq.",
    });
    const returnTo = authReturnView;
    setAuthReturnView({ name: "home" });
    if (returnTo.name !== "home" && returnTo.name !== "auth") {
      navigate(returnTo);
    } else if (sessionUser.role === "DOCTOR") {
      navigate({ name: "doctor-dashboard" });
    } else if (sessionUser.role === "ADMIN") {
      navigate({ name: "admin" });
    } else {
      navigate({ name: "home" });
    }
  }

  // Fetch the auth config once on mount to know which methods are available.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/auth/config")
      .then((r) => r.json())
      .then((res: unknown) => {
        if (cancelled) return;
        if (isApiSuccess(res)) {
          const config = res.data as AuthConfig;
          if (config.googleEnabled && config.googleClientId) {
            setGoogleClientId(config.googleClientId);
            setGoogleState("ready");
          } else {
            setGoogleState("unavailable");
          }
        } else {
          setGoogleState("error");
        }
      })
      .catch(() => {
        if (!cancelled) setGoogleState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the latest Google credential handler available to the GIS callback.
  async function handleGoogleCredential(credential: string) {
    if (googleBusy) return;
    setGoogleBusy(true);
    try {
      const data = (await postJson("/api/v1/auth/google", {
        credential,
      })) as { user: SessionUser; isNewAccount: boolean };
      handleAuthSuccess(data.user, data.isNewAccount);
    } catch (err) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleBusy(false);
    }
  }
  useEffect(() => {
    googleCallbackRef.current = handleGoogleCredential;
  });

  // Render the official GIS button once the config and script are ready.
  useEffect(() => {
    if (googleState !== "ready" || !googleClientId) return;
    let cancelled = false;
    loadGisScript()
      .then(() => {
        if (cancelled) return;
        const idApi = window.google?.accounts?.id;
        if (!idApi || !googleButtonRef.current) return;
        idApi.initialize({
          client_id: googleClientId,
          callback: (response: { credential: string }) => {
            void googleCallbackRef.current(response.credential);
          },
        });
        idApi.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 300,
          text: "signin_with",
        });
      })
      .catch(() => {
        if (!cancelled) setGoogleState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [googleState, googleClientId]);

  // OTP expiry countdown (mm:ss).
  useEffect(() => {
    if (!otpSent || expiresAt === null) return;
    const tick = () =>
      setSecondsLeft(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpSent, expiresAt]);

  function resetOtpState() {
    setOtpSent(false);
    setOtpCode("");
    setDevCode(null);
    setExpiresAt(null);
    setSecondsLeft(0);
  }

  async function sendCode() {
    if (sendingCode) return;
    const normalized = normalizeBdPhone(phone.trim());
    if (!normalized) {
      toast({
        title: "Invalid phone number",
        description: "Enter a Bangladeshi mobile number, e.g. 01712345678.",
        variant: "destructive",
      });
      return;
    }
    setSendingCode(true);
    try {
      const data = (await postJson("/api/v1/auth/otp/request", {
        phone: normalized,
      })) as {
        sent: boolean;
        expiresInSeconds: number;
        devCode?: string;
      };
      setOtpSent(true);
      setOtpCode("");
      setDevCode(typeof data.devCode === "string" ? data.devCode : null);
      setExpiresAt(Date.now() + data.expiresInSeconds * 1000);
      toast({
        title: "Code sent",
        description: `A 6-digit code was sent to ${normalized}.`,
      });
    } catch (err) {
      toast({
        title: "Could not send code",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyOtp() {
    if (verifying || otpCode.length !== 6) return;
    const normalized = normalizeBdPhone(phone.trim());
    if (!normalized) {
      toast({
        title: "Invalid phone number",
        description: "Enter a Bangladeshi mobile number, e.g. 01712345678.",
        variant: "destructive",
      });
      return;
    }
    setVerifying(true);
    try {
      const body: { phone: string; code: string; name?: string } = {
        phone: normalized,
        code: otpCode,
      };
      const name = phoneName.trim();
      if (name) body.name = name;
      const data = (await postJson("/api/v1/auth/otp/verify", body)) as {
        user: SessionUser;
        isNewAccount: boolean;
      };
      resetOtpState();
      setPhoneName("");
      handleAuthSuccess(data.user, data.isNewAccount);
    } catch (err) {
      // 400 INVALID_CODE (message includes attempts left) / 429 too many attempts.
      toast({
        title: "Verification failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  function openForgotDialog() {
    setForgotStep(1);
    setForgotPhone("");
    setForgotCode("");
    setForgotDevCode(null);
    setForgotPassword("");
    setForgotOpen(true);
  }

  async function submitForgotRequest(e: FormEvent) {
    e.preventDefault();
    if (forgotBusy) return;
    const normalized = normalizeBdPhone(forgotPhone.trim());
    if (!normalized) {
      toast({
        title: "Invalid phone number",
        description: "Enter the Bangladeshi mobile number on your account.",
        variant: "destructive",
      });
      return;
    }
    setForgotBusy(true);
    try {
      const data = (await postJson("/api/v1/auth/forgot-password", {
        phone: normalized,
      })) as { sent: boolean; expiresInSeconds: number; devCode?: string };
      setForgotDevCode(
        typeof data.devCode === "string" ? data.devCode : null
      );
      setForgotStep(2);
    } catch (err) {
      toast({
        title: "Could not send reset code",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setForgotBusy(false);
    }
  }

  async function submitForgotReset(e: FormEvent) {
    e.preventDefault();
    if (forgotBusy) return;
    if (forgotCode.length !== 6) {
      toast({
        title: "Enter the 6-digit code",
        description: "Check the code we sent to your phone.",
        variant: "destructive",
      });
      return;
    }
    if (forgotPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    const normalized = normalizeBdPhone(forgotPhone.trim());
    if (!normalized) {
      toast({
        title: "Invalid phone number",
        variant: "destructive",
      });
      return;
    }
    setForgotBusy(true);
    try {
      await postJson("/api/v1/auth/reset-password", {
        phone: normalized,
        code: forgotCode,
        newPassword: forgotPassword,
      });
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      setForgotOpen(false);
    } catch (err) {
      toast({
        title: "Could not reset password",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    try {
      const data = (await postJson("/api/v1/auth/login", {
        email,
        password,
      })) as { user: SessionUser };
      handleAuthSuccess(data.user, false);
    } catch (err) {
      toast({
        title: "Sign in failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSigningIn(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (registering) return;

    // Basic client-side checks; the server re-validates everything.
    if (regPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    let payload: Record<string, unknown>;
    if (role === "DOCTOR") {
      const years = Number(experienceYears);
      const fee = Number(consultationFee);
      const followUp = followUpFee.trim() === "" ? 0 : Number(followUpFee);
      if (!specialtySlug) {
        toast({ title: "Select a specialty", variant: "destructive" });
        return;
      }
      if (regNumber.trim().length < 3) {
        toast({
          title: "Registration number required",
          description: "Enter your BMDC registration number.",
          variant: "destructive",
        });
        return;
      }
      if (!Number.isInteger(years) || years < 0 || years > 60) {
        toast({
          title: "Invalid experience",
          description: "Enter whole years between 0 and 60.",
          variant: "destructive",
        });
        return;
      }
      if (!Number.isFinite(fee) || fee <= 0) {
        toast({
          title: "Invalid consultation fee",
          description: "Enter a fee greater than zero.",
          variant: "destructive",
        });
        return;
      }
      if (!Number.isFinite(followUp) || followUp < 0) {
        toast({
          title: "Invalid follow-up fee",
          variant: "destructive",
        });
        return;
      }
      if (!city) {
        toast({ title: "Select a city", variant: "destructive" });
        return;
      }
      if (languages.length === 0) {
        toast({
          title: "Select at least one language",
          variant: "destructive",
        });
        return;
      }
      payload = {
        role: "DOCTOR",
        name: regName,
        email: regEmail,
        phone: regPhone.trim() === "" ? undefined : regPhone,
        password: regPassword,
        specialtySlug,
        regNumber: regNumber.trim(),
        experienceYears: years,
        consultationFee: fee,
        followUpFee: followUp,
        city,
        chamberAddress:
          chamberAddress.trim() === "" ? undefined : chamberAddress.trim(),
        bio: bio.trim() === "" ? undefined : bio.trim(),
        languages: languages.join(","),
        supportsVideo,
        requiresApproval,
      };
    } else {
      payload = {
        role: "PATIENT",
        name: regName,
        email: regEmail,
        phone: regPhone.trim() === "" ? undefined : regPhone,
        password: regPassword,
      };
    }

    setRegistering(true);
    try {
      const data = (await postJson("/api/v1/auth/register", payload)) as {
        user: SessionUser;
      };
      handleAuthSuccess(data.user, true);
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  }

  function fillDemo(account: { email: string; password: string }) {
    setTab("signin");
    setEmail(account.email);
    setPassword(account.password);
    toast({
      title: "Credentials filled",
      description: "Press Sign in to continue.",
    });
  }

  function toggleLanguage(code: string, checked: boolean) {
    setLanguages((prev) =>
      checked
        ? prev.includes(code)
          ? prev
          : [...prev, code]
        : prev.filter((c) => c !== code)
    );
  }

  return (
    <div className="relative overflow-hidden bg-hero-mesh">
      <div
        className="blob h-72 w-72 bg-emerald-300/40 -top-20 -left-16"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        {/* Branding panel — desktop only */}
        <aside className="relative hidden overflow-hidden rounded-3xl bg-brand-gradient p-8 text-primary-foreground shadow-xl shadow-emerald-900/20 lg:flex lg:flex-col lg:gap-6">
          <div
            className="blob h-56 w-56 bg-white/25 -top-16 -right-10"
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-2xl font-bold leading-snug">
              Your health companion in Bangladesh
            </h2>
            <p lang="bn" className="mt-2 text-sm text-primary-foreground/85">
              বিশ্বস্ত ডাক্তার খুঁজুন ও সহজেই অ্যাপয়েন্টমেন্ট নিন।
            </p>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/20 shadow-lg">
            <Image
              src="/images/auth-side.png"
              alt="Illustration of a doctor consulting a patient"
              width={560}
              height={560}
              className="h-auto w-full object-cover"
            />
          </div>
          <ul className="relative space-y-3 text-sm">
            {[
              { icon: ShieldCheck, text: "BMDC-verified doctor profiles" },
              { icon: BadgeCheck, text: "Transparent new & returning patient fees" },
              { icon: Zap, text: "Instant confirmation or doctor approval" },
            ].map((benefit) => (
              <li key={benefit.text} className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <benefit.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {benefit.text}
              </li>
            ))}
          </ul>
        </aside>

        {/* Form column */}
        <div className="mx-auto w-full max-w-lg">
      <Card className="border-border/70 shadow-xl shadow-emerald-900/5">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Medbriq</CardTitle>
          <CardDescription>
            Sign in to book appointments or manage your practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userLoaded && user ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                You are already signed in as{" "}
                <span className="font-medium text-foreground">{user.name}</span>.
              </p>
              <Button
                onClick={() =>
                  navigate(
                    user.role === "DOCTOR"
                      ? { name: "doctor-dashboard" }
                      : user.role === "ADMIN"
                        ? { name: "admin" }
                        : { name: "home" }
                  )
                }
              >
                Continue to my workspace
              </Button>
            </div>
          ) : (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "signin" | "register")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="register">Create account</TabsTrigger>
              </TabsList>

              {/* ------------------------- Sign in ------------------------- */}
              <TabsContent value="signin" className="mt-6">
                {/* Method switcher: Email | Phone */}
                <div
                  role="tablist"
                  aria-label="Sign-in method"
                  className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={method === "email"}
                    onClick={() => setMethod("email")}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      method === "email"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    Email
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={method === "phone"}
                    onClick={() => setMethod("phone")}
                    className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      method === "phone"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    Phone
                  </button>
                </div>

                {method === "email" ? (
                  <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={signingIn || email === "" || password === ""}
                    >
                      {signingIn ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Signing in
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={openForgotDialog}
                        className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 space-y-4">
                    {/* Step 1: phone number */}
                    <div className="space-y-2">
                      <Label htmlFor="signin-phone">Phone number</Label>
                      <Input
                        id="signin-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        inputMode="tel"
                        autoComplete="tel"
                        maxLength={20}
                        disabled={otpSent}
                      />
                      <p className="text-xs text-muted-foreground">
                        Bangladeshi mobile number
                        {otpSent && (
                          <>
                            {" — "}
                            <button
                              type="button"
                              onClick={resetOtpState}
                              className="font-medium text-primary hover:underline"
                            >
                              Use a different number
                            </button>
                          </>
                        )}
                      </p>
                    </div>

                    {!otpSent ? (
                      <Button
                        type="button"
                        className="w-full gap-1.5"
                        onClick={() => void sendCode()}
                        disabled={sendingCode || phone.trim() === ""}
                      >
                        {sendingCode ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending code
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4" />
                            Send code
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        {/* Dev-mode OTP (no SMS provider configured) */}
                        {devCode && (
                          <Alert>
                            <Info />
                            <AlertTitle>
                              Dev mode — no SMS provider configured
                            </AlertTitle>
                            <AlertDescription>
                              Your code:{" "}
                              <button
                                type="button"
                                onClick={() => setOtpCode(devCode)}
                                className="rounded font-mono text-base font-bold tracking-widest text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Fill verification code ${devCode}`}
                              >
                                {devCode}
                              </button>{" "}
                              (tap to fill)
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="signin-otp">Verification code</Label>
                          <InputOTP
                            id="signin-otp"
                            maxLength={6}
                            value={otpCode}
                            onChange={setOtpCode}
                            autoComplete="one-time-code"
                            inputMode="numeric"
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signin-phone-name">
                            Your name{" "}
                            <span className="text-muted-foreground">
                              (for new patients)
                            </span>
                          </Label>
                          <Input
                            id="signin-phone-name"
                            value={phoneName}
                            onChange={(e) => setPhoneName(e.target.value)}
                            placeholder="e.g. Ayesha Rahman"
                            maxLength={80}
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          {secondsLeft > 0 ? (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Timer
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Code expires in {countdownLabel(secondsLeft)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              The code has expired
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => void sendCode()}
                            disabled={sendingCode || secondsLeft > 0}
                          >
                            {sendingCode && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            Resend code
                          </Button>
                        </div>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => void verifyOtp()}
                          disabled={verifying || otpCode.length !== 6}
                        >
                          {verifying ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Verifying
                            </>
                          ) : (
                            "Verify and sign in"
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* "or" divider + Google sign-in */}
                <div className="flex items-center gap-3 py-5" aria-hidden="true">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    or
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div className="flex flex-col items-center gap-3">
                  {googleState === "loading" ? (
                    <div
                      className="h-10 w-[300px] animate-pulse rounded-md bg-secondary"
                      aria-label="Loading Google sign-in"
                    />
                  ) : googleState === "ready" ? (
                    <div className="relative flex w-full justify-center">
                      <div ref={googleButtonRef} />
                      {googleBusy && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-background/80">
                          <Loader2
                            className="h-5 w-5 animate-spin text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => setGoogleHelpOpen(true)}
                      >
                        <GoogleGIcon />
                        Continue with Google
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        {googleState === "error"
                          ? "Google sign-in could not be loaded right now. Refresh the page to retry."
                          : "Not configured yet — tap the button to see how to enable it."}
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* ------------------------ Register ------------------------ */}
              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Role selector */}
                  <RadioGroup
                    value={role}
                    onValueChange={(v) => setRole(v as "PATIENT" | "DOCTOR")}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    <Label
                      htmlFor="role-patient"
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/60"
                    >
                      <RadioGroupItem id="role-patient" value="PATIENT" className="mt-0.5" />
                      <CalendarCheck className="mt-0.5 h-5 w-5 text-primary" />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium leading-none">
                          Patient
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Book and track appointments
                        </span>
                      </span>
                    </Label>
                    <Label
                      htmlFor="role-doctor"
                      className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft/60"
                    >
                      <RadioGroupItem id="role-doctor" value="DOCTOR" className="mt-0.5" />
                      <Stethoscope className="mt-0.5 h-5 w-5 text-primary" />
                      <span className="space-y-1">
                        <span className="block text-sm font-medium leading-none">
                          Doctor
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          Grow your practice
                        </span>
                      </span>
                    </Label>
                  </RadioGroup>

                  {role === "DOCTOR" && (
                    <Alert className="border-warning/40 bg-warning/5">
                      <Info className="text-warning" />
                      <AlertTitle>Verification required</AlertTitle>
                      <AlertDescription>
                        Doctor accounts pass admin verification before appearing
                        in public search and accepting bookings.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Shared fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name">Full name</Label>
                      <Input
                        id="reg-name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Dr. Ayesha Rahman"
                        required
                        minLength={2}
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone">
                        Phone{" "}
                        <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="reg-phone"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        inputMode="tel"
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground">
                        e.g. 01XXXXXXXXX — Bangladeshi mobile format
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                        maxLength={100}
                      />
                    </div>
                  </div>

                  {/* Doctor-only fields */}
                  {role === "DOCTOR" && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="reg-specialty">Specialty</Label>
                          {specialties === null ? (
                            <div
                              className="h-9 animate-pulse rounded-md bg-secondary"
                              aria-label="Loading specialties"
                            />
                          ) : (
                            <Select
                              value={specialtySlug}
                              onValueChange={setSpecialtySlug}
                            >
                              <SelectTrigger id="reg-specialty" className="w-full">
                                <SelectValue placeholder="Select specialty" />
                              </SelectTrigger>
                              <SelectContent>
                                {specialties.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No specialties available yet.
                                  </div>
                                ) : (
                                  specialties.map((s) => (
                                    <SelectItem key={s.slug} value={s.slug}>
                                      {s.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-number">Registration number</Label>
                          <Input
                            id="reg-number"
                            value={regNumber}
                            onChange={(e) => setRegNumber(e.target.value)}
                            placeholder="BMDC registration number"
                            required
                            minLength={3}
                            maxLength={60}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="reg-experience">
                            Experience (years)
                          </Label>
                          <Input
                            id="reg-experience"
                            type="number"
                            min={0}
                            max={60}
                            step={1}
                            value={experienceYears}
                            onChange={(e) => setExperienceYears(e.target.value)}
                            placeholder="5"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-fee">
                            Consultation fee (BDT)
                          </Label>
                          <Input
                            id="reg-fee"
                            type="number"
                            min={1}
                            step="any"
                            value={consultationFee}
                            onChange={(e) => setConsultationFee(e.target.value)}
                            placeholder="800"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-followup">
                            Follow-up fee (BDT)
                          </Label>
                          <Input
                            id="reg-followup"
                            type="number"
                            min={0}
                            step="any"
                            value={followUpFee}
                            onChange={(e) => setFollowUpFee(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="reg-city">City</Label>
                          <Select value={city} onValueChange={setCity}>
                            <SelectTrigger id="reg-city" className="w-full">
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {CITIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="reg-chamber">
                            Chamber address{" "}
                            <span className="text-muted-foreground">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id="reg-chamber"
                            value={chamberAddress}
                            onChange={(e) => setChamberAddress(e.target.value)}
                            placeholder="House 12, Road 5, Dhanmondi"
                            maxLength={200}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-bio">
                          Short bio{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <Textarea
                          id="reg-bio"
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          placeholder="Tell patients about your practice, qualifications and specialties..."
                          rows={3}
                          maxLength={2000}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Languages</Label>
                        <div className="flex flex-wrap gap-4">
                          {Object.entries(LANGUAGES).map(([code, label]) => (
                            <label
                              key={code}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={languages.includes(code)}
                                onCheckedChange={(checked) =>
                                  toggleLanguage(
                                    code,
                                    checked === true || checked === "indeterminate"
                                  )
                                }
                                aria-label={label}
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="reg-video"
                            className="cursor-pointer text-sm font-normal text-muted-foreground"
                          >
                            Offer video consultations
                          </Label>
                          <Switch
                            id="reg-video"
                            checked={supportsVideo}
                            onCheckedChange={setSupportsVideo}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="reg-approval"
                            className="cursor-pointer text-sm font-normal text-muted-foreground"
                          >
                            Require my approval for each booking
                          </Label>
                          <Switch
                            id="reg-approval"
                            checked={requiresApproval}
                            onCheckedChange={setRequiresApproval}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      registering ||
                      regName.trim().length < 2 ||
                      regEmail === "" ||
                      regPassword.length < 8
                    }
                  >
                    {registering ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Creating account
                      </>
                    ) : role === "DOCTOR" ? (
                      "Register as doctor"
                    ) : (
                      "Create patient account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Demo credentials (explicitly labeled dev-only) */}
      {!user && (
        <Card className="mt-4 border-dashed bg-secondary/40">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Toggle demo accounts"
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" />
                  Demo accounts (dev only)
                </span>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1.5 px-4 pb-4">
                <p className="pb-1 text-[11px] text-muted-foreground">
                  This is a labeled demo environment. Use a filler button then
                  press Sign in.
                </p>
                {DEMO_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.email}
                    className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium">{acc.label}</span>
                      <span className="ml-2 truncate text-xs text-muted-foreground">
                        {acc.email} / {acc.password}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fillDemo(acc)}
                    >
                      Fill
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Forgot-password dialog: phone OTP reset flow */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
              Reset your password
            </DialogTitle>
            <DialogDescription>
              {forgotStep === 1
                ? "Enter the phone number on your account. We will send a verification code."
                : "Enter the code we sent and choose a new password."}
            </DialogDescription>
          </DialogHeader>

          {forgotStep === 1 ? (
            <form onSubmit={submitForgotRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-phone">Phone number</Label>
                <Input
                  id="forgot-phone"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Bangladeshi mobile number
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  disabled={forgotBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotBusy || forgotPhone.trim() === ""}
                  className="gap-1.5"
                >
                  {forgotBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send reset code
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitForgotReset} className="space-y-4">
              {forgotDevCode && (
                <Alert>
                  <Info />
                  <AlertTitle>Dev mode — no SMS provider configured</AlertTitle>
                  <AlertDescription>
                    Your code:{" "}
                    <button
                      type="button"
                      onClick={() => setForgotCode(forgotDevCode)}
                      className="rounded font-mono text-base font-bold tracking-widest text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Fill reset code ${forgotDevCode}`}
                    >
                      {forgotDevCode}
                    </button>{" "}
                    (tap to fill)
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="forgot-code">Verification code</Label>
                <InputOTP
                  id="forgot-code"
                  maxLength={6}
                  value={forgotCode}
                  onChange={setForgotCode}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-password">New password</Label>
                <Input
                  id="forgot-password"
                  type="password"
                  autoComplete="new-password"
                  value={forgotPassword}
                  onChange={(e) => setForgotPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  maxLength={100}
                />
              </div>

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotStep(1)}
                  disabled={forgotBusy}
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForgotOpen(false)}
                    disabled={forgotBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotBusy || forgotCode.length !== 6}
                    className="gap-1.5"
                  >
                    {forgotBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Reset password
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Google sign-in setup help (shown when GOOGLE_CLIENT_ID is missing) */}
      <Dialog open={googleHelpOpen} onOpenChange={setGoogleHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              Enable Google sign-in
            </DialogTitle>
            <DialogDescription>
              Google sign-in is fully implemented but needs an OAuth client ID
              for this deployment. Once configured, the official Google button
              appears here automatically.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              Open{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Google Cloud Console → Credentials
              </a>{" "}
              and create an <strong>OAuth Client ID</strong> (type: Web
              application).
            </li>
            <li>
              Add this deployment&apos;s domain (and{" "}
              <code className="rounded bg-muted px-1">localhost</code> for
              local dev) under <em>Authorized JavaScript origins</em>.
            </li>
            <li>
              Set the resulting client ID as the{" "}
              <code className="rounded bg-muted px-1">GOOGLE_CLIENT_ID</code>{" "}
              environment variable, then redeploy / restart the server.
            </li>
          </ol>
          <DialogFooter>
            <Button onClick={() => setGoogleHelpOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}
