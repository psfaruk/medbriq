"use client";

/**
 * Public article view (spec §6): full article with author, review status
 * (honest), dates, key points, sections, when-to-seek, sources, related
 * guides and the standing medical disclaimer.
 */

import { CalendarDays, UserRound, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Article } from "@/content";
import { useT, EmptyState, ErrorState } from "@/components/app/shared/ui-kit";
import { track } from "@/lib/analytics";
import {
  ArticleBody,
  Breadcrumbs,
  MedicalDisclaimerBox,
  PortalLink,
  usePortalData,
  useTrackPageView,
} from "../shared";
import { ArticleCard, categoryLabel, type ArticleSummary } from "../home/sections";

type ArticleResponse = {
  article: Article;
  relatedSlugs: string[];
  disclaimer: string;
};

export default function ArticleView({ slug }: { slug: string }) {
  useTrackPageView("article");
  const { t, lang } = useT();

  const { data, loading, error, reload } = usePortalData<ArticleResponse>(
    `/api/v1/content/articles?slug=${encodeURIComponent(slug)}`
  );
  const all = usePortalData<{ items: ArticleSummary[] }>("/api/v1/content/articles");

  const article = data?.article ?? null;
  const related = (all.data?.items ?? []).filter(
    (a) => data?.relatedSlugs.includes(a.slug) && a.slug !== slug
  );

  const title = article && lang === "bn" && article.titleBn ? article.titleBn : article?.title;

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: t("portal.library.title"), view: { name: "library" } },
          ...(article
            ? [
                {
                  label: categoryLabel(article.category),
                  view: { name: "library", category: article.category } as const,
                },
                { label: article.title },
              ]
            : [{ label: "…" }]),
        ]}
      />

      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && !data && (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Article not found"
          hint="It may have been unpublished or the link is incorrect."
          action={
            <PortalLink view={{ name: "library" }}>
              <Button size="sm" variant="outline">
                {t("portal.cta.viewAllArticles")}
              </Button>
            </PortalLink>
          }
        />
      )}

      {article && data && (
        <article>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0f8f87]">
            {categoryLabel(article.category)}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {article.summary}
          </p>

          {/* Meta row — honest review status */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {article.author.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t("portal.library.published")} {article.publishedAt}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t("portal.library.updated")} {article.updatedAt}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800">
              {article.medicalReviewer
                ? `${t("portal.library.medicalReviewer")} ${article.medicalReviewer.name}`
                : t("portal.library.reviewStatus")}
            </span>
          </div>

          {/* Key points */}
          {article.keyPoints.length > 0 && (
            <Card className="mt-6 border-[#13A89E]/30 bg-[#13A89E]/5 shadow-none">
              <CardContent className="p-5">
                <h2 className="text-sm font-bold text-foreground">
                  {t("portal.library.keyPoints")}
                </h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
                  {article.keyPoints.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Sections */}
          <div className="mt-6">
            {article.sections.map((section, i) => (
              <section key={i} aria-label={section.heading} className="mt-6">
                <h2 className="text-lg font-bold text-foreground">{section.heading}</h2>
                <ArticleBody body={section.body} />
              </section>
            ))}
          </div>

          {/* When to seek help */}
          {article.whenToSeekHelp.length > 0 && (
            <Card className="mt-6 border-primary/25 bg-primary-soft/40 shadow-none">
              <CardContent className="p-5">
                <h2 className="text-sm font-bold text-primary">
                  {t("portal.library.whenToSeek")}
                </h2>
                <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground">
                  {article.whenToSeekHelp.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Emergency note */}
          {article.emergencyNote && (
            <div
              role="alert"
              className="mt-6 flex gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-sm font-medium text-red-900"
            >
              <span aria-hidden="true">⚠</span>
              <p>{article.emergencyNote}</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8">
            <MedicalDisclaimerBox text={data.disclaimer} />
          </div>

          {/* Sources */}
          {article.sources.length > 0 && (
            <section aria-label={t("portal.library.sources")} className="mt-6">
              <h2 className="text-sm font-bold text-foreground">
                {t("portal.library.sources")}
              </h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {article.sources.map((s, i) => (
                  <li key={i}>
                    {s.publisher}:{" "}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Related */}
          {related.length > 0 && (
            <section aria-label={t("portal.library.related")} className="mt-10">
              <h2 className="mb-4 text-lg font-bold text-foreground">
                {t("portal.library.related")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.slice(0, 2).map((a) => (
                  <div key={a.slug} onClick={() => track("article_view")}>
                    <ArticleCard article={a} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      )}
    </main>
  );
}
