import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
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
import { PageSubtitle, PageTitle } from "@/components/layout/PageText";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { DimensionScoreGrid } from "@/features/media/DimensionScoreGrid";
import {
  findScoreValidationError,
  scoreDraftsFromScores,
  scoreDraftsToRequest,
  type ScoreDraft,
} from "@/features/media/scoreDrafts";
import { deleteMediaItem, useMediaItem } from "@/features/media/mediaApi";
import { MediaFormModal } from "@/features/media/MediaFormModal";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";

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
    data: dimensions,
    error: dimensionsError,
    isLoading: isLoadingDimensions,
  } = useTasteDimensions(Boolean(data));
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDraftMap>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

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

  if (isLoading) {
    return <LoadingState title="Loading media detail" message="Fetching this library item." />;
  }
  if (error) {
    return <ErrorState title="Media item unavailable" message={error.message} onRetry={() => void mutate()} />;
  }
  if (!data) {
    return <EmptyState title="Media item not found" message="This item may have been deleted or is unavailable." />;
  }

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
            onChange={setScoreDrafts}
          />
          <div className="flex justify-end">
            <Button disabled={isSavingScores || !dimensions?.length} type="button" onClick={() => void handleSaveScores()}>
              {isSavingScores ? "Saving scores…" : "Save scores"}
            </Button>
          </div>
        </div>
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

function Metadata({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || "—"}</dd>
    </div>
  );
}
