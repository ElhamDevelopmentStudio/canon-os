import {
  DESIRED_EFFECTS,
  ENERGY_LEVELS,
  FOCUS_LEVELS,
  MEDIA_TYPES,
  RISK_TOLERANCES,
  type DesiredEffect,
  type EnergyLevel,
  type FocusLevel,
  type MediaType,
  type RiskTolerance,
  type TonightModeRecommendation,
  type TonightModeResponse,
} from "@canonos/contracts";
import { Clock3, Gauge, ListPlus, Moon, Play, SlidersHorizontal, Sparkles, ThumbsDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { Button } from "@/components/ui/button";
import { ModuleChatPanel } from "@/features/chat/ModuleChatPanel";
import { updateMediaItem } from "@/features/media/mediaApi";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { useUserSettings } from "@/features/settings/settingsApi";
import { createQueueItem, updateQueueItem } from "@/features/queue/queueApi";
import {
  desiredEffectLabels,
  energyLevelLabels,
  focusLevelLabels,
  recommendationSlotLabels,
  riskToleranceLabels,
} from "@/features/tonight-mode/tonightLabels";
import { generateTonightPlan } from "@/features/tonight-mode/tonightApi";
import { cn } from "@/lib/utils";

const defaultMediaTypes: MediaType[] = ["movie", "anime", "novel", "audiobook"];

type TonightDraft = {
  availableMinutes: string;
  energyLevel: EnergyLevel;
  focusLevel: FocusLevel;
  desiredEffect: DesiredEffect;
  preferredMediaTypes: MediaType[];
  riskTolerance: RiskTolerance;
};

const defaultDraft: TonightDraft = {
  availableMinutes: "90",
  energyLevel: "medium",
  focusLevel: "medium",
  desiredEffect: "quality",
  preferredMediaTypes: defaultMediaTypes,
  riskTolerance: "medium",
};

export function TonightModePage() {
  const { data: userSettings } = useUserSettings();
  const [draft, setDraft] = useState<TonightDraft>(defaultDraft);
  const [settingsDefaultsApplied, setSettingsDefaultsApplied] = useState(false);
  const [plan, setPlan] = useState<TonightModeResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userSettings || settingsDefaultsApplied) return;
    setDraft((current) => ({
      ...current,
      availableMinutes: String(userSettings.recommendation.defaultTonightMode.availableMinutes),
      energyLevel: userSettings.recommendation.defaultTonightMode.energyLevel,
      focusLevel: userSettings.recommendation.defaultTonightMode.focusLevel,
      desiredEffect: userSettings.recommendation.defaultTonightMode.desiredEffect,
      preferredMediaTypes: userSettings.recommendation.defaultMediaTypes,
      riskTolerance: userSettings.recommendation.defaultRiskTolerance,
    }));
    setSettingsDefaultsApplied(true);
  }, [settingsDefaultsApplied, userSettings]);

  function updateDraft<K extends keyof TonightDraft>(field: K, value: TonightDraft[K]) {
    setSettingsDefaultsApplied(true);
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleMediaType(type: MediaType) {
    setSettingsDefaultsApplied(true);
    setDraft((current) => {
      const selected = current.preferredMediaTypes.includes(type);
      const preferredMediaTypes = selected
        ? current.preferredMediaTypes.filter((item) => item !== type)
        : [...current.preferredMediaTypes, type];
      return { ...current, preferredMediaTypes };
    });
  }

  async function generatePlan() {
    const availableMinutes = Number.parseInt(draft.availableMinutes, 10);
    if (!Number.isFinite(availableMinutes) || availableMinutes < 1) {
      setError("Enter at least 1 available minute before generating a Tonight Mode plan.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setActionMessage(null);
    try {
      const response = await generateTonightPlan({
        availableMinutes,
        energyLevel: draft.energyLevel,
        focusLevel: draft.focusLevel,
        desiredEffect: draft.desiredEffect,
        preferredMediaTypes: draft.preferredMediaTypes,
        riskTolerance: draft.riskTolerance,
      });
      setPlan(response);
      setActionMessage("Tonight Mode plan generated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate a Tonight Mode plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function startRecommendation(recommendation: TonightModeRecommendation) {
    setError(null);
    try {
      if (recommendation.mediaItemId) {
        await updateMediaItem(recommendation.mediaItemId, { status: "consuming" });
        setActionMessage(`${recommendation.title} is now marked as consuming.`);
        return;
      }
      setActionMessage(`${recommendation.title} is selected for tonight.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start this recommendation.");
    }
  }

  async function delayRecommendation(recommendation: TonightModeRecommendation) {
    setError(null);
    try {
      if (recommendation.queueItemId) {
        await updateQueueItem(recommendation.queueItemId, {
          priority: "later",
          reason: `${recommendation.reason} Not tonight: current mood or energy was wrong.`,
        });
        setActionMessage(`${recommendation.title} moved to Later.`);
        return;
      }
      setActionMessage(`${recommendation.title} was skipped for tonight.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delay this recommendation.");
    }
  }

  async function addRecommendationToQueue(recommendation: TonightModeRecommendation) {
    setError(null);
    try {
      if (recommendation.queueItemId) {
        setActionMessage(`${recommendation.title} is already in your queue.`);
        return;
      }
      await createQueueItem({
        mediaItemId: recommendation.mediaItemId,
        candidateId: recommendation.candidateId,
        title: recommendation.title,
        mediaType: recommendation.mediaType,
        priority: recommendation.slot === "safe" ? "start_soon" : "sample_first",
        reason: recommendation.reason,
        estimatedTimeMinutes: recommendation.estimatedTimeMinutes,
        bestMood: `${energyLevelLabels[draft.energyLevel]} energy / ${focusLevelLabels[draft.focusLevel]} focus`,
      });
      setActionMessage(`${recommendation.title} added to queue.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add this recommendation to queue.");
    }
  }

  const recommendations = plan?.recommendations ?? [];
  const bestRecommendation = recommendations[0] ?? null;
  const selectedTypeLabels = draft.preferredMediaTypes.map((type) => mediaTypeLabels[type]).join(", ");

  return (
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tonight desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Tonight Mode</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Pick something that fits this exact window, not an abstract best-of list.
            </p>
          </div>
          <Button aria-label="Generate plan" disabled={isGenerating} type="button" onClick={() => void generatePlan()}>
            <Moon aria-hidden="true" className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
        <TonightSignalStrip draft={draft} bestRecommendation={bestRecommendation} selectedTypeLabels={selectedTypeLabels} />
      </section>

      <div className="grid min-h-[34rem] gap-6 xl:grid-cols-[minmax(25rem,0.75fr)_minmax(36rem,1.25fr)]">
        <div className="grid content-start gap-5 border-r border-border pr-6">
          <ModuleChatPanel
            module="tonight"
            onResult={(result) => {
              if (isTonightModeResponse(result)) {
                setPlan(result);
                setActionMessage("Tonight Mode plan generated from chat.");
              }
            }}
          />
          <TonightCheckInPanel
            draft={draft}
            isGenerating={isGenerating}
            onGenerate={() => void generatePlan()}
            onToggleMediaType={toggleMediaType}
            onUpdate={updateDraft}
          />
        </div>

        <div className="flex flex-col gap-5">
          {isGenerating ? (
            <LoadingState title="Generating Tonight Mode plan" message="Ranking queue and planned media against your current context." />
          ) : null}
          {error ? <ErrorState title="Tonight Mode failed" message={error} /> : null}
          {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

          {!plan && !isGenerating ? <TonightLandingState /> : null}

          {plan && recommendations.length === 0 ? (
            <EmptyState
              title="No Tonight Mode recommendations yet"
              message="Add queue items or planned media that fit the time window, then generate another plan."
            />
          ) : null}

          {recommendations.length > 0 ? (
            <section aria-label="Tonight recommendations" className="grid gap-4 border-l border-border pl-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Recommended order</p>
                  <h2 className="mt-2 text-2xl font-semibold">Start with {recommendations[0].title}</h2>
                </div>
                <StatusPill label={`${recommendations.length} options`} tone="active" />
              </div>
              <div className="divide-y divide-border border-y border-border">
                {recommendations.map((recommendation, index) => (
                  <RecommendationRow
                    index={index}
                    key={`${recommendation.slot}-${recommendation.title}-${recommendation.queueItemId ?? recommendation.mediaItemId}`}
                    recommendation={recommendation}
                    onAddToQueue={addRecommendationToQueue}
                    onDelay={delayRecommendation}
                    onStart={startRecommendation}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TonightSignalStrip({
  bestRecommendation,
  draft,
  selectedTypeLabels,
}: {
  bestRecommendation: TonightModeRecommendation | null;
  draft: TonightDraft;
  selectedTypeLabels: string;
}) {
  return (
    <section aria-label="Tonight constraints" className="grid gap-2 md:grid-cols-4">
      <SignalStat label="Window" value={`${draft.availableMinutes || "0"} min`} />
      <SignalStat label="State" value={`${energyLevelLabels[draft.energyLevel]} energy / ${focusLevelLabels[draft.focusLevel]} focus`} />
      <SignalStat label="Intent" value={`${desiredEffectLabels[draft.desiredEffect]} / ${riskToleranceLabels[draft.riskTolerance]} risk`} />
      <SignalStat label="Best fit" value={bestRecommendation ? `${Math.round(bestRecommendation.score)} - ${bestRecommendation.title}` : selectedTypeLabels || "No types"} />
    </section>
  );
}

function SignalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-4 border-primary bg-muted/35 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function TonightCheckInPanel({
  draft,
  isGenerating,
  onGenerate,
  onToggleMediaType,
  onUpdate,
}: {
  draft: TonightDraft;
  isGenerating: boolean;
  onGenerate: () => void;
  onToggleMediaType: (type: MediaType) => void;
  onUpdate: <K extends keyof TonightDraft>(field: K, value: TonightDraft[K]) => void;
}) {
  return (
    <section aria-label="Tonight check-in" className="grid content-start gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-primary" />
          Current state
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Set only the constraints that matter tonight. Settings supply the defaults.
        </p>
      </div>

      <TimePicker value={draft.availableMinutes} onChange={(value) => onUpdate("availableMinutes", value)} />

      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          label="Energy level"
          labels={energyLevelLabels}
          options={ENERGY_LEVELS}
          value={draft.energyLevel}
          onChange={(value) => onUpdate("energyLevel", value)}
        />
        <SelectField
          label="Focus level"
          labels={focusLevelLabels}
          options={FOCUS_LEVELS}
          value={draft.focusLevel}
          onChange={(value) => onUpdate("focusLevel", value)}
        />
        <SelectField
          label="Desired effect"
          labels={desiredEffectLabels}
          options={DESIRED_EFFECTS}
          value={draft.desiredEffect}
          onChange={(value) => onUpdate("desiredEffect", value)}
        />
        <SelectField
          label="Risk tolerance"
          labels={riskToleranceLabels}
          options={RISK_TOLERANCES}
          value={draft.riskTolerance}
          onChange={(value) => onUpdate("riskTolerance", value)}
        />
      </div>

      <fieldset className="grid gap-3 border-t border-border pt-4">
        <legend className="text-sm font-semibold">Preferred media types</legend>
        <div className="grid grid-cols-2 gap-2">
          {MEDIA_TYPES.map((type) => {
            const selected = draft.preferredMediaTypes.includes(type);
            return (
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 border border-border px-3 py-2 text-sm transition",
                  selected ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted",
                )}
                key={type}
              >
                <span>{mediaTypeLabels[type]}</span>
                <input checked={selected} type="checkbox" onChange={() => onToggleMediaType(type)} />
              </label>
            );
          })}
        </div>
      </fieldset>

      <Button disabled={isGenerating} type="button" onClick={onGenerate}>
        <Moon aria-hidden="true" className="mr-2 h-4 w-4" />
        {isGenerating ? "Generating..." : "Generate Tonight Plan"}
      </Button>
    </section>
  );
}

function TimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const presets = [
    { label: "30m", value: "30" },
    { label: "45m", value: "45" },
    { label: "90m", value: "90" },
    { label: "2h", value: "120" },
  ];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium" htmlFor="available-minutes">
          Available time (minutes)
        </label>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock3 aria-hidden="true" className="h-4 w-4" />
          {value.trim() ? `${value} min` : "Not set"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            className={cn(
              "border px-3 py-1.5 text-sm transition",
              value === preset.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
        <input
          className={cn(fieldClassName, "w-28")}
          id="available-minutes"
          min={1}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  labels,
  options,
  value,
  onChange,
}: {
  label: string;
  labels: Record<T, string>;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select className={fieldClassName} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
      </select>
    </label>
  );
}

function TonightLandingState() {
  return (
    <section aria-label="Tonight plan" className="border-l border-border pl-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Plan output</p>
      <h2 className="mt-3 text-2xl font-semibold">No plan generated yet</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Generate a plan to rank active queue items and planned library titles against the time, energy, focus, and risk you have now.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <OutputHint icon={<Gauge aria-hidden="true" className="h-5 w-5" />} label="Fit score" />
        <OutputHint icon={<Clock3 aria-hidden="true" className="h-5 w-5" />} label="Time match" />
        <OutputHint icon={<Sparkles aria-hidden="true" className="h-5 w-5" />} label="Freshness" />
      </div>
    </section>
  );
}

function OutputHint({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="border-t border-border pt-3">
      <div className="text-primary">{icon}</div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
    </div>
  );
}

function RecommendationRow({
  index,
  recommendation,
  onAddToQueue,
  onDelay,
  onStart,
}: {
  index: number;
  recommendation: TonightModeRecommendation;
  onAddToQueue: (recommendation: TonightModeRecommendation) => void | Promise<void>;
  onDelay: (recommendation: TonightModeRecommendation) => void | Promise<void>;
  onStart: (recommendation: TonightModeRecommendation) => void | Promise<void>;
}) {
  return (
    <article className="grid gap-4 py-5 lg:grid-cols-[2.25rem_minmax(0,1fr)_auto]">
      <div className="text-2xl font-semibold tabular-nums text-muted-foreground">{index + 1}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {recommendationSlotLabels[recommendation.slot]}
            </p>
            <h3 className="mt-1 truncate text-xl font-semibold">{recommendation.title}</h3>
          </div>
          <StatusPill label={`${Math.round(recommendation.score)} fit`} tone="success" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <MediaTypeBadge type={recommendation.mediaType} label={mediaTypeLabels[recommendation.mediaType]} />
          <StatusPill
            label={recommendation.estimatedTimeMinutes ? `${recommendation.estimatedTimeMinutes} min` : "Flexible time"}
            tone="neutral"
          />
          <StatusPill label={`${recommendation.moodCompatibility}% mood`} tone="active" />
          <StatusPill label={`${recommendation.commitmentLevel}/10 commitment`} tone={recommendation.commitmentLevel >= 8 ? "warning" : "neutral"} />
          <StatusPill label={`${Math.round(recommendation.freshnessScore)}% fresh`} tone={recommendation.freshnessScore < 40 ? "warning" : "success"} />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{recommendation.reason}</p>
      </div>
      <div className="flex flex-wrap content-start gap-2 lg:justify-end">
        <Button className="gap-2" size="sm" type="button" onClick={() => void onStart(recommendation)}>
          <Play aria-hidden="true" className="h-4 w-4" />
          Start This
        </Button>
        <Button className="gap-2" size="sm" type="button" variant="secondary" onClick={() => void onDelay(recommendation)}>
          <ThumbsDown aria-hidden="true" className="h-4 w-4" />
          Not Tonight
        </Button>
        <Button className="gap-2" size="sm" type="button" variant="ghost" onClick={() => void onAddToQueue(recommendation)}>
          <ListPlus aria-hidden="true" className="h-4 w-4" />
          Add To Queue
        </Button>
      </div>
    </article>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">{message}</div>;
}

const fieldClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);

function isTonightModeResponse(result: Record<string, unknown>): result is TonightModeResponse {
  return Array.isArray(result.recommendations) && typeof result.session === "object" && result.session !== null;
}
