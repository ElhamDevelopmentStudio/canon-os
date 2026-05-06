import { mutate as globalMutate } from "swr";

import type {
  ExternalMediaMatch,
  ExternalMetadataSnapshot,
  ExternalProvider,
  MediaType,
  MetadataMatchListResponse,
  MetadataRefreshJob,
  ProviderCapabilityListResponse,
} from "@canonos/contracts";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";

export type MetadataSearchParams = {
  query: string;
  mediaType?: MediaType | "";
  provider?: ExternalProvider | "";
};

export async function fetchMetadataProviders(): Promise<ProviderCapabilityListResponse> {
  const response = await api.get<ProviderCapabilityListResponse>(API_ROUTES.metadataProviders);
  return response.data;
}

function normalizeMetadata(metadata: ExternalMetadataSnapshot): ExternalMetadataSnapshot {
  return {
    ...metadata,
    externalRating: metadata.externalRating === null ? null : Number(metadata.externalRating),
    externalPopularity: metadata.externalPopularity === null ? null : Number(metadata.externalPopularity),
  };
}

function normalizeMatch(match: ExternalMediaMatch): ExternalMediaMatch {
  return {
    ...match,
    externalRating: match.externalRating === null ? null : Number(match.externalRating),
    externalPopularity: match.externalPopularity === null ? null : Number(match.externalPopularity),
    confidence: Number(match.confidence),
  };
}

export async function searchMetadata(params: MetadataSearchParams): Promise<MetadataMatchListResponse> {
  const query = params.query.trim();
  if (!query) {
    return { count: 0, results: [] };
  }
  const searchParams = new URLSearchParams({ query });
  if (params.mediaType) searchParams.set("mediaType", params.mediaType);
  if (params.provider) searchParams.set("provider", params.provider);
  const response = await api.get<MetadataMatchListResponse>(`${API_ROUTES.metadataMatches}?${searchParams}`);
  return {
    ...response.data,
    results: response.data.results.map(normalizeMatch),
  };
}

export async function attachMetadata(mediaItemId: string, match: ExternalMediaMatch): Promise<ExternalMetadataSnapshot> {
  await getCsrfToken();
  const response = await api.post<ExternalMetadataSnapshot>(`${API_ROUTES.mediaItems}${mediaItemId}/metadata/attach/`, match);
  return normalizeMetadata(response.data);
}

export async function refreshMetadata(mediaItemId: string): Promise<MetadataRefreshJob> {
  await getCsrfToken();
  const response = await api.post<MetadataRefreshJob>(`${API_ROUTES.mediaItems}${mediaItemId}/metadata/refresh/`);
  await globalMutate(API_ROUTES.backgroundJobs);
  return {
    ...response.data,
    metadata: normalizeMetadata(response.data.metadata),
  };
}
