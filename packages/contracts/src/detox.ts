import type { ConsumptionStatus, MediaItem, MediaType } from "./media";

export const DETOX_DECISIONS = ["drop", "pause", "delay", "archive", "continue"] as const;
export type DetoxDecisionValue = (typeof DETOX_DECISIONS)[number];

export type DetoxRuleCondition = {
  maxMotivation?: number;
  minProgress?: number;
  maxProgress?: number;
  minEstimatedRemainingMinutes?: number;
  eligibleStatuses?: ConsumptionStatus[];
};

export type DetoxRule = {
  id: string;
  key: string;
  name: string;
  description: string;
  mediaType: MediaType | null;
  sampleLimit: number;
  condition: DetoxRuleCondition;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DetoxRuleListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: DetoxRule[];
};

export type DetoxRuleUpdateRequest = Partial<Pick<DetoxRule, "isEnabled" | "sampleLimit" | "condition">>;

export type DetoxDecision = {
  id: string;
  mediaItemId: string;
  mediaItemTitle: string;
  mediaType: MediaType;
  ruleId: string | null;
  ruleName: string | null;
  decision: DetoxDecisionValue;
  reason: string;
  estimatedTimeSavedMinutes: number;
  progressValue: number;
  motivationScore: number;
  createdAt: string;
};

export type DetoxDecisionListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: DetoxDecision[];
};

export type TimeSavedEntry = {
  decisionId: string;
  mediaItemId: string;
  mediaItemTitle: string;
  decision: Exclude<DetoxDecisionValue, "continue">;
  estimatedTimeSavedMinutes: number;
  createdAt: string;
};

export type DetoxTimeSavedSummary = {
  totalMinutes: number;
  currentMonthMinutes: number;
  decisionCount: number;
  entries: TimeSavedEntry[];
};

export type DetoxEvaluateRequest = {
  mediaItemId: string;
  progressValue: number;
  motivationScore: number;
};

export type DetoxEvaluateResponse = {
  decision: DetoxDecision;
  matchedRule: DetoxRule | null;
  mediaItem: MediaItem;
  timeSavedSummary: DetoxTimeSavedSummary;
};
