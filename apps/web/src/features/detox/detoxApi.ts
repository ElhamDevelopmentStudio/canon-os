import type {
  DetoxDecision,
  DetoxDecisionListResponse,
  DetoxEvaluateRequest,
  DetoxEvaluateResponse,
  DetoxRule,
  DetoxRuleListResponse,
  DetoxRuleUpdateRequest,
  DetoxTimeSavedSummary,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeRule(rule: DetoxRule): DetoxRule {
  return {
    ...rule,
    sampleLimit: Number(rule.sampleLimit),
  };
}

function normalizeDecision(decision: DetoxDecision): DetoxDecision {
  return {
    ...decision,
    estimatedTimeSavedMinutes: Number(decision.estimatedTimeSavedMinutes),
    progressValue: Number(decision.progressValue),
    motivationScore: Number(decision.motivationScore),
  };
}

function normalizeRuleList(response: DetoxRuleListResponse): DetoxRuleListResponse {
  return { ...response, results: response.results.map(normalizeRule) };
}

function normalizeDecisionList(response: DetoxDecisionListResponse): DetoxDecisionListResponse {
  return { ...response, results: response.results.map(normalizeDecision) };
}

function normalizeTimeSaved(summary: DetoxTimeSavedSummary): DetoxTimeSavedSummary {
  return {
    ...summary,
    totalMinutes: Number(summary.totalMinutes),
    currentMonthMinutes: Number(summary.currentMonthMinutes),
    decisionCount: Number(summary.decisionCount),
    entries: summary.entries.map((entry) => ({
      ...entry,
      estimatedTimeSavedMinutes: Number(entry.estimatedTimeSavedMinutes),
    })),
  };
}

function normalizeEvaluateResponse(response: DetoxEvaluateResponse): DetoxEvaluateResponse {
  return {
    ...response,
    decision: normalizeDecision(response.decision),
    matchedRule: response.matchedRule ? normalizeRule(response.matchedRule) : null,
    timeSavedSummary: normalizeTimeSaved(response.timeSavedSummary),
  };
}

export function useDetoxRules() {
  return useSWR(API_ROUTES.detoxRules, async (url: string) => normalizeRuleList(await fetcher<DetoxRuleListResponse>(url)));
}

export function useDetoxDecisions() {
  return useSWR(API_ROUTES.detoxDecisions, async (url: string) =>
    normalizeDecisionList(await fetcher<DetoxDecisionListResponse>(url)),
  );
}

export function useDetoxTimeSaved() {
  return useSWR(API_ROUTES.detoxTimeSaved, async (url: string) =>
    normalizeTimeSaved(await fetcher<DetoxTimeSavedSummary>(url)),
  );
}

export async function updateDetoxRule(id: string, request: DetoxRuleUpdateRequest): Promise<DetoxRule> {
  await getCsrfToken();
  const response = await api.patch<DetoxRule>(`${API_ROUTES.detoxRules}${id}/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.detoxRules));
  return normalizeRule(response.data);
}

export async function evaluateDetox(request: DetoxEvaluateRequest): Promise<DetoxEvaluateResponse> {
  await getCsrfToken();
  const response = await api.post<DetoxEvaluateResponse>(API_ROUTES.detoxEvaluate, request);
  await globalMutate(API_ROUTES.detoxDecisions);
  await globalMutate(API_ROUTES.detoxTimeSaved);
  return normalizeEvaluateResponse(response.data);
}
