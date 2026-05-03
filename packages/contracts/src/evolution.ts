import type { MediaType } from "./media";

export const TASTE_EVOLUTION_SNAPSHOT_PERIODS = ["monthly", "quarterly", "yearly"] as const;
export type TasteEvolutionSnapshotPeriod = (typeof TASTE_EVOLUTION_SNAPSHOT_PERIODS)[number];

export const TASTE_TREND_DIRECTIONS = ["up", "down", "flat", "new", "insufficient_data"] as const;
export type TasteTrendDirection = (typeof TASTE_TREND_DIRECTIONS)[number];

export const TASTE_TREND_KEYS = [
  "rating",
  "media_type",
  "genericness_tolerance",
  "regret",
  "completion_fatigue",
  "favorite_dimension",
] as const;
export type TasteTrendKey = (typeof TASTE_TREND_KEYS)[number];

export const TASTE_CHANGE_INSIGHT_SEVERITIES = ["positive", "neutral", "warning"] as const;
export type TasteChangeInsightSeverity = (typeof TASTE_CHANGE_INSIGHT_SEVERITIES)[number];

export type TasteTrendPoint = {
  period: string;
  label: string;
  value: number | null;
  count: number;
  meta: Record<string, string | number | boolean | null>;
};

export type TasteTrend = {
  key: TasteTrendKey;
  label: string;
  direction: TasteTrendDirection;
  summary: string;
  currentValue: number | string | null;
  previousValue: number | string | null;
  points: TasteTrendPoint[];
};

export type TasteChangeInsight = {
  key: string;
  severity: TasteChangeInsightSeverity;
  title: string;
  body: string;
  recommendation: string;
  evidence: string[];
};

export type TasteEvolutionEvidenceCounts = {
  mediaCount: number;
  completedMediaCount: number;
  ratedMediaCount: number;
  scoredMediaCount: number;
  scoreCount: number;
  aftertasteCount: number;
  snapshotMonthCount: number;
};

export type TasteEvolutionAggregateData = {
  isEmpty: boolean;
  generatedSummary: string;
  evidenceCounts: TasteEvolutionEvidenceCounts;
  ratingTrend: TasteTrend;
  mediaTypeTrend: TasteTrend;
  genericnessToleranceTrend: TasteTrend;
  regretTrend: TasteTrend;
  completionFatigueTrend: TasteTrend;
  favoriteDimensionTrend: TasteTrend;
};

export type TasteEvolutionSnapshot = {
  id: string;
  snapshotPeriod: TasteEvolutionSnapshotPeriod;
  snapshotDate: string;
  aggregateData: TasteEvolutionAggregateData;
  insights: TasteChangeInsight[];
  createdAt: string;
  updatedAt: string;
};

export type TasteEvolutionTimelineResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TasteEvolutionSnapshot[];
};

export type TasteEvolutionGenerateRequest = {
  snapshotPeriod?: TasteEvolutionSnapshotPeriod;
  snapshotDate?: string;
};

export type TasteEvolutionGenerateResponse = TasteEvolutionSnapshot;

export type TasteEvolutionMediumMeta = {
  mediaType: MediaType;
  count: number;
};
