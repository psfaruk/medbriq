/**
 * Production preflight — run BEFORE deploying.
 *
 *   bun run check:prod
 *
 * Reads the environment (Bun auto-loads .env, .env.local, .env.production)
 * and reports whether the configuration is safe to deploy. Never prints a
 * secret value — only whether a variable is present and how it will behave.
 *
 * Exit codes:
 *   0 — no error-level problems
 *   1 — at least one error-level problem (block the deploy)
 *
 * In CI, set ALLOW_PRODUCTION_CHECKS=1 to evaluate production rules even
 * though NODE_ENV is not "production" there.
 */

import {
  IS_DEMO_MODE,
  IS_PRODUCTION,
  productionConfigReport,
} from "../src/lib/prod-config";

const checks = productionConfigReport();

const ICON: Record<string, string> = {
  pass: "✓",
  fail: "✗",
  warn: "!",
  info: "·",
};

console.log("");
console.log("  Find Medi Doctor — production preflight");
console.log(`  mode: ${IS_PRODUCTION ? "production" : "development"} · demo: ${IS_DEMO_MODE ? "ON" : "off"}`);
console.log("  " + "─".repeat(72));

for (const check of checks) {
  const icon =
    check.level === "info"
      ? ICON.info
      : check.ok
        ? check.level === "warn"
          ? ICON.pass
          : ICON.pass
        : check.level === "warn"
          ? ICON.warn
          : ICON.fail;

  console.log(`  ${icon} [${check.level.padEnd(5)}] ${check.label}`);
  console.log(`      ${check.detail}`);
}

console.log("  " + "─".repeat(72));

const errors = checks.filter((c) => c.level === "error" && !c.ok);
const warnings = checks.filter((c) => c.level === "warn" && !c.ok);

if (errors.length > 0) {
  console.log(
    `  ✗ NOT SAFE TO DEPLOY — ${errors.length} error(s), ${warnings.length} warning(s).`
  );
  console.log("");
  console.log("  Fix the errors above, then re-run. See docs/PRODUCTION-RUNBOOK.md.");
  console.log("");
  process.exit(1);
}

console.log(
  `  ✓ Production configuration OK — ${warnings.length} warning(s) (non-blocking).`
);
if (warnings.length > 0) {
  console.log("  Warnings mean a feature is honestly unavailable, not broken:");
  for (const w of warnings) console.log(`    · ${w.label}: ${w.detail}`);
}
console.log("");
