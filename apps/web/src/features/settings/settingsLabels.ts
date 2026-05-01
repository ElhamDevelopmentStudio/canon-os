import type { MediaType, RiskTolerance, ThemePreference } from "@canonos/contracts";

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
