import type { DesiredEffect, EnergyLevel, FocusLevel, RiskTolerance, TonightRecommendationSlot } from "@canonos/contracts";

export const energyLevelLabels: Record<EnergyLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const focusLevelLabels: Record<FocusLevel, string> = {
  low: "Low",
  medium: "Medium",
  deep: "Deep",
};

export const desiredEffectLabels: Record<DesiredEffect, string> = {
  comfort: "Comfort",
  quality: "Quality",
  surprise: "Surprise",
  light: "Light",
  deep: "Deep",
};

export const riskToleranceLabels: Record<RiskTolerance, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const recommendationSlotLabels: Record<TonightRecommendationSlot, string> = {
  safe: "Safe choice",
  challenging: "Challenging choice",
  wildcard: "Wildcard choice",
};
