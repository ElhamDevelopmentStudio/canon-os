import type { TasteChangeInsight, TasteEvolutionSnapshot, TasteTrend } from "@canonos/contracts";
import { CalendarClock, History, LineChart, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { MetricCard } from "@/components/data-display/MetricCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import {
  generateTasteEvolutionSnapshot,
  useTasteEvolutionTimeline,
} from "@/features/evolution/evolutionApi";

const insightTone: Record<TasteChangeInsight["severity"], string> = {
  positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  neutral: "border-border bg-background text-foreground",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-100",
};

export function TasteEvolutionPage() {
  const { data, error, isLoading, isValidating, mutate } = useTasteEvolutionTimeline();
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      await generateTasteEvolutionSnapshot();
      await mutate();
    } catch (caught) {
      setGenerateError(caught instanceof Error ? caught.message : "Could not generate a taste evolution snapshot.");
    } finally {
      setIsGenerating(false);
    }
  }

  const snapshots = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <PageTitle>Taste Evolution Journal</PageTitle>
            <PageSubtitle>
              Track month-by-month shifts in ratings, mediums, genericness tolerance, regret, fatigue, and favorite
              dimensions.
            </PageSubtitle>
          </div>
          <Button className="gap-2" disabled={isGenerating || isValidating} type="button" onClick={() => void handleGenerate()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {isGenerating ? "Generating…" : "Generate Snapshot"}
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading taste evolution" message="Reading your snapshot timeline." /> : null}
      {error ? <ErrorState title="Taste evolution unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {generateError ? <ErrorState title="Snapshot generation failed" message={generateError} onRetry={() => void handleGenerate()} /> : null}

      {!isLoading && !error && data ? (
        snapshots.length > 0 ? (
          <TasteEvolutionContent snapshots={snapshots} onGenerate={() => void handleGenerate()} />
        ) : (
          <EmptyState
            actionLabel="Generate Snapshot"
            message="The timeline is empty. Generate a first snapshot now; it will safely explain when more evidence is needed."
            title="No taste evolution snapshots yet"
            onAction={() => void handleGenerate()}
          />
        )
      ) : null}
    </div>
  );
}

function TasteEvolutionContent({ snapshots, onGenerate }: { snapshots: TasteEvolutionSnapshot[]; onGenerate: () => void }) {
  const latest = snapshots[0];
  const aggregate = latest.aggregateData;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard helper="Saved historical snapshots." label="Snapshots" value={snapshots.length} />
        <MetricCard helper="Completed works in trend evidence." label="Completed" value={aggregate.evidenceCounts.completedMediaCount} />
        <MetricCard helper="Taste score rows analyzed." label="Scores" value={aggregate.evidenceCounts.scoreCount} />
        <MetricCard helper="Aftertaste reflections analyzed." label="Reflections" value={aggregate.evidenceCounts.aftertasteCount} />
      </section>

      <SectionCard title="Latest taste change insight">
        {latest.insights.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {latest.insights.map((insight) => (
              <InsightCard insight={insight} key={insight.key} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No insight has crossed the current evidence thresholds.</p>
        )}
      </SectionCard>

      {aggregate.isEmpty ? (
        <EmptyState
          actionLabel="Generate Snapshot Again"
          message="This snapshot proves the journal works, but you need ratings, scores, or aftertaste before trend lines become meaningful."
          title="Taste Evolution needs more evidence"
          onAction={onGenerate}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <TrendCard
          icon={<LineChart aria-hidden="true" className="h-5 w-5" />}
          trend={aggregate.ratingTrend}
          unit="/10"
        />
        <TrendCard icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} trend={aggregate.mediaTypeTrend} />
        <TrendCard trend={aggregate.genericnessToleranceTrend} unit="/100" />
        <TrendCard icon={<TriangleAlert aria-hidden="true" className="h-5 w-5" />} trend={aggregate.regretTrend} unit="/100" />
        <TrendCard icon={<CalendarClock aria-hidden="true" className="h-5 w-5" />} trend={aggregate.completionFatigueTrend} unit="/100" />
        <TrendCard icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} trend={aggregate.favoriteDimensionTrend} />
      </section>

      <SectionCard title="Snapshot history">
        <CardHeading icon={<History aria-hidden="true" className="h-5 w-5" />} title="Snapshot history" />
        <ol className="mt-4 grid gap-3">
          {snapshots.map((snapshot) => (
            <li className="rounded-xl border border-border bg-background p-4" key={snapshot.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{new Date(snapshot.snapshotDate).toLocaleDateString()} snapshot</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{snapshot.aggregateData.generatedSummary}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {snapshot.snapshotPeriod}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
    </>
  );
}

function TrendCard({
  icon = <LineChart aria-hidden="true" className="h-5 w-5" />,
  trend,
  unit = "",
}: {
  icon?: ReactNode;
  trend: TasteTrend;
  unit?: string;
}) {
  return (
    <SectionCard title={trend.label}>
      <CardHeading icon={icon} title={trend.label} />
      <p className="mt-3 text-sm text-muted-foreground">{trend.summary}</p>
      <div className="mt-4 grid gap-2">
        {trend.points.length > 0 ? (
          trend.points.map((point) => (
            <div className="rounded-xl border border-border bg-background p-3" key={`${trend.key}-${point.period}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{point.label}</span>
                <span className="text-sm font-semibold">{formatTrendValue(point, trend, unit)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{point.count} evidence item{point.count === 1 ? "" : "s"}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No evidence for this trend yet.</p>
        )}
      </div>
    </SectionCard>
  );
}

function InsightCard({ insight }: { insight: TasteChangeInsight }) {
  return (
    <article className={`rounded-xl border p-4 ${insightTone[insight.severity]}`}>
      <h3 className="font-semibold">{insight.title}</h3>
      <p className="mt-2 text-sm opacity-90">{insight.body}</p>
      <p className="mt-3 text-sm font-medium">{insight.recommendation}</p>
      {insight.evidence.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs opacity-80">
          {insight.evidence.map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function formatTrendValue(point: TasteTrend["points"][number], trend: TasteTrend, unit: string): string {
  if (trend.key === "media_type") {
    return String(point.meta.mediaTypeLabel ?? point.meta.mediaType ?? "Unknown medium");
  }
  if (trend.key === "favorite_dimension") {
    return String(point.meta.dimensionName ?? "Unknown dimension");
  }
  if (point.value === null) {
    return "No value";
  }
  return `${point.value}${unit}`;
}

function CardHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
