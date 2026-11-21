import Link from "next/link";
import { Home, Search, BookOpen } from "lucide-react";

/**
 * Custom 404 (spec §14). Server-rendered, works without JS: plain links to
 * the homepage and the main public portal views.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-[#1769AA]">404</p>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The page you are looking for does not exist or has moved. Try one of
        these instead:
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#135a8d]"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go to homepage
        </Link>
        <Link
          href="/?view=doctors"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Find doctors
        </Link>
        <Link
          href="/?view=library"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Health library
        </Link>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Emergency in Bangladesh? Call 999 — free, 24/7.
      </p>
    </main>
  );
}
