import type { AftertasteEntry } from "./aftertaste";
import type { MediaScore } from "./taste";

export const MEDIA_TYPES = ["movie", "tv_show", "anime", "novel", "audiobook"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const CONSUMPTION_STATUSES = ["planned", "consuming", "completed", "paused", "dropped"] as const;
export type ConsumptionStatus = (typeof CONSUMPTION_STATUSES)[number];

export type MediaItem = {
  id: string;
  title: string;
  originalTitle: string;
  mediaType: MediaType;
  releaseYear: number | null;
  countryLanguage: string;
  creator: string;
  status: ConsumptionStatus;
  personalRating: number | null;
  startedDate: string | null;
  completedDate: string | null;
  runtimeMinutes: number | null;
  episodeCount: number | null;
  pageCount: number | null;
  audiobookLengthMinutes: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
  scores?: MediaScore[];
  latestAftertaste?: AftertasteEntry | null;
};

export type MediaItemCreateRequest = {
  title: string;
  originalTitle?: string;
  mediaType: MediaType;
  releaseYear?: number | null;
  countryLanguage?: string;
  creator?: string;
  status: ConsumptionStatus;
  personalRating?: number | null;
  startedDate?: string | null;
  completedDate?: string | null;
  runtimeMinutes?: number | null;
  episodeCount?: number | null;
  pageCount?: number | null;
  audiobookLengthMinutes?: number | null;
  notes?: string;
};

export type MediaItemUpdateRequest = Partial<MediaItemCreateRequest>;

export type MediaItemListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MediaItem[];
};

export type MediaItemFilters = {
  mediaType?: MediaType | "";
  status?: ConsumptionStatus | "";
  search?: string;
};
