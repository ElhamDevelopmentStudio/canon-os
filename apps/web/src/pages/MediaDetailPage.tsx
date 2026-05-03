import type { NarrativeAnalysisResult, NarrativeTrait, TasteDimension } from "@canonos/contracts";
import { ArrowLeft, Dna, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { MediaTypeBadge } from "@/components/data-display/MediaTypeBadge";
import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill, type StatusTone } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { PageActionBar } from "@/components/layout/PageActionBar";
import { PageTabs } from "@/components/layout/PageTabs";
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { appetiteEffectLabels, booleanLabel } from "@/features/aftertaste/aftertasteLabels";
import { DimensionScoreGrid } from "@/features/media/DimensionScoreGrid";
import {
  findScoreValidationError,
  scoreDraftsFromScores,
  scoreDraftsToRequest,
  type ScoreDraft,
} from "@/features/media/scoreDrafts";
import { deleteMediaItem, useMediaItem } from "@/features/media/mediaApi";
import { refreshMetadata } from "@/features/metadata/metadataApi";
import { externalProviderLabels } from "@/features/metadata/metadataLabels";
import { MediaFormModal } from "@/features/media/MediaFormModal";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";
import { requestNarrativeAnalysis, useNarrativeAnalysis } from "@/features/narrative/narrativeApi";
import {
  narrativeSourceBasisLabels,
  narrativeStatusLabels,
  narrativeStatusTone,
  narrativeTraitLabels,
} from "@/features/narrative/narrativeLabels";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { ApiError } from "@/lib/errors";

type ScoreDraftMap = Record<string, ScoreDraft>;

const statusTone: Record<string, StatusTone> = {
  planned: "neutral",
  consuming: "active",
  completed: "success",
  paused: "warning",
  dropped: "danger",
};

export function MediaDetailPage() {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const { data, error, isLoading, mutate } = useMediaItem(mediaId);
  const {
    data: narrativeAnalysis,
    error: narrativeError,
    isLoading: isLoadingNarrative,
    mutate: mutateNarrativeAnalysis,
  } = useNarrativeAnalysis(mediaId);
  const {
    data: dimensions,
    error: dimensionsError,
    isLoading: isLoadingDimensions,
  } = useTasteDimensions(Boolean(data));
  const [activeAnalysisTab, setActiveAnalysisTab] = useState("taste-scorecard");
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDraftMap>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [narrativeNotes, setNarrativeNotes] = useState("");
  const [isRequestingNarrative, setIsRequestingNarrative] = useState(false);
  const [narrativeRequestError, setNarrativeRequestError] = useState<string | null>(null);
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  useEffect(() => {
    setScoreDrafts(scoreDraftsFromScores(data?.scores));
  }, [data?.id, data?.scores]);

  async function handleDelete() {
    if (!data) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMediaItem(data.id);
      navigate(APP_ROUTES.library, { replace: true });
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete media item.");
    } finally {
      setIsDeleting(false);
    }
  }


  async function handleRefreshMetadata() {
    if (!data) return;
    setIsRefreshingMetadata(true);
    setMetadataError(null);
    try {
      await refreshMetadata(data.id);
      await mutate();
    } catch (caught) {
      setMetadataError(caught instanceof Error ? caught.message : "Could not refresh metadata.");
    } finally {
      setIsRefreshingMetadata(false);
    }
  }

  async function handleSaveScores() {
    if (!data || !dimensions) return;
    const validationError = findScoreValidationError(dimensions, scoreDrafts);
    if (validationError) {
      setScoreError(validationError);
      return;
    }

    setIsSavingScores(true);
    setScoreError(null);
    try {
      await upsertMediaScores(data.id, { scores: scoreDraftsToRequest(dimensions, scoreDrafts) });
      await mutate();
    } catch (caught) {
      setScoreError(caught instanceof Error ? caught.message : "Could not save scores.");
    } finally {
      setIsSavingScores(false);
    }
  }

  async function handleRequestNarrativeAnalysis(forceRefresh = false) {
    if (!data) return;
    setIsRequestingNarrative(true);
    setNarrativeRequestError(null);
    try {
      await requestNarrativeAnalysis(data.id, {
        manualNotes: narrativeNotes || data.notes,
        forceRefresh,
        provider: "local_heuristic",
      });
      await mutateNarrativeAnalysis();
    } catch (caught) {
      setNarrativeRequestError(
        caught instanceof Error ? caught.message : "Could not request Narrative DNA analysis.",
      );
    } finally {
      setIsRequestingNarrative(false);
    }
  }

  if (isLoading) {
    return <LoadingState title="Loading media detail" message="Fetching this library item." />;
  }
  if (error) {
    return <ErrorState title="Media item unavailable" message={error.message} onRetry={() => void mutate()} />;
  }
  if (!data) {
    return <EmptyState title="Media item not found" message="This item may have been deleted or is unavailable." />;
  }
  const hasNoNarrativeAnalysis = narrativeError instanceof ApiError && narrativeError.status === 404;
  const visibleNarrativeError = hasNoNarrativeAnalysis ? undefined : narrativeError;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          to={APP_ROUTES.library}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to Library
        </Link>
        <PageActionBar className="mt-4 justify-between">
          <div>
            <PageTitle>{data.title}</PageTitle>
            <PageSubtitle>
              {data.creator || "Creator unknown"}
              {data.releaseYear ? ` · ${data.releaseYear}` : ""}
            </PageSubtitle>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2" type="button" variant="secondary" onClick={() => setIsEditOpen(true)}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Button>
            <Button
              className="gap-2"
              disabled={isDeleting}
              type="button"
              variant="ghost"
              onClick={() => void handleDelete()}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </PageActionBar>
      </section>

      {deleteError ? <ErrorState title="Delete failed" message={deleteError} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Type">
          <p className="text-sm text-muted-foreground">Media type</p>
          <div className="mt-3">
            <MediaTypeBadge type={data.mediaType} label={mediaTypeLabels[data.mediaType]} />
          </div>
        </SectionCard>
        <SectionCard title="Status">
          <p className="text-sm text-muted-foreground">Consumption status</p>
          <div className="mt-3">
            <StatusPill label={statusLabels[data.status]} tone={statusTone[data.status]} />
          </div>
        </SectionCard>
        <SectionCard title="Rating">
          <p className="text-sm text-muted-foreground">Personal rating</p>
          <div className="mt-3">
            <ScoreBadge
              score={data.personalRating ?? undefined}
              tone={data.personalRating && data.personalRating >= 8 ? "excellent" : "unknown"}
            />
          </div>
        </SectionCard>
      </section>

      <PageTabs
        activeTab={activeAnalysisTab}
        tabs={[
          {
            id: "taste-scorecard",
            label: "Taste scorecard",
            panel: (
              <TasteScorecardPanel
                dimensions={dimensions}
                dimensionsError={dimensionsError}
                isLoadingDimensions={isLoadingDimensions}
                isSavingScores={isSavingScores}
                scoreDrafts={scoreDrafts}
                scoreError={scoreError}
                onSaveScores={handleSaveScores}
                onScoreDraftChange={setScoreDrafts}
              />
            ),
          },
          {
            id: "narrative-dna",
            label: "Narrative DNA",
            panel: (
              <NarrativeDnaPanel
                analysis={narrativeAnalysis}
                error={visibleNarrativeError}
                isLoading={isLoadingNarrative && !hasNoNarrativeAnalysis}
                isRequesting={isRequestingNarrative}
                notes={narrativeNotes}
                requestError={narrativeRequestError}
                onNotesChange={setNarrativeNotes}
                onRequest={handleRequestNarrativeAnalysis}
              />
            ),
          },
        ]}
        onChange={setActiveAnalysisTab}
      />

      <SectionCard title="Aftertaste">
        {data.latestAftertaste ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Latest reflection</h2>
                <p className="text-sm text-muted-foreground">
                  Logged {new Date(data.latestAftertaste.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button asChild type="button" variant="secondary">
                <Link to={APP_ROUTES.aftertasteLog}>Open Aftertaste Log</Link>
              </Button>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Metadata label="Worth time" value={booleanLabel(data.latestAftertaste.worthTime)} />
              <Metadata label="Stayed with me" value={`${data.latestAftertaste.stayedWithMeScore}/10`} />
              <Metadata label="Felt generic" value={booleanLabel(data.latestAftertaste.feltGeneric)} />
              <Metadata label="Appetite effect" value={appetiteEffectLabels[data.latestAftertaste.appetiteEffect]} />
            </dl>
            <div className="rounded-2xl bg-muted/50 p-4">
              <h3 className="text-sm font-semibold">Final thoughts</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {data.latestAftertaste.finalThoughts || "No final thoughts recorded yet."}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            actionLabel="Log Aftertaste"
            message="When this work is finished, dropped, or paused, add a reflection so CanonOS remembers what actually stayed with you."
            title="No aftertaste recorded"
            onAction={() => navigate(APP_ROUTES.aftertasteLog)}
          />
        )}
      </SectionCard>

      <SectionCard title="External metadata">
        {metadataError ? <ErrorState title="Metadata refresh failed" message={metadataError} /> : null}
        {data.externalMetadata ? (
          <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
            {data.externalMetadata.imageUrl ? (
              <img
                alt={`Poster for ${data.title}`}
                className="h-60 w-40 rounded-2xl object-cover shadow-sm"
                src={data.externalMetadata.imageUrl}
              />
            ) : null}
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {externalProviderLabels[data.externalMetadata.provider]}
                  </p>
                  <h2 className="text-xl font-semibold">{data.externalMetadata.normalizedTitle}</h2>
                </div>
                <Button
                  className="gap-2"
                  disabled={isRefreshingMetadata}
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRefreshMetadata()}
                >
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />
                  {isRefreshingMetadata ? "Refreshing…" : "Refresh metadata"}
                </Button>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {data.externalMetadata.normalizedDescription || "No external description available."}
              </p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Metadata label="Provider item ID" value={data.externalMetadata.providerItemId} />
                <Metadata label="External rating" value={data.externalMetadata.externalRating?.toString()} />
                <Metadata label="Popularity" value={data.externalMetadata.externalPopularity?.toString()} />
                <Metadata label="Source" value={data.externalMetadata.sourceUrl} />
                <Metadata label="Last refreshed" value={new Date(data.externalMetadata.lastRefreshedAt).toLocaleString()} />
              </dl>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No external metadata attached"
            message="Use Edit, search metadata, and attach a provider result to enrich this item without changing your private scores or notes."
          />
        )}
      </SectionCard>

      <SectionCard title="Metadata">
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Metadata label="Original title" value={data.originalTitle} />
          <Metadata label="Country / language" value={data.countryLanguage} />
          <Metadata label="Started" value={data.startedDate} />
          <Metadata label="Completed" value={data.completedDate} />
          <Metadata label="Runtime minutes" value={data.runtimeMinutes?.toString()} />
          <Metadata label="Episodes" value={data.episodeCount?.toString()} />
          <Metadata label="Pages" value={data.pageCount?.toString()} />
          <Metadata label="Audiobook length minutes" value={data.audiobookLengthMinutes?.toString()} />
          <Metadata label="Updated" value={new Date(data.updatedAt).toLocaleString()} />
        </dl>
      </SectionCard>

      <SectionCard title="Notes">
        {data.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{data.notes}</p>
        ) : (
          <EmptyState
            title="No notes yet"
            message="Use Edit to add private context, reactions, or reminders."
          />
        )}
      </SectionCard>

      <MediaFormModal
        open={isEditOpen}
        media={data}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => void mutate()}
      />
    </div>
  );
}

function TasteScorecardPanel({
  dimensions,
  dimensionsError,
  isLoadingDimensions,
  isSavingScores,
  scoreDrafts,
  scoreError,
  onSaveScores,
  onScoreDraftChange,
}: {
  dimensions?: TasteDimension[];
  dimensionsError?: Error;
  isLoadingDimensions: boolean;
  isSavingScores: boolean;
  scoreDrafts: ScoreDraftMap;
  scoreError: string | null;
  onSaveScores: () => void;
  onScoreDraftChange: (drafts: ScoreDraftMap) => void;
}) {
  return (
    <SectionCard title="Taste scorecard">
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Scores explain why the work succeeded or failed beyond the overall rating.
        </p>
        {scoreError ? <ErrorState title="Score save failed" message={scoreError} /> : null}
        <DimensionScoreGrid
          dimensions={dimensions}
          drafts={scoreDrafts}
          error={dimensionsError}
          isLoading={isLoadingDimensions}
          onChange={onScoreDraftChange}
        />
        <div className="flex justify-end">
          <Button
            disabled={isSavingScores || !dimensions?.length}
            type="button"
            onClick={() => void onSaveScores()}
          >
            {isSavingScores ? "Saving scores…" : "Save scores"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function NarrativeDnaPanel({
  analysis,
  error,
  isLoading,
  isRequesting,
  notes,
  requestError,
  onNotesChange,
  onRequest,
}: {
  analysis?: NarrativeAnalysisResult | null;
  error?: Error;
  isLoading: boolean;
  isRequesting: boolean;
  notes: string;
  requestError: string | null;
  onNotesChange: (value: string) => void;
  onRequest: (forceRefresh?: boolean) => void;
}) {
  return (
    <SectionCard title="Narrative DNA">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Dna aria-hidden="true" className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Narrative DNA</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Analyze story structure from notes and metadata without storing full copyrighted
              source text.
            </p>
          </div>
          {analysis ? (
            <StatusPill
              label={narrativeStatusLabels[analysis.status]}
              tone={narrativeStatusTone[analysis.status]}
            />
          ) : null}
        </div>

        {isLoading ? (
          <LoadingState title="Loading Narrative DNA" message="Checking whether this item has an analysis." />
        ) : null}
        {error ? <ErrorState title="Narrative DNA unavailable" message={error.message} /> : null}
        {requestError ? <ErrorState title="Narrative analysis failed" message={requestError} /> : null}

        {!isLoading && !error && !analysis ? (
          <EmptyState
            title="No Narrative DNA yet"
            message="Request analysis after adding notes, a premise, or metadata. CanonOS will state the evidence basis and confidence."
          />
        ) : null}

        {analysis?.status === "queued" || analysis?.status === "running" ? (
          <LoadingState title="Narrative analysis running" message="CanonOS is generating trait scores." />
        ) : null}

        {analysis ? <NarrativeAnalysisSummary analysis={analysis} /> : null}

        <label className="grid gap-1.5 text-sm font-medium">
          Narrative analysis notes
          <textarea
            className="min-h-28 resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Optional notes about pacing, themes, character arcs, atmosphere, ending, or what felt fresh/generic."
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button disabled={isRequesting} type="button" onClick={() => void onRequest(Boolean(analysis))}>
            {isRequesting
              ? "Requesting…"
              : analysis
                ? "Refresh Narrative DNA"
                : "Request Narrative Analysis"}
          </Button>
          {analysis ? (
            <p className="self-center text-xs text-muted-foreground">
              Source: {narrativeSourceBasisLabels[analysis.sourceBasis]} · confidence{" "}
              {analysis.confidenceScore}/100
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function NarrativeAnalysisSummary({ analysis }: { analysis: NarrativeAnalysisResult }) {
  const traits = orderedNarrativeTraits(analysis);
  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Analysis summary</h3>
          <ScoreBadge label="confidence" score={analysis.confidenceScore} tone="promising" />
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{analysis.analysisSummary}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {traits.map((trait) => (
          <div className="rounded-2xl border border-border bg-background p-4" key={trait.key}>
            <p className="text-sm font-medium text-muted-foreground">{narrativeTraitLabels[trait.key]}</p>
            <div className="mt-2">
              <ScoreBadge score={trait.score} tone={scoreToneForNarrativeTrait(trait.score)} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{trait.evidence}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="font-semibold">Extracted traits</h3>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
          {analysis.extractedTraits.map((trait) => (
            <li className="rounded-xl bg-muted/50 p-3" key={`${analysis.id}-${trait.key}`}>
              <span className="font-medium text-foreground">{trait.label}</span>: {trait.description}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <h3 className="font-semibold">Evidence notes</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{analysis.evidenceNotes}</p>
      </div>
    </div>
  );
}

function orderedNarrativeTraits(analysis: NarrativeAnalysisResult): NarrativeTrait[] {
  const byKey = new Map(analysis.extractedTraits.map((trait) => [trait.key, trait]));
  return [
    "character_complexity",
    "plot_complexity",
    "pacing_density",
    "thematic_weight",
    "moral_ambiguity",
    "atmosphere",
    "ending_dependency",
    "trope_freshness",
  ].map((key) => byKey.get(key as NarrativeTrait["key"])).filter(Boolean) as NarrativeTrait[];
}

function scoreToneForNarrativeTrait(score: number) {
  if (score >= 75) return "excellent";
  if (score >= 55) return "promising";
  if (score >= 35) return "risky";
  return "avoid";
}

function Metadata({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || "—"}</dd>
    </div>
  );
}
