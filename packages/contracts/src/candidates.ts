import type { AntiGenericEvaluation } from "./antiGeneric";
import type { MediaItem, MediaItemCreateRequest, MediaType } from "./media";

export const CANDIDATE_STATUSES = ["unevaluated", "watch_now", "sample", "delay", "skip"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const EVALUATION_DECISIONS = ["watch_now", "sample", "delay", "skip"] as const;
export type EvaluationDecision = (typeof EVALUATION_DECISIONS)[number];

export type CandidateEvaluation = {
  id: string;
  candidateId: string;
  decision: EvaluationDecision;
  confidenceScore: number;
  likelyFitScore: number;
  riskScore: number;
  reasonsFor: string[];
  reasonsAgainst: string[];
  bestMood: string;
  recommendedAction: string;
  antiGenericEvaluation: AntiGenericEvaluation | null;
  createdAt: string;
};

export type Candidate = {
  id: string;
  title: string;
  mediaType: MediaType;
  releaseYear: number | null;
  knownCreator: string;
  premise: string;
  sourceOfInterest: string;
  hypeLevel: number | null;
  expectedGenericness: number | null;
  expectedTimeCostMinutes: number | null;
  status: CandidateStatus;
  latestEvaluation: CandidateEvaluation | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateCreateRequest = {
  title: string;
  mediaType: MediaType;
  releaseYear?: number | null;
  knownCreator?: string;
  premise?: string;
  sourceOfInterest?: string;
  hypeLevel?: number | null;
  expectedGenericness?: number | null;
  expectedTimeCostMinutes?: number | null;
};

export type CandidateUpdateRequest = Partial<CandidateCreateRequest & { status: CandidateStatus }>;

export type CandidateListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Candidate[];
};

export type CandidateEvaluateRequest = {
  candidate: CandidateCreateRequest;
};

export type CandidateEvaluateResponse = {
  candidate: Candidate;
  evaluation: CandidateEvaluation;
};

export type CandidateAddToLibraryRequest = Pick<
  MediaItemCreateRequest,
  "status" | "personalRating" | "notes"
>;

export type CandidateAddToLibraryResponse = {
  candidate: Candidate;
  mediaItem: MediaItem;
};
