import type { TonightModeRecommendation, TonightModeRequest, TonightModeResponse } from "@canonos/contracts";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";

export async function generateTonightPlan(request: TonightModeRequest): Promise<TonightModeResponse> {
  await getCsrfToken();
  const response = await api.post<TonightModeResponse>(API_ROUTES.tonightMode, request);
  return normalizeTonightResponse(response.data);
}

function normalizeTonightRecommendation(recommendation: TonightModeRecommendation): TonightModeRecommendation {
  return {
    ...recommendation,
    score: Number(recommendation.score),
    moodCompatibility: Number(recommendation.moodCompatibility),
    intensityLevel: Number(recommendation.intensityLevel),
    complexityLevel: Number(recommendation.complexityLevel),
    commitmentLevel: Number(recommendation.commitmentLevel),
    freshnessScore: Number(recommendation.freshnessScore),
  };
}

function normalizeTonightResponse(response: TonightModeResponse): TonightModeResponse {
  const recommendations = response.recommendations.map(normalizeTonightRecommendation);
  return {
    ...response,
    recommendations,
    safeChoice: response.safeChoice ? normalizeTonightRecommendation(response.safeChoice) : null,
    challengingChoice: response.challengingChoice
      ? normalizeTonightRecommendation(response.challengingChoice)
      : null,
    wildcardChoice: response.wildcardChoice ? normalizeTonightRecommendation(response.wildcardChoice) : null,
    session: {
      ...response.session,
      recommendations,
    },
  };
}
