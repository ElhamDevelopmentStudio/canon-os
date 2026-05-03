import type { MediaType } from "./media";
import type { DesiredEffect, EnergyLevel, FocusLevel, RiskTolerance } from "./tonight";
import type { ProfileUpdateRequest, UserProfile } from "./auth";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const RECOMMENDATION_FORMULA_WEIGHT_KEYS = [
  "personalFit",
  "moodFit",
  "qualitySignal",
  "genericnessPenalty",
  "regretRiskPenalty",
  "commitmentCostPenalty",
] as const;
export type RecommendationFormulaWeightKey = (typeof RECOMMENDATION_FORMULA_WEIGHT_KEYS)[number];

export type RecommendationFormulaWeights = Record<RecommendationFormulaWeightKey, number>;

export type DefaultTonightModeSettings = {
  availableMinutes: number;
  energyLevel: EnergyLevel;
  focusLevel: FocusLevel;
  desiredEffect: DesiredEffect;
};

export type NotificationPreferences = {
  browserNotifications: boolean;
  emailDigest: boolean;
  recommendationReminders: boolean;
  completionDetoxReminders: boolean;
};

export type RecommendationSettings = {
  defaultMediaTypes: MediaType[];
  defaultRiskTolerance: RiskTolerance;
  modernMediaSkepticismLevel: number;
  genericnessSensitivity: number;
  preferredScoringStrictness: number;
  recommendationFormulaWeights: RecommendationFormulaWeights;
  defaultTonightMode: DefaultTonightModeSettings;
  preferredRecommendationStrictness: number;
  allowModernExceptions: boolean;
  burnoutSensitivity: number;
  completionDetoxStrictness: number;
  notificationPreferences: NotificationPreferences;
};

export type DisplaySettings = {
  themePreference: ThemePreference;
};

export type UserSettings = {
  id: number;
  profile: UserProfile;
  display: DisplaySettings;
  recommendation: RecommendationSettings;
  updatedAt: string;
};

export type UserSettingsUpdateRequest = {
  profile?: ProfileUpdateRequest;
  display?: Partial<DisplaySettings>;
  recommendation?: Partial<RecommendationSettings>;
};
