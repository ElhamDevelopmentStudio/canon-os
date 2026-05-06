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
import { ChevronDown, Compass, History, ListPlus, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge, type ScoreTone } from "@/components/data-display/ScoreBadge";
import { DialogShell } from "@/components/feedback/DialogShell";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
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
  "rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary";

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
  const [isSavedTrailsOpen, setIsSavedTrailsOpen] = useState(false);

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
    <div className="flex flex-col gap-5">
      <section className="grid gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Discovery desk</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Media Archaeologist</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Generate deep-cut trails from a few useful anchors, then save or queue the results worth testing.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setIsSavedTrailsOpen(true)}>
            <History aria-hidden="true" className="mr-2 h-4 w-4" />
            Saved Trails{data?.count ? ` (${data.count})` : ""}
          </Button>
        </div>
        <DiscoverySignalStrip response={generated} savedCount={data?.count ?? 0} />
      </section>

      <div className="grid min-h-[34rem] gap-6 xl:grid-cols-[minmax(28rem,0.85fr)_minmax(34rem,1.15fr)]">
        <DiscoveryRequestPanel
          draft={draft}
          generated={generated}
          isGenerating={isGenerating}
          isSaving={isSaving}
          onChange={updateDraft}
          onGenerate={() => void runGeneration()}
          onSave={() => void saveGeneratedTrail()}
        />

        <div className="flex flex-col gap-5">
          {actionError ? <ErrorState title="Discovery action failed" message={actionError} /> : null}
          {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
          {isGenerating ? <LoadingState title="Generating discovery trail" message="Scoring deep cuts and expansion risks." /> : null}
          {generated ? (
            <GeneratedTrailSection
              generated={generated}
              queueTargetId={queueTargetId}
              onAddToQueue={(result) => void addResultToQueue(result)}
            />
          ) : (
            <EmptyState
              title="No trail generated yet"
              message="Choose a mode and a few anchors, then generate a trail."
            />
          )}
        </div>
      </div>

      {isSavedTrailsOpen ? (
        <SavedTrailsDialog
          error={error}
          isLoading={isLoading}
          savedTrails={savedTrails}
          deleteTargetId={deleteTargetId}
          onClose={() => setIsSavedTrailsOpen(false)}
          onDelete={removeTrail}
          onRetry={() => void mutate()}
        />
      ) : null}
    </div>
  );
}

function DiscoverySignalStrip({
  response,
  savedCount,
}: {
  response: DiscoveryGenerateResponse | null;
  savedCount: number;
}) {
  const analysis = response?.analysis;
  return (
    <section aria-label="Discovery signals" className="grid gap-2 md:grid-cols-4">
      <SignalStat label="Trail" value={response ? response.draft.name : "Not generated"} />
      <SignalStat
        label="Underused mediums"
        value={analysis?.underexploredMediaTypes.length ? analysis.underexploredMediaTypes.map((type) => mediaTypeLabels[type]).join(", ") : "Pending"}
      />
      <SignalStat
        label="Country/language gap"
        value={analysis?.underexploredCountryLanguages.length ? analysis.underexploredCountryLanguages.slice(0, 2).join(", ") : "Pending"}
      />
      <SignalStat label="Saved trails" value={String(savedCount)} />
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

function DiscoveryRequestPanel({
  draft,
  generated,
  isGenerating,
  isSaving,
  onChange,
  onGenerate,
  onSave,
}: {
  draft: DiscoveryDraft;
  generated: DiscoveryGenerateResponse | null;
  isGenerating: boolean;
  isSaving: boolean;
  onChange: <Field extends keyof DiscoveryDraft>(field: Field, value: DiscoveryDraft[Field]) => void;
  onGenerate: () => void;
  onSave: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterSummary = [
    draft.era ? discoveryEraLabels[draft.era] : null,
    draft.countryLanguage.trim() || null,
    draft.creator.trim() || null,
    draft.favoriteWork.trim() || null,
  ].filter(Boolean);

  return (
    <section aria-label="Discovery request" className="grid content-start gap-4 border-r border-border pr-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Compass aria-hidden="true" className="h-5 w-5 text-primary" />
            Build trail
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Deep-cut generator
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Start broad. Add hard constraints only when they actually sharpen the search.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            Discovery mode
            <select
              aria-label="Discovery mode"
              className={fieldClassName}
              value={draft.mode}
              onChange={(event) => onChange("mode", event.target.value as DiscoveryMode)}
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
              onChange={(event) => onChange("mediaType", event.target.value as MediaType | "")}
            >
              <option value="">Any medium</option>
              {MEDIA_TYPES.map((mediaType) => (
                <option key={mediaType} value={mediaType}>{mediaTypeLabels[mediaType]}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label="Theme"
            placeholder="identity, memory, exile"
            value={draft.theme}
            onChange={(value) => onChange("theme", value)}
          />
          <TextField
            label="Mood"
            placeholder="patient, strange, reflective"
            value={draft.mood}
            onChange={(value) => onChange("mood", value)}
          />
        </div>
      </div>

      <div className="border-y border-border py-3">
        <button
          aria-expanded={filtersOpen}
          className="flex w-full items-center justify-between gap-4 text-left"
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
        >
          <span>
            <span className="block text-sm font-semibold">Narrow the trail</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {filterSummary.length ? filterSummary.join(" · ") : "Era, region, creator, favorite work, and pattern."}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("h-5 w-5 text-muted-foreground transition", filtersOpen ? "rotate-180" : "")}
          />
        </button>

        {filtersOpen ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Era
                <select
                  aria-label="Era"
                  className={fieldClassName}
                  value={draft.era}
                  onChange={(event) => onChange("era", event.target.value as DiscoveryEra)}
                >
                  {DISCOVERY_ERAS.map((era) => (
                    <option key={era || "any"} value={era}>{discoveryEraLabels[era]}</option>
                  ))}
                </select>
              </label>
              <TextField
                label="Country or language"
                placeholder="Czech, Japanese, Persian"
                value={draft.countryLanguage}
                onChange={(value) => onChange("countryLanguage", value)}
              />
              <TextField
                label="Creator"
                placeholder="Kobo Abe, Tarkovsky"
                value={draft.creator}
                onChange={(value) => onChange("creator", value)}
              />
              <TextField
                label="Favorite work"
                placeholder="Stalker, Perfect Blue"
                value={draft.favoriteWork}
                onChange={(value) => onChange("favoriteWork", value)}
              />
            </div>
            <label className="grid gap-1 text-sm font-medium">
              Narrative pattern
              <textarea
                aria-label="Narrative pattern"
                className={cn(fieldClassName, "min-h-24 resize-y")}
                placeholder="labyrinth stories, unreliable identity, slow metaphysical investigation"
                value={draft.narrativePattern}
                onChange={(event) => onChange("narrativePattern", event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          className="gap-2"
          disabled={isGenerating}
          type="button"
          onClick={onGenerate}
        >
          <Search aria-hidden="true" className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Discovery Trail"}
        </Button>
        <Button
          className="gap-2"
          disabled={!generated || isSaving}
          type="button"
          variant="secondary"
          onClick={onSave}
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save Trail"}
        </Button>
      </div>
    </section>
  );
}

function SavedTrailsDialog({
  deleteTargetId,
  error,
  isLoading,
  savedTrails,
  onClose,
  onDelete,
  onRetry,
}: {
  deleteTargetId: string | null;
  error: Error | undefined;
  isLoading: boolean;
  savedTrails: DiscoveryTrail[];
  onClose: () => void;
  onDelete: (trail: DiscoveryTrail) => void;
  onRetry: () => void;
}) {
  return (
    <DialogShell labelledBy="saved-discovery-trails-title" onClose={onClose} panelClassName="max-w-5xl p-0">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reusable maps</p>
            <h2 className="mt-2 text-2xl font-semibold" id="saved-discovery-trails-title">Saved discovery trails</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep repeatable maps for future exploration sessions.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-5">
        {isLoading ? <LoadingState title="Loading saved trails" message="Fetching your discovery maps." /> : null}
        {error ? <ErrorState title="Saved trails unavailable" message={error.message} onRetry={onRetry} /> : null}
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
                onDelete={() => onDelete(trail)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </DialogShell>
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
    <section aria-label="Generated discovery trail" className="grid gap-4">
      <div className="border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Generated discovery trail</p>
        <h2 className="text-lg font-semibold">{generated.draft.name}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{generated.draft.description}</p>
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        {generated.results.map((result) => (
          <DiscoveryResultCard
            key={result.id}
            result={result}
            isQueueSaving={queueTargetId === result.id}
            onAddToQueue={() => onAddToQueue(result)}
          />
        ))}
      </div>
    </section>
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
