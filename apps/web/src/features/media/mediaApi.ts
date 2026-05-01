import type {
  MediaItem,
  MediaItemCreateRequest,
  MediaItemFilters,
  MediaItemListResponse,
  MediaItemUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function mediaListKey(filters: MediaItemFilters = {}) {
  const params = new URLSearchParams();
  if (filters.mediaType) params.set("mediaType", filters.mediaType);
  if (filters.status) params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  const query = params.toString();
  return `${API_ROUTES.mediaItems}${query ? `?${query}` : ""}`;
}

function normalizeMediaItem(item: MediaItem): MediaItem {
  return {
    ...item,
    personalRating: item.personalRating === null ? null : Number(item.personalRating),
  };
}

function normalizeMediaList(response: MediaItemListResponse): MediaItemListResponse {
  return {
    ...response,
    results: response.results.map(normalizeMediaItem),
  };
}

export function useMediaItems(filters: MediaItemFilters = {}) {
  const key = mediaListKey(filters);
  return useSWR(key, async (url: string) => normalizeMediaList(await fetcher<MediaItemListResponse>(url)));
}

export function useMediaItem(id: string | undefined) {
  return useSWR(id ? `${API_ROUTES.mediaItems}${id}/` : null, async (url: string) =>
    normalizeMediaItem(await fetcher<MediaItem>(url)),
  );
}

export async function createMediaItem(request: MediaItemCreateRequest): Promise<MediaItem> {
  await getCsrfToken();
  const response = await api.post<MediaItem>(API_ROUTES.mediaItems, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.mediaItems));
  return normalizeMediaItem(response.data);
}

export async function updateMediaItem(id: string, request: MediaItemUpdateRequest): Promise<MediaItem> {
  await getCsrfToken();
  const response = await api.patch<MediaItem>(`${API_ROUTES.mediaItems}${id}/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.mediaItems));
  return normalizeMediaItem(response.data);
}

export async function deleteMediaItem(id: string): Promise<void> {
  await getCsrfToken();
  await api.delete(`${API_ROUTES.mediaItems}${id}/`);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.mediaItems));
}
