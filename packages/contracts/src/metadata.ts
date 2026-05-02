import type { MediaType } from "./media";

export const EXTERNAL_PROVIDERS = ["manual", "movie_tv", "anime", "book", "audiobook"] as const;
export type ExternalProvider = (typeof EXTERNAL_PROVIDERS)[number];

export type MetadataRefreshJobStatus = "queued" | "running" | "succeeded" | "failed";

export type ExternalMediaMatch = {
  provider: ExternalProvider;
  providerItemId: string;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  description: string;
  releaseYear: number | null;
  creator: string;
  imageUrl: string;
  externalRating: number | null;
  externalPopularity: number | null;
  confidence: number;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
};

export type ExternalMetadataSnapshot = {
  id: string;
  mediaItemId: string;
  provider: ExternalProvider;
  providerItemId: string;
  normalizedTitle: string;
  normalizedDescription: string;
  imageUrl: string;
  externalRating: number | null;
  externalPopularity: number | null;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
  lastRefreshedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type MetadataSearchRequest = {
  query: string;
  mediaType?: MediaType | "";
  provider?: ExternalProvider | "";
};

export type MetadataMatchListResponse = {
  count: number;
  results: ExternalMediaMatch[];
};

export type MetadataAttachRequest = {
  provider: ExternalProvider;
  providerItemId: string;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  description?: string;
  releaseYear?: number | null;
  creator?: string;
  imageUrl?: string;
  externalRating?: number | null;
  externalPopularity?: number | null;
  sourceUrl?: string;
  rawPayload?: Record<string, unknown>;
};

export type MetadataRefreshJob = {
  id: string;
  status: MetadataRefreshJobStatus;
  metadata: ExternalMetadataSnapshot;
  queuedAt: string;
  completedAt: string | null;
  message: string;
};
