# Contributing to Medbriq

Thank you for contributing! Medbriq is a healthcare discovery & booking platform —
correctness, security, and honesty about scope matter more than speed
(see the master product spec’s final instructions and [docs/security.md](docs/security.md)).

## Ground Rules (non-negotiable)

1. **Never commit secrets.** No `.env` files, API keys, tokens, passwords, or connection
   strings with real credentials — not in code, tests, docs, or commit history.
   `.env` is git-ignored; keep it that way. If a secret leaks, rotate it immediately and
   notify the maintainers (see [docs/security.md §7](docs/security.md#7-secrets-policy)).
2. **Demo data is fictional only.** Never add real doctors, patients, hospitals,
   license numbers, phone numbers, or reviews to seeds or fixtures. Seed data must stay
   clearly labeled as demo/fictional.
3. **Never fake progress.** Do not claim a feature works without implementation and
   evidence. Placeholders must be visibly placeholders.
4. **Medical safety invariants** ([docs/security.md §8](docs/security.md#8-medical-safety-rules-from-the-master-spec-12)):
   no diagnosis, no prescriptions, emergency **999** guidance stays visible, no fake
   verification claims.
5. **No paid service may be introduced silently** — every external dependency must be
   added to [docs/costs.md](docs/costs.md) with justification first.

## Branch Strategy

```
main              protected — no direct pushes; everything lands via reviewed PR
feature/<scope>   new work (e.g. feature/doctor-search-filters)
fix/<scope>       bug fixes (e.g. fix/slot-timezone-off-by-one)
```

- Branch from the latest `main`; keep branches short-lived and focused.
- `develop`, `release/*` branches (master-spec strategy) will be introduced when the
  team/release cadence justifies them — not needed at current size.
- Conventional, focused PRs: one logical change per PR.

## Commit Messages (Conventional Commits)

```
<type>(<scope>): <subject>

feat(booking): add guest reschedule flow
fix(slots): reject past slots in Dhaka timezone
docs(api): document SLOT_TAKEN error code
chore(ci): pin bun version
refactor(auth): hash session tokens at rest
test(doctors): add filter pagination tests
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`.
Scope examples: `auth`, `booking`, `doctors`, `admin`, `db`, `ui`, `ci`, `docs`.

## Pull Requests & Review

1. Ensure `bun run lint` passes and `bunx tsc --noEmit` is clean locally (CI runs the
   same gate — see [.github/workflows/ci.yml](.github/workflows/ci.yml)).
2. Update documentation in the same PR when behavior changes: contract changes →
   [docs/api.md](docs/api.md); schema changes → [docs/database.md](docs/database.md);
   security-relevant changes → [docs/security.md](docs/security.md) (+ Security review
   required, per the master spec’s coordination rules).
3. Database changes go through Prisma schema edits; do not hand-edit the SQLite file.
4. Every PR requires at least one review; security-sensitive changes require explicit
   security review approval.
5. Never merge with a red CI check.

## Code Style

- **TypeScript strict** — no new `any` in domain code; keep types in
  `src/lib/types.ts` aligned with API DTOs.
- **UI:** use shadcn/ui components and Tailwind utility classes; **no raw hex colors** —
  use theme tokens (`bg-primary`, `text-success`, `border-warning`, …) defined in
  `src/app/globals.css` so light/dark themes stay consistent.
- **Constants as source of truth:** roles/statuses come from `src/lib/constants.ts`
  (SQLite has no enums) — never hardcode status strings.
- **Time:** store UTC, schedule in Dhaka minutes-from-midnight, display via
  `src/lib/time.ts` helpers — never hand-roll timezone math
  ([architecture.md §4](docs/architecture.md#4-timezone-policy)).
- **Money:** keep currency paired with amounts; remember fees are `Float` at MVP —
  round for display, never for storage decisions.
- **API:** all responses use the `ok()/fail()` envelope from `src/lib/api.ts`; validate
  every input with zod; authorization via `requireUser(...roles)` **inside the handler**.

## Running Locally

```bash
bun install
cp .env.example .env
bun run db:push
bun prisma/seed.ts     # fictional demo data — DEV ONLY
bun run dev            # http://localhost:3000
bun run lint           # must pass before every PR
bunx tsc --noEmit      # CI typecheck gate
```

Demo credentials (dev only): see the [README](README.md#demo-credentials) — never enable
the seed outside local development.

## Reporting Bugs & Vulnerabilities

- Bugs: open an issue with reproduction steps, expected vs. actual behavior.
- **Security: report privately to the maintainers** — do not open public issues with
  exploit details ([docs/security.md §10](docs/security.md#10-reporting-vulnerabilities)).
