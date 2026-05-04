import {
  ADAPTATION_COMPLETENESS_LEVELS,
  ADAPTATION_RELATION_TYPES,
  EXPERIENCE_ORDER_RECOMMENDATIONS,
  type AdaptationPath,
  type AdaptationRelation,
  type AdaptationRelationCreateRequest,
  type AdaptationCompleteness,
  type AdaptationRelationType,
  type ExperienceOrderRecommendationValue,
  type MediaItem,
} from "@canonos/contracts";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { ScoreBadge } from "@/components/data-display/ScoreBadge";
import { StatusPill } from "@/components/data-display/StatusPill";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DialogShell } from "@/components/feedback/DialogShell";
import { LoadingState } from "@/components/feedback/LoadingState";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import {
  createAdaptationRelation,
  deleteAdaptationRelation,
  generateAdaptationPath,
  useAdaptationMap,
  useAdaptationRelations,
} from "@/features/adaptations/adaptationsApi";
import {
  adaptationCompletenessLabels,
  adaptationCompletenessTone,
  adaptationRelationTypeLabels,
  experienceOrderLabels,
  riskSeverityTone,
} from "@/features/adaptations/adaptationLabels";
import { mediaTypeLabels } from "@/features/media/mediaLabels";
import { useMediaItems } from "@/features/media/mediaApi";
import { cn } from "@/lib/utils";

type RelationFormState = {
  sourceMediaItemId: string;
  adaptationMediaItemId: string;
  relationType: AdaptationRelationType;
  completeness: AdaptationCompleteness;
  faithfulnessScore: string;
  pacingPreservationScore: string;
  soulPreservationScore: string;
  recommendedExperienceOrder: ExperienceOrderRecommendationValue;
  notes: string;
};

function blankRelationForm(media: MediaItem, items: MediaItem[]): RelationFormState {
  const firstOther = items.find((item) => item.id !== media.id);
  return {
    sourceMediaItemId: media.id,
    adaptationMediaItemId: firstOther?.id ?? "",
    relationType: relationTypeFor(media, firstOther),
    completeness: "unknown",
    faithfulnessScore: "",
    pacingPreservationScore: "",
    soulPreservationScore: "",
    recommendedExperienceOrder: media.mediaType === "audiobook" ? "listen_first" : "read_first",
    notes: "",
  };
}

function relationTypeFor(source: MediaItem, adaptation?: MediaItem): AdaptationRelationType {
  if (!adaptation) return "source_to_adaptation";
  if (adaptation.mediaType === "audiobook" || source.mediaType === "audiobook") {
    return "audiobook_version";
  }
  if (source.mediaType === "novel" && adaptation.mediaType === "movie") return "novel_to_film";
  if (source.mediaType === "novel" && ["tv_show", "anime"].includes(adaptation.mediaType)) {
    return "novel_to_show";
  }
  if (adaptation.mediaType === "anime") return "manga_to_anime";
  return "source_to_adaptation";
}

function nullableScore(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) return "unknown";
  if (score >= 80) return "excellent";
  if (score >= 65) return "promising";
  if (score >= 45) return "risky";
  return "avoid";
}

function requestFromForm(form: RelationFormState): AdaptationRelationCreateRequest {
  return {
    sourceMediaItemId: form.sourceMediaItemId,
    adaptationMediaItemId: form.adaptationMediaItemId,
    relationType: form.relationType,
    completeness: form.completeness,
    faithfulnessScore: nullableScore(form.faithfulnessScore),
    pacingPreservationScore: nullableScore(form.pacingPreservationScore),
    soulPreservationScore: nullableScore(form.soulPreservationScore),
    recommendedExperienceOrder: form.recommendedExperienceOrder,
    notes: form.notes.trim(),
  };
}

export function AdaptationsPanel({ media }: { media: MediaItem }) {
  const {
    data: relations,
    error: relationsError,
    isLoading: isLoadingRelations,
    mutate: mutateRelations,
  } = useAdaptationRelations(media.id);
  const {
    data: adaptationMap,
    error: mapError,
    isLoading: isLoadingMap,
    mutate: mutateMap,
  } = useAdaptationMap(media.id);
  const { data: mediaItems, error: mediaItemsError, isLoading: isLoadingMediaItems } = useMediaItems();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<RelationFormState>(() => blankRelationForm(media, []));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingRelationId, setDeletingRelationId] = useState<string | null>(null);
  const [generatedPath, setGeneratedPath] = useState<AdaptationPath | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const availableMedia = useMemo(() => mediaItems?.results ?? [], [mediaItems?.results]);
  const currentPath = generatedPath ?? adaptationMap;

  useEffect(() => {
    if (isModalOpen) {
      setForm(blankRelationForm(media, availableMedia));
      setFormError(null);
    }
  }, [availableMedia, isModalOpen, media]);

  const selectedSource = useMemo(
    () => availableMedia.find((item) => item.id === form.sourceMediaItemId),
    [availableMedia, form.sourceMediaItemId],
  );
  const selectedAdaptation = useMemo(
    () => availableMedia.find((item) => item.id === form.adaptationMediaItemId),
    [availableMedia, form.adaptationMediaItemId],
  );

  function updateField<K extends keyof RelationFormState>(key: K, value: RelationFormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "sourceMediaItemId" || key === "adaptationMediaItemId") {
        const source = availableMedia.find((item) => item.id === next.sourceMediaItemId) ?? media;
        const adaptation = availableMedia.find((item) => item.id === next.adaptationMediaItemId);
        next.relationType = relationTypeFor(source, adaptation);
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.sourceMediaItemId || !form.adaptationMediaItemId) {
      setFormError("Select both source and adaptation media items.");
      return;
    }
    if (form.sourceMediaItemId === form.adaptationMediaItemId) {
      setFormError("Source and adaptation must be different items.");
      return;
    }
    const scores = [form.faithfulnessScore, form.pacingPreservationScore, form.soulPreservationScore]
      .filter((value) => value.trim() !== "")
      .map(Number);
    if (scores.some((score) => Number.isNaN(score) || score < 0 || score > 100)) {
      setFormError("Scores must be blank or between 0 and 100.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await createAdaptationRelation(requestFromForm(form));
      setGeneratedPath(null);
      await Promise.all([mutateRelations(), mutateMap()]);
      setIsModalOpen(false);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not save adaptation relation.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRelation(relation: AdaptationRelation) {
    setDeletingRelationId(relation.id);
    setDeleteError(null);
    try {
      await deleteAdaptationRelation(relation.id);
      setGeneratedPath(null);
      await Promise.all([mutateRelations(), mutateMap()]);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete adaptation relation.");
    } finally {
      setDeletingRelationId(null);
    }
  }

  async function handleGeneratePath() {
    setIsGeneratingPath(true);
    setPathError(null);
    try {
      setGeneratedPath(await generateAdaptationPath(media.id));
      await mutateMap();
    } catch (caught) {
      setPathError(caught instanceof Error ? caught.message : "Could not generate adaptation path.");
    } finally {
      setIsGeneratingPath(false);
    }
  }

  return (
    <SectionCard title="Adaptation Intelligence">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Source and adaptation map</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Link source material, adaptations, remakes, audiobook versions, and loose versions so CanonOS can recommend whether to read, watch, listen, or skip.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isLoadingMediaItems || availableMedia.length < 2}
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(true)}
            >
              Add adaptation relation
            </Button>
            <Button disabled={isGeneratingPath} type="button" onClick={() => void handleGeneratePath()}>
              {isGeneratingPath ? "Generating…" : "Get Experience Path"}
            </Button>
          </div>
        </div>

        {mediaItemsError ? (
          <ErrorState title="Media choices unavailable" message={mediaItemsError.message} />
        ) : null}
        {deleteError ? <ErrorState title="Delete failed" message={deleteError} /> : null}
        {pathError ? <ErrorState title="Path generation failed" message={pathError} /> : null}

        {isLoadingRelations ? (
          <LoadingState title="Loading adaptation relations" message="Checking linked source and adaptation items." />
        ) : null}
        {relationsError ? (
          <ErrorState
            title="Adaptation relations unavailable"
            message={relationsError.message}
            onRetry={() => void mutateRelations()}
          />
        ) : null}
        {!isLoadingRelations && !relationsError && !relations?.results.length ? (
          <EmptyState
            title="No adaptation relations yet"
            message="Add a source/adaptation link to compare completeness, faithfulness, pacing, soul, and recommended order."
            actionLabel={availableMedia.length >= 2 ? "Add adaptation relation" : undefined}
            onAction={availableMedia.length >= 2 ? () => setIsModalOpen(true) : undefined}
          />
        ) : null}
        {relations?.results.length ? (
          <div className="grid gap-3">
            {relations.results.map((relation) => (
              <AdaptationRelationCard
                isDeleting={deletingRelationId === relation.id}
                key={relation.id}
                relation={relation}
                onDelete={handleDeleteRelation}
              />
            ))}
          </div>
        ) : null}

        {isLoadingMap ? (
          <LoadingState title="Loading experience path" message="Preparing the current path recommendation." />
        ) : null}
        {mapError ? (
          <ErrorState title="Experience path unavailable" message={mapError.message} onRetry={() => void mutateMap()} />
        ) : null}
        {currentPath ? <AdaptationPathCard path={currentPath} /> : null}
      </div>

      <AdaptationRelationModal
        availableMedia={availableMedia}
        form={form}
        formError={formError}
        isSaving={isSaving}
        open={isModalOpen}
        selectedAdaptation={selectedAdaptation}
        selectedSource={selectedSource}
        onClose={() => setIsModalOpen(false)}
        onFieldChange={updateField}
        onSubmit={handleSubmit}
      />
    </SectionCard>
  );
}

function AdaptationRelationCard({
  relation,
  isDeleting,
  onDelete,
}: {
  relation: AdaptationRelation;
  isDeleting: boolean;
  onDelete: (relation: AdaptationRelation) => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {adaptationRelationTypeLabels[relation.relationType]}
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            {relation.sourceTitle} → {relation.adaptationTitle}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mediaTypeLabels[relation.sourceMediaType]} source · {mediaTypeLabels[relation.adaptationMediaType]} adaptation
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label={adaptationCompletenessLabels[relation.completeness]}
            tone={adaptationCompletenessTone[relation.completeness]}
          />
          <StatusPill label={experienceOrderLabels[relation.recommendedExperienceOrder]} tone="active" />
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <Metric label="Faithfulness" score={relation.faithfulnessScore} />
        <Metric label="Pacing preserved" score={relation.pacingPreservationScore} />
        <Metric label="Soul preserved" score={relation.soulPreservationScore} />
      </dl>
      {relation.notes ? (
        <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">
          {relation.notes}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button disabled={isDeleting} type="button" variant="ghost" onClick={() => void onDelete(relation)}>
          {isDeleting ? "Removing…" : "Remove relation"}
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-2">
        <ScoreBadge label="/100" score={score ?? undefined} tone={scoreTone(score)} />
      </dd>
    </div>
  );
}

function AdaptationPathCard({ path }: { path: AdaptationPath }) {
  const recommendation = path.recommendation;
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Best Experience Path</p>
          <h3 className="mt-1 text-lg font-semibold">{recommendation.label}</h3>
        </div>
        <ScoreBadge label="confidence" score={recommendation.confidenceScore} tone={scoreTone(recommendation.confidenceScore)} />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{recommendation.rationale}</p>
      {recommendation.risks.length ? (
        <div className="mt-4 grid gap-2">
          <h4 className="text-sm font-semibold">Risk signals</h4>
          <div className="flex flex-wrap gap-2">
            {recommendation.risks.map((risk) => (
              <StatusPill
                key={`${risk.kind}-${risk.reason}`}
                label={`${risk.label}: ${risk.reason}`}
                tone={riskSeverityTone[risk.severity]}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No major adaptation risks are currently flagged.</p>
      )}
    </div>
  );
}

function AdaptationRelationModal({
  open,
  form,
  availableMedia,
  selectedSource,
  selectedAdaptation,
  isSaving,
  formError,
  onFieldChange,
  onSubmit,
  onClose,
}: {
  open: boolean;
  form: RelationFormState;
  availableMedia: MediaItem[];
  selectedSource?: MediaItem;
  selectedAdaptation?: MediaItem;
  isSaving: boolean;
  formError: string | null;
  onFieldChange: <K extends keyof RelationFormState>(key: K, value: RelationFormState[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <DialogShell
      className="block overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm"
      labelledBy="adaptation-relation-title"
      onClose={onClose}
      panelClassName="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" id="adaptation-relation-title">
            Add adaptation relation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare a source work with an adaptation, remake, audiobook, or alternate version.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>

        {formError ? (
          <div className="mt-4">
            <ErrorState title="Relation save failed" message={formError} />
          </div>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormFieldWrapper id="adaptation-source" label="Source media">
              <select
                className={selectClassName}
                id="adaptation-source"
                required
                value={form.sourceMediaItemId}
                onChange={(event) => onFieldChange("sourceMediaItemId", event.target.value)}
              >
                <option value="">Select source</option>
                {availableMedia.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {mediaTypeLabels[item.mediaType]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-target" label="Adaptation media">
              <select
                className={selectClassName}
                id="adaptation-target"
                required
                value={form.adaptationMediaItemId}
                onChange={(event) => onFieldChange("adaptationMediaItemId", event.target.value)}
              >
                <option value="">Select adaptation</option>
                {availableMedia.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {mediaTypeLabels[item.mediaType]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-relation-type" label="Relation type">
              <select
                className={selectClassName}
                id="adaptation-relation-type"
                value={form.relationType}
                onChange={(event) =>
                  onFieldChange("relationType", event.target.value as AdaptationRelationType)
                }
              >
                {ADAPTATION_RELATION_TYPES.map((relationType) => (
                  <option key={relationType} value={relationType}>
                    {adaptationRelationTypeLabels[relationType]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-completeness" label="Completeness">
              <select
                className={selectClassName}
                id="adaptation-completeness"
                value={form.completeness}
                onChange={(event) =>
                  onFieldChange("completeness", event.target.value as AdaptationCompleteness)
                }
              >
                {ADAPTATION_COMPLETENESS_LEVELS.map((completeness) => (
                  <option key={completeness} value={completeness}>
                    {adaptationCompletenessLabels[completeness]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-faithfulness" label="Faithfulness score">
              <TextInput
                id="adaptation-faithfulness"
                inputMode="numeric"
                max="100"
                min="0"
                type="number"
                value={form.faithfulnessScore}
                onChange={(event) => onFieldChange("faithfulnessScore", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-pacing" label="Pacing preservation score">
              <TextInput
                id="adaptation-pacing"
                inputMode="numeric"
                max="100"
                min="0"
                type="number"
                value={form.pacingPreservationScore}
                onChange={(event) => onFieldChange("pacingPreservationScore", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-soul" label="Soul preservation score">
              <TextInput
                id="adaptation-soul"
                inputMode="numeric"
                max="100"
                min="0"
                type="number"
                value={form.soulPreservationScore}
                onChange={(event) => onFieldChange("soulPreservationScore", event.target.value)}
              />
            </FormFieldWrapper>
            <FormFieldWrapper id="adaptation-recommended-order" label="Recommended order">
              <select
                className={selectClassName}
                id="adaptation-recommended-order"
                value={form.recommendedExperienceOrder}
                onChange={(event) =>
                  onFieldChange(
                    "recommendedExperienceOrder",
                    event.target.value as ExperienceOrderRecommendationValue,
                  )
                }
              >
                {EXPERIENCE_ORDER_RECOMMENDATIONS.map((recommendation) => (
                  <option key={recommendation} value={recommendation}>
                    {experienceOrderLabels[recommendation]}
                  </option>
                ))}
              </select>
            </FormFieldWrapper>
          </div>

          <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Source: {selectedSource?.title ?? "not selected"} · Adaptation: {selectedAdaptation?.title ?? "not selected"}
          </div>

          <FormFieldWrapper id="adaptation-notes" label="Comparison notes">
            <textarea
              className="min-h-28 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              id="adaptation-notes"
              placeholder="Track changed tone, compression, weak endings, poor narration, or where the adaptation keeps the source's soul."
              value={form.notes}
              onChange={(event) => onFieldChange("notes", event.target.value)}
            />
          </FormFieldWrapper>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : "Save relation"}
            </Button>
          </div>
        </form>
    </DialogShell>
  );
}

const selectClassName = cn(
  "h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary",
);
