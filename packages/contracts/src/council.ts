import type { Candidate, EvaluationDecision } from "./candidates";

export const CRITIC_PERSONA_ROLES = [
  "ruthless_critic",
  "historian",
  "modern_defender",
  "anime_specialist",
  "literary_editor",
  "mood_doctor",
  "completion_strategist",
  "wildcard",
] as const;

export type CriticPersonaRole = (typeof CRITIC_PERSONA_ROLES)[number];

export type CriticPersona = {
  id: string;
  key: string;
  name: string;
  role: CriticPersonaRole;
  description: string;
  weight: number;
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CriticPersonaListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CriticPersona[];
};

export type CriticPersonaUpdateRequest = {
  weight?: number;
  isEnabled?: boolean;
};

export type CriticOpinion = {
  personaId: string;
  role: CriticPersonaRole;
  name: string;
  description: string;
  weight: number;
  recommendation: EvaluationDecision;
  recommendationLabel: string;
  confidence: number;
  stance: string;
  argument: string;
  reason: string;
  evidence: string[];
};

export type CouncilFinalDecision = {
  decision: EvaluationDecision;
  label: string;
  confidenceScore: number;
  disagreementScore: number;
  explanation: string;
  appliedToCandidate: boolean;
};

export type CouncilSession = {
  id: string;
  candidateId: string | null;
  candidateTitle: string | null;
  mediaItemId: string | null;
  mediaItemTitle: string | null;
  prompt: string;
  context: Record<string, unknown>;
  criticOpinions: CriticOpinion[];
  finalDecision: CouncilFinalDecision;
  createdAt: string;
  updatedAt: string;
};

export type CouncilSessionListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CouncilSession[];
};

export type CouncilSessionCreateRequest = {
  prompt?: string;
  candidateId?: string | null;
  mediaItemId?: string | null;
};

export type CouncilSessionFilters = {
  candidateId?: string;
  mediaItemId?: string;
};

export type CouncilApplyResponse = {
  session: CouncilSession;
  candidate: Candidate | null;
};
