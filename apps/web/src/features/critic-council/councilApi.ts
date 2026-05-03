import type {
  CouncilApplyResponse,
  CouncilSession,
  CouncilSessionCreateRequest,
  CouncilSessionFilters,
  CouncilSessionListResponse,
  CriticPersona,
  CriticPersonaListResponse,
  CriticPersonaUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizePersona(persona: CriticPersona): CriticPersona {
  return {
    ...persona,
    weight: Number(persona.weight),
    sortOrder: Number(persona.sortOrder),
  };
}

function normalizeSession(session: CouncilSession): CouncilSession {
  return {
    ...session,
    criticOpinions: session.criticOpinions.map((opinion) => ({
      ...opinion,
      weight: Number(opinion.weight),
      confidence: Number(opinion.confidence),
    })),
    finalDecision: {
      ...session.finalDecision,
      confidenceScore: Number(session.finalDecision.confidenceScore),
      disagreementScore: Number(session.finalDecision.disagreementScore),
    },
  };
}

function sessionsKey(filters: CouncilSessionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.candidateId) params.set("candidateId", filters.candidateId);
  if (filters.mediaItemId) params.set("mediaItemId", filters.mediaItemId);
  const query = params.toString();
  return `${API_ROUTES.councilSessions}${query ? `?${query}` : ""}`;
}

export function useCriticPersonas() {
  return useSWR(API_ROUTES.criticPersonas, async (url: string) => {
    const response = await fetcher<CriticPersonaListResponse>(url);
    return { ...response, results: response.results.map(normalizePersona) };
  });
}

export function useCouncilSessions(filters: CouncilSessionFilters = {}) {
  const key = sessionsKey(filters);
  return useSWR(key, async (url: string) => {
    const response = await fetcher<CouncilSessionListResponse>(url);
    return { ...response, results: response.results.map(normalizeSession) };
  });
}

export async function updateCriticPersona(
  id: string,
  request: CriticPersonaUpdateRequest,
): Promise<CriticPersona> {
  await getCsrfToken();
  const response = await api.patch<CriticPersona>(`${API_ROUTES.criticPersonas}${id}/`, request);
  await globalMutate(API_ROUTES.criticPersonas);
  return normalizePersona(response.data);
}

export async function resetCriticPersonas(): Promise<CriticPersona[]> {
  await getCsrfToken();
  const response = await api.post<{ results: CriticPersona[] }>(`${API_ROUTES.criticPersonas}reset/`);
  await globalMutate(API_ROUTES.criticPersonas);
  return response.data.results.map(normalizePersona);
}

export async function createCouncilSession(request: CouncilSessionCreateRequest): Promise<CouncilSession> {
  await getCsrfToken();
  const response = await api.post<CouncilSession>(API_ROUTES.councilSessions, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.councilSessions));
  return normalizeSession(response.data);
}

export async function applyCouncilDecisionToCandidate(id: string): Promise<CouncilApplyResponse> {
  await getCsrfToken();
  const response = await api.post<CouncilApplyResponse>(
    `${API_ROUTES.councilSessions}${id}/apply-to-candidate/`,
  );
  await Promise.all([
    globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.councilSessions)),
    globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.candidates)),
  ]);
  return {
    ...response.data,
    session: normalizeSession(response.data.session),
  };
}
