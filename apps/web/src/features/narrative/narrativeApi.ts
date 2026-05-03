import type {
  NarrativeAnalysisRequest,
  NarrativeAnalysisListResponse,
  NarrativeAnalysisResult,
  NarrativeAnalysisUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

export function narrativeAnalysisKey(mediaId: string | undefined) {
  return mediaId ? `${API_ROUTES.narrativeAnalyses}?mediaItemId=${mediaId}` : null;
}

function isPending(analysis: NarrativeAnalysisResult | null | undefined) {
  return analysis?.status === "queued" || analysis?.status === "running";
}

function normalizeAnalysis(analysis: NarrativeAnalysisResult): NarrativeAnalysisResult {
  return {
    ...analysis,
    characterComplexityScore: Number(analysis.characterComplexityScore),
    plotComplexityScore: Number(analysis.plotComplexityScore),
    pacingDensityScore: Number(analysis.pacingDensityScore),
    thematicWeightScore: Number(analysis.thematicWeightScore),
    moralAmbiguityScore: Number(analysis.moralAmbiguityScore),
    atmosphereScore: Number(analysis.atmosphereScore),
    endingDependencyScore: Number(analysis.endingDependencyScore),
    tropeFreshnessScore: Number(analysis.tropeFreshnessScore),
    confidenceScore: Number(analysis.confidenceScore),
    extractedTraits: analysis.extractedTraits.map((trait) => ({
      ...trait,
      score: Number(trait.score),
      confidenceScore: Number(trait.confidenceScore),
    })),
  };
}

export function useNarrativeAnalysis(mediaId: string | undefined) {
  return useSWR(
    narrativeAnalysisKey(mediaId),
    async (url: string) => {
      const response = await fetcher<NarrativeAnalysisListResponse>(url);
      return response.results[0] ? normalizeAnalysis(response.results[0]) : null;
    },
    {
      refreshInterval: (latest) => (isPending(latest) ? 1_500 : 0),
      shouldRetryOnError: false,
    },
  );
}

export async function requestNarrativeAnalysis(
  mediaId: string,
  request: NarrativeAnalysisRequest = {},
): Promise<NarrativeAnalysisResult> {
  await getCsrfToken();
  const response = await api.post<NarrativeAnalysisResult>(
    `${API_ROUTES.mediaItems}${mediaId}/narrative-analysis/`,
    request,
  );
  await globalMutate(narrativeAnalysisKey(mediaId));
  return normalizeAnalysis(response.data);
}

export async function updateNarrativeAnalysis(
  analysisId: string,
  request: NarrativeAnalysisUpdateRequest,
): Promise<NarrativeAnalysisResult> {
  await getCsrfToken();
  const response = await api.patch<NarrativeAnalysisResult>(
    `${API_ROUTES.narrativeAnalyses}${analysisId}/`,
    request,
  );
  await globalMutate((key) => typeof key === "string" && key.includes("narrative-analysis"));
  return normalizeAnalysis(response.data);
}
