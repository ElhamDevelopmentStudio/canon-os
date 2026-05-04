import type { DetoxDecision, DetoxEvaluateResponse, DetoxRule, MediaItem } from "@canonos/contracts";
import { Ban, CheckCircle2, Clock, PauseCircle, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { MetricCard } from "@/components/data-display/MetricCard";
import { StatusPill, type StatusTone } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { evaluateDetox, updateDetoxRule, useDetoxDecisions, useDetoxRules, useDetoxTimeSaved } from "@/features/detox/detoxApi";
import { updateMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";

const statusTone: Record<string, StatusTone> = {
  planned: "neutral",
  consuming: "active",
  completed: "success",
  paused: "warning",
  dropped: "danger",
};

const decisionLabels: Record<DetoxDecision["decision"], string> = {
  drop: "Drop",
  pause: "Pause",
  delay: "Delay",
  archive: "Archive",
  continue: "Continue",
};

const decisionTone: Record<DetoxDecision["decision"], string> = {
  drop: "border-avoid/35 bg-avoid/10 text-avoid",
  pause: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-100",
  delay: "border-border bg-muted text-muted-foreground",
  archive: "border-border bg-muted text-muted-foreground",
  continue: "border-worth/35 bg-worth/10 text-worth",
};

export function CompletionDetoxPage() {
  const rules = useDetoxRules();
  const decisions = useDetoxDecisions();
  const timeSaved = useDetoxTimeSaved();
  const mediaItems = useMediaItems();
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [progressValue, setProgressValue] = useState("30");
  const [motivationScore, setMotivationScore] = useState("3");
  const [evaluation, setEvaluation] = useState<DetoxEvaluateResponse | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<"paused" | "dropped" | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const availableMedia = useMemo(() => mediaItems.data?.results ?? [], [mediaItems.data?.results]);
  const selectedMedia = availableMedia.find((item) => item.id === selectedMediaId) ?? null;

  useEffect(() => {
    if (!selectedMediaId && availableMedia.length > 0) {
      setSelectedMediaId(availableMedia[0].id);
    }
  }, [availableMedia, selectedMediaId]);

  async function handleEvaluate() {
    if (!selectedMediaId) return;
    setIsEvaluating(true);
    setMutationError(null);
    setActionMessage(null);
    try {
      const response = await evaluateDetox({
        mediaItemId: selectedMediaId,
        progressValue: Number(progressValue),
        motivationScore: Number(motivationScore),
      });
      setEvaluation(response);
      await Promise.all([decisions.mutate(), timeSaved.mutate()]);
    } catch (caught) {
      setMutationError(caught instanceof Error ? caught.message : "Could not evaluate Completion Detox.");
    } finally {
      setIsEvaluating(false);
    }
  }

  async function handleRuleToggle(rule: DetoxRule) {
    setUpdatingRuleId(rule.id);
    setMutationError(null);
    try {
      await updateDetoxRule(rule.id, { isEnabled: !rule.isEnabled });
      await rules.mutate();
    } catch (caught) {
      setMutationError(caught instanceof Error ? caught.message : "Could not update detox rule.");
    } finally {
      setUpdatingRuleId(null);
    }
  }

  async function handleStatusUpdate(status: "paused" | "dropped") {
    if (!evaluation) return;
    setUpdatingStatus(status);
    setMutationError(null);
    try {
      await updateMediaItem(evaluation.decision.mediaItemId, { status });
      await mediaItems.mutate();
      setActionMessage(`${evaluation.decision.mediaItemTitle} marked as ${statusLabels[status].toLowerCase()}.`);
    } catch (caught) {
      setMutationError(caught instanceof Error ? caught.message : `Could not mark item as ${status}.`);
    } finally {
      setUpdatingStatus(null);
    }
  }

  const isLoading = rules.isLoading || decisions.isLoading || timeSaved.isLoading || mediaItems.isLoading;
  const loadError = rules.error ?? decisions.error ?? timeSaved.error ?? mediaItems.error;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageActionBar className="justify-between">
          <div>
            <PageTitle>Completion Detox</PageTitle>
            <PageSubtitle>
              Use neutral sample rules to stop, pause, or continue media without sunk-cost pressure.
            </PageSubtitle>
          </div>
          <Button asChild type="button" variant="secondary">
            <Link to={APP_ROUTES.library}>Open Library</Link>
          </Button>
        </PageActionBar>
      </section>

      {isLoading ? <LoadingState title="Loading Completion Detox" message="Fetching rules, decisions, and library items." /> : null}
      {loadError ? <ErrorState title="Completion Detox unavailable" message={loadError.message} onRetry={() => void refreshAll()} /> : null}
      {mutationError ? <ErrorState title="Completion Detox action failed" message={mutationError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

      {!isLoading && !loadError ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard helper="Estimated from drop, pause, delay, and archive decisions." label="Total time saved" value={formatMinutes(timeSaved.data?.totalMinutes ?? 0)} />
            <MetricCard helper="Time saved by decisions created this month." label="This month" value={formatMinutes(timeSaved.data?.currentMonthMinutes ?? 0)} />
            <MetricCard helper="Recorded detox decisions with time savings." label="Saved decisions" value={timeSaved.data?.decisionCount ?? 0} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
            <DetoxEvaluateForm
              mediaItems={availableMedia}
              motivationScore={motivationScore}
              progressValue={progressValue}
              selectedMedia={selectedMedia}
              selectedMediaId={selectedMediaId}
              isEvaluating={isEvaluating}
              onEvaluate={handleEvaluate}
              onMotivationChange={setMotivationScore}
              onProgressChange={setProgressValue}
              onSelectedMediaChange={setSelectedMediaId}
            />
            <ActiveRulesSection
              rules={rules.data?.results ?? []}
              updatingRuleId={updatingRuleId}
              onToggle={(rule) => void handleRuleToggle(rule)}
            />
          </section>

          {evaluation ? (
            <DecisionResultCard
              evaluation={evaluation}
              updatingStatus={updatingStatus}
              onContinue={() => {
                setEvaluation(null);
                setActionMessage("Continuing is recorded as a conscious choice. Re-check at the next sample boundary.");
              }}
              onMarkDropped={() => void handleStatusUpdate("dropped")}
              onMarkPaused={() => void handleStatusUpdate("paused")}
            />
          ) : null}

          <DecisionHistory decisions={decisions.data?.results ?? []} />
        </>
      ) : null}
    </div>
  );

  async function refreshAll() {
    await Promise.all([rules.mutate(), decisions.mutate(), timeSaved.mutate(), mediaItems.mutate()]);
  }
}

function DetoxEvaluateForm({
  mediaItems,
  motivationScore,
  progressValue,
  selectedMedia,
  selectedMediaId,
  isEvaluating,
  onEvaluate,
  onMotivationChange,
  onProgressChange,
  onSelectedMediaChange,
}: {
  mediaItems: MediaItem[];
  motivationScore: string;
  progressValue: string;
  selectedMedia: MediaItem | null;
  selectedMediaId: string;
  isEvaluating: boolean;
  onEvaluate: () => void;
  onMotivationChange: (value: string) => void;
  onProgressChange: (value: string) => void;
  onSelectedMediaChange: (value: string) => void;
}) {
  return (
    <SectionCard title="Detox Evaluate form">
      <div className="grid gap-5">
        <div>
          <div className="flex items-center gap-2">
            <TimerReset aria-hidden="true" className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Evaluate Drop/Pause</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Pick a work, enter current progress, and rate motivation. CanonOS will use active sample rules and neutral language.
          </p>
        </div>

        {mediaItems.length > 0 ? (
          <>
            <label className="grid gap-1.5 text-sm font-medium">
              Media item
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={selectedMediaId}
                onChange={(event) => onSelectedMediaChange(event.target.value)}
              >
                {mediaItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>

            {selectedMedia ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3 text-sm">
                <MediaTypeBadge type={selectedMedia.mediaType} label={mediaTypeLabels[selectedMedia.mediaType]} />
                <StatusPill label={statusLabels[selectedMedia.status]} tone={statusTone[selectedMedia.status]} />
                <span className="text-muted-foreground">Progress unit: {progressUnitLabel(selectedMedia.mediaType)}</span>
              </div>
            ) : null}

            <label className="grid gap-1.5 text-sm font-medium">
              Current progress
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                min="0"
                type="number"
                value={progressValue}
                onChange={(event) => onProgressChange(event.target.value)}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              Current motivation
              <input
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                max="10"
                min="1"
                type="number"
                value={motivationScore}
                onChange={(event) => onMotivationChange(event.target.value)}
              />
            </label>

            <Button disabled={isEvaluating || !selectedMediaId} type="button" onClick={() => void onEvaluate()}>
              {isEvaluating ? "Evaluating…" : "Evaluate Drop/Pause"}
            </Button>
          </>
        ) : (
          <EmptyState
            message="Completion Detox needs at least one library item before it can evaluate a sample boundary."
            title="No media available"
          />
        )}
      </div>
    </SectionCard>
  );
}

function ActiveRulesSection({
  rules,
  updatingRuleId,
  onToggle,
}: {
  rules: DetoxRule[];
  updatingRuleId: string | null;
  onToggle: (rule: DetoxRule) => void;
}) {
  return (
    <SectionCard title="Active detox rules">
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Ban aria-hidden="true" className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Active detox rules</h2>
        </div>
        {rules.map((rule) => (
          <article className="rounded-2xl border border-border bg-background p-4" key={rule.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{rule.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{rule.description}</p>
              </div>
              <Button
                aria-pressed={rule.isEnabled}
                disabled={updatingRuleId === rule.id}
                type="button"
                variant={rule.isEnabled ? "default" : "secondary"}
                onClick={() => onToggle(rule)}
              >
                {updatingRuleId === rule.id ? "Saving…" : rule.isEnabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
              </Button>
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Metadata label="Medium" value={rule.mediaType ? mediaTypeLabels[rule.mediaType] : "Any"} />
              <Metadata label="Sample limit" value={`${rule.sampleLimit} ${rule.mediaType ? progressUnitLabel(rule.mediaType) : "units"}`} />
            </dl>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function DecisionResultCard({
  evaluation,
  updatingStatus,
  onContinue,
  onMarkDropped,
  onMarkPaused,
}: {
  evaluation: DetoxEvaluateResponse;
  updatingStatus: "paused" | "dropped" | null;
  onContinue: () => void;
  onMarkDropped: () => void;
  onMarkPaused: () => void;
}) {
  const decision = evaluation.decision;
  return (
    <SectionCard title="Detox decision result">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DecisionIcon decision={decision.decision} />
              <h2 className="text-lg font-semibold">Detox decision result</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{decision.reason}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${decisionTone[decision.decision]}`}>
            {decisionLabels[decision.decision]}
          </span>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Metadata label="Media item" value={decision.mediaItemTitle} />
          <Metadata label="Matched rule" value={decision.ruleName ?? "No active rule"} />
          <Metadata label="Estimated time saved" value={formatMinutes(decision.estimatedTimeSavedMinutes)} />
        </dl>
        <div className="flex flex-wrap gap-3">
          <Button disabled={updatingStatus === "dropped"} type="button" onClick={onMarkDropped}>
            {updatingStatus === "dropped" ? "Marking dropped…" : "Mark As Dropped"}
          </Button>
          <Button disabled={updatingStatus === "paused"} type="button" variant="secondary" onClick={onMarkPaused}>
            {updatingStatus === "paused" ? "Marking paused…" : "Mark As Paused"}
          </Button>
          <Button type="button" variant="ghost" onClick={onContinue}>Continue Anyway</Button>
        </div>
      </div>
    </SectionCard>
  );
}

function DecisionHistory({ decisions }: { decisions: DetoxDecision[] }) {
  return (
    <SectionCard title="Decision history">
      <div className="flex items-center gap-2">
        <Clock aria-hidden="true" className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Decision history</h2>
      </div>
      {decisions.length > 0 ? (
        <ol className="mt-4 grid gap-3">
          {decisions.map((decision) => (
            <li className="rounded-2xl border border-border bg-background p-4" key={decision.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{decision.mediaItemTitle}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{decision.reason}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${decisionTone[decision.decision]}`}>
                  {decisionLabels[decision.decision]}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatMinutes(decision.estimatedTimeSavedMinutes)} saved · {new Date(decision.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState title="No detox decisions yet" message="Evaluate a sample boundary to start a neutral decision history." />
      )}
    </SectionCard>
  );
}

function DecisionIcon({ decision }: { decision: DetoxDecision["decision"] }) {
  if (decision === "drop") return <Ban aria-hidden="true" className="h-5 w-5 text-avoid" />;
  if (decision === "pause") return <PauseCircle aria-hidden="true" className="h-5 w-5 text-amber-600" />;
  return <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-worth" />;
}

function SuccessMessage({ message }: { message: string }) {
  return <div className="rounded-2xl border border-worth/30 bg-worth/10 p-4 text-sm font-medium text-worth" role="status">{message}</div>;
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function progressUnitLabel(mediaType: MediaItem["mediaType"]): string {
  if (mediaType === "movie" || mediaType === "audiobook") return "minutes";
  if (mediaType === "tv_show" || mediaType === "anime") return "episodes";
  return "pages";
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}
