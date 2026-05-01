import { SCORE_MAX, SCORE_MIN, type TasteDimension } from "@canonos/contracts";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { FormFieldWrapper, TextInput } from "@/components/forms/FormFieldWrapper";
import { cn } from "@/lib/utils";

import type { ScoreDraft } from "@/features/media/scoreDrafts";

type ScoreDraftMap = Record<string, ScoreDraft>;

export function DimensionScoreGrid({
  dimensions,
  drafts,
  isLoading,
  error,
  onChange,
}: {
  dimensions: TasteDimension[] | undefined;
  drafts: ScoreDraftMap;
  isLoading?: boolean;
  error?: Error;
  onChange: (drafts: ScoreDraftMap) => void;
}) {
  if (isLoading) {
    return <LoadingState title="Loading taste dimensions" message="Preparing the scorecard." />;
  }

  if (error) {
    return <ErrorState title="Taste dimensions unavailable" message={error.message} />;
  }

  if (!dimensions?.length) {
    return (
      <EmptyState
        title="No taste dimensions yet"
        message="Default dimensions will be created for your account when the API is available."
      />
    );
  }

  function updateDraft(dimensionId: string, patch: Partial<ScoreDraft>) {
    onChange({
      ...drafts,
      [dimensionId]: {
        dimensionId,
        score: drafts[dimensionId]?.score ?? "",
        note: drafts[dimensionId]?.note ?? "",
        ...patch,
      },
    });
  }

  return (
    <div className="grid gap-3">
      {dimensions.map((dimension) => (
        <DimensionScoreRow
          dimension={dimension}
          draft={drafts[dimension.id] ?? { dimensionId: dimension.id, score: "", note: "" }}
          key={dimension.id}
          onChange={(patch) => updateDraft(dimension.id, patch)}
        />
      ))}
    </div>
  );
}

function DimensionScoreRow({
  dimension,
  draft,
  onChange,
}: {
  dimension: TasteDimension;
  draft: ScoreDraft;
  onChange: (patch: Partial<ScoreDraft>) => void;
}) {
  const scoreNumber = draft.score.trim() === "" ? null : Number(draft.score);
  const invalid = scoreNumber !== null && (scoreNumber < SCORE_MIN || scoreNumber > SCORE_MAX);

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{dimension.name}</h4>
            <DimensionIndicator dimension={dimension} score={scoreNumber} />
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{dimension.description}</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {dimension.direction === "negative" ? "Lower is better" : "Higher is better"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-[8rem,1fr]">
        <FormFieldWrapper
          error={invalid ? `Use ${SCORE_MIN}–${SCORE_MAX}` : undefined}
          id={`score-${dimension.id}`}
          label="Score"
        >
          <TextInput
            aria-describedby={`score-${dimension.id}-description`}
            id={`score-${dimension.id}`}
            inputMode="decimal"
            max={SCORE_MAX}
            min={SCORE_MIN}
            step="0.1"
            type="number"
            value={draft.score}
            onChange={(event) => onChange({ score: event.target.value })}
          />
        </FormFieldWrapper>
        <FormFieldWrapper id={`score-note-${dimension.id}`} label="Score note">
          <TextInput
            id={`score-note-${dimension.id}`}
            placeholder="Optional reason this score fits."
            value={draft.note}
            onChange={(event) => onChange({ note: event.target.value })}
          />
        </FormFieldWrapper>
      </div>
    </div>
  );
}

function DimensionIndicator({ dimension, score }: { dimension: TasteDimension; score: number | null }) {
  const specialLabels: Record<string, string> = {
    genericness: "Genericness signal",
    regret_score: "Regret signal",
    memorability: "Memory signal",
  };
  const label = specialLabels[dimension.slug];
  if (!label || score === null || Number.isNaN(score)) return null;

  const isNegativeRisk = dimension.direction === "negative" && score >= 7;
  const isPositiveSignal = dimension.direction === "positive" && score >= 7;
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-semibold",
        isNegativeRisk
          ? "border-avoid/30 bg-avoid/10 text-avoid"
          : isPositiveSignal
            ? "border-excellent/30 bg-excellent/10 text-excellent"
            : "border-unknown/30 bg-unknown/10 text-unknown",
      )}
    >
      {label}
    </span>
  );
}
