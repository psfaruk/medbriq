"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  LockKeyhole,
  Loader2,
  Mail,
  Stethoscope,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { patchJson, postJson } from "@/components/lib/api-client";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { normalizeBdPhone } from "@/lib/phone";
import type { SessionUser } from "@/lib/types";

/**
 * SettingsView — account settings for signed-in users of every role:
 * profile (name/phone), password management and read-only account info.
 */

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function providerLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "phone") return "Phone";
  return "Email";
}

function roleLabel(role: string): string {
  if (role === "DOCTOR") return "Doctor";
  if (role === "ADMIN") return "Admin";
  return "Patient";
}

export default function SettingsView() {
  const { user, userLoaded, navigate, setUser, setAuthReturnView } =
    useAppStore();
  const { toast } = useToast();

  // --- profile form ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // --- password form ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Prefill the form whenever the session user changes.
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ?? "");
  }, [user]);

  if (!userLoaded) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64" />
        <Skeleton className="h-52" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <LockKeyhole className="h-8 w-8 text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Sign in required</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to manage your account settings.
              </p>
            </div>
            <Button
              onClick={() => {
                setAuthReturnView({ name: "settings" });
                navigate({ name: "auth" });
              }}
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasPasswordProvider = user.provider === "credentials";

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (savingProfile) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast({
        title: "Name too short",
        description: "Use at least 2 characters.",
        variant: "destructive",
      });
      return;
    }
    const trimmedPhone = phone.trim();
    let phoneValue: string | null = null;
    if (trimmedPhone !== "") {
      phoneValue = normalizeBdPhone(trimmedPhone);
      if (phoneValue === null) {
        toast({
          title: "Invalid phone number",
          description:
            "Enter a Bangladeshi mobile number like 01712345678, or leave it empty to remove.",
          variant: "destructive",
        });
        return;
      }
    }
    setSavingProfile(true);
    try {
      const data = (await patchJson("/api/v1/auth/me", {
        name: trimmedName,
        phone: phoneValue,
      })) as { user: SessionUser };
      setUser(data.user);
      toast({
        title: "Profile updated",
        description: "Your account details have been saved.",
      });
    } catch (err) {
      toast({
        title: "Could not save profile",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (savingPassword) return;
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Re-enter the same new password in both fields.",
        variant: "destructive",
      });
      return;
    }
    const body: { newPassword: string; currentPassword?: string } = {
      newPassword,
    };
    // currentPassword is omitted when empty — allowed only for accounts that
    // never had a password (Google/phone sign-ups).
    if (currentPassword !== "") body.currentPassword = currentPassword;
    setSavingPassword(true);
    try {
      await postJson("/api/v1/auth/password", body);
      toast({
        title: hasPasswordProvider ? "Password changed" : "Password set",
        description: hasPasswordProvider
          ? "Use your new password next time you sign in with email."
          : "You can now sign in with your email and this password.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({
        title: "Could not update password",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-xl font-semibold sm:text-2xl">Account settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile, sign-in options and account details.
        </p>
      </header>

      {/* --- Profile --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your display name and phone number, visible to the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="h-16 w-16">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                  {initials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  Signed in with {providerLabel(user.provider)}
                </Badge>
                {user.phoneVerified ? (
                  <Badge className="bg-success text-success-foreground hover:bg-success">
                    Phone verified
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-warning/50 text-warning"
                  >
                    Phone unverified
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-name">Display name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-phone">Phone</Label>
                <Input
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Bangladeshi mobile number, e.g. 01XXXXXXXXX. Leave empty to
                  remove.
                </p>
              </div>
            </div>

            <Button type="submit" disabled={savingProfile} className="gap-1.5">
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* --- Password --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {hasPasswordProvider ? "Change password" : "Set a password"}
          </CardTitle>
          <CardDescription>
            {hasPasswordProvider
              ? "Choose a new password for email sign-in."
              : "You signed in with Google or phone — set a password to also sign in with email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-current-password">
                Current password
              </Label>
              <Input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if you signed up with Google/phone and never set
                one.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="settings-new-password">New password</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-confirm-password">
                  Confirm new password
                </Label>
                <Input
                  id="settings-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={100}
                />
              </div>
            </div>
            <Button type="submit" disabled={savingPassword} className="gap-1.5">
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasPasswordProvider ? "Change password" : "Set password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* --- Account info (read-only) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Read-only account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="break-all">{user.email}</span>
          </p>
          <p className="flex items-center gap-3 text-sm">
            <UserRound
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span>Role: {roleLabel(user.role)}</span>
          </p>
          {user.role === "DOCTOR" && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              {user.verificationStatus === "VERIFIED" ? (
                <Badge className="bg-success text-success-foreground hover:bg-success">
                  Verified doctor
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-warning/50 text-warning"
                >
                  Verification {user.verificationStatus ?? "PENDING"}
                </Badge>
              )}
              {user.doctorSlug && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    navigate({ name: "doctor", slug: user.doctorSlug ?? "" })
                  }
                >
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                  View public profile
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
