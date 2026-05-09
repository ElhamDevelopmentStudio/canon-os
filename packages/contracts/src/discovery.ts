import type { MediaType } from "./media";

export const DISCOVERY_MODES = [
  "deep_cut",
  "cross_medium",
  "creator_adjacent",
  "theme_map",
  "modern_exception",
] as const;
export type DiscoveryMode = (typeof DISCOVERY_MODES)[number];

export const DISCOVERY_ERAS = ["", "pre_1970", "1970s_1990s", "2000s", "modern_exception"] as const;
export type DiscoveryEra = (typeof DISCOVERY_ERAS)[number];

export const DISCOVERY_REASON_KINDS = [
  "taste_expansion",
  "underexplored_medium",
  "underexplored_era",
  "underexplored_region",
  "creator_adjacent",
  "theme_adjacent",
  "deep_cut_score",
  "risk",
  "action",
] as const;
export type DiscoveryReasonKind = (typeof DISCOVERY_REASON_KINDS)[number];

export type DiscoverySearchRequest = {
  mode: DiscoveryMode;
  theme?: string;
  mood?: string;
  era?: DiscoveryEra;
  releaseYearMin?: number | null;
  releaseYearMax?: number | null;
  countryLanguage?: string;
  mediaType?: MediaType | "";
  creator?: string;
  narrativePattern?: string;
  favoriteWork?: string;
  sourceMediaItemId?: string | null;
};

export type DiscoveryReason = {
  kind: DiscoveryReasonKind;
  label: string;
  detail: string;
  weight: number;
};

export type DiscoveryResult = {
  id: string;
  title: string;
  mediaType: MediaType;
  releaseYear: number | null;
  countryLanguage: string;
  creator: string;
  premise: string;
  discoveryScore: number;
  obscurityScore: number;
  confidenceScore: number;
  estimatedTimeMinutes: number | null;
  reasons: DiscoveryReason[];
  expansionRationale: string;
  riskRationale: string;
  suggestedAction: string;
};

export type DiscoveryAnalysis = {
  underexploredMediaTypes: MediaType[];
  underexploredEras: Exclude<DiscoveryEra, "">[];
  underexploredCountryLanguages: string[];
  strongestMediaTypes: MediaType[];
  sourceTitle: string | null;
};

export type DiscoveryTrailDraft = {
  name: string;
  theme: string;
  description: string;
  sourceMediaItemId: string | null;
  sourceMediaItemTitle?: string | null;
  resultItems: DiscoveryResult[];
  createdAt: string | null;
};

export type DiscoveryTrail = Omit<DiscoveryTrailDraft, "createdAt"> & {
  id: string;
  createdAt: string;
};

export type DiscoveryTrailListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: DiscoveryTrail[];
};

export type DiscoveryGenerateResponse = {
  search: DiscoverySearchRequest;
  analysis: DiscoveryAnalysis;
  draft: DiscoveryTrailDraft;
  results: DiscoveryResult[];
  generatedAt: string;
};
