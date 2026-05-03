import type { MediaType } from "./media";
import type { QueuePriority } from "./queue";

export const ENERGY_LEVELS = ["low", "medium", "high"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export const FOCUS_LEVELS = ["low", "medium", "deep"] as const;
export type FocusLevel = (typeof FOCUS_LEVELS)[number];

export const DESIRED_EFFECTS = ["comfort", "quality", "surprise", "light", "deep"] as const;
export type DesiredEffect = (typeof DESIRED_EFFECTS)[number];

export const RISK_TOLERANCES = ["low", "medium", "high"] as const;
export type RiskTolerance = (typeof RISK_TOLERANCES)[number];

export const TONIGHT_RECOMMENDATION_SLOTS = ["safe", "challenging", "wildcard"] as const;
export type TonightRecommendationSlot = (typeof TONIGHT_RECOMMENDATION_SLOTS)[number];

export const TONIGHT_RECOMMENDATION_SOURCES = ["queue", "planned_media"] as const;
export type TonightRecommendationSource = (typeof TONIGHT_RECOMMENDATION_SOURCES)[number];

export type TonightModeRequest = {
  availableMinutes: number;
  energyLevel: EnergyLevel;
  focusLevel: FocusLevel;
  desiredEffect: DesiredEffect;
  preferredMediaTypes: MediaType[];
  riskTolerance: RiskTolerance;
};

export type TonightModeRecommendation = {
  slot: TonightRecommendationSlot;
  source: TonightRecommendationSource;
  title: string;
  mediaType: MediaType;
  reason: string;
  score: number;
  estimatedTimeMinutes: number | null;
  queueItemId: string | null;
  mediaItemId: string | null;
  candidateId: string | null;
  priority: QueuePriority | null;
  moodCompatibility: number;
  intensityLevel: number;
  complexityLevel: number;
  commitmentLevel: number;
  freshnessScore: number;
};

export type TonightModeSession = {
  id: string;
  availableMinutes: number;
  energyLevel: EnergyLevel;
  focusLevel: FocusLevel;
  desiredEffect: DesiredEffect;
  preferredMediaTypes: MediaType[];
  riskTolerance: RiskTolerance;
  recommendations: TonightModeRecommendation[];
  createdAt: string;
};

export type TonightModeResponse = {
  session: TonightModeSession;
  recommendations: TonightModeRecommendation[];
  safeChoice: TonightModeRecommendation | null;
  challengingChoice: TonightModeRecommendation | null;
  wildcardChoice: TonightModeRecommendation | null;
};
