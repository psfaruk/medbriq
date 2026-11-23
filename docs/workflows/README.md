# Workflow definitions — manual install

The GitHub integration that edits this repository cannot write to
`.github/workflows/` (the token lacks the `workflows` permission), so the
definitions live here. Installing them takes one command:

```bash
git pull
mkdir -p .github/workflows
cp docs/workflows/ci.yml .github/workflows/
cp docs/workflows/firebase-deploy.yml .github/workflows/
cp docs/workflows/dependabot.yml .github/
git add .github
git commit -m "ci: install production quality gate and Firebase deploy"
git push
```

---

## What each one does

### `ci.yml`
Replaces the old lint-only workflow.

| Job | Runs | Why it matters |
| --- | --- | --- |
| `quality` | `bun run lint` → `bun run typecheck` | `next.config.ts` used to set `ignoreBuildErrors: true`, so a type error could reach production silently. It is now `false`, and this job catches it earlier with better context. |
| `build` | `bun run build` | A real production build on every PR. Broken imports, bad server/client boundaries and build-time env mistakes fail here instead of on Vercel. |
| `secrets` | `gitleaks/gitleaks-action@v2` | Scans the full history for committed credentials. |

Runs on `push` to `main` and on every PR targeting `main`. Superseded runs on
the same ref are cancelled automatically.

### `firebase-deploy.yml`
Deploys **only** Firebase security rules and indexes — the app itself is
deployed by Vercel's Git integration.

Triggers on pushes to `main` that touch `firestore.rules`,
`firestore.indexes.json`, `storage.rules`, `firebase.json` or `.firebaserc`,
and manually via `workflow_dispatch`.

It needs one repository secret:

```bash
base64 -w0 service-account.json \
  | gh secret set FIREBASE_SERVICE_ACCOUNT_B64 -R psfaruk/medbriq
```

Use a **freshly minted** service-account key. The workflow materializes it into
`$RUNNER_TEMP`, exports `GOOGLE_APPLICATION_CREDENTIALS`, deploys
`firestore:rules,firestore:indexes,storage` against project `medifindbd`, and
shreds the file in an `if: always()` step.

### `dependabot.yml`
Weekly, grouped updates for npm and GitHub Actions. The app handles phone
numbers, OTP codes and medical-adjacent records, so vulnerable transitive
packages should not linger. Grouped so it produces a few PRs rather than
twenty.

---

## Notes

- `ci.yml` sets `DATABASE_URL` to a placeholder for the build. Prisma only
  needs a syntactically valid URL at build time; Firestore is what production
  uses at runtime.
- The `build` job is a genuine compile, not a cache hit — expect 2–4 minutes.
- If you later move to a monorepo or add `apps/*`, revisit `directory: "/"` in
  `dependabot.yml`.
