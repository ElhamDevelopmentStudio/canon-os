import type {
  Candidate,
  CandidateAddToLibraryRequest,
  CandidateAddToLibraryResponse,
  CandidateCreateRequest,
  CandidateEvaluateResponse,
  CandidateListResponse,
  CandidateUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeCandidate(candidate: Candidate): Candidate {
  return {
    ...candidate,
    latestEvaluation: candidate.latestEvaluation
      ? {
          ...candidate.latestEvaluation,
          confidenceScore: Number(candidate.latestEvaluation.confidenceScore),
          likelyFitScore: Number(candidate.latestEvaluation.likelyFitScore),
          riskScore: Number(candidate.latestEvaluation.riskScore),
        }
      : null,
  };
}

function normalizeCandidateList(response: CandidateListResponse): CandidateListResponse {
  return { ...response, results: response.results.map(normalizeCandidate) };
}

function normalizeEvaluationResponse(response: CandidateEvaluateResponse): CandidateEvaluateResponse {
  return {
    candidate: normalizeCandidate(response.candidate),
    evaluation: {
      ...response.evaluation,
      confidenceScore: Number(response.evaluation.confidenceScore),
      likelyFitScore: Number(response.evaluation.likelyFitScore),
      riskScore: Number(response.evaluation.riskScore),
    },
  };
}

export function useCandidates() {
  return useSWR(API_ROUTES.candidates, async (url: string) =>
    normalizeCandidateList(await fetcher<CandidateListResponse>(url)),
  );
}

export async function createCandidate(request: CandidateCreateRequest): Promise<Candidate> {
  await getCsrfToken();
  const response = await api.post<Candidate>(API_ROUTES.candidates, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.candidates));
  return normalizeCandidate(response.data);
}

export async function updateCandidate(id: string, request: CandidateUpdateRequest): Promise<Candidate> {
  await getCsrfToken();
  const response = await api.patch<Candidate>(`${API_ROUTES.candidates}${id}/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.candidates));
  return normalizeCandidate(response.data);
}

export async function evaluateCandidate(id: string): Promise<CandidateEvaluateResponse> {
  await getCsrfToken();
  const response = await api.post<CandidateEvaluateResponse>(`${API_ROUTES.candidates}${id}/evaluate/`);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.candidates));
  return normalizeEvaluationResponse(response.data);
}

export async function addCandidateToLibrary(
  id: string,
  request: CandidateAddToLibraryRequest = { status: "planned" },
): Promise<CandidateAddToLibraryResponse> {
  await getCsrfToken();
  const response = await api.post<CandidateAddToLibraryResponse>(
    `${API_ROUTES.candidates}${id}/add-to-library/`,
    request,
  );
  await Promise.all([
    globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.candidates)),
    globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.mediaItems)),
  ]);
  return { ...response.data, candidate: normalizeCandidate(response.data.candidate) };
}
