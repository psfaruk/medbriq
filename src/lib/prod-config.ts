/**
 * Central production-mode configuration and safety checks.
 *
 * One place answers: "is this deployment configured like a real production
 * service, or is it still a demo?" Every other module (the preflight script,
 * the deploy script, and any future health endpoint) consumes this so the
 * definition of "production ready" never drifts.
 *
 * Deliberately dependency-free (no firebase-admin, no Prisma) so it can be
 * imported from a plain `bun scripts/...` preflight without booting the app.
 *
 * ── What counts as production ────────────────────────────────────────────
 * NODE_ENV === "production" (set by Vercel/`next build`) OR an explicit
 * ALLOW_PRODUCTION_CHECKS=1 when validating a staging build by hand.
 *
 * ── Why these specific rules ─────────────────────────────────────────────
 * - The data store MUST be Firestore/hybrid in production. The alternative is
 *   Prisma+SQLite on a read-only serverless filesystem, which loses every
 *   write on the next cold start — for a booking platform that is silent data
 *   loss, so it is an ERROR, not a warning.
 * - Phone OTP with SMS_PROVIDER=console is refused at runtime already
 *   (src/lib/sms.ts). The preflight still flags it so the operator knows the
 *   login method is intentionally unavailable rather than mysteriously broken.
 * - VVS_SIGNING_SECRET under 32 chars is a WARN because the QR credentials are
 *   HMAC-signed with it; a short secret makes forging a "verified visit"
 *   record feasible.
 * - NEXT_PUBLIC_DEMO_MODE=true in production is an ERROR: it is the switch that
 *   tells the UI to render demo labels and sample content.
 */

/** True when the process is running as a real production build. */
export const IS_PRODUCTION: boolean =
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_PRODUCTION_CHECKS === "1";

/** Explicit demo-content switch. Default OFF — production is the default. */
export const IS_DEMO_MODE: boolean =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export type CheckLevel = "error" | "warn" | "info";

export type ConfigCheck = {
  /** Stable machine-readable id. */
  id: string;
  /** Human label for the report table. */
  label: string;
  ok: boolean;
  level: CheckLevel;
  /** Short, actionable explanation. Never contains a secret value. */
  detail: string;
};

/** Parse a service-account JSON string without leaking it into an error. */
function serviceAccountLooksValid(raw: string | undefined): boolean {
  if (!raw || !raw.trim()) return false;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Boolean(
      parsed.project_id &&
        parsed.client_email &&
        typeof parsed.private_key === "string" &&
        (parsed.private_key as string).includes("BEGIN PRIVATE KEY")
    );
  } catch {
    return false;
  }
}

/** True when the SMS layer can actually deliver a code. */
function smsProviderIsReal(): boolean {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  if (!provider || provider === "console") return false;
  if (provider === "twilio") {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.SMS_SENDER_ID?.trim()
    );
  }
  if (provider === "sslwireless") {
    return Boolean(
      process.env.SSLWIRELESS_API_TOKEN?.trim() &&
        process.env.SSLWIRELESS_SID?.trim() &&
        process.env.SMS_SENDER_ID?.trim()
    );
  }
  return false;
}

/**
 * Evaluate the full production configuration. Returns every check with an
 * ok flag and a severity; callers decide whether to print, block or ignore.
 */
export function productionConfigReport(): ConfigCheck[] {
  const checks: ConfigCheck[] = [];

  // ── 1. Data store ────────────────────────────────────────────────────
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const hybrid = Boolean(process.env.BOOKING_DATABASE_URL?.trim());
  checks.push({
    id: "store",
    label: "Production data store",
    ok: serviceAccountLooksValid(saRaw),
    level: "error",
    detail: serviceAccountLooksValid(saRaw)
      ? `Firestore${hybrid ? " + in-region booking database (hybrid)" : ""}`
      : "FIREBASE_SERVICE_ACCOUNT is missing or not a valid service-account JSON. " +
        "Without it the app falls back to Prisma/SQLite, which cannot persist " +
        "writes on a serverless host.",
  });

  // ── 2. Demo mode ─────────────────────────────────────────────────────
  checks.push({
    id: "demo-mode",
    label: "Demo mode disabled",
    ok: !IS_DEMO_MODE,
    level: "error",
    detail: IS_DEMO_MODE
      ? "NEXT_PUBLIC_DEMO_MODE=true — demo labels and sample content would render on a live site."
      : "Off (production default).",
  });

  // ── 3. Phone OTP / SMS ───────────────────────────────────────────────
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase() || "console";
  const smsOk = smsProviderIsReal();
  checks.push({
    id: "sms",
    label: "SMS provider",
    ok: smsOk,
    level: "error",
    detail: smsOk
      ? `Real provider configured (${provider}).`
      : `SMS_PROVIDER=${provider} — phone OTP login is DISABLED in production ` +
        "(the dev provider echoes codes and would allow account takeover). " +
        "Email + password and Google sign-in still work.",
  });

  // ── 4. Google sign-in ────────────────────────────────────────────────
  const googleOk = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  checks.push({
    id: "google",
    label: "Google Sign-In",
    ok: googleOk,
    level: "warn",
    detail: googleOk
      ? "Client ID configured."
      : "GOOGLE_CLIENT_ID unset — the UI shows an honest 'not configured' state.",
  });

  // ── 5. Firebase web config (client bundle) ───────────────────────────
  const webKeys = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];
  const missingWeb = webKeys.filter((k) => !process.env[k]?.trim());
  checks.push({
    id: "firebase-web",
    label: "Firebase web config",
    ok: missingWeb.length === 0,
    level: "warn",
    detail:
      missingWeb.length === 0
        ? "Push messaging + Google popup available."
        : `Missing: ${missingWeb.join(", ")} — push notifications disabled.`,
  });

  // ── 6. VVS signing secret ────────────────────────────────────────────
  const vvs = process.env.VVS_SIGNING_SECRET ?? "";
  const vvsOk = vvs.trim().length >= 32;
  checks.push({
    id: "vvs-secret",
    label: "VVS_SIGNING_SECRET strength",
    ok: vvsOk,
    level: "error",
    detail: vvsOk
      ? "Sufficient entropy for HMAC signing + AES-256-GCM sealing."
      : `Too short (${vvs.trim().length} chars). Generate with: openssl rand -hex 32`,
  });

  // ── 7. Base URL ──────────────────────────────────────────────────────
  const base = process.env.APP_BASE_URL ?? "";
  const baseOk = IS_PRODUCTION ? base.startsWith("https://") : true;
  checks.push({
    id: "base-url",
    label: "APP_BASE_URL",
    ok: baseOk,
    level: "warn",
    detail: baseOk
      ? base || "(unset — relative links only)"
      : "Must be an https:// URL in production.",
  });

  // ── 8. Session / OTP hygiene ─────────────────────────────────────────
  checks.push({
    id: "node-env",
    label: "Runtime environment",
    ok: process.env.NODE_ENV !== "development",
    level: "info",
    detail: `NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`,
  });

  return checks;
}

/** True when every `error`-level check passes. */
export function isProductionSafe(): boolean {
  return productionConfigReport().every((c) => c.level !== "error" || c.ok);
}

/** Errors only — useful for a compact CI summary. */
export function productionErrors(): ConfigCheck[] {
  return productionConfigReport().filter((c) => c.level === "error" && !c.ok);
}

/**
 * Throw when the configuration is not production-safe. Used by the preflight
 * script so a bad deploy fails loudly before it ever reaches a user.
 * The error message never includes a secret value.
 */
export function assertProductionSafe(): void {
  const errors = productionErrors();
  if (errors.length === 0) return;
  const lines = errors.map((e) => `  ✗ ${e.label}: ${e.detail}`).join("\n");
  throw new Error(
    `Production configuration is not safe to deploy:\n${lines}\n\n` +
      "See docs/PRODUCTION-RUNBOOK.md §3.2 for the expected environment variables."
  );
}
