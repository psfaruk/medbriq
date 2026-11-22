# Find Medi Doctor — Costs (Free-First Policy)

> Format per the master product spec’s COSTS.md requirement (§13): for each service —
> provider, purpose, free allowance, usage limitations, expected upgrade trigger,
> alternative provider, data portability, cost risks.
>
> ## **No paid service is currently in use.**
>
> Free-tier limits cited below were last reviewed in **November 2026**. Free tiers change;
> **re-verify every limit before relying on it** (per master spec §4: “Check current
> free-tier limitations before selecting services”).

## 1. Services in Use (all $0)

### GitHub (private repository)
| | |
| --- | --- |
| **Provider** | GitHub (Microsoft) |
| **Purpose** | Source control, code review, CI (GitHub Actions) |
| **Free allowance** | Unlimited private repos; **Actions: 2,000 minutes/month** for private repos (Linux runners bill at 1×) |
| **Usage limitations** | The CI workflow is deliberately minimal — install + `prisma generate` + lint + typecheck, **no build step** — to keep the per-run cost low; a concurrency group cancels superseded runs on the same ref |
| **Expected upgrade trigger** | Team CI needs exceeding 2,000 min/month (e.g., adding build + test matrix) or required commit/PR status checks beyond free features |
| **Alternative provider** | GitLab (400 compute min/month free), Gitea/Forgejo self-hosted, or Actions team plan ($3/user/mo incl. 3,000 min) |
| **Data portability** | Full Git clone; issues/metadata exportable via API |
| **Cost risks** | Low. Accidental runaway workflows (loops, large matrices) can burn minutes — mitigated by `timeout-minutes: 10` and the concurrency group |

### SQLite (local database)
| | |
| --- | --- |
| **Provider** | Open source (public domain) — embedded, file-based |
| **Purpose** | Entire application database for the local/dev MVP (`./db/custom.db`) |
| **Free allowance** | Unlimited (local software) |
| **Usage limitations** | Single-writer; no network access; not suitable for production hosting or multi-instance |
| **Expected upgrade trigger** | First real deployment → migrate to PostgreSQL (Supabase) — schema is designed portably; **money fields must become `Decimal`** (see [database.md §4](database.md#4-float-to-decimal-migration)) |
| **Alternative provider** | Any Postgres host (Supabase, Neon, Railway); the Prisma schema switches by changing the provider + URL |
| **Data portability** | Trivial — it’s a file; Prisma can also export/import data |
| **Cost risks** | None (software is free); risk is operational (single file, manual backups) |

## 2. Planned / Future Services (not yet in use — evaluate before adoption)

### Supabase (PostgreSQL) — production database path
| | |
| --- | --- |
| **Provider** | Supabase |
| **Purpose** | Managed PostgreSQL when the app is deployed for real use |
| **Free allowance** | ~500 MB database, 2 projects, pauses after ~1 week of inactivity (verify current terms) |
| **Usage limitations** | Paused free projects need manual reactivation (bad for production); no guaranteed uptime SLA on free tier |
| **Expected upgrade trigger** | Real patient traffic, >500 MB data, or uptime requirements |
| **Alternative provider** | Neon (generous free tier), Fly Postgres, self-hosted on a VPS |
| **Data portability** | Excellent — standard Postgres; dump/restore anywhere |
| **Cost risks** | Low–medium; Pro tier ~$25/mo when needed. Never upload real patient medical data to unapproved free-tier services (master spec rule) |

### Vercel (Next.js hosting)
| | |
| --- | --- |
| **Provider** | Vercel |
| **Purpose** | Hosting the Next.js app (public site + API routes) |
| **Free allowance** | Hobby tier: non-commercial use only, ~100 GB bandwidth/mo, limited build minutes (verify current terms) |
| **Usage limitations** | **Hobby tier prohibits commercial use** — a monetized Find Medi Doctor deployment requires the Pro plan (~$20/mo); serverless function limits apply |
| **Expected upgrade trigger** | Public launch or any commercial use |
| **Alternative provider** | Netlify, Railway, Render, or the standalone Next build on any VPS (repo already builds `output: "standalone"`) |
| **Data portability** | High — it’s a standard Next.js app; no vendor-locked runtime features required |
| **Cost risks** | Medium — bandwidth/function overages; mitigated by the tiny MVP footprint |

### Domain — findmedidoctor.com (**not yet purchased**)
| | |
| --- | --- |
| **Provider** | Any ICANN registrar (Cloudflare, Porkbun, Namecheap, etc.) |
| **Purpose** | Brand domain for the platform |
| **Free allowance** | None — domains cost money |
| **Usage limitations** | **findmedidoctor.com was verified AVAILABLE via the authoritative Verisign RDAP registry on 2026-11-19** (`rdap.verisign.com/com/v1/domain/findmedidoctor.com` → 404). It has **NOT been purchased**; availability can change at any moment |
| **Expected upgrade trigger** | Before any public-facing launch |
| **Alternative provider** | Alternate TLDs (.health, .care, .io) — generally pricier |
| **Data portability** | N/A |
| **Cost risks** | **~$10–12/year** (registrar-dependent). Risk: the name being registered by someone else before purchase; trademark clearance is also still pending (see [architecture.md §5](architecture.md#5-brand-evaluation-rdap-verified)) |

### Email provider — verification & notifications (Phase 2/9)
| | |
| --- | --- |
| **Provider** | TBD — e.g., Resend, Brevo, SendGrid |
| **Purpose** | Email verification, password reset, booking notifications |
| **Free allowance** | Typical tiers: Resend ~3,000 emails/mo (100/day), Brevo ~300/day (verify current terms) |
| **Usage limitations** | Daily caps; sender-domain verification required; deliverability varies |
| **Expected upgrade trigger** | Notification volume exceeding caps once Phase 9 lands |
| **Alternative provider** | Any SMTP provider behind the planned email abstraction layer |
| **Data portability** | High (standard email APIs) |
| **Cost risks** | Low; provider abstraction keeps switching cheap |

### Video consultation — TURN/SFU (Phase 8, **deferred — biggest cost risk**)
| | |
| --- | --- |
| **Provider** | TBD — managed SFU (e.g., LiveKit Cloud, Daily) or self-hosted + metered TURN (e.g., Cloudflare Calls, Twilio TURN, Xirsys) |
| **Purpose** | WebRTC relay/selection infrastructure for video consultations |
| **Free allowance** | Dev-tier minutes are small (typically a few thousand participant-minutes/mo); TURN relay is metered by the GB |
| **Usage limitations** | Video minutes scale linearly with usage — a healthcare platform with real consultation volume will **not fit free tiers** |
| **Expected upgrade trigger** | Phase 8 implementation decision |
| **Alternative provider** | Self-hosted LiveKit/Janus SFU on a VPS + coturn (engineering cost instead of usage cost) |
| **Data portability** | Medium — WebRTC itself is standard; room-state is ephemeral by design |
| **Cost risks** | **HIGH — this is the single biggest cost risk in the roadmap.** Recommendation: **defer Phase 8** until there is a funded budget and a volume estimate; the MVP intentionally ships only the `supportsVideo` *flag* |

## 3. Upgrade Triggers Summary

| Trigger | Action |
| --- | --- |
| Public deployment needed | Buy domain (~$10–12/yr) → Supabase Postgres (free) → Vercel (check commercial-use terms) |
| Real patient data | Confirm privacy posture of every service first (master spec: never upload real medical data to unapproved free tiers) |
| Team CI > 2,000 min/mo | Trim jobs or pay for Actions; keep `no-build` strategy as long as feasible |
| Notifications volume > free email caps | Paid email tier (~$15–20/mo class) or throttle to in-app only |
| Video consultation approved as a feature | Budget review **first** — SFU/TURN is usage-metered and the largest recurring cost |
| Multi-instance / rate-limit sharing | Redis (free tier via Upstash class providers, then paid) |

## 4. Standing Rules (from the master spec)

1. Prefer open-source libraries; use local development for expensive services.
2. Use simulated adapters (payments, video) during development — no real money flows at MVP.
3. **Never silently switch to a paid service** — document the reason and request
   authorization first.
4. Monitor free-tier usage; implement cost limits where the platform allows.
5. Document every external service dependency (this file).
