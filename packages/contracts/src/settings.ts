import type { MediaType } from "./media";
import type { RiskTolerance } from "./tonight";
import type { ProfileUpdateRequest, UserProfile } from "./auth";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export type RecommendationSettings = {
  defaultMediaTypes: MediaType[];
  defaultRiskTolerance: RiskTolerance;
  modernMediaSkepticismLevel: number;
  genericnessSensitivity: number;
  preferredScoringStrictness: number;
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
