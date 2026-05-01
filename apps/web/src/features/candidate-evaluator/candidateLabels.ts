import type { CandidateStatus, EvaluationDecision } from "@canonos/contracts";

import type { StatusTone } from "@/components/data-display/StatusPill";

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  unevaluated: "Unevaluated",
  watch_now: "Watch now",
  sample: "Sample",
  delay: "Delay",
  skip: "Skip",
};

export const evaluationDecisionLabels: Record<EvaluationDecision, string> = {
  watch_now: "Watch now",
  sample: "Sample first",
  delay: "Delay",
  skip: "Skip",
};

export const candidateStatusTone: Record<CandidateStatus, StatusTone> = {
  unevaluated: "neutral",
  watch_now: "success",
  sample: "active",
  delay: "warning",
  skip: "danger",
};
