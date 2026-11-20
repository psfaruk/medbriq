"use client";

import { useState } from "react";
import { Globe, LogOut, UserRound } from "lucide-react";
import { apiPatch, ApiCallError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DemoNotice,
  PageHeader,
  SectionCard,
  UserAvatar,
  useT,
} from "@/components/app/shared/ui-kit";
import { useAppStore } from "@/lib/app-state";
import { LANGS } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import type { SessionUser } from "@/lib/types";

const ERROR_FALLBACK = "Something went wrong. Please try again.";

export default function SettingsSection() {
  const { t } = useT();
  const { toast } = useToast();
  const { user, setUser, lang, setLang, logout } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setEditing(true);
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || name.trim().length < 2) return;
    setSaving(true);
    try {
      const d = await apiPatch<{ user: SessionUser }>("/api/v1/auth/me", {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      setUser(d.user);
      setEditing(false);
      toast({ title: "Account updated", description: d.user.name });
    } catch (err) {
      toast({
        title: "Could not update account",
        description: err instanceof ApiCallError ? err.message : ERROR_FALLBACK,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("hospitalNav.settings")}
        subtitle="Manage your manager account and dashboard preferences."
      />

      {/* Manager account */}
      <SectionCard title="Manager account">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <UserAvatar name={user?.name ?? "User"} className="h-14 w-14" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <form onSubmit={saveAccount} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-name">Full name</Label>
                    <Input
                      id="mgr-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mgr-phone">
                      Phone{" "}
                      <span className="text-muted-foreground">
                        ({t("common.optional")})
                      </span>
                    </Label>
                    <Input
                      id="mgr-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={30}
                      placeholder="+880 1XXXXXXXXX"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Email ({user?.email}) and role cannot be changed here.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={saving || name.trim().length < 2}>
                    {saving ? "Saving…" : t("common.saveChanges")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserRound className="h-4 w-4 text-primary" />
                    {user?.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {user?.email}
                    {user?.phone ? ` · ${user.phone}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Role: Hospital manager — signs in to this dashboard.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="gap-1.5 self-start"
                  onClick={startEdit}
                >
                  {t("common.edit")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Language */}
      <SectionCard title={t("profile.language")}>
        <div className="space-y-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Choose the display language for the dashboard interface.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 sm:max-w-md">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className={
                  lang === l.code
                    ? "rounded-xl border border-primary bg-primary-soft px-4 py-3 text-left text-sm font-semibold text-primary shadow-soft"
                    : "rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40"
                }
              >
                {l.native}
                <span className="block text-[11px] font-normal text-muted-foreground">
                  {l.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Sign out */}
      <SectionCard title="Session">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Sign out of the hospital dashboard on this device.
          </p>
          <Button
            variant="outline"
            className="gap-1.5 self-start text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            {t("auth.signOut")}
          </Button>
        </div>
      </SectionCard>

      <DemoNotice />
    </div>
  );
}
