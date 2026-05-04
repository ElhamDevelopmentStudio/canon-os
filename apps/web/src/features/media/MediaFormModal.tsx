import {
  CONSUMPTION_STATUSES,
  EXTERNAL_PROVIDERS,
  MEDIA_TYPES,
  type ExternalMediaMatch,
  type ExternalProvider,
  type MediaItem,
  type MediaItemCreateRequest,
} from "@canonos/contracts";
import { FormEvent, useEffect, useState } from "react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { Button } from "@/components/ui/button";
import { DimensionScoreGrid } from "@/features/media/DimensionScoreGrid";
import {
  findScoreValidationError,
  scoreDraftsFromScores,
  scoreDraftsToRequest,
  type ScoreDraft,
} from "@/features/media/scoreDrafts";
import { createMediaItem, updateMediaItem } from "@/features/media/mediaApi";
import { ExternalMetadataCard } from "@/features/metadata/ExternalMetadataCard";
import { attachMetadata, searchMetadata } from "@/features/metadata/metadataApi";
import { externalProviderLabels } from "@/features/metadata/metadataLabels";
import { mediaTypeLabels, statusLabels } from "@/features/media/mediaLabels";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  originalTitle: string;
  mediaType: MediaItemCreateRequest["mediaType"];
  releaseYear: string;
  countryLanguage: string;
  creator: string;
  status: MediaItemCreateRequest["status"];
  personalRating: string;
  startedDate: string;
  completedDate: string;
  runtimeMinutes: string;
  episodeCount: string;
  pageCount: string;
  audiobookLengthMinutes: string;
  notes: string;
};

type ScoreDraftMap = Record<string, ScoreDraft>;

const blankState: FormState = {
  title: "",
  originalTitle: "",
  mediaType: "movie",
  releaseYear: "",
  countryLanguage: "",
  creator: "",
  status: "planned",
  personalRating: "",
  startedDate: "",
  completedDate: "",
  runtimeMinutes: "",
  episodeCount: "",
  pageCount: "",
  audiobookLengthMinutes: "",
  notes: "",
};

function stateFromMedia(media: MediaItem | null): FormState {
  if (!media) return blankState;
  return {
    title: media.title,
    originalTitle: media.originalTitle,
    mediaType: media.mediaType,
    releaseYear: media.releaseYear?.toString() ?? "",
    countryLanguage: media.countryLanguage,
    creator: media.creator,
    status: media.status,
    personalRating: media.personalRating?.toString() ?? "",
    startedDate: media.startedDate ?? "",
    completedDate: media.completedDate ?? "",
    runtimeMinutes: media.runtimeMinutes?.toString() ?? "",
    episodeCount: media.episodeCount?.toString() ?? "",
    pageCount: media.pageCount?.toString() ?? "",
    audiobookLengthMinutes: media.audiobookLengthMinutes?.toString() ?? "",
    notes: media.notes,
  };
}

function nullableNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function nullableDate(value: string): string | null {
  return value.trim() === "" ? null : value;
}

function requestFromState(state: FormState): MediaItemCreateRequest {
  return {
    title: state.title.trim(),
    originalTitle: state.originalTitle.trim(),
    mediaType: state.mediaType,
    releaseYear: nullableNumber(state.releaseYear),
    countryLanguage: state.countryLanguage.trim(),
    creator: state.creator.trim(),
    status: state.status,
    personalRating: nullableNumber(state.personalRating),
    startedDate: nullableDate(state.startedDate),
    completedDate: nullableDate(state.completedDate),
    runtimeMinutes: nullableNumber(state.runtimeMinutes),
    episodeCount: nullableNumber(state.episodeCount),
    pageCount: nullableNumber(state.pageCount),
    audiobookLengthMinutes: nullableNumber(state.audiobookLengthMinutes),
    notes: state.notes.trim(),
  };
}

export function MediaFormModal({
  open,
  media,
  onClose,
  onSaved,
}: {
  open: boolean;
  media: MediaItem | null;
  onClose: () => void;
  onSaved?: (media: MediaItem) => void;
}) {
  const [form, setForm] = useState<FormState>(blankState);
  const [scoreDrafts, setScoreDrafts] = useState<ScoreDraftMap>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [metadataQuery, setMetadataQuery] = useState("");
  const [metadataProvider, setMetadataProvider] = useState<ExternalProvider | "">("");
  const [metadataMatches, setMetadataMatches] = useState<ExternalMediaMatch[]>([]);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [attachingProviderItemId, setAttachingProviderItemId] = useState<string | null>(null);
  const { data: dimensions, error: dimensionsError, isLoading: isLoadingDimensions } =
    useTasteDimensions(open);
  const title = media ? "Edit media" : "Add media";

  useEffect(() => {
    if (open) {
      setForm(stateFromMedia(media));
      setScoreDrafts(scoreDraftsFromScores(media?.scores));
      setError(null);
      setMetadataQuery(media?.title ?? "");
      setMetadataProvider("");
      setMetadataMatches([]);
      setMetadataError(null);
    }
  }, [media, open]);

  if (!open) return null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyMetadataMatch(match: ExternalMediaMatch) {
    setForm((current) => ({
      ...current,
      title: match.title || current.title,
      originalTitle: match.originalTitle || current.originalTitle,
      mediaType: match.mediaType,
      releaseYear: match.releaseYear?.toString() ?? current.releaseYear,
      creator: match.creator || current.creator,
      notes: current.notes || match.description,
    }));
  }

  async function handleMetadataSearch() {
    const query = metadataQuery.trim() || form.title.trim();
    if (!query) {
      setMetadataError("Enter a title before searching metadata.");
      return;
    }
    setIsSearchingMetadata(true);
    setMetadataError(null);
    try {
      const response = await searchMetadata({
        query,
        mediaType: form.mediaType,
        provider: metadataProvider,
      });
      setMetadataMatches(response.results);
    } catch (caught) {
      setMetadataError(caught instanceof Error ? caught.message : "Could not search metadata providers.");
    } finally {
      setIsSearchingMetadata(false);
    }
  }

  async function handleAttachMetadata(match: ExternalMediaMatch) {
    if (!media) {
      applyMetadataMatch(match);
      return;
    }
    setAttachingProviderItemId(match.providerItemId);
    setMetadataError(null);
    try {
      await attachMetadata(media.id, match);
      applyMetadataMatch(match);
      onSaved?.({ ...media, externalMetadata: undefined });
    } catch (caught) {
      setMetadataError(caught instanceof Error ? caught.message : "Could not attach metadata.");
    } finally {
      setAttachingProviderItemId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = dimensions
      ? findScoreValidationError(dimensions, scoreDrafts)
      : null;
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const request = requestFromState(form);
      const saved = media ? await updateMediaItem(media.id, request) : await createMediaItem(request);
      if (dimensions?.length) {
        await upsertMediaScores(saved.id, { scores: scoreDraftsToRequest(dimensions, scoreDrafts) });
      }
      onSaved?.(saved);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save media item.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DialogShell
      className="block overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm"
      labelledBy="media-form-title"
      onClose={onClose}
      panelClassName="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" id="media-form-title">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save library details and the private scorecard that explains why it worked.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
        {error ? (
          <div className="mt-4">
            <ErrorState title="Save failed" message={error} />
          </div>
        ) : null}
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormFieldWrapper id="media-title" label="Title">
              <TextInput
                data-autofocus="true"
                id="media-title"
                required
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-original-title" label="Original title">
              <TextInput
                id="media-original-title"
                value={form.originalTitle}
                onChange={(event) => updateField("originalTitle", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-type" label="Media type">
              <select
                className={selectClassName}
                id="media-type"
                value={form.mediaType}
                onChange={(event) =>
                  updateField("mediaType", event.target.value as FormState["mediaType"])
                }
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {mediaTypeLabels[type]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
            <FormFieldWrapper id="media-status" label="Status">
              <select
                className={selectClassName}
                id="media-status"
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as FormState["status"])
                }
              >
                {CONSUMPTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
            <FormFieldWrapper id="media-year" label="Release year">
              <TextInput
                id="media-year"
                inputMode="numeric"
                max="2100"
                min="1800"
                type="number"
                value={form.releaseYear}
                onChange={(event) => updateField("releaseYear", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-creator" label="Creator / director / author">
              <TextInput
                id="media-creator"
                value={form.creator}
                onChange={(event) => updateField("creator", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-country-language" label="Country / language">
              <TextInput
                id="media-country-language"
                value={form.countryLanguage}
                onChange={(event) => updateField("countryLanguage", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-rating" label="Personal rating">
              <TextInput
                id="media-rating"
                inputMode="decimal"
                max="10"
                min="0"
                step="0.1"
                type="number"
                value={form.personalRating}
                onChange={(event) => updateField("personalRating", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-started" label="Started date">
              <TextInput
                id="media-started"
                type="date"
                value={form.startedDate}
                onChange={(event) => updateField("startedDate", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-completed" label="Completed date">
              <TextInput
                id="media-completed"
                type="date"
                value={form.completedDate}
                onChange={(event) => updateField("completedDate", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-runtime" label="Runtime minutes">
              <TextInput
                id="media-runtime"
                inputMode="numeric"
                min="0"
                type="number"
                value={form.runtimeMinutes}
                onChange={(event) => updateField("runtimeMinutes", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-episodes" label="Episode count">
              <TextInput
                id="media-episodes"
                inputMode="numeric"
                min="0"
                type="number"
                value={form.episodeCount}
                onChange={(event) => updateField("episodeCount", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-pages" label="Page count">
              <TextInput
                id="media-pages"
                inputMode="numeric"
                min="0"
                type="number"
                value={form.pageCount}
                onChange={(event) => updateField("pageCount", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="media-audio-length" label="Audiobook length minutes">
              <TextInput
                id="media-audio-length"
                inputMode="numeric"
                min="0"
                type="number"
                value={form.audiobookLengthMinutes}
                onChange={(event) => updateField("audiobookLengthMinutes", event.target.value)}
              />
            </FormFieldWrapper>
          </div>
          <FormFieldWrapper id="media-notes" label="Notes">
            <textarea
              className="min-h-28 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              id="media-notes"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </FormFieldWrapper>

          <section className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4">
            <div>
              <h3 className="text-lg font-semibold">External metadata</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Search optional provider adapters for public metadata. Personal notes, ratings, and taste data are never sent.
              </p>
            </div>
            {metadataError ? <ErrorState title="Metadata lookup failed" message={metadataError} /> : null}
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
              <FormFieldWrapper id="metadata-query" label="Metadata search title">
                <TextInput
                  id="metadata-query"
                  value={metadataQuery}
                  onChange={(event) => setMetadataQuery(event.target.value)}
                />
              </FormFieldWrapper>
              <FormFieldWrapper id="metadata-provider" label="Provider">
                <select
                  className={selectClassName}
                  id="metadata-provider"
                  value={metadataProvider}
                  onChange={(event) => setMetadataProvider(event.target.value as ExternalProvider | "")}
                >
                  <option value="">Best provider</option>
                  {EXTERNAL_PROVIDERS.filter((provider) => provider !== "manual").map((provider) => (
                    <option key={provider} value={provider}>
                      {externalProviderLabels[provider]}
                    </option>
                  ))}
                </select>
              </FormFieldWrapper>
              <div className="flex items-end">
                <Button disabled={isSearchingMetadata} type="button" variant="secondary" onClick={() => void handleMetadataSearch()}>
                  {isSearchingMetadata ? "Searching…" : "Search metadata"}
                </Button>
              </div>
            </div>
            {metadataMatches.length ? (
              <div className="grid gap-3">
                {metadataMatches.map((match) => (
                  <ExternalMetadataCard
                    key={`${match.provider}:${match.providerItemId}`}
                    isAttaching={attachingProviderItemId === match.providerItemId}
                    match={match}
                    onAttach={handleAttachMetadata}
                    onUse={applyMetadataMatch}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No metadata selected"
                message="Search by title to prefill public metadata or attach a provider snapshot to an existing item."
              />
            )}
          </section>

          <section className="grid gap-3">
            <div>
              <h3 className="text-lg font-semibold">Taste scorecard</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Score dimensions from 0 to 10. Leave a score blank if it does not apply yet.
              </p>
            </div>
            <DimensionScoreGrid
              dimensions={dimensions}
              drafts={scoreDrafts}
              error={dimensionsError}
              isLoading={isLoadingDimensions}
              onChange={setScoreDrafts}
            />
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : "Save media"}
            </Button>
          </div>
        </form>
    </DialogShell>
  );
}

const selectClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
