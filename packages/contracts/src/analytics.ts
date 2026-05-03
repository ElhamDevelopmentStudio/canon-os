import type { MediaType } from "./media";
import type { TasteDimensionDirection } from "./taste";

export type AnalyticsBaseResponse = {
  isEmpty: boolean;
  generatedAt: string;
};

export type AnalyticsConsumptionTimelinePoint = {
  period: string;
  label: string;
  completedCount: number;
  droppedCount: number;
  totalCount: number;
  averageRating: number | null;
};

export type AnalyticsConsumptionTimelineResponse = AnalyticsBaseResponse & {
  points: AnalyticsConsumptionTimelinePoint[];
};

export type AnalyticsRatingDistributionBucket = {
  bucket: string;
  label: string;
  minRating: number;
  maxRating: number;
  count: number;
};

export type AnalyticsRatingDistributionResponse = AnalyticsBaseResponse & {
  ratedCount: number;
  averageRating: number | null;
  buckets: AnalyticsRatingDistributionBucket[];
};

export type AnalyticsMediaTypeDistributionRow = {
  mediaType: MediaType;
  count: number;
  completedCount: number;
  averageRating: number | null;
  sharePercent: number;
};

export type AnalyticsMediaTypeDistributionResponse = AnalyticsBaseResponse & {
  totalCount: number;
  results: AnalyticsMediaTypeDistributionRow[];
};

export type AnalyticsDimensionTrendPoint = {
  period: string;
  label: string;
  averageScore: number | null;
  scoreCount: number;
};

export type AnalyticsDimensionTrend = {
  dimensionId: string;
  dimensionSlug: string;
  dimensionName: string;
  dimensionDirection: TasteDimensionDirection;
  averageScore: number | null;
  scoreCount: number;
  points: AnalyticsDimensionTrendPoint[];
};

export type AnalyticsDimensionTrendsResponse = AnalyticsBaseResponse & {
  dimensions: AnalyticsDimensionTrend[];
};

export type AnalyticsGenericnessSatisfactionPoint = {
  mediaItemId: string;
  title: string;
  mediaType: MediaType;
  genericnessScore: number | null;
  satisfactionScore: number | null;
};

export type AnalyticsGenericnessSatisfactionResponse = AnalyticsBaseResponse & {
  points: AnalyticsGenericnessSatisfactionPoint[];
  averageGenericness: number | null;
  averageSatisfaction: number | null;
  insight: string;
};

export type AnalyticsRegretTimeCostPoint = {
  mediaItemId: string;
  title: string;
  mediaType: MediaType;
  regretScore: number | null;
  timeCostMinutes: number | null;
};

export type AnalyticsRegretTimeCostResponse = AnalyticsBaseResponse & {
  points: AnalyticsRegretTimeCostPoint[];
  averageRegret: number | null;
  totalHighRegretMinutes: number;
  insight: string;
};

export type AnalyticsTopCreator = {
  creator: string;
  count: number;
  completedCount: number;
  averageRating: number | null;
  bestTitle: string | null;
  negativeSignalCount: number;
};

export type AnalyticsTopCreatorsResponse = AnalyticsBaseResponse & {
  results: AnalyticsTopCreator[];
};

export type AnalyticsTopTheme = {
  key: string;
  label: string;
  count: number;
  averageScore: number | null;
  exampleTitle: string | null;
};

export type AnalyticsTopThemesResponse = AnalyticsBaseResponse & {
  results: AnalyticsTopTheme[];
};

export type AnalyticsInsights = {
  consumptionTimeline: AnalyticsConsumptionTimelineResponse;
  ratingDistribution: AnalyticsRatingDistributionResponse;
  mediaTypeDistribution: AnalyticsMediaTypeDistributionResponse;
  dimensionTrends: AnalyticsDimensionTrendsResponse;
  genericnessSatisfaction: AnalyticsGenericnessSatisfactionResponse;
  regretTimeCost: AnalyticsRegretTimeCostResponse;
  topCreators: AnalyticsTopCreatorsResponse;
  topThemes: AnalyticsTopThemesResponse;
};
