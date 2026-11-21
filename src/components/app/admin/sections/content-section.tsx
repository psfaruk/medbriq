"use client";

/**
 * Admin Content Management console (spec §13).
 *
 * Lists every content item across collections with its workflow stage
 * (DRAFT → EDITOR_REVIEW → MEDICAL_REVIEW → APPROVED → PUBLISHED),
 * medical-review state, and a publication override toggle (persisted in
 * PlatformSetting). The workflow gate is enforced server-side: only
 * PUBLISHED (+ override) items are ever served by the public content APIs.
 */

import { useEffect, useState } from "react";
import {
  FileText,
  Activity,
  Thermometer,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPatch } from "@/lib/api-client";
import { useT, ErrorState } from "@/components/app/shared/ui-kit";

type ContentStatus = "DRAFT" | "EDITOR_REVIEW" | "MEDICAL_REVIEW" | "APPROVED" | "PUBLISHED";

type AdminContentItem = {
  collection: "article" | "symptom" | "equipment";
  key: string;
  title: string;
  category: string;
  status: ContentStatus;
  modulePublished: boolean;
  override: boolean | null;
  served: boolean;
  medicalReviewer: string | null;
  publishedAt: string;
  updatedAt: string;
};

type ContentResponse = {
  items: AdminContentItem[];
  byStatus: Record<ContentStatus, number>;
  workflow: ContentStatus[];
  author: { name: string; role: string };
  policy: string;
};

const STATUS_STYLES: Record<ContentStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  EDITOR_REVIEW: "bg-sky-50 text-sky-700 border-sky-200",
  MEDICAL_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PUBLISHED: "bg-primary-soft text-primary border-primary/30",
};

const COLLECTION_META: Record<
  AdminContentItem["collection"],
  { label: string; icon: typeof FileText }
> = {
  article: { label: "Article", icon: FileText },
  symptom: { label: "Symptom guide", icon: Activity },
  equipment: { label: "Equipment guide", icon: Thermometer },
};

export default function ContentSection() {
  const { t } = useT();
  const { toast } = useToast();
  const [nonce, setNonce] = useState(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [collection, setCollection] = useState("all");
  const [status, setStatus] = useState("all");

  const [data, setData] = useState<ContentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await apiGet<ContentResponse>("/api/v1/admin/content");
        if (!alive) return;
        setData(d);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load content");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [nonce]);

  async function togglePublication(item: AdminContentItem) {
    setBusyKey(item.key);
    try {
      await apiPatch(`/api/v1/admin/content/${encodeURIComponent(item.key)}`, {
        action: "publish",
        published: !item.served,
      });
      toast({
        title: !item.served ? "Published" : "Unpublished",
        description: `${item.title} is now ${!item.served ? "served on the public site" : "hidden from the public site"}.`,
      });
      setNonce((n) => n + 1);
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  }

  const filtered = (data?.items ?? []).filter(
    (i) =>
      (collection === "all" || i.collection === collection) &&
      (status === "all" || i.status === status)
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Content Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Health Library articles, symptom guides and equipment guides — workflow,
          medical review state and publication control.
        </p>
      </div>

      {/* Workflow pipeline */}
      {data && (
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-[#13A89E]" aria-hidden="true" />
              Editorial workflow — {data.byStatus.PUBLISHED} published ·{" "}
              {data.byStatus.MEDICAL_REVIEW} in medical review ·{" "}
              {data.byStatus.DRAFT} drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {data.workflow.map((stage, i) => (
                <li key={stage} className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1.5 ${STATUS_STYLES[stage]}`}
                  >
                    {stage.replaceAll("_", " ")}
                    <span className="ml-1.5 font-bold">{data.byStatus[stage]}</span>
                  </span>
                  {i < data.workflow.length - 1 && (
                    <span aria-hidden="true" className="text-muted-foreground">
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {data.policy}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={collection} onValueChange={setCollection}>
          <SelectTrigger size="sm" className="w-40" aria-label="Filter by collection">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All collections</SelectItem>
            <SelectItem value="article">Articles</SelectItem>
            <SelectItem value="symptom">Symptom guides</SelectItem>
            <SelectItem value="equipment">Equipment guides</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(data?.workflow ?? []).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNonce((n) => n + 1)}
          className="ml-auto gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {/* Content table */}
      {error && <ErrorState message={error} onRetry={() => setNonce((n) => n + 1)} />}
      {loading && !data && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Loading content…
          </CardContent>
        </Card>
      )}
      {data && (
        <Card className="shadow-soft">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Medical review</TableHead>
                    <TableHead>Public</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const meta = COLLECTION_META[item.collection];
                    const Icon = meta.icon;
                    return (
                      <TableRow key={item.key}>
                        <TableCell className="max-w-[280px]">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {meta.label} · {item.category}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_STYLES[item.status]}
                          >
                            {item.status.replaceAll("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.medicalReviewer ?? (
                            <span className="text-amber-700">Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.served ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              Served
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                              Hidden
                            </span>
                          )}
                          {item.override !== null && (
                            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                              OVERRIDE
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={item.served ? "outline" : "default"}
                            disabled={busyKey === item.key}
                            onClick={() => togglePublication(item)}
                          >
                            {busyKey === item.key && (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            )}
                            {item.served ? "Unpublish" : "Publish"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        No items match the filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Source of truth: <code className="rounded bg-muted px-1 py-0.5">src/content/</code>{" "}
        typed modules (versioned in git). Publish toggles persist in the
        database and take effect on the public site within ~30 seconds. AI or
        draft content stays invisible to the public until it passes review and
        is published here. {t("adminNav.system") && ""}
      </p>
    </div>
  );
}
