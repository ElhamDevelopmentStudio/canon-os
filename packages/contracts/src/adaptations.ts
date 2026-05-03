import type { MediaType } from "./media";

export const ADAPTATION_RELATION_TYPES = [
  "source_to_adaptation",
  "adaptation_to_source",
  "remake",
  "alternate_version",
  "inspired_by",
  "audiobook_version",
  "manga_to_anime",
  "novel_to_film",
  "novel_to_show",
] as const;
export type AdaptationRelationType = (typeof ADAPTATION_RELATION_TYPES)[number];

export const ADAPTATION_COMPLETENESS_LEVELS = [
  "complete",
  "partial",
  "incomplete",
  "loose",
  "unknown",
] as const;
export type AdaptationCompleteness = (typeof ADAPTATION_COMPLETENESS_LEVELS)[number];

export const EXPERIENCE_ORDER_RECOMMENDATIONS = [
  "read_first",
  "watch_first",
  "listen_first",
  "adaptation_sufficient",
  "source_preferred",
  "skip_adaptation",
] as const;
export type ExperienceOrderRecommendationValue =
  (typeof EXPERIENCE_ORDER_RECOMMENDATIONS)[number];

export const ADAPTATION_RISK_KINDS = [
  "incomplete_adaptation",
  "weak_ending",
  "compression",
  "changed_tone",
  "poor_narration",
  "low_faithfulness",
  "pacing_loss",
  "soul_loss",
] as const;
export type AdaptationRiskKind = (typeof ADAPTATION_RISK_KINDS)[number];

export type AdaptationRiskSeverity = "low" | "medium" | "high";

export type AdaptationRelation = {
  id: string;
  sourceMediaItemId: string;
  adaptationMediaItemId: string;
  sourceTitle: string;
  adaptationTitle: string;
  sourceMediaType: MediaType;
  adaptationMediaType: MediaType;
  relationType: AdaptationRelationType;
  completeness: AdaptationCompleteness;
  faithfulnessScore: number | null;
  pacingPreservationScore: number | null;
  soulPreservationScore: number | null;
  recommendedExperienceOrder: ExperienceOrderRecommendationValue;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type AdaptationRelationListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdaptationRelation[];
};

export type AdaptationRelationCreateRequest = {
  sourceMediaItemId: string;
  adaptationMediaItemId: string;
  relationType: AdaptationRelationType;
  completeness: AdaptationCompleteness;
  faithfulnessScore?: number | null;
  pacingPreservationScore?: number | null;
  soulPreservationScore?: number | null;
  recommendedExperienceOrder: ExperienceOrderRecommendationValue;
  notes?: string;
};

export type AdaptationRelationUpdateRequest = Partial<AdaptationRelationCreateRequest>;

export type AdaptationRisk = {
  kind: AdaptationRiskKind;
  label: string;
  severity: AdaptationRiskSeverity;
  reason: string;
};

export type ExperienceOrderRecommendation = {
  recommendation: ExperienceOrderRecommendationValue;
  label: string;
  rationale: string;
  confidenceScore: number;
  risks: AdaptationRisk[];
};

export type AdaptationPath = {
  mediaItemId: string;
  mediaTitle: string;
  relations: AdaptationRelation[];
  recommendation: ExperienceOrderRecommendation;
  createdAt: string;
};
