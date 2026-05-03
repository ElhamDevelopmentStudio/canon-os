import type { MediaType } from "./media";

export const CANON_THEME_KEYS = [
  "moral_collapse",
  "anti_heroes_done_right",
  "forgotten_masterpieces",
  "modern_works_worth_it",
  "atmosphere_over_plot",
  "custom",
] as const;
export type CanonThemeKey = (typeof CANON_THEME_KEYS)[number];

export type CanonTheme = {
  key: CanonThemeKey;
  label: string;
  description: string;
  starterPrompts: string[];
};

export const CANON_SEASON_STATUSES = ["planned", "active", "paused", "completed"] as const;
export type CanonSeasonStatus = (typeof CANON_SEASON_STATUSES)[number];

export const CANON_ITEM_COMPLETION_STATUSES = ["planned", "in_progress", "completed", "skipped"] as const;
export type CanonItemCompletionStatus = (typeof CANON_ITEM_COMPLETION_STATUSES)[number];

export const CANON_ITEM_CANON_STATUSES = [
  "unmarked",
  "personal_canon",
  "near_canon",
  "rejected",
  "historically_important",
] as const;
export type CanonItemCanonStatus = (typeof CANON_ITEM_CANON_STATUSES)[number];

export type CanonSeasonItem = {
  id: string;
  mediaItemId: string | null;
  candidateId: string | null;
  titleSnapshot: string;
  mediaType: MediaType;
  order: number;
  reasonIncluded: string;
  whatToPayAttentionTo: string;
  completionStatus: CanonItemCompletionStatus;
  canonStatus: CanonItemCanonStatus;
  createdAt: string;
  updatedAt: string;
};

export type CanonSeason = {
  id: string;
  title: string;
  theme: CanonThemeKey;
  description: string;
  status: CanonSeasonStatus;
  startDate: string | null;
  endDate: string | null;
  reflectionNotes: string;
  reflectionPrompts: string[];
  itemCount: number;
  completedItemCount: number;
  progressPercent: number;
  items: CanonSeasonItem[];
  createdAt: string;
  updatedAt: string;
};

export type CanonSeasonListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CanonSeason[];
};

export type CanonSeasonCreateRequest = {
  title: string;
  theme: CanonThemeKey;
  description?: string;
  status?: CanonSeasonStatus;
  startDate?: string | null;
  endDate?: string | null;
  reflectionNotes?: string;
};

export type CanonSeasonUpdateRequest = Partial<CanonSeasonCreateRequest>;

export type CanonSeasonItemCreateRequest = {
  mediaItemId?: string | null;
  candidateId?: string | null;
  titleSnapshot?: string;
  mediaType?: MediaType;
  order?: number;
  reasonIncluded?: string;
  whatToPayAttentionTo?: string;
  completionStatus?: CanonItemCompletionStatus;
  canonStatus?: CanonItemCanonStatus;
};

export type CanonSeasonItemUpdateRequest = Partial<CanonSeasonItemCreateRequest>;

export type CanonSeasonItemReorderRequest = {
  itemIds: string[];
};

export type CanonSeasonItemReorderResponse = {
  results: CanonSeasonItem[];
  season: CanonSeason;
};
