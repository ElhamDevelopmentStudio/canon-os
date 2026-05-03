import type {
  AdaptationCompleteness,
  AdaptationRelationType,
  AdaptationRiskSeverity,
  ExperienceOrderRecommendationValue,
} from "@canonos/contracts";

import type { StatusTone } from "@/components/data-display/StatusPill";

export const adaptationRelationTypeLabels: Record<AdaptationRelationType, string> = {
  source_to_adaptation: "Source to adaptation",
  adaptation_to_source: "Adaptation to source",
  remake: "Remake",
  alternate_version: "Alternate version",
  inspired_by: "Inspired by",
  audiobook_version: "Audiobook version",
  manga_to_anime: "Manga to anime",
  novel_to_film: "Novel to film",
  novel_to_show: "Novel to show",
};

export const adaptationCompletenessLabels: Record<AdaptationCompleteness, string> = {
  complete: "Complete",
  partial: "Partial",
  incomplete: "Incomplete",
  loose: "Loose",
  unknown: "Unknown",
};

export const experienceOrderLabels: Record<ExperienceOrderRecommendationValue, string> = {
  read_first: "Read first",
  watch_first: "Watch first",
  listen_first: "Listen first",
  adaptation_sufficient: "Adaptation sufficient",
  source_preferred: "Source preferred",
  skip_adaptation: "Skip adaptation",
};

export const adaptationCompletenessTone: Record<AdaptationCompleteness, StatusTone> = {
  complete: "success",
  partial: "warning",
  incomplete: "danger",
  loose: "warning",
  unknown: "neutral",
};

export const riskSeverityTone: Record<AdaptationRiskSeverity, StatusTone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};
