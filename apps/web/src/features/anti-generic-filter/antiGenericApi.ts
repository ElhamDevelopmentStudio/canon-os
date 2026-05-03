import type {
  AntiGenericEvaluateRequest,
  AntiGenericEvaluateResponse,
  AntiGenericEvaluation,
  AntiGenericRule,
  AntiGenericRuleListResponse,
  AntiGenericRuleUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeEvaluation(evaluation: AntiGenericEvaluation): AntiGenericEvaluation {
  return {
    ...evaluation,
    genericnessRiskScore: Number(evaluation.genericnessRiskScore),
    timeWasteRiskScore: Number(evaluation.timeWasteRiskScore),
    positiveExceptionScore: Number(evaluation.positiveExceptionScore),
    detectedSignals: evaluation.detectedSignals.map((signal) => ({
      ...signal,
      weight: Number(signal.weight),
      score: Number(signal.score),
    })),
    positiveExceptions: evaluation.positiveExceptions.map((signal) => ({
      ...signal,
      weight: Number(signal.weight),
      score: Number(signal.score),
    })),
  };
}

function normalizeRule(rule: AntiGenericRule): AntiGenericRule {
  return { ...rule, weight: Number(rule.weight) };
}

function normalizeRuleList(response: AntiGenericRuleListResponse): AntiGenericRuleListResponse {
  return { ...response, results: response.results.map(normalizeRule) };
}

export function useAntiGenericRules() {
  return useSWR(API_ROUTES.antiGenericRules, async (url: string) =>
    normalizeRuleList(await fetcher<AntiGenericRuleListResponse>(url)),
  );
}

export async function updateAntiGenericRule(
  id: string,
  request: AntiGenericRuleUpdateRequest,
): Promise<AntiGenericRule> {
  await getCsrfToken();
  const response = await api.patch<AntiGenericRule>(`${API_ROUTES.antiGenericRules}${id}/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.antiGenericRules));
  return normalizeRule(response.data);
}

export async function resetAntiGenericRules(): Promise<AntiGenericRule[]> {
  await getCsrfToken();
  const response = await api.post<{ results: AntiGenericRule[] }>(`${API_ROUTES.antiGenericRules}reset/`);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.antiGenericRules));
  return response.data.results.map(normalizeRule);
}

export async function runAntiGenericEvaluation(
  request: AntiGenericEvaluateRequest,
): Promise<AntiGenericEvaluateResponse> {
  await getCsrfToken();
  const response = await api.post<AntiGenericEvaluateResponse>(API_ROUTES.antiGenericEvaluate, request);
  return { ...response.data, evaluation: normalizeEvaluation(response.data.evaluation) };
}
