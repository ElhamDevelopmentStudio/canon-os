import type { GraphRebuildJob, TasteGraphSummary, TasteGraphSummaryItem } from "@canonos/contracts";
import { GitBranch, Network, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { MetricCard } from "@/components/data-display/MetricCard";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { JobStatusCard } from "@/features/jobs/JobStatusCard";
import { useBackgroundJob } from "@/features/jobs/jobsApi";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { rebuildTasteGraph, useTasteGraphSummary } from "@/features/tastegraph/tasteGraphApi";

export function TasteGraphPage() {
  const { data, error, isLoading, isValidating, mutate } = useTasteGraphSummary();
  const [job, setJob] = useState<GraphRebuildJob | null>(null);
  const { data: backgroundJob } = useBackgroundJob(job?.id);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  async function handleRebuild() {
    setIsRebuilding(true);
    setRebuildError(null);
    try {
      const result = await rebuildTasteGraph();
      setJob(result);
      await mutate();
    } catch (caught) {
      setRebuildError(caught instanceof Error ? caught.message : "Could not rebuild TasteGraph.");
    } finally {
      setIsRebuilding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <PageTitle>TasteGraph</PageTitle>
            <PageSubtitle>
              A transparent graph connecting media, creators, score dimensions, mediums, and aftertaste signals.
            </PageSubtitle>
          </div>
          <Button className="gap-2" disabled={isRebuilding || isValidating} type="button" onClick={() => void handleRebuild()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            {isRebuilding ? "Rebuilding…" : "Rebuild TasteGraph"}
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading TasteGraph" message="Reading graph nodes and connections." /> : null}
      {error ? <ErrorState title="TasteGraph unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
      {rebuildError ? <ErrorState title="TasteGraph rebuild failed" message={rebuildError} onRetry={() => void handleRebuild()} /> : null}
      {backgroundJob ? <JobStatusCard job={backgroundJob} title="TasteGraph rebuild status" /> : null}
      {!backgroundJob && job ? <JobStatus job={job} /> : null}
      {!isLoading && !error && data ? <TasteGraphContent graph={data} onRebuild={() => void handleRebuild()} /> : null}
    </div>
  );
}

function TasteGraphContent({ graph, onRebuild }: { graph: TasteGraphSummary; onRebuild: () => void }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard helper="Owner-scoped graph nodes." label="Nodes" value={graph.nodeCount} />
        <MetricCard helper="Weighted evidence connections." label="Edges" value={graph.edgeCount} />
        <MetricCard helper="Media connected to the graph." label="Media nodes" value={graph.evidenceCounts.mediaNodeCount} />
        <MetricCard helper="Creators, dimensions, aftertaste, and Narrative DNA." label="Signal nodes" value={graph.evidenceCounts.creatorNodeCount + graph.evidenceCounts.dimensionNodeCount + graph.evidenceCounts.aftertasteSignalNodeCount + graph.evidenceCounts.narrativeTraitNodeCount} />
      </section>

      {graph.isEmpty ? (
        <EmptyState
          actionLabel="Rebuild TasteGraph"
          message="Add or score media, then rebuild the graph to connect works, creators, dimensions, and aftertaste signals. An empty library rebuild is safe and should stay empty."
          title="TasteGraph has no connections yet"
          onAction={onRebuild}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <GraphListCard
          emptyMessage="Score media to reveal theme and dimension connections."
          icon={<Sparkles aria-hidden="true" className="h-5 w-5" />}
          items={graph.strongestThemes}
          title="Strongest connected themes"
        />
        <GraphListCard
          emptyMessage="Add creator/author/director names to media items."
          icon={<Network aria-hidden="true" className="h-5 w-5" />}
          items={graph.strongestCreators}
          title="Strongest connected creators"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <GraphListCard
          emptyMessage="Add scored or reflected media to produce media nodes."
          icon={<GitBranch aria-hidden="true" className="h-5 w-5" />}
          items={graph.strongestMedia}
          title="Strongest connected media"
        />
        <GraphListCard
          emptyMessage="Negative dimension scores or regret/generic aftertaste will appear here."
          icon={<TriangleAlert aria-hidden="true" className="h-5 w-5" />}
          items={graph.weakNegativeSignals}
          title="Weak and negative signals"
          tone="risky"
        />
      </section>

      <SectionCard title="Text graph view">
        <CardHeading icon={<Network aria-hidden="true" className="h-5 w-5" />} title="Text graph view" />
        {graph.textGraph.length > 0 ? (
          <ol className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {graph.textGraph.map((line) => (
              <li className="rounded-xl border border-border bg-background p-3 font-mono" key={line}>{line}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No graph lines yet. Rebuild after adding scored media.</p>
        )}
      </SectionCard>
    </>
  );
}

function JobStatus({ job }: { job: GraphRebuildJob }) {
  return (
    <SectionCard title="TasteGraph rebuild status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">TasteGraph rebuild {job.status}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{job.message}</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {job.nodeCount} nodes · {job.edgeCount} edges
        </p>
      </div>
    </SectionCard>
  );
}

function GraphListCard({
  emptyMessage,
  icon,
  items,
  title,
  tone = "promising",
}: {
  emptyMessage: string;
  icon: ReactNode;
  items: TasteGraphSummaryItem[];
  title: string;
  tone?: "promising" | "risky";
}) {
  return (
    <SectionCard title={title}>
      <CardHeading icon={icon} title={title} />
      {items.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div className="rounded-xl border border-border bg-background p-4" key={`${title}-${item.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.label}</h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.nodeType.replace(/_/g, " ")}{item.mediaType ? ` · ${mediaTypeLabels[item.mediaType]}` : ""} · {item.evidenceLabel}
                  </p>
                </div>
                <ScoreBadge label="weight" score={Math.abs(item.weight)} tone={tone} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </SectionCard>
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
