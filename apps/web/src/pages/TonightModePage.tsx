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
import { ListPlus, Moon, Play, ThumbsDown } from "lucide-react";
import { useEffect, useState } from "react";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>Tonight Mode</PageTitle>
        <PageSubtitle>
          Run a quick mood, time, energy, and risk check-in to choose what actually fits tonight.
        </PageSubtitle>
      </section>

      <SectionCard title="Tonight Mode check-in">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium">
            Available time (minutes)
            <input
              className={fieldClassName}
              min={1}
              type="number"
              value={draft.availableMinutes}
              onChange={(event) => updateDraft("availableMinutes", event.target.value)}
            />
          </label>
          <SelectField
            label="Energy level"
            options={ENERGY_LEVELS}
            value={draft.energyLevel}
            labels={energyLevelLabels}
            onChange={(value) => updateDraft("energyLevel", value)}
          />
          <SelectField
            label="Focus level"
            options={FOCUS_LEVELS}
            value={draft.focusLevel}
            labels={focusLevelLabels}
            onChange={(value) => updateDraft("focusLevel", value)}
          />
          <SelectField
            label="Desired effect"
            options={DESIRED_EFFECTS}
            value={draft.desiredEffect}
            labels={desiredEffectLabels}
            onChange={(value) => updateDraft("desiredEffect", value)}
          />
          <SelectField
            label="Risk tolerance"
            options={RISK_TOLERANCES}
            value={draft.riskTolerance}
            labels={riskToleranceLabels}
            onChange={(value) => updateDraft("riskTolerance", value)}
          />
        </div>

        <fieldset className="mt-5 grid gap-3">
          <legend className="text-sm font-semibold">Preferred media types</legend>
          <div className="flex flex-wrap gap-2">
            {MEDIA_TYPES.map((type) => (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                key={type}
              >
                <input
                  checked={draft.preferredMediaTypes.includes(type)}
                  type="checkbox"
                  onChange={() => toggleMediaType(type)}
                />
                {mediaTypeLabels[type]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button className="gap-2" disabled={isGenerating} type="button" onClick={() => void generatePlan()}>
            <Moon aria-hidden="true" className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Tonight Plan"}
          </Button>
          <p className="text-sm text-muted-foreground">Default risk and media types come from Settings. Unsafe calls use the browser CSRF cookie and session.</p>
        </div>
      </SectionCard>

      {isGenerating ? <LoadingState title="Generating Tonight Mode plan" message="Ranking queue and planned media against your current context." /> : null}
      {error ? <ErrorState title="Tonight Mode failed" message={error} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

      {plan && recommendations.length === 0 ? (
        <EmptyState
          title="No Tonight Mode recommendations yet"
          message="Add queue items or planned media that fit the time window, then generate another plan."
        />
      ) : null}

      {recommendations.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-3" aria-label="Tonight recommendations">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={`${recommendation.slot}-${recommendation.title}-${recommendation.queueItemId ?? recommendation.mediaItemId}`}
              recommendation={recommendation}
              onAddToQueue={addRecommendationToQueue}
              onDelay={delayRecommendation}
              onStart={startRecommendation}
            />
          ))}
        </section>
      ) : null}
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

function RecommendationCard({
  recommendation,
  onAddToQueue,
  onDelay,
  onStart,
}: {
  recommendation: TonightModeRecommendation;
  onAddToQueue: (recommendation: TonightModeRecommendation) => void | Promise<void>;
  onDelay: (recommendation: TonightModeRecommendation) => void | Promise<void>;
  onStart: (recommendation: TonightModeRecommendation) => void | Promise<void>;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {recommendationSlotLabels[recommendation.slot]}
          </p>
          <h2 className="mt-2 text-lg font-semibold">{recommendation.title}</h2>
        </div>
        <StatusPill label={`${Math.round(recommendation.score)} fit`} tone="success" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <MediaTypeBadge type={recommendation.mediaType} label={mediaTypeLabels[recommendation.mediaType]} />
        <StatusPill
          label={recommendation.estimatedTimeMinutes ? `${recommendation.estimatedTimeMinutes} min` : "Flexible time"}
          tone="neutral"
        />
        <StatusPill label={`${recommendation.moodCompatibility}% mood fit`} tone="active" />
        <StatusPill label={`${recommendation.commitmentLevel}/10 commitment`} tone={recommendation.commitmentLevel >= 8 ? "warning" : "neutral"} />
        <StatusPill label={`${Math.round(recommendation.freshnessScore)}% fresh`} tone={recommendation.freshnessScore < 40 ? "warning" : "success"} />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{recommendation.reason}</p>
      <div className="mt-5 flex flex-wrap gap-2">
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
