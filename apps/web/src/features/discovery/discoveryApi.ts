import type {
  DiscoveryGenerateResponse,
  DiscoveryResult,
  DiscoverySearchRequest,
  DiscoveryTrail,
  DiscoveryTrailDraft,
  DiscoveryTrailListResponse,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeDiscoveryResult(result: DiscoveryResult): DiscoveryResult {
  return {
    ...result,
    discoveryScore: Number(result.discoveryScore),
    obscurityScore: Number(result.obscurityScore),
    confidenceScore: Number(result.confidenceScore),
    estimatedTimeMinutes:
      result.estimatedTimeMinutes === null ? null : Number(result.estimatedTimeMinutes),
    reasons: result.reasons.map((reason) => ({
      ...reason,
      weight: Number(reason.weight),
    })),
  };
}

function normalizeTrailDraft(draft: DiscoveryTrailDraft): DiscoveryTrailDraft {
  return {
    ...draft,
    resultItems: draft.resultItems.map(normalizeDiscoveryResult),
  };
}

function normalizeTrail(trail: DiscoveryTrail): DiscoveryTrail {
  return {
    ...trail,
    resultItems: trail.resultItems.map(normalizeDiscoveryResult),
  };
}

function normalizeList(response: DiscoveryTrailListResponse): DiscoveryTrailListResponse {
  return { ...response, results: response.results.map(normalizeTrail) };
}

function normalizeGenerate(response: DiscoveryGenerateResponse): DiscoveryGenerateResponse {
  return {
    ...response,
    draft: normalizeTrailDraft(response.draft),
    results: response.results.map(normalizeDiscoveryResult),
  };
}

export function useDiscoveryTrails() {
  return useSWR(API_ROUTES.discoveryTrails, async (url: string) =>
    normalizeList(await fetcher<DiscoveryTrailListResponse>(url)),
  );
}

export async function generateDiscoveryTrail(
  request: DiscoverySearchRequest,
): Promise<DiscoveryGenerateResponse> {
  await getCsrfToken();
  const response = await api.post<DiscoveryGenerateResponse>(API_ROUTES.discoveryGenerate, request);
  return normalizeGenerate(response.data);
}

export async function saveDiscoveryTrail(draft: DiscoveryTrailDraft): Promise<DiscoveryTrail> {
  await getCsrfToken();
  const response = await api.post<DiscoveryTrail>(API_ROUTES.discoveryTrails, {
    name: draft.name,
    theme: draft.theme,
    description: draft.description,
    sourceMediaItemId: draft.sourceMediaItemId,
    resultItems: draft.resultItems,
  });
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.discoveryTrails));
  return normalizeTrail(response.data);
}

export async function deleteDiscoveryTrail(id: string): Promise<void> {
  await getCsrfToken();
  await api.delete(`${API_ROUTES.discoveryTrails}${id}/`);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.discoveryTrails));
}
