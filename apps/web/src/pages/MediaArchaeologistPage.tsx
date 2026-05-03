import type {
  DiscoveryEra,
  DiscoveryGenerateResponse,
  DiscoveryMode,
  DiscoveryResult,
  DiscoverySearchRequest,
  DiscoveryTrail,
  MediaType,
  QueuePriority,
} from "@canonos/contracts";
import { DISCOVERY_ERAS, DISCOVERY_MODES, MEDIA_TYPES } from "@canonos/contracts";
import { Compass, ListPlus, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge, type ScoreTone } from "@/components/data-display/ScoreBadge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import {
  deleteDiscoveryTrail,
  generateDiscoveryTrail,
  saveDiscoveryTrail,
  useDiscoveryTrails,
} from "@/features/discovery/discoveryApi";
import { discoveryEraLabels, discoveryModeLabels } from "@/features/discovery/discoveryLabels";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { createQueueItem } from "@/features/queue/queueApi";
import { cn } from "@/lib/utils";

const fieldClassName =
  "rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

type DiscoveryDraft = {
  mode: DiscoveryMode;
  theme: string;
  mood: string;
  era: DiscoveryEra;
  countryLanguage: string;
  mediaType: MediaType | "";
  creator: string;
  narrativePattern: string;
  favoriteWork: string;
};

const emptyDraft: DiscoveryDraft = {
  mode: "deep_cut",
  theme: "",
  mood: "",
  era: "",
  countryLanguage: "",
  mediaType: "",
  creator: "",
  narrativePattern: "",
  favoriteWork: "",
};

export function MediaArchaeologistPage() {
  const { data, error, isLoading, mutate } = useDiscoveryTrails();
  const savedTrails = useMemo(() => data?.results ?? [], [data]);
  const [draft, setDraft] = useState<DiscoveryDraft>(emptyDraft);
  const [generated, setGenerated] = useState<DiscoveryGenerateResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [queueTargetId, setQueueTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function updateDraft<Field extends keyof DiscoveryDraft>(field: Field, value: DiscoveryDraft[Field]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function runGeneration() {
    setIsGenerating(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const response = await generateDiscoveryTrail(buildSearchRequest(draft));
      setGenerated(response);
      setActionMessage("Discovery trail generated.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not generate discovery trail.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveGeneratedTrail() {
    if (!generated) return;
    setIsSaving(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await saveDiscoveryTrail(generated.draft);
      await mutate();
      setActionMessage("Discovery trail saved.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not save discovery trail.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addResultToQueue(result: DiscoveryResult) {
    setQueueTargetId(result.id);
    setActionError(null);
    setActionMessage(null);
    try {
      await createQueueItem({
        title: result.title,
        mediaType: result.mediaType,
        priority: queuePriorityForResult(result),
        reason: result.suggestedAction,
        estimatedTimeMinutes: result.estimatedTimeMinutes,
        bestMood: draft.mood.trim() || "Curious discovery mood",
        moodCompatibility: clamp(result.confidenceScore, 45, 95),
        freshnessScore: clamp(result.discoveryScore + 10, 0, 100),
      });
      setActionMessage(`Added “${result.title}” to the queue.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not add result to queue.");
    } finally {
      setQueueTargetId(null);
    }
  }

  async function removeTrail(trail: DiscoveryTrail) {
    setDeleteTargetId(trail.id);
    setActionError(null);
    setActionMessage(null);
    try {
      await deleteDiscoveryTrail(trail.id);
      await mutate();
      setActionMessage(`Removed “${trail.name}”.`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not remove saved trail.");
    } finally {
      setDeleteTargetId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageTitle>Media Archaeologist</PageTitle>
        <PageSubtitle>
          Build explainable deep-cut trails from underexplored media, eras, countries, creators, and themes.
        </PageSubtitle>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <SectionCard title="Discovery request" className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Compass aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Discovery request</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Start broad or provide anchors. The archaeologist favors underexplored, non-obvious paths.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Discovery mode
              <select
                aria-label="Discovery mode"
                className={fieldClassName}
                value={draft.mode}
                onChange={(event) => updateDraft("mode", event.target.value as DiscoveryMode)}
              >
                {DISCOVERY_MODES.map((mode) => (
                  <option key={mode} value={mode}>{discoveryModeLabels[mode]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Preferred medium
              <select
                aria-label="Preferred medium"
                className={fieldClassName}
                value={draft.mediaType}
                onChange={(event) => updateDraft("mediaType", event.target.value as MediaType | "")}
              >
                <option value="">Any medium</option>
                {MEDIA_TYPES.map((mediaType) => (
                  <option key={mediaType} value={mediaType}>{mediaTypeLabels[mediaType]}</option>
                ))}
              </select>
            </label>
            <TextField
              label="Theme"
              placeholder="identity, memory, exile, spiritual dread"
              value={draft.theme}
              onChange={(value) => updateDraft("theme", value)}
            />
            <TextField
              label="Mood"
              placeholder="patient, strange, reflective"
              value={draft.mood}
              onChange={(value) => updateDraft("mood", value)}
            />
            <label className="grid gap-1 text-sm font-medium">
              Era
              <select
                aria-label="Era"
                className={fieldClassName}
                value={draft.era}
                onChange={(event) => updateDraft("era", event.target.value as DiscoveryEra)}
              >
                {DISCOVERY_ERAS.map((era) => (
                  <option key={era || "any"} value={era}>{discoveryEraLabels[era]}</option>
                ))}
              </select>
            </label>
            <TextField
              label="Country or language"
              placeholder="Czech, Japanese, Persian, Polish"
              value={draft.countryLanguage}
              onChange={(value) => updateDraft("countryLanguage", value)}
            />
            <TextField
              label="Creator"
              placeholder="Kōbō Abe, Tarkovsky, Satoshi Kon"
              value={draft.creator}
              onChange={(value) => updateDraft("creator", value)}
            />
            <TextField
              label="Favorite work"
              placeholder="Stalker, Perfect Blue, Solaris"
              value={draft.favoriteWork}
              onChange={(value) => updateDraft("favoriteWork", value)}
            />
            <label className="grid gap-1 text-sm font-medium md:col-span-2">
              Narrative pattern
              <textarea
                aria-label="Narrative pattern"
                className={cn(fieldClassName, "min-h-24 resize-y")}
                placeholder="labyrinth stories, unreliable identity, slow metaphysical investigation"
                value={draft.narrativePattern}
                onChange={(event) => updateDraft("narrativePattern", event.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              disabled={isGenerating}
              type="button"
              onClick={() => void runGeneration()}
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Discovery Trail"}
            </Button>
            <Button
              className="gap-2"
              disabled={!generated || isSaving}
              type="button"
              variant="secondary"
              onClick={() => void saveGeneratedTrail()}
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Trail"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Archaeologist signal map" className="space-y-4">
          <h2 className="text-lg font-semibold">Archaeologist signal map</h2>
          {generated ? (
            <DiscoveryAnalysisCard response={generated} />
          ) : (
            <EmptyState
              title="No trail generated yet"
              message="Generate a trail to see underexplored mediums, eras, and country/language gaps."
            />
          )}
        </SectionCard>
      </div>

      {actionError ? <ErrorState title="Discovery action failed" message={actionError} /> : null}
      {actionMessage ? <SuccessMessage message={actionMessage} /> : null}

      {isGenerating ? <LoadingState title="Generating discovery trail" message="Scoring deep cuts and expansion risks." /> : null}

      {generated ? (
        <GeneratedTrailSection
          generated={generated}
          queueTargetId={queueTargetId}
          onAddToQueue={(result) => void addResultToQueue(result)}
        />
      ) : null}

      <SectionCard title="Saved discovery trails" className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Saved discovery trails</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Keep repeatable maps for future exploration sessions.
          </p>
        </div>
        {isLoading ? <LoadingState title="Loading saved trails" message="Fetching your discovery maps." /> : null}
        {error ? <ErrorState title="Saved trails unavailable" message={error.message} onRetry={() => void mutate()} /> : null}
        {!isLoading && !error && savedTrails.length === 0 ? (
          <EmptyState
            title="No saved discovery trails"
            message="Generate and save a trail when it finds a path worth revisiting."
          />
        ) : null}
        {!isLoading && !error && savedTrails.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {savedTrails.map((trail) => (
              <SavedTrailCard
                key={trail.id}
                trail={trail}
                isDeleting={deleteTargetId === trail.id}
                onDelete={() => void removeTrail(trail)}
              />
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        aria-label={label}
        className={fieldClassName}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function DiscoveryAnalysisCard({ response }: { response: DiscoveryGenerateResponse }) {
  const { analysis, search } = response;
  return (
    <div className="space-y-4 text-sm">
      <SignalGroup
        label="Underexplored mediums"
        values={analysis.underexploredMediaTypes.map((type) => mediaTypeLabels[type])}
      />
      <SignalGroup
        label="Underexplored eras"
        values={analysis.underexploredEras.map((era) => discoveryEraLabels[era])}
      />
      <SignalGroup label="Underexplored country/language" values={analysis.underexploredCountryLanguages} />
      <SignalGroup
        label="Strongest current mediums"
        values={analysis.strongestMediaTypes.map((type) => mediaTypeLabels[type])}
      />
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <h3 className="font-semibold">Search frame</h3>
        <p className="mt-2 leading-6 text-muted-foreground">
          {discoveryModeLabels[search.mode]} trail
          {search.theme ? ` for “${search.theme}”` : ""}
          {search.mediaType ? ` in ${mediaTypeLabels[search.mediaType]}` : " across media"}.
        </p>
      </div>
    </div>
  );
}

function SignalGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{label}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length ? values.map((value) => <SignalPill key={value}>{value}</SignalPill>) : <SignalPill>None yet</SignalPill>}
      </div>
    </div>
  );
}

function SignalPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function GeneratedTrailSection({
  generated,
  queueTargetId,
  onAddToQueue,
}: {
  generated: DiscoveryGenerateResponse;
  queueTargetId: string | null;
  onAddToQueue: (result: DiscoveryResult) => void;
}) {
  return (
    <SectionCard title="Generated discovery trail" className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{generated.draft.name}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{generated.draft.description}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {generated.results.map((result) => (
          <DiscoveryResultCard
            key={result.id}
            result={result}
            isQueueSaving={queueTargetId === result.id}
            onAddToQueue={() => onAddToQueue(result)}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function DiscoveryResultCard({
  result,
  isQueueSaving,
  onAddToQueue,
}: {
  result: DiscoveryResult;
  isQueueSaving: boolean;
  onAddToQueue: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{result.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {[result.creator, result.releaseYear, result.countryLanguage].filter(Boolean).join(" · ")}
          </p>
        </div>
        <MediaTypeBadge type={result.mediaType} label={mediaTypeLabels[result.mediaType]} />
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">{result.premise}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <ScoreBadge score={result.discoveryScore} label="discovery" tone={toneForScore(result.discoveryScore)} />
        <ScoreBadge score={result.obscurityScore} label="obscurity" tone="promising" />
        <ScoreBadge score={result.confidenceScore} label="confidence" tone={toneForScore(result.confidenceScore)} />
      </div>

      <ReasonList title="Why this expands your taste" reasons={result.reasons.filter((reason) => reason.kind !== "risk")} />
      <ReasonList title="Why it may fail" reasons={result.reasons.filter((reason) => reason.kind === "risk")} />

      <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6">
        <h4 className="font-semibold">Suggested action</h4>
        <p className="mt-1 text-muted-foreground">{result.suggestedAction}</p>
      </div>

      <Button
        className="mt-4 w-full gap-2"
        disabled={isQueueSaving}
        type="button"
        variant="secondary"
        onClick={onAddToQueue}
      >
        <ListPlus aria-hidden="true" className="h-4 w-4" />
        {isQueueSaving ? "Adding..." : "Add To Queue"}
      </Button>
    </article>
  );
}

function ReasonList({ title, reasons }: { title: string; reasons: DiscoveryResult["reasons"] }) {
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      {reasons.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
          {reasons.map((reason) => (
            <li key={`${reason.kind}-${reason.label}`}>{reason.detail}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No major risks detected.</p>
      )}
    </div>
  );
}

function SavedTrailCard({
  trail,
  isDeleting,
  onDelete,
}: {
  trail: DiscoveryTrail;
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{trail.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{trail.description}</p>
        </div>
        <Button
          aria-label={`Delete ${trail.name}`}
          disabled={isDeleting}
          type="button"
          variant="ghost"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {trail.resultItems.slice(0, 3).map((result) => (
          <MediaTypeBadge key={result.id} type={result.mediaType} label={result.title} />
        ))}
      </div>
    </article>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-promising/30 bg-promising/10 p-4 text-sm font-medium text-promising" role="status">
      {message}
    </div>
  );
}

function buildSearchRequest(draft: DiscoveryDraft): DiscoverySearchRequest {
  return {
    mode: draft.mode,
    theme: emptyToUndefined(draft.theme),
    mood: emptyToUndefined(draft.mood),
    era: draft.era,
    countryLanguage: emptyToUndefined(draft.countryLanguage),
    mediaType: draft.mediaType,
    creator: emptyToUndefined(draft.creator),
    narrativePattern: emptyToUndefined(draft.narrativePattern),
    favoriteWork: emptyToUndefined(draft.favoriteWork),
    sourceMediaItemId: null,
  };
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function queuePriorityForResult(result: DiscoveryResult): QueuePriority {
  return result.discoveryScore >= 78 ? "sample_first" : "later";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toneForScore(score: number): ScoreTone {
  if (score >= 80) return "excellent";
  if (score >= 60) return "promising";
  if (score >= 40) return "risky";
  return "avoid";
}
