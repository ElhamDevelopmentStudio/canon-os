import type { DiscoveryEra, DiscoveryMode } from "@canonos/contracts";

export const discoveryModeLabels: Record<DiscoveryMode, string> = {
  deep_cut: "Deep cut",
  cross_medium: "Cross-medium",
  creator_adjacent: "Creator adjacent",
  theme_map: "Theme map",
  modern_exception: "Modern exception",
};

export const discoveryEraLabels: Record<DiscoveryEra, string> = {
  "": "Any era",
  pre_1970: "Pre-1970",
  "1970s_1990s": "1970s-1990s",
  "2000s": "2000s-mid 2010s",
  modern_exception: "Modern exceptions",
};

export const discoveryReasonKindLabels = {
  taste_expansion: "Taste expansion",
  underexplored_medium: "Underexplored medium",
  underexplored_era: "Underexplored era",
  underexplored_region: "Underexplored region",
  creator_adjacent: "Creator adjacent",
  theme_adjacent: "Theme adjacent",
  deep_cut_score: "Deep-cut score",
  risk: "Risk",
  action: "Action",
} as const;
