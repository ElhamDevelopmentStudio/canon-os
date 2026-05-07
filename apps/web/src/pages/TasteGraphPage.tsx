import type { GraphRebuildJob, TasteGraphSummary, TasteGraphSummaryItem } from "@canonos/contracts";
import { CircleDot, GitBranch, Network, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
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
  const signalNodeCount =
    graph.evidenceCounts.creatorNodeCount +
    graph.evidenceCounts.dimensionNodeCount +
    graph.evidenceCounts.aftertasteSignalNodeCount +
    graph.evidenceCounts.narrativeTraitNodeCount;

  return (
    <>
      <section className="border-y border-border py-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Network aria-hidden="true" className="h-4 w-4" />
                Evidence map
              </span>
              <span className="text-sm text-muted-foreground">Generated {formatGeneratedAt(graph.generatedAt)}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <GraphSignal label="Nodes" value={graph.nodeCount} helper="Owner-scoped vertices" />
              <GraphSignal label="Edges" value={graph.edgeCount} helper="Weighted connections" />
              <GraphSignal label="Media" value={graph.evidenceCounts.mediaNodeCount} helper="Works in evidence" />
              <GraphSignal label="Signals" value={signalNodeCount} helper="Creators, dimensions, reactions" />
            </div>
          </div>

          <div className="relative min-h-48 overflow-hidden rounded-2xl border border-border bg-card/55 p-5">
            <div className="absolute left-8 right-8 top-1/2 h-px bg-primary/40" aria-hidden="true" />
            <div className="absolute bottom-8 left-1/2 top-8 w-px bg-primary/25" aria-hidden="true" />
            <GraphNode className="left-6 top-6" label="Media" value={graph.evidenceCounts.mediaNodeCount} />
            <GraphNode className="right-6 top-10" label="Creators" value={graph.evidenceCounts.creatorNodeCount} />
            <GraphNode className="bottom-6 left-10" label="Taste" value={graph.evidenceCounts.dimensionNodeCount} />
            <GraphNode className="bottom-8 right-8" label="Aftertaste" value={graph.evidenceCounts.aftertasteSignalNodeCount} />
            <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary/40 bg-background text-center shadow-lg shadow-primary/10">
              <span className="text-2xl font-semibold">{graph.edgeCount}</span>
              <span className="-mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">edges</span>
            </div>
          </div>
        </div>
      </section>

      {graph.isEmpty ? (
        <EmptyState
          actionLabel="Rebuild TasteGraph"
          message="Add or score media, then rebuild the graph to connect works, creators, dimensions, and aftertaste signals. An empty library rebuild is safe and should stay empty."
          title="TasteGraph has no connections yet"
          onAction={onRebuild}
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
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

      <section className="border-t border-border pt-5">
        <CardHeading icon={<Network aria-hidden="true" className="h-5 w-5" />} label="Graph ledger" title="Text graph view" />
        <div className="mt-4 border-y border-border">
          {graph.textGraph.length > 0 ? (
            <ol className="divide-y divide-border text-sm">
              {graph.textGraph.map((line, index) => (
                <li className="grid gap-3 py-3 font-mono text-muted-foreground sm:grid-cols-[3rem_minmax(0,1fr)]" key={line}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 break-words">{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">No graph lines yet. Rebuild after adding scored media.</p>
          )}
        </div>
      </section>
    </>
  );
}

function JobStatus({ job }: { job: GraphRebuildJob }) {
  return (
    <section className="border-y border-border py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Rebuild status</p>
          <h2 className="mt-1 text-lg font-semibold">TasteGraph rebuild {job.status}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{job.message}</p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {job.nodeCount} nodes · {job.edgeCount} edges
        </p>
      </div>
    </section>
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
    <section className="border-t border-border pt-5">
      <CardHeading icon={icon} label={tone === "risky" ? "Risk signals" : "Ranked evidence"} title={title} />
      {items.length > 0 ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {items.map((item, index) => (
            <div className="grid gap-4 py-4 sm:grid-cols-[3rem_minmax(0,1fr)_7rem]" key={`${title}-${item.id}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div>
                  <h3 className="truncate font-semibold">{item.label}</h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {formatNodeType(item.nodeType)}{item.mediaType ? ` · ${mediaTypeLabels[item.mediaType]}` : ""} · {item.evidenceLabel}
                  </p>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-muted">
                  <div
                    className={tone === "risky" ? "h-1.5 rounded-full bg-risky" : "h-1.5 rounded-full bg-primary"}
                    style={{ width: `${weightPercent(item.weight)}%` }}
                  />
                </div>
              </div>
              <div className="self-center text-left sm:text-right">
                <p className={tone === "risky" ? "text-xl font-semibold text-risky" : "text-xl font-semibold text-primary"}>
                  {Math.abs(item.weight).toFixed(1)}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">weight</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 border-y border-border py-6 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}

function CardHeading({ icon, label, title }: { icon: ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      </div>
    </div>
  );
}

function GraphSignal({ helper, label, value }: { helper: string; label: string; value: number }) {
  return (
    <div className="border-l border-border pl-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

function GraphNode({ className, label, value }: { className: string; label: string; value: number }) {
  return (
    <div className={`absolute rounded-xl border border-border bg-background/95 px-3 py-2 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <CircleDot aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatNodeType(nodeType: TasteGraphSummaryItem["nodeType"]) {
  return nodeType.replace(/_/g, " ");
}

function formatGeneratedAt(generatedAt: string) {
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    return "after the latest rebuild";
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function weightPercent(weight: number) {
  return Math.min(Math.max(Math.abs(weight) * 10, 8), 100);
}
