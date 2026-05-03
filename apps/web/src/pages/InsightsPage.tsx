import type {
  AnalyticsConsumptionTimelinePoint,
  AnalyticsDimensionTrend,
  AnalyticsInsights,
  AnalyticsMediaTypeDistributionRow,
  AnalyticsRatingDistributionBucket,
  AnalyticsTopTheme,
} from "@canonos/contracts";
import { BarChart3, Compass, PieChart, Sparkles, Tags, TrendingUp, TriangleAlert, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { MetricCard } from "@/components/data-display/MetricCard";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useAnalyticsInsights } from "@/features/insights/analyticsApi";
import { mediaTypeLabels } from "@/features/media/mediaLabels";

export function InsightsPage() {
  const { data, error, isLoading, mutate } = useAnalyticsInsights();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Insights</p>
            <PageTitle>Readable patterns from your media history.</PageTitle>
            <PageSubtitle>
              Track consumption momentum, ratings, mediums, creators, narrative traits, and avoidable regret without
              turning CanonOS into a noisy analytics suite.
            </PageSubtitle>
          </div>
          <Button asChild className="gap-2" type="button" variant="secondary">
            <Link to={APP_ROUTES.library}>Add more evidence</Link>
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading insights" message="Reading analytics endpoints and taste evidence." /> : null}
      {error ? <ErrorState title="Insights unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && data ? <InsightsContent insights={data} /> : null}
    </div>
  );
}

function InsightsContent({ insights }: { insights: AnalyticsInsights }) {
  const isEmpty = isInsightsEmpty(insights);
  const highestTimelineCount = maxOrOne(insights.consumptionTimeline.points.map((point) => point.totalCount));
  const totalHighRegretHours = Math.round((insights.regretTimeCost.totalHighRegretMinutes / 60) * 10) / 10;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          helper="Completed and dropped evidence points."
          label="Timeline months"
          value={insights.consumptionTimeline.points.length}
        />
        <MetricCard helper="Media with personal ratings." label="Rated media" value={insights.ratingDistribution.ratedCount} />
        <MetricCard
          helper="Taste dimensions with score history."
          label="Tracked dimensions"
          value={insights.dimensionTrends.dimensions.length}
        />
        <MetricCard
          helper="Estimated high-regret hours."
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

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Consumption timeline">
          <CardHeading icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />} title="Consumption timeline" />
          {insights.consumptionTimeline.points.length > 0 ? (
            <div className="mt-4 grid gap-3" aria-label="Consumption timeline chart">
              {insights.consumptionTimeline.points.map((point) => (
                <TimelineRow key={point.period} maxValue={highestTimelineCount} point={point} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Finish or drop media to populate the timeline.</p>
          )}
        </SectionCard>

        <SectionCard title="Rating distribution">
          <CardHeading icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />} title="Rating distribution" />
          <p className="mt-2 text-sm text-muted-foreground">
            Average rating: {formatScore(insights.ratingDistribution.averageRating)}
          </p>
          <DistributionBars buckets={insights.ratingDistribution.buckets} />
        </SectionCard>

        <SectionCard title="Media type distribution">
          <CardHeading icon={<PieChart aria-hidden="true" className="h-5 w-5" />} title="Media type distribution" />
          {insights.mediaTypeDistribution.results.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {insights.mediaTypeDistribution.results.map((row) => (
                <MediaTypeRow key={row.mediaType} row={row} totalCount={insights.mediaTypeDistribution.totalCount} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Add media to see medium balance.</p>
          )}
        </SectionCard>

        <SectionCard title="Dimension trends">
          <CardHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} title="Dimension trends" />
          {insights.dimensionTrends.dimensions.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {insights.dimensionTrends.dimensions.slice(0, 5).map((dimension) => (
                <DimensionTrendCard dimension={dimension} key={dimension.dimensionId} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Score media against taste dimensions to see trend lines.</p>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <InsightSignalCard
          description={insights.genericnessSatisfaction.insight}
          icon={<Compass aria-hidden="true" className="h-5 w-5" />}
          title="Genericness vs satisfaction"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricPill label="Avg genericness" value={formatScore(insights.genericnessSatisfaction.averageGenericness)} />
            <MetricPill label="Avg satisfaction" value={formatScore(insights.genericnessSatisfaction.averageSatisfaction)} />
          </div>
          <ScatterList
            emptyText="Score genericness and rate media to reveal outliers."
            items={insights.genericnessSatisfaction.points.map((point) => ({
              key: point.mediaItemId,
              title: point.title,
              leftLabel: "Genericness",
              leftValue: point.genericnessScore,
              rightLabel: "Satisfaction",
              rightValue: point.satisfactionScore,
            }))}
          />
        </InsightSignalCard>

        <InsightSignalCard
          description={insights.regretTimeCost.insight}
          icon={<TriangleAlert aria-hidden="true" className="h-5 w-5" />}
          title="Regret vs time cost"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricPill label="Avg regret" value={formatScore(insights.regretTimeCost.averageRegret)} />
            <MetricPill label="High-regret time" value={`${insights.regretTimeCost.totalHighRegretMinutes} min`} />
          </div>
          <ScatterList
            emptyText="Score regret and add runtime/page evidence to reveal time sinks."
            items={insights.regretTimeCost.points.map((point) => ({
              key: point.mediaItemId,
              title: point.title,
              leftLabel: "Regret",
              leftValue: point.regretScore,
              rightLabel: "Time cost",
              rightValue: point.timeCostMinutes,
              rightSuffix: " min",
            }))}
          />
        </InsightSignalCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Top creators">
          <CardHeading icon={<Users aria-hidden="true" className="h-5 w-5" />} title="Top creators" />
          <RankedList
            emptyText="Add creators to media records to rank trusted and risky sources."
            items={insights.topCreators.results.map((creator) => ({
              key: creator.creator,
              title: creator.creator,
              meta: `${creator.count} item${creator.count === 1 ? "" : "s"} · ${creator.completedCount} completed`,
              score: creator.averageRating,
              detail: creator.bestTitle ? `Best rated: ${creator.bestTitle}` : "No rated item yet",
              warning: creator.negativeSignalCount > 0 ? `${creator.negativeSignalCount} negative signal${creator.negativeSignalCount === 1 ? "" : "s"}` : null,
            }))}
          />
        </SectionCard>

        <SectionCard title="Top themes">
          <CardHeading icon={<Tags aria-hidden="true" className="h-5 w-5" />} title="Top themes" />
          <RankedList
            emptyText="Run Narrative DNA analysis to extract recurring story traits."
            items={insights.topThemes.results.map((theme) => themeToRankedItem(theme))}
          />
        </SectionCard>
      </section>
    </>
  );
}

function TimelineRow({ maxValue, point }: { maxValue: number; point: AnalyticsConsumptionTimelinePoint }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium">{point.label}</span>
        <span className="text-sm text-muted-foreground">
          {point.completedCount} completed · {point.droppedCount} dropped
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (point.totalCount / maxValue) * 100)}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {point.totalCount} total · Average rating {formatScore(point.averageRating)}
      </p>
    </div>
  );
}

function DistributionBars({ buckets }: { buckets: AnalyticsRatingDistributionBucket[] }) {
  const maxCount = maxOrOne(buckets.map((bucket) => bucket.count));
  return (
    <div className="mt-4 grid gap-3" aria-label="Rating distribution chart">
      {buckets.map((bucket) => (
        <div className="grid grid-cols-[3rem_1fr_2rem] items-center gap-3" key={bucket.bucket}>
          <span className="text-sm font-medium">{bucket.label}</span>
          <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary" style={{ width: `${bucket.count === 0 ? 0 : Math.max(8, (bucket.count / maxCount) * 100)}%` }} />
          </div>
          <span className="text-right text-sm font-semibold">{bucket.count}</span>
        </div>
      ))}
    </div>
  );
}

function MediaTypeRow({ row, totalCount }: { row: AnalyticsMediaTypeDistributionRow; totalCount: number }) {
  const percent = totalCount === 0 ? 0 : row.sharePercent;
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MediaTypeBadge label={mediaTypeLabels[row.mediaType]} type={row.mediaType} />
        <span className="text-sm font-semibold">{row.count} item{row.count === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {row.completedCount} completed · {percent}% share · Avg {formatScore(row.averageRating)}
      </p>
    </div>
  );
}

function DimensionTrendCard({ dimension }: { dimension: AnalyticsDimensionTrend }) {
  const latestPoint = dimension.points[dimension.points.length - 1];
  return (
    <article className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{dimension.dimensionName}</h3>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dimension.dimensionDirection === "negative" ? "Negative signal" : "Positive signal"} · {dimension.scoreCount} score{dimension.scoreCount === 1 ? "" : "s"}
          </p>
        </div>
        <ScoreBadge score={dimension.averageScore ?? undefined} tone={dimension.averageScore && dimension.averageScore >= 8 ? "excellent" : "promising"} />
      </div>
      {latestPoint ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Latest: {latestPoint.label} at {formatScore(latestPoint.averageScore)} from {latestPoint.scoreCount} score{latestPoint.scoreCount === 1 ? "" : "s"}.
        </p>
      ) : null}
    </article>
  );
}

function InsightSignalCard({ children, description, icon, title }: { children: ReactNode; description: string; icon: ReactNode; title: string }) {
  return (
    <SectionCard title={title}>
      <CardHeading icon={icon} title={title} />
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-4 grid gap-4">{children}</div>
    </SectionCard>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ScatterList({ emptyText, items }: { emptyText: string; items: Array<{ key: string; title: string; leftLabel: string; leftValue: number | null; rightLabel: string; rightValue: number | null; rightSuffix?: string }> }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3">
      {items.slice(0, 5).map((item) => (
        <div className="rounded-xl border border-border bg-background p-3" key={item.key}>
          <p className="font-medium">{item.title}</p>
          <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <span>{item.leftLabel}: {formatScore(item.leftValue)}</span>
            <span>{item.rightLabel}: {item.rightValue === null ? "No data" : `${item.rightValue}${item.rightSuffix ?? ""}`}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedList({ emptyText, items }: { emptyText: string; items: Array<{ key: string; title: string; meta: string; score: number | null; detail: string; warning: string | null }> }) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ol className="mt-4 grid gap-3">
      {items.slice(0, 8).map((item, index) => (
        <li className="rounded-xl border border-border bg-background p-3" key={item.key}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">#{index + 1}</p>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
            </div>
            <ScoreBadge score={item.score ?? undefined} tone={item.score && item.score >= 8 ? "excellent" : "unknown"} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
          {item.warning ? <p className="mt-2 text-xs font-semibold text-risky">{item.warning}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function CardHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

function themeToRankedItem(theme: AnalyticsTopTheme) {
  return {
    key: theme.key,
    title: theme.label,
    meta: `${theme.count} narrative signal${theme.count === 1 ? "" : "s"}`,
    score: theme.averageScore,
    detail: theme.exampleTitle ? `Example: ${theme.exampleTitle}` : "No example title available",
    warning: null,
  };
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
  return value === null ? "No data" : `${value}/10`;
}
