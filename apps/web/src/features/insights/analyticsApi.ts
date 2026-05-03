import type {
  AnalyticsConsumptionTimelineResponse,
  AnalyticsDimensionTrend,
  AnalyticsDimensionTrendsResponse,
  AnalyticsGenericnessSatisfactionResponse,
  AnalyticsInsights,
  AnalyticsMediaTypeDistributionResponse,
  AnalyticsRatingDistributionResponse,
  AnalyticsRegretTimeCostResponse,
  AnalyticsTopCreatorsResponse,
  AnalyticsTopThemesResponse,
} from "@canonos/contracts";
import useSWR from "swr";

import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function numberOrNull(value: number | null): number | null {
  return value === null ? null : Number(value);
}

function normalizeConsumptionTimeline(
  response: AnalyticsConsumptionTimelineResponse,
): AnalyticsConsumptionTimelineResponse {
  return {
    ...response,
    points: response.points.map((point) => ({
      ...point,
      completedCount: Number(point.completedCount),
      droppedCount: Number(point.droppedCount),
      totalCount: Number(point.totalCount),
      averageRating: numberOrNull(point.averageRating),
    })),
  };
}

function normalizeRatingDistribution(
  response: AnalyticsRatingDistributionResponse,
): AnalyticsRatingDistributionResponse {
  return {
    ...response,
    ratedCount: Number(response.ratedCount),
    averageRating: numberOrNull(response.averageRating),
    buckets: response.buckets.map((bucket) => ({
      ...bucket,
      minRating: Number(bucket.minRating),
      maxRating: Number(bucket.maxRating),
      count: Number(bucket.count),
    })),
  };
}

function normalizeMediaTypeDistribution(
  response: AnalyticsMediaTypeDistributionResponse,
): AnalyticsMediaTypeDistributionResponse {
  return {
    ...response,
    totalCount: Number(response.totalCount),
    results: response.results.map((row) => ({
      ...row,
      count: Number(row.count),
      completedCount: Number(row.completedCount),
      averageRating: numberOrNull(row.averageRating),
      sharePercent: Number(row.sharePercent),
    })),
  };
}

function normalizeDimensionTrend(trend: AnalyticsDimensionTrend): AnalyticsDimensionTrend {
  return {
    ...trend,
    averageScore: numberOrNull(trend.averageScore),
    scoreCount: Number(trend.scoreCount),
    points: trend.points.map((point) => ({
      ...point,
      averageScore: numberOrNull(point.averageScore),
      scoreCount: Number(point.scoreCount),
    })),
  };
}

function normalizeDimensionTrends(response: AnalyticsDimensionTrendsResponse): AnalyticsDimensionTrendsResponse {
  return {
    ...response,
    dimensions: response.dimensions.map(normalizeDimensionTrend),
  };
}

function normalizeGenericnessSatisfaction(
  response: AnalyticsGenericnessSatisfactionResponse,
): AnalyticsGenericnessSatisfactionResponse {
  return {
    ...response,
    averageGenericness: numberOrNull(response.averageGenericness),
    averageSatisfaction: numberOrNull(response.averageSatisfaction),
    points: response.points.map((point) => ({
      ...point,
      genericnessScore: numberOrNull(point.genericnessScore),
      satisfactionScore: numberOrNull(point.satisfactionScore),
    })),
  };
}

function normalizeRegretTimeCost(response: AnalyticsRegretTimeCostResponse): AnalyticsRegretTimeCostResponse {
  return {
    ...response,
    averageRegret: numberOrNull(response.averageRegret),
    totalHighRegretMinutes: Number(response.totalHighRegretMinutes),
    points: response.points.map((point) => ({
      ...point,
      regretScore: numberOrNull(point.regretScore),
      timeCostMinutes: point.timeCostMinutes === null ? null : Number(point.timeCostMinutes),
    })),
  };
}

function normalizeTopCreators(response: AnalyticsTopCreatorsResponse): AnalyticsTopCreatorsResponse {
  return {
    ...response,
    results: response.results.map((creator) => ({
      ...creator,
      count: Number(creator.count),
      completedCount: Number(creator.completedCount),
      averageRating: numberOrNull(creator.averageRating),
      negativeSignalCount: Number(creator.negativeSignalCount),
    })),
  };
}

function normalizeTopThemes(response: AnalyticsTopThemesResponse): AnalyticsTopThemesResponse {
  return {
    ...response,
    results: response.results.map((theme) => ({
      ...theme,
      count: Number(theme.count),
      averageScore: numberOrNull(theme.averageScore),
    })),
  };
}

export async function fetchAnalyticsInsights(): Promise<AnalyticsInsights> {
  const [
    consumptionTimeline,
    ratingDistribution,
    mediaTypeDistribution,
    dimensionTrends,
    genericnessSatisfaction,
    regretTimeCost,
    topCreators,
    topThemes,
  ] = await Promise.all([
    fetcher<AnalyticsConsumptionTimelineResponse>(API_ROUTES.analyticsConsumptionTimeline),
    fetcher<AnalyticsRatingDistributionResponse>(API_ROUTES.analyticsRatingDistribution),
    fetcher<AnalyticsMediaTypeDistributionResponse>(API_ROUTES.analyticsMediaTypeDistribution),
    fetcher<AnalyticsDimensionTrendsResponse>(API_ROUTES.analyticsDimensionTrends),
    fetcher<AnalyticsGenericnessSatisfactionResponse>(API_ROUTES.analyticsGenericnessSatisfaction),
    fetcher<AnalyticsRegretTimeCostResponse>(API_ROUTES.analyticsRegretTimeCost),
    fetcher<AnalyticsTopCreatorsResponse>(API_ROUTES.analyticsTopCreators),
    fetcher<AnalyticsTopThemesResponse>(API_ROUTES.analyticsTopThemes),
  ]);

  return {
    consumptionTimeline: normalizeConsumptionTimeline(consumptionTimeline),
    ratingDistribution: normalizeRatingDistribution(ratingDistribution),
    mediaTypeDistribution: normalizeMediaTypeDistribution(mediaTypeDistribution),
    dimensionTrends: normalizeDimensionTrends(dimensionTrends),
    genericnessSatisfaction: normalizeGenericnessSatisfaction(genericnessSatisfaction),
    regretTimeCost: normalizeRegretTimeCost(regretTimeCost),
    topCreators: normalizeTopCreators(topCreators),
    topThemes: normalizeTopThemes(topThemes),
  };
}

export function useAnalyticsInsights() {
  return useSWR("analytics-insights", fetchAnalyticsInsights);
}
