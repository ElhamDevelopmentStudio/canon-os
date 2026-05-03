import type {
  MediaType,
  RecommendationFormulaWeightKey,
  RiskTolerance,
  ThemePreference,
} from "@canonos/contracts";

export const themePreferenceLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export const riskToleranceLabels: Record<RiskTolerance, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const settingsMediaTypeLabels: Record<MediaType, string> = {
  movie: "Movie",
  tv_show: "TV Show",
  anime: "Anime",
  novel: "Novel",
  audiobook: "Audiobook",
};

export const recommendationFormulaWeightLabels: Record<RecommendationFormulaWeightKey, string> = {
  personalFit: "Personal fit",
  moodFit: "Mood fit",
  qualitySignal: "Quality signal",
  genericnessPenalty: "Genericness penalty",
  regretRiskPenalty: "Regret risk penalty",
  commitmentCostPenalty: "Commitment cost penalty",
};

export const recommendationFormulaWeightHelp: Record<RecommendationFormulaWeightKey, string> = {
  personalFit: "How strongly history and known taste should lift a recommendation.",
  moodFit: "How much current energy, focus, and desired effect should matter.",
  qualitySignal: "How much craft, narrative, and trusted evidence should lift a choice.",
  genericnessPenalty: "How heavily genericness red flags should reduce score.",
  regretRiskPenalty: "How much likely wasted time or weak aftertaste should count against it.",
  commitmentCostPenalty: "How strongly long runtime or complexity should be penalized.",
};
