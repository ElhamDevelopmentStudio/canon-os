import { SCORE_MAX, SCORE_MIN, type MediaScore, type TasteDimension } from "@canonos/contracts";

export type ScoreDraft = {
  dimensionId: string;
  score: string;
  note: string;
};

type ScoreDraftMap = Record<string, ScoreDraft>;

export function scoreDraftsFromScores(scores: MediaScore[] | undefined): ScoreDraftMap {
  return Object.fromEntries(
    (scores ?? []).map((score) => [
      score.dimensionId,
      {
        dimensionId: score.dimensionId,
        score: score.score.toString(),
        note: score.note,
      },
    ]),
  );
}

export function scoreDraftsToRequest(dimensions: TasteDimension[], drafts: ScoreDraftMap) {
  return dimensions.map((dimension) => {
    const draft = drafts[dimension.id];
    const trimmedScore = draft?.score.trim() ?? "";
    return {
      dimensionId: dimension.id,
      score: trimmedScore === "" ? null : Number(trimmedScore),
      note: draft?.note.trim() ?? "",
    };
  });
}

export function findScoreValidationError(dimensions: TasteDimension[], drafts: ScoreDraftMap) {
  for (const dimension of dimensions) {
    const score = drafts[dimension.id]?.score.trim();
    if (!score) continue;
    const parsed = Number(score);
    if (!Number.isFinite(parsed) || parsed < SCORE_MIN || parsed > SCORE_MAX) {
      return `${dimension.name} must be between ${SCORE_MIN} and ${SCORE_MAX}.`;
    }
  }
  return null;
}
