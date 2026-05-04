import type {
  AntiGenericEvaluation,
  Candidate,
  CandidateAddToLibraryRequest,
  CandidateAddToLibraryResponse,
  CandidateCreateRequest,
  CandidateEvaluateResponse,
  CandidateListResponse,
  CandidateUpdateRequest,
  MediaType,
  PaginationParams,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { paginationParams } from "@/lib/pagination";
import { fetcher } from "@/lib/swr";

export type CandidateListParams = PaginationParams & {
  mediaType?: MediaType | "";
  status?: Candidate["status"] | "";
  search?: string;
};

function candidateListKey(params: CandidateListParams = {}) {
  const query = paginationParams(params);
  if (params.mediaType) query.set("mediaType", params.mediaType);
  if (params.status) query.set("status", params.status);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const serialized = query.toString();
  return `${API_ROUTES.candidates}${serialized ? `?${serialized}` : ""}`;
}

function normalizeAntiGenericEvaluation(evaluation: AntiGenericEvaluation | null): AntiGenericEvaluation | null {
  if (!evaluation) return null;
  return {
    ...evaluation,
    genericnessRiskScore: Number(evaluation.genericnessRiskScore),
    timeWasteRiskScore: Number(evaluation.timeWasteRiskScore),
    positiveExceptionScore: Number(evaluation.positiveExceptionScore),
    detectedSignals: evaluation.detectedSignals.map((signal) => ({
      ...signal,
      score: Number(signal.score),
      weight: Number(signal.weight),
    })),
    positiveExceptions: evaluation.positiveExceptions.map((signal) => ({
      ...signal,
      score: Number(signal.score),
      weight: Number(signal.weight),
    })),
  };
}

function normalizeEvaluation(evaluation: NonNullable<Candidate["latestEvaluation"]>): NonNullable<Candidate["latestEvaluation"]> {
  return {
    ...evaluation,
    confidenceScore: Number(evaluation.confidenceScore),
    likelyFitScore: Number(evaluation.likelyFitScore),
    riskScore: Number(evaluation.riskScore),
    narrativeSignals: evaluation.narrativeSignals.map((signal) => ({
      ...signal,
      impact: Number(signal.impact),
      averageScore: Number(signal.averageScore),
    })),
    antiGenericEvaluation: normalizeAntiGenericEvaluation(evaluation.antiGenericEvaluation),
  };
}

function normalizeCandidate(candidate: Candidate): Candidate {
  return {
    ...candidate,
    latestEvaluation: candidate.latestEvaluation ? normalizeEvaluation(candidate.latestEvaluation) : null,
  };
}

function normalizeCandidateList(response: CandidateListResponse): CandidateListResponse {
  return { ...response, results: response.results.map(normalizeCandidate) };
}

function normalizeEvaluationResponse(response: CandidateEvaluateResponse): CandidateEvaluateResponse {
  return {
    candidate: normalizeCandidate(response.candidate),
    evaluation: normalizeEvaluation(response.evaluation),
  };
}

export function useCandidates(params: CandidateListParams = {}) {
  return useSWR(candidateListKey(params), async (url: string) =>
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
