import type { MediaItem } from "./media";

export const ANTI_GENERIC_FINAL_VERDICTS = [
  "low_risk",
  "sample_with_guardrail",
  "likely_generic_skip",
  "modern_exception",
] as const;
export type AntiGenericFinalVerdict = (typeof ANTI_GENERIC_FINAL_VERDICTS)[number];

export type GenericnessSignal = {
  ruleId: string;
  ruleKey: string;
  name: string;
  description: string;
  weight: number;
  score: number;
  evidence: string;
};

export type PositiveExceptionSignal = GenericnessSignal;

export type AntiGenericEvaluation = {
  id: string;
  candidateId: string;
  mediaItemId: string | null;
  genericnessRiskScore: number;
  timeWasteRiskScore: number;
  positiveExceptionScore: number;
  detectedSignals: GenericnessSignal[];
  positiveExceptions: PositiveExceptionSignal[];
  finalVerdict: AntiGenericFinalVerdict;
  createdAt: string;
};

export type AntiGenericRule = {
  id: string;
  key: string;
  name: string;
  description: string;
  weight: number;
  isPositiveException: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AntiGenericRuleUpdateRequest = Partial<Pick<AntiGenericRule, "weight" | "isEnabled">>;

export type AntiGenericRuleListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AntiGenericRule[];
};

export type AntiGenericEvaluateRequest = {
  candidateId: string;
  mediaItemId?: string | null;
};

export type AntiGenericEvaluateResponse = {
  evaluation: AntiGenericEvaluation;
  mediaItem?: MediaItem | null;
};
