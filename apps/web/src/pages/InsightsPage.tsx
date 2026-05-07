import type {
  AnalyticsConsumptionTimelinePoint,
  AnalyticsDimensionTrend,
  AnalyticsInsights,
  AnalyticsMediaTypeDistributionRow,
  AnalyticsRatingDistributionBucket,
  AnalyticsTopTheme,
} from "@canonos/contracts";
import { BarChart3, CalendarDays, Compass, Grid3X3, Library, Plus, Sparkles, Tags, TrendingUp, TriangleAlert, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { useAnalyticsInsights } from "@/features/insights/analyticsApi";
import { mediaTypeLabels } from "@/features/media/mediaLabels";

const chartPalette = [
  "bg-primary",
  "bg-success",
  "bg-promising",
  "bg-risky",
  "bg-muted-foreground",
] as const;

export function InsightsPage() {
  const { data, error, isLoading, mutate } = useAnalyticsInsights();

  return (
    <div className="grid gap-6">
      <section className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Analytics desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Insights</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Readable patterns from your media history: momentum, ratings, mediums, creators, story traits, and avoidable regret.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />} label="All evidence" />
            <FilterPill label="Live profile" />
            <Button asChild className="gap-2" type="button" variant="secondary">
              <Link to={APP_ROUTES.library}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add evidence
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? <LoadingState title="Loading insights" message="Reading analytics endpoints and taste evidence." /> : null}
      {error ? <ErrorState title="Insights unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && data ? <InsightsContent insights={data} /> : null}
    </div>
  );
}

function InsightsContent({ insights }: { insights: AnalyticsInsights }) {
  const isEmpty = isInsightsEmpty(insights);
  const totalHighRegretHours = Math.round((insights.regretTimeCost.totalHighRegretMinutes / 60) * 10) / 10;
  const dominantMedium = [...insights.mediaTypeDistribution.results].sort((a, b) => b.count - a.count)[0] ?? null;
  const strongestDimension = [...insights.dimensionTrends.dimensions].sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0] ?? null;

  return (
    <div className="grid gap-8">
      <section aria-label="Insight signals" className="grid gap-4 border-y border-border py-4 md:grid-cols-4">
        <InsightStat
          helper="Completed and dropped evidence points."
          icon={<TrendingUp aria-hidden="true" className="h-4 w-4" />}
          label="Timeline"
          value={`${insights.consumptionTimeline.points.length} months`}
        />
        <InsightStat
          helper={`Average ${formatScore(insights.ratingDistribution.averageRating)}`}
          icon={<BarChart3 aria-hidden="true" className="h-4 w-4" />}
          label="Rated media"
          value={String(insights.ratingDistribution.ratedCount)}
        />
        <InsightStat
          helper={dominantMedium ? `${dominantMedium.sharePercent}% of library` : "Add media to calculate share."}
          icon={<Library aria-hidden="true" className="h-4 w-4" />}
          label="Dominant medium"
          value={dominantMedium ? mediaTypeLabels[dominantMedium.mediaType] : "Needs data"}
        />
        <InsightStat
          helper={`${insights.regretTimeCost.totalHighRegretMinutes} high-regret minutes`}
          icon={<TriangleAlert aria-hidden="true" className="h-4 w-4" />}
          label="Regret time"
          value={`${totalHighRegretHours}h`}
        />
      </section>

      {isEmpty ? (
        <EmptyState
          message="Add completed media, ratings, taste scores, and Narrative DNA analysis to unlock the Insights page."
          title="Insights are ready for your first evidence trail"
        />
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[minmax(32rem,1.35fr)_minmax(24rem,0.65fr)]">
        <WorksheetPanel
          ariaLabel="Consumption overview"
          eyebrow="Momentum"
          icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />}
          title="Consumption timeline"
        >
          <TimelineColumnChart points={insights.consumptionTimeline.points} />
          <div className="mt-5 grid gap-2 rounded-xl bg-muted/20 px-4 py-3 sm:grid-cols-[9rem_1fr]">
            <p className="text-sm font-medium text-foreground">Inspect next</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Compare the month with the highest drop count against ratings, genericness, and regret scores.
            </p>
          </div>
        </WorksheetPanel>

        <WorksheetPanel
          ariaLabel="Rating distribution"
          eyebrow="Quality"
          icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />}
          title="Rating distribution"
        >
          <RatingDistributionPanel distribution={insights.ratingDistribution} />
        </WorksheetPanel>
      </section>

      <section className="grid gap-8 border-t border-border pt-7 xl:grid-cols-[minmax(18rem,0.85fr)_minmax(20rem,1fr)_minmax(20rem,1fr)]">
        <WorksheetPanel
          ariaLabel="Media mix"
          eyebrow="Mediums"
          icon={<Compass aria-hidden="true" className="h-5 w-5" />}
          title="Media mix"
        >
          <MediaMixPanel rows={insights.mediaTypeDistribution.results} totalCount={insights.mediaTypeDistribution.totalCount} />
        </WorksheetPanel>

        <WorksheetPanel
          ariaLabel="Taste monitor"
          eyebrow="Score signals"
          icon={<Grid3X3 aria-hidden="true" className="h-5 w-5" />}
          title="Taste monitor"
        >
          <TasteMonitor dimensions={insights.dimensionTrends.dimensions} strongestDimension={strongestDimension} />
        </WorksheetPanel>

        <WorksheetPanel
          ariaLabel="Narrative themes"
          eyebrow="Narrative DNA"
          icon={<Tags aria-hidden="true" className="h-5 w-5" />}
          title="Top themes"
        >
          <ThemeStack themes={insights.topThemes.results} />
        </WorksheetPanel>
      </section>

      <section className="grid gap-8 border-t border-border pt-7 xl:grid-cols-2">
        <CorrelationPanel
          description={insights.genericnessSatisfaction.insight}
          emptyText="Score genericness and rate media to reveal outliers."
          leftLabel="Genericness"
          points={insights.genericnessSatisfaction.points.map((point) => ({
            key: point.mediaItemId,
            title: point.title,
            leftValue: point.genericnessScore,
            rightValue: point.satisfactionScore,
          }))}
          rightLabel="Satisfaction"
          statA={{ label: "Avg genericness", value: formatScore(insights.genericnessSatisfaction.averageGenericness) }}
          statB={{ label: "Avg satisfaction", value: formatScore(insights.genericnessSatisfaction.averageSatisfaction) }}
          title="Genericness vs satisfaction"
        />
        <CorrelationPanel
          description={insights.regretTimeCost.insight}
          emptyText="Score regret and add runtime/page evidence to reveal time sinks."
          leftLabel="Regret"
          points={insights.regretTimeCost.points.map((point) => ({
            key: point.mediaItemId,
            title: point.title,
            leftValue: point.regretScore,
            rightValue: point.timeCostMinutes,
            rightSuffix: " min",
          }))}
          rightLabel="Time cost"
          statA={{ label: "Avg regret", value: formatScore(insights.regretTimeCost.averageRegret) }}
          statB={{ label: "High-regret time", value: `${insights.regretTimeCost.totalHighRegretMinutes} min` }}
          title="Regret vs time cost"
          tone="risk"
        />
      </section>

      <section className="grid gap-8 border-t border-border pt-7 xl:grid-cols-2">
        <RankedPanel
          ariaLabel="Top creators"
          emptyText="Add creators to media records to rank trusted and risky sources."
          icon={<Users aria-hidden="true" className="h-5 w-5" />}
          items={insights.topCreators.results.map((creator) => ({
            key: creator.creator,
            title: creator.creator,
            meta: `${creator.count} item${creator.count === 1 ? "" : "s"} / ${creator.completedCount} completed`,
            score: creator.averageRating,
            detail: creator.bestTitle ? `Best rated: ${creator.bestTitle}` : "No rated item yet",
            warning: creator.negativeSignalCount > 0 ? `${creator.negativeSignalCount} negative signal${creator.negativeSignalCount === 1 ? "" : "s"}` : null,
          }))}
          title="Top creators"
        />
        <RankedPanel
          ariaLabel="Dimension trends"
          emptyText="Score media against taste dimensions to see trend lines."
          icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
          items={insights.dimensionTrends.dimensions.map((dimension) => ({
            key: dimension.dimensionId,
            title: dimension.dimensionName,
            meta: `${dimension.dimensionDirection === "negative" ? "Negative" : "Positive"} signal / ${dimension.scoreCount} score${dimension.scoreCount === 1 ? "" : "s"}`,
            score: dimension.averageScore,
            detail: latestDimensionCopy(dimension),
            warning: null,
          }))}
          title="Dimension trends"
        />
      </section>
    </div>
  );
}

function FilterPill({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground">
      {icon}
      {label}
    </span>
  );
}

function InsightStat({ helper, icon, label, value }: { helper: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2 truncate text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 truncate text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function WorksheetPanel({
  ariaLabel,
  children,
  eyebrow,
  icon,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section aria-label={ariaLabel} className="min-w-0">
      <PanelHeading eyebrow={eyebrow} icon={icon} title={title} />
      {children}
    </section>
  );
}

function PanelHeading({ eyebrow, icon, title }: { eyebrow: string; icon: ReactNode; title: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 text-primary">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function EvidenceEmptyState({ message, steps, title }: { message: string; steps: string[]; title: string }) {
  return (
    <div className="mt-5 rounded-xl bg-muted/20 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {steps.map((step) => (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground" key={step}>
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimelineColumnChart({ points }: { points: AnalyticsConsumptionTimelinePoint[] }) {
  const maxValue = maxOrOne(points.map((point) => point.totalCount));

  if (points.length === 0) {
    return (
      <EvidenceEmptyState
        message="Finish or drop media to populate the timeline."
        steps={["Complete media", "Drop clear misses", "Add completed dates"]}
        title="No activity trend yet"
      />
    );
  }

  return (
    <div className="mt-6" aria-label="Consumption timeline chart">
      <div className="flex h-64 items-end gap-2 border-b border-l border-border px-3 pt-6">
        {points.map((point) => {
          const height = Math.max(14, (point.totalCount / maxValue) * 100);
          const completedShare = point.totalCount === 0 ? 0 : (point.completedCount / point.totalCount) * 100;
          const droppedShare = 100 - completedShare;

          return (
            <div className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2" key={point.period}>
              <div className="relative flex w-full max-w-20 items-end justify-center">
                <div
                  className="flex w-full overflow-hidden rounded-t-2xl border border-primary/20 bg-primary/10"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${point.totalCount} total`}
                >
                  <div
                    className="self-end bg-primary/80"
                    style={{ height: `${completedShare}%`, width: "100%" }}
                    aria-hidden="true"
                  />
                  {point.droppedCount > 0 ? (
                    <div
                      className="absolute bottom-0 w-full bg-[repeating-linear-gradient(135deg,hsl(var(--risky))_0_4px,transparent_4px_8px)]"
                      style={{ height: `${droppedShare}%` }}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{point.label.replace(" 2026", "")}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {points.slice(-3).map((point) => (
          <div className="border-l border-border pl-3" key={`summary-${point.period}`}>
            <p className="text-sm font-semibold text-foreground">{point.label}</p>
            <p className="text-xs text-muted-foreground">{point.completedCount} completed / {point.droppedCount} dropped / Avg {formatScore(point.averageRating)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingDistributionPanel({ distribution }: { distribution: AnalyticsInsights["ratingDistribution"] }) {
  const maxCount = maxOrOne(distribution.buckets.map((bucket) => bucket.count));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
        <div>
          <p className="text-5xl font-semibold tracking-tight text-foreground">{formatScore(distribution.averageRating)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{distribution.ratedCount} rated media</p>
        </div>
        <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-sm font-semibold text-success">Rated</span>
      </div>
      <div className="mt-5 grid gap-4" aria-label="Rating distribution chart">
        {distribution.buckets.map((bucket, index) => (
          <DistributionBar bucket={bucket} index={index} key={bucket.bucket} maxCount={maxCount} />
        ))}
      </div>
    </div>
  );
}

function DistributionBar({ bucket, index, maxCount }: { bucket: AnalyticsRatingDistributionBucket; index: number; maxCount: number }) {
  const width = bucket.count === 0 ? 0 : Math.max(8, (bucket.count / maxCount) * 100);
  return (
    <div className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">{bucket.label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={`h-full rounded-full ${chartPalette[index % chartPalette.length]}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-right text-sm font-semibold text-foreground">{bucket.count}</span>
    </div>
  );
}

function MediaMixPanel({ rows, totalCount }: { rows: AnalyticsMediaTypeDistributionRow[]; totalCount: number }) {
  if (rows.length === 0) {
    return (
      <EvidenceEmptyState
        message="Add media to see medium balance."
        steps={["Add movies", "Add books", "Finish items"]}
        title="No medium mix yet"
      />
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {rows.map((row, index) => (
        <div className="grid gap-2" key={row.mediaType}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MediaTypeBadge label={mediaTypeLabels[row.mediaType]} type={row.mediaType} />
            <p className="text-sm text-muted-foreground">{row.count} of {totalCount} / Avg {formatScore(row.averageRating)}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={`h-full rounded-full ${chartPalette[index % chartPalette.length]}`} style={{ width: `${row.sharePercent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TasteMonitor({ dimensions, strongestDimension }: { dimensions: AnalyticsDimensionTrend[]; strongestDimension: AnalyticsDimensionTrend | null }) {
  if (dimensions.length === 0) {
    return (
      <EvidenceEmptyState
        message="Score media against taste dimensions to see trend lines."
        steps={["Rate titles", "Open scorecard", "Save dimensions"]}
        title="No score signal grid yet"
      />
    );
  }

  const cells = Array.from({ length: 45 }, (_, index) => {
    const dimension = dimensions[index % dimensions.length];
    const score = dimension?.averageScore ?? 0;
    if (score >= 8) return "border-primary bg-primary";
    if (score >= 6) return "border-success bg-success";
    if (score >= 4) return "border-promising bg-promising";
    return "border-muted-foreground bg-muted-foreground";
  });

  return (
    <div className="mt-6">
      <div className="grid grid-cols-9 gap-2" aria-hidden="true">
        {cells.map((className, index) => (
          <span className={`h-4 w-4 rounded-md border-4 bg-transparent ${className}`} key={`taste-cell-${index}`} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="border-l-2 border-primary pl-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Strongest</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{strongestDimension?.dimensionName ?? "Needs data"}</p>
        </div>
        <div className="border-l-2 border-success pl-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tracked</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{dimensions.length}</p>
        </div>
      </div>
    </div>
  );
}

function ThemeStack({ themes }: { themes: AnalyticsTopTheme[] }) {
  if (themes.length === 0) {
    return (
      <EvidenceEmptyState
        message="Run Narrative DNA analysis to extract recurring story traits."
        steps={["Analyze narrative DNA", "Save traits", "Compare themes"]}
        title="No theme stack yet"
      />
    );
  }

  const maxCount = maxOrOne(themes.map((theme) => theme.count));
  return (
    <div className="mt-6 grid gap-4">
      {themes.slice(0, 5).map((theme, index) => (
        <div className="grid grid-cols-[minmax(8rem,1fr)_4rem] items-center gap-3" key={theme.key}>
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">{theme.label}</span>
              <span className="text-xs text-muted-foreground">{theme.count}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className={`h-full rounded-full ${chartPalette[index % chartPalette.length]}`} style={{ width: `${Math.max(8, (theme.count / maxCount) * 100)}%` }} />
            </div>
          </div>
          <ScoreBadge score={theme.averageScore ?? undefined} tone={theme.averageScore && theme.averageScore >= 80 ? "excellent" : "promising"} />
        </div>
      ))}
    </div>
  );
}

function CorrelationPanel({
  description,
  emptyText,
  leftLabel,
  points,
  rightLabel,
  statA,
  statB,
  title,
  tone = "normal",
}: {
  description: string;
  emptyText: string;
  leftLabel: string;
  points: Array<{ key: string; title: string; leftValue: number | null; rightValue: number | null; rightSuffix?: string }>;
  rightLabel: string;
  statA: { label: string; value: string };
  statB: { label: string; value: string };
  title: string;
  tone?: "normal" | "risk";
}) {
  return (
    <section aria-label={title} className="min-w-0 border-t border-border pt-5">
      <div className={`border-l-2 pl-4 ${tone === "risk" ? "border-risky" : "border-primary"}`}>
        <PanelHeading
          eyebrow="Correlation"
          icon={tone === "risk" ? <TriangleAlert aria-hidden="true" className="h-5 w-5" /> : <Compass aria-hidden="true" className="h-5 w-5" />}
          title={title}
        />
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="grid content-start gap-3">
          <MiniStat label={statA.label} value={statA.value} />
          <MiniStat label={statB.label} value={statB.value} />
        </div>
        <CorrelationList emptyText={emptyText} leftLabel={leftLabel} points={points} rightLabel={rightLabel} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border pl-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function CorrelationList({
  emptyText,
  leftLabel,
  points,
  rightLabel,
}: {
  emptyText: string;
  leftLabel: string;
  points: Array<{ key: string; title: string; leftValue: number | null; rightValue: number | null; rightSuffix?: string }>;
  rightLabel: string;
}) {
  if (points.length === 0) {
    return <p className="border-y border-border py-5 text-sm leading-6 text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {points.slice(0, 5).map((point) => (
        <div className="py-3" key={point.key}>
          <p className="font-medium text-foreground">{point.title}</p>
          <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <span>{leftLabel}: {formatScore(point.leftValue)}</span>
            <span>{rightLabel}: {point.rightValue === null ? "No data" : `${point.rightValue}${point.rightSuffix ?? ""}`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedPanel({
  ariaLabel,
  emptyText,
  icon,
  items,
  title,
}: {
  ariaLabel: string;
  emptyText: string;
  icon: ReactNode;
  items: Array<{ key: string; title: string; meta: string; score: number | null; detail: string; warning: string | null }>;
  title: string;
}) {
  return (
    <section aria-label={ariaLabel} className="min-w-0 border-t border-border pt-5">
      <PanelHeading eyebrow="Ranked evidence" icon={icon} title={title} />
      {items.length === 0 ? (
        <p className="mt-5 border-y border-border py-5 text-sm leading-6 text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className="mt-5 divide-y divide-border border-y border-border">
          {items.slice(0, 8).map((item, index) => (
            <li className="py-4" key={item.key}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">#{index + 1}</p>
                  <h3 className="mt-1 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
                </div>
                <ScoreBadge score={item.score ?? undefined} tone={item.score && item.score >= 8 ? "excellent" : "unknown"} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
              {item.warning ? <p className="mt-2 text-xs font-semibold text-risky">{item.warning}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function latestDimensionCopy(dimension: AnalyticsDimensionTrend) {
  const latestPoint = dimension.points[dimension.points.length - 1];
  if (!latestPoint) return "No trend point yet";
  return `Latest: ${latestPoint.label} at ${formatScore(latestPoint.averageScore)} from ${latestPoint.scoreCount} score${latestPoint.scoreCount === 1 ? "" : "s"}.`;
}

function isInsightsEmpty(insights: AnalyticsInsights): boolean {
  return (
    insights.consumptionTimeline.isEmpty &&
    insights.ratingDistribution.isEmpty &&
    insights.mediaTypeDistribution.isEmpty &&
    insights.dimensionTrends.isEmpty &&
    insights.genericnessSatisfaction.isEmpty &&
    insights.regretTimeCost.isEmpty &&
    insights.topCreators.isEmpty &&
    insights.topThemes.isEmpty
  );
}

function maxOrOne(values: number[]): number {
  return Math.max(1, ...values);
}

function formatScore(value: number | null): string {
  return value === null ? "No data" : `${Number(value.toFixed(1))}/10`;
}
