"use client";

/**
 * Shared building blocks for the public portal.
 *
 * Design language: clean white surfaces, blue (#1769AA) + teal (#13A89E)
 * identity (the existing app tokens), spacious sections, accessible
 * typography. Everything here is presentational and route-portable —
 * when the single-route sandbox constraint lifts, each view component
 * moves into its own app/ route unchanged.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Stethoscope,
  HeartPulse,
  Baby,
  Brain,
  Bone,
  Eye,
  Activity,
  Syringe,
  Droplets,
  Wind,
  Thermometer,
  Scale,
  ScanLine,
  Zap,
  Pill,
  Microscope,
  Scan,
  Waves,
  Gauge,
  Monitor,
  Camera,
  Layers,
  Video,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAppStore,
  viewToUrl,
  type PortalView,
} from "@/lib/app-state";
import { track, trackCta } from "@/lib/analytics";
import { useT } from "@/components/app/shared/ui-kit";

// ── Navigation ────────────────────────────────────────────────────────

/** Hook wrapping portal navigation + analytics. */
export function usePortalNav() {
  const setPortalView = useAppStore((s) => s.setPortalView);
  return {
    go: (view: PortalView, opts?: { push?: boolean }) => {
      setPortalView(view, opts);
    },
  };
}

/** Rendered as <button> (in-app) — anchors to "/" keep a real href for SEO/UX. */
export function PortalLink({
  view,
  className,
  children,
  ctaLabel,
  ariaLabel,
  onNavigate,
}: {
  view: PortalView;
  className?: string;
  children: ReactNode;
  ctaLabel?: string;
  ariaLabel?: string;
  onNavigate?: () => void;
}) {
  const setPortalView = useAppStore((s) => s.setPortalView);
  return (
    <Link
      href={viewToUrl(view)}
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        // Let the browser handle modifier clicks (open in new tab etc.)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (ctaLabel) trackCta(ctaLabel, view.name);
        onNavigate?.();
        setPortalView(view, { push: true });
      }}
    >
      {children}
    </Link>
  );
}

// ── Section scaffolding ───────────────────────────────────────────────

export function PortalSection({
  id,
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className,
  tinted,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tinted?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        "py-12 sm:py-16",
        tinted && "bg-primary-soft/40",
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-[#13A89E]">
                {eyebrow}
              </p>
            )}
            <h2
              id={id ? `${id}-title` : undefined}
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Compact text link used as section "view all" actions. */
export function ViewAllLink({ view, label }: { view: PortalView; label: string }) {
  return (
    <PortalLink
      view={view}
      ctaLabel="view-all"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </PortalLink>
  );
}

// ── Breadcrumbs ───────────────────────────────────────────────────────

export function Breadcrumbs({ items }: { items: { label: string; view?: PortalView }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <li>
          <PortalLink
            view={{ name: "home" }}
            className="rounded px-1 py-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            Home
          </PortalLink>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {item.view && i < items.length - 1 ? (
              <PortalLink
                view={item.view}
                className="rounded px-1 py-0.5 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                {item.label}
              </PortalLink>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="px-1 py-0.5 font-medium text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ── Medical disclaimer & review labels ────────────────────────────────

export function MedicalDisclaimerBox({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <aside
      role="note"
      aria-label="Medical disclaimer"
      className={cn(
        "flex gap-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900",
        compact ? "p-3 text-xs" : "p-4 text-sm"
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="leading-relaxed">{text}</p>
    </aside>
  );
}

/** The "educational, not diagnosis" note used by symptom/equipment pages. */
export function EducationNotice({ children }: { children?: ReactNode }) {
  const { t } = useT();
  return (
    <aside
      role="note"
      aria-label="Educational note"
      className="flex gap-3 rounded-xl border border-[#13A89E]/30 bg-[#13A89E]/5 p-4 text-sm text-foreground"
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#13A89E]" aria-hidden="true" />
      <p className="leading-relaxed">
        {children ??
          "This guide is educational. It cannot tell you what illness you have — only a qualified healthcare professional can assess that. In an emergency call 999 (Bangladesh)."}
      </p>
    </aside>
  );
}

// ── Icon registry (content modules reference icons by name) ───────────

const ICONS: Record<string, LucideIcon> = {
  Stethoscope,
  HeartPulse,
  Baby,
  Brain,
  Bone,
  Eye,
  Activity,
  Syringe,
  Droplets,
  Wind,
  Thermometer,
  Scale,
  ScanLine,
  Zap,
  Pill,
  Microscope,
  Scan,
  Waves,
  Gauge,
  Monitor,
  Camera,
  Layers,
  Video,
};

export function ContentIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Stethoscope;
  return <Icon className={className} aria-hidden="true" />;
}

// ── Article body renderer (plain text + "• " bullets) ────────────────

export function ArticleBody({ body }: { body: string }) {
  const blocks = body.split("\n\n");
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter(Boolean);
        const isBullets = lines.every((l) => l.startsWith("• "));
        if (isBullets && lines.length > 0) {
          return (
            <ul key={i} className="my-4 list-disc space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j} className="leading-relaxed text-muted-foreground">
                  {l.slice(2)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-4 leading-relaxed text-muted-foreground">
            {block}
          </p>
        );
      })}
    </>
  );
}

// ── Data fetching helper (small SWR-ish hook) ─────────────────────────

export type ApiDataState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** Fetch-on-mount helper for public GET endpoints with error + reload.
 *  Stale-while-revalidate: on url change the previous data stays visible
 *  until the new payload arrives (no skeleton flash on pagination). */
export function usePortalData<T>(url: string, deps: unknown[] = []): ApiDataState<T> {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(url);
        const json = (await res.json().catch(() => null)) as
          | { ok: true; data: T }
          | { ok: false; error: { message: string } }
          | null;
        if (!alive) return;
        if (json && json.ok) {
          setState(json.data);
          setError(null);
        } else {
          setError(
            json && !json.ok
              ? json.error.message
              : "Could not load this section. Please try again."
          );
        }
      } catch {
        if (alive) setError("Network error. Check your connection.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [url, nonce, ...deps]);

  return {
    data: state,
    loading,
    error,
    reload: () => setNonce((n) => n + 1),
  };
}

// ── Page-view analytics helper ────────────────────────────────────────

/** Fire a page_view once per mounted view. */
export function useTrackPageView(scope: string): void {
  const fired = useRef(false);
  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      track("page_view", { scope });
    }
  }, [scope]);
}
