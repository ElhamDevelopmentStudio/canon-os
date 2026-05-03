import type { DashboardMediaItem, DashboardSummary } from "@canonos/contracts";
import type { ReactNode } from "react";
import { BarChart3, Clock, Moon, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { MetricCard } from "@/components/data-display/MetricCard";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill, type StatusTone } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/features/dashboard/dashboardApi";
import { MediaFormModal } from "@/features/media/MediaFormModal";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";

const statusTone: Record<string, StatusTone> = {
  planned: "neutral",
  consuming: "active",
  completed: "success",
  paused: "warning",
  dropped: "danger",
};

export function DashboardPage() {
  const { data, error, isLoading, mutate } = useDashboardSummary();
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Dashboard</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <PageTitle>Your private media command center.</PageTitle>
            <PageSubtitle>
              See library momentum, recent updates, and taste signals before choosing what to evaluate or watch next.
            </PageSubtitle>
          </div>
          <QuickActions onAddMedia={() => setIsAddOpen(true)} />
        </div>
      </section>

      {isLoading ? <LoadingState title="Loading dashboard" message="Summarizing your library and taste signals." /> : null}
      {error ? <ErrorState title="Dashboard unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {!isLoading && !error && data ? (
        <DashboardSummaryContent summary={data} onAddMedia={() => setIsAddOpen(true)} />
      ) : null}

      <MediaFormModal
        open={isAddOpen}
        media={null}
        onClose={() => setIsAddOpen(false)}
        onSaved={() => void mutate()}
      />
    </div>
  );
}

function DashboardSummaryContent({
  summary,
  onAddMedia,
}: {
  summary: DashboardSummary;
  onAddMedia: () => void;
}) {
  const isEmpty = summary.counts.totalMedia === 0;

  return (
    <>
      <section aria-labelledby="dashboard-metrics" className="grid gap-4 md:grid-cols-4">
        <h2 className="sr-only" id="dashboard-metrics">
          Dashboard metrics
        </h2>
        <MetricCard
          helper="All private media records."
          label="Total library"
          value={summary.counts.totalMedia}
        />
        <MetricCard
          helper="Finished works in the library."
          label="Completed"
          value={summary.counts.completedMedia}
        />
        <MetricCard helper="Intentional future picks." label="Planned" value={summary.counts.plannedMedia} />
        <MetricCard helper="Useful negative taste data." label="Dropped" value={summary.counts.droppedMedia} />
      </section>

      {isEmpty ? (
        <EmptyState
          actionLabel="Add Media"
          message="Add the first item to unlock recent activity, score signals, and dashboard trends."
          title="Your dashboard is ready for its first media item"
          onAction={onAddMedia}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Media type breakdown">
          <CardHeading icon={<BarChart3 aria-hidden="true" className="h-5 w-5" />} title="Media type breakdown" />
          {summary.mediaTypeBreakdown.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {summary.mediaTypeBreakdown.map((row) => (
                <div className="flex items-center justify-between gap-3" key={row.mediaType}>
                  <MediaTypeBadge label={mediaTypeLabels[row.mediaType]} type={row.mediaType} />
                  <span className="text-sm font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No media types yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Latest taste shift">
          <CardHeading icon={<TrendingUp aria-hidden="true" className="h-5 w-5" />} title="Latest taste shift" />
          {summary.latestTasteEvolutionInsight ? (
            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {summary.latestTasteEvolutionInsight.severity} insight
              </p>
              <h3 className="mt-2 font-semibold">{summary.latestTasteEvolutionInsight.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{summary.latestTasteEvolutionInsight.body}</p>
              <Button asChild className="mt-4" size="sm" type="button" variant="secondary">
                <Link to={APP_ROUTES.tasteEvolution}>Open Taste Evolution</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Generate a Taste Evolution snapshot to surface the latest taste change insight here.</p>
          )}
        </SectionCard>

        <SectionCard title="Top taste signals">
          <CardHeading icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} title="Top taste signals" />
          {summary.topTasteSignals.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {summary.topTasteSignals.map((signal) => (
                <div className="rounded-xl border border-border bg-background p-3" key={signal.dimensionId}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{signal.dimensionName}</p>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {signal.dimensionDirection === "negative" ? "Negative signal" : "Positive signal"} · {signal.scoreCount} score{signal.scoreCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ScoreBadge score={signal.averageScore} tone={signal.averageScore >= 8 ? "excellent" : "promising"} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Score media to reveal taste signals.</p>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MediaListCard items={summary.recentActivity} title="Recent activity" />
        <MediaListCard items={summary.highestRated} title="Highest rated recent items" />
      </section>
    </>
  );
}

function QuickActions({ onAddMedia }: { onAddMedia: () => void }) {
  return (
    <PageActionBar className="justify-start lg:justify-end">
      <Button className="gap-2" type="button" onClick={onAddMedia}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Media
      </Button>
      <Button asChild className="gap-2" type="button" variant="secondary">
        <Link to={APP_ROUTES.candidates}>
          <Sparkles aria-hidden="true" className="h-4 w-4" />
          Evaluate Candidate
        </Link>
      </Button>
      <Button asChild className="gap-2" type="button" variant="secondary">
        <Link to={APP_ROUTES.tonight}>
          <Moon aria-hidden="true" className="h-4 w-4" />
          Tonight Mode
        </Link>
      </Button>
    </PageActionBar>
  );
}

function MediaListCard({ items, title }: { items: DashboardMediaItem[]; title: string }) {
  return (
    <SectionCard title={title}>
      <CardHeading icon={<Clock aria-hidden="true" className="h-5 w-5" />} title={title} />
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <Link
              className="rounded-xl border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-muted/30"
              key={item.id}
              to={APP_ROUTES.mediaDetail.replace(":mediaId", item.id)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusPill label={statusLabels[item.status]} tone={statusTone[item.status]} />
                  <ScoreBadge score={item.personalRating ?? undefined} tone="unknown" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No items to show yet.</p>
      )}
    </SectionCard>
  );
}

function CardHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl bg-muted p-2 text-muted-foreground">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
