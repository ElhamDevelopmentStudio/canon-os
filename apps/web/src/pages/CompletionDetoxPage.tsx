import type { DetoxDecision, DetoxEvaluateResponse, DetoxRule, MediaItem } from "@canonos/contracts";
import { Ban, CheckCircle2, Clock, Library, PauseCircle, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { StatusPill, type StatusTone } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { ModuleChatPanel } from "@/features/chat/ModuleChatPanel";
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
    <div className="grid gap-6">
      <section className="border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Detox desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Completion Detox</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Use neutral sample rules to stop, pause, or continue media without sunk-cost pressure.
            </p>
          </div>
          <Button asChild className="gap-2" type="button" variant="secondary">
            <Link to={APP_ROUTES.library}>
              <Library aria-hidden="true" className="h-4 w-4" />
              Open Library
            </Link>
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingState title="Loading Completion Detox" message="Fetching rules, decisions, and library items." /> : null}
      {loadError ? <ErrorState title="Completion Detox unavailable" message={loadError.message} onRetry={() => void refreshAll()} /> : null}
      {mutationError ? <ErrorState title="Completion Detox action failed" message={mutationError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

      {!isLoading && !loadError ? (
        <>
          <ModuleChatPanel
            module="detox"
            onResult={(result) => {
              if (isDetoxEvaluateResponse(result)) {
                setEvaluation(result);
                setActionMessage("Completion Detox evaluated from chat.");
                void Promise.all([decisions.mutate(), timeSaved.mutate()]);
              }
            }}
          />

          <section aria-label="Detox summary" className="grid gap-4 border-y border-border py-4 md:grid-cols-3">
            <DetoxStat
              helper="Drop, pause, delay, and archive estimates."
              label="Total time saved"
              value={formatMinutes(timeSaved.data?.totalMinutes ?? 0)}
            />
            <DetoxStat
              helper="Decisions created this month."
              label="This month"
              value={formatMinutes(timeSaved.data?.currentMonthMinutes ?? 0)}
            />
            <DetoxStat
              helper="Saved stop/pause decisions."
              label="Saved decisions"
              value={String(timeSaved.data?.decisionCount ?? 0)}
            />
          </section>

          <section className="grid gap-10 xl:grid-cols-[minmax(34rem,1.12fr)_minmax(26rem,0.88fr)]">
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

function isDetoxEvaluateResponse(result: Record<string, unknown>): result is DetoxEvaluateResponse {
  return typeof result.decision === "object" && result.decision !== null && typeof result.mediaItem === "object" && result.mediaItem !== null;
}

function DetoxStat({ helper, label, value }: { helper: string; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 truncate text-sm text-muted-foreground">{helper}</p>
    </div>
  );
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
    <section aria-label="Detox Evaluate form" className="min-w-0">
      <div className="flex items-start gap-3">
        <TimerReset aria-hidden="true" className="mt-1 h-5 w-5 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sample boundary</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">Evaluate Drop/Pause</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Pick one active work, enter where you are, then check whether continuing is still a conscious choice.
          </p>
        </div>
      </div>

      {mediaItems.length > 0 ? (
        <div className="mt-6 grid gap-5">
          <div className="grid gap-3">
            <label className="grid gap-2 text-sm font-medium">
              Media item
              <select
                className="h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={selectedMediaId}
                onChange={(event) => onSelectedMediaChange(event.target.value)}
              >
                {mediaItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>

            {selectedMedia ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <MediaTypeBadge type={selectedMedia.mediaType} label={mediaTypeLabels[selectedMedia.mediaType]} />
                <StatusPill label={statusLabels[selectedMedia.status]} tone={statusTone[selectedMedia.status]} />
                <span className="text-muted-foreground">Progress unit: {progressUnitLabel(selectedMedia.mediaType)}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              <span className="flex items-center justify-between gap-3">
                Current progress
                <span className="text-muted-foreground">{progressValue} {selectedMedia ? progressUnitLabel(selectedMedia.mediaType) : "units"}</span>
              </span>
              <input
                className="h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                min="0"
                type="number"
                value={progressValue}
                onChange={(event) => onProgressChange(event.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              <span className="flex items-center justify-between gap-3">
                Current motivation
                <span className="text-muted-foreground">{motivationScore}/10</span>
              </span>
              <input
                className="h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                max="10"
                min="1"
                type="number"
                value={motivationScore}
                onChange={(event) => onMotivationChange(event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/20 px-4 py-3">
            <Button disabled={isEvaluating || !selectedMediaId} type="button" onClick={() => void onEvaluate()}>
              {isEvaluating ? "Evaluating…" : "Evaluate Drop/Pause"}
            </Button>
            <p className="text-sm text-muted-foreground">Neutral output. No penalty for dropping, pausing, or continuing deliberately.</p>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            message="Completion Detox needs at least one library item before it can evaluate a sample boundary."
            title="No media available"
          />
        </div>
      )}
    </section>
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
    <section aria-label="Active detox rules" className="min-w-0">
      <div className="flex items-start gap-3">
        <Ban aria-hidden="true" className="mt-1 h-5 w-5 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Rules</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">Active detox rules</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Enabled sample limits used by the evaluator.</p>
        </div>
      </div>
      <div className="mt-5 divide-y divide-border border-y border-border">
        {rules.map((rule) => (
          <article className="py-4" key={rule.id}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <h3 className="font-semibold">{rule.name}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{rule.description}</p>
                <dl className="mt-3 flex flex-wrap gap-2 text-xs">
                  <MetadataChip label="Medium" value={rule.mediaType ? mediaTypeLabels[rule.mediaType] : "Any"} />
                  <MetadataChip label="Sample" value={`${rule.sampleLimit} ${rule.mediaType ? progressUnitLabel(rule.mediaType) : "units"}`} />
                </dl>
              </div>
              <Button
                aria-label={updatingRuleId === rule.id ? `Saving ${rule.name}` : rule.isEnabled ? `Disable ${rule.name}` : `Enable ${rule.name}`}
                aria-pressed={rule.isEnabled}
                className="justify-self-start sm:justify-self-end"
                disabled={updatingRuleId === rule.id}
                size="sm"
                type="button"
                variant={rule.isEnabled ? "secondary" : "ghost"}
                onClick={() => onToggle(rule)}
              >
                {updatingRuleId === rule.id ? "Saving…" : rule.isEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
    <section aria-label="Detox decision result" className="border-t border-border pt-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex items-start gap-3">
            <span className="mt-1">
              <DecisionIcon decision={decision.decision} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decision</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Detox decision result</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{decision.reason}</p>
            </div>
          </div>
        </div>
        <div className="flex items-start justify-start md:justify-end">
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${decisionTone[decision.decision]}`}>
            {decisionLabels[decision.decision]}
          </span>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 border-y border-border py-4 text-sm sm:grid-cols-3">
        <Metadata label="Media item" value={decision.mediaItemTitle} />
        <Metadata label="Matched rule" value={decision.ruleName ?? "No active rule"} />
        <Metadata label="Estimated time saved" value={formatMinutes(decision.estimatedTimeSavedMinutes)} />
      </dl>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button disabled={updatingStatus === "dropped"} type="button" onClick={onMarkDropped}>
          {updatingStatus === "dropped" ? "Marking dropped…" : "Mark As Dropped"}
        </Button>
        <Button disabled={updatingStatus === "paused"} type="button" variant="secondary" onClick={onMarkPaused}>
          {updatingStatus === "paused" ? "Marking paused…" : "Mark As Paused"}
        </Button>
        <Button type="button" variant="ghost" onClick={onContinue}>Continue Anyway</Button>
      </div>
    </section>
  );
}

function DecisionHistory({ decisions }: { decisions: DetoxDecision[] }) {
  return (
    <section aria-label="Decision history" className="border-t border-border pt-6">
      <div className="flex items-start gap-3">
        <Clock aria-hidden="true" className="mt-1 h-5 w-5 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ledger</p>
          <h2 className="mt-1 text-2xl font-semibold text-foreground">Decision history</h2>
        </div>
      </div>
      {decisions.length > 0 ? (
        <ol className="mt-5 divide-y divide-border border-y border-border">
          {decisions.map((decision) => (
            <li className="py-4" key={decision.id}>
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
        <p className="mt-5 rounded-xl bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">No detox decisions yet.</span> Evaluate a sample boundary to start a neutral decision history.
        </p>
      )}
    </section>
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

function MetadataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border px-2.5 py-1">
      <dt className="sr-only">{label}</dt>
      <dd className="font-medium text-muted-foreground">{value}</dd>
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
