"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGES } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarCheck,
  ChevronDown,
  Info,
  KeyRound,
  Loader2,
  Stethoscope,
} from "lucide-react";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

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
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      <Card>
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
                <form onSubmit={handleSignIn} className="space-y-4">
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
                </form>
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
                        placeholder="+880 1XXX-XXXXXX"
                        maxLength={20}
                      />
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
    </div>
  );
}
