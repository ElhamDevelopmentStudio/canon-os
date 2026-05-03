import type {
  TasteEvolutionGenerateRequest,
  TasteEvolutionGenerateResponse,
  TasteEvolutionSnapshot,
  TasteEvolutionTimelineResponse,
  TasteTrend,
  TasteTrendPoint,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizePoint(point: TasteTrendPoint): TasteTrendPoint {
  return {
    ...point,
    value: point.value === null ? null : Number(point.value),
    count: Number(point.count),
  };
}

function normalizeTrend(trend: TasteTrend): TasteTrend {
  return {
    ...trend,
    currentValue: typeof trend.currentValue === "number" ? Number(trend.currentValue) : trend.currentValue,
    previousValue: typeof trend.previousValue === "number" ? Number(trend.previousValue) : trend.previousValue,
    points: trend.points.map(normalizePoint),
  };
}

export function normalizeSnapshot(snapshot: TasteEvolutionSnapshot): TasteEvolutionSnapshot {
  return {
    ...snapshot,
    aggregateData: {
      ...snapshot.aggregateData,
      evidenceCounts: {
        mediaCount: Number(snapshot.aggregateData.evidenceCounts.mediaCount),
        completedMediaCount: Number(snapshot.aggregateData.evidenceCounts.completedMediaCount),
        ratedMediaCount: Number(snapshot.aggregateData.evidenceCounts.ratedMediaCount),
        scoredMediaCount: Number(snapshot.aggregateData.evidenceCounts.scoredMediaCount),
        scoreCount: Number(snapshot.aggregateData.evidenceCounts.scoreCount),
        aftertasteCount: Number(snapshot.aggregateData.evidenceCounts.aftertasteCount),
        snapshotMonthCount: Number(snapshot.aggregateData.evidenceCounts.snapshotMonthCount),
      },
      ratingTrend: normalizeTrend(snapshot.aggregateData.ratingTrend),
      mediaTypeTrend: normalizeTrend(snapshot.aggregateData.mediaTypeTrend),
      genericnessToleranceTrend: normalizeTrend(snapshot.aggregateData.genericnessToleranceTrend),
      regretTrend: normalizeTrend(snapshot.aggregateData.regretTrend),
      completionFatigueTrend: normalizeTrend(snapshot.aggregateData.completionFatigueTrend),
      favoriteDimensionTrend: normalizeTrend(snapshot.aggregateData.favoriteDimensionTrend),
    },
  };
}

function normalizeTimeline(response: TasteEvolutionTimelineResponse): TasteEvolutionTimelineResponse {
  return {
    ...response,
    count: Number(response.count),
    results: response.results.map(normalizeSnapshot),
  };
}

export function useTasteEvolutionTimeline() {
  return useSWR(API_ROUTES.tasteEvolution, async (url: string) =>
    normalizeTimeline(await fetcher<TasteEvolutionTimelineResponse>(url)),
  );
}

export async function generateTasteEvolutionSnapshot(
  request: TasteEvolutionGenerateRequest = {},
): Promise<TasteEvolutionGenerateResponse> {
  await getCsrfToken();
  const response = await api.post<TasteEvolutionGenerateResponse>(API_ROUTES.tasteEvolutionGenerate, request);
  await globalMutate(API_ROUTES.tasteEvolution);
  await globalMutate(API_ROUTES.dashboardSummary);
  return normalizeSnapshot(response.data);
}
