import type {
  QueueItem,
  QueueItemCreateRequest,
  QueueItemListResponse,
  QueueRecalculateResponse,
  QueueItemUpdateRequest,
  QueueReorderResponse,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

export type QueueItemFilters = {
  mediaType?: string;
  priority?: string;
  search?: string;
};

function queueListKey(filters: QueueItemFilters = {}) {
  const params = new URLSearchParams();
  if (filters.mediaType) params.set("mediaType", filters.mediaType);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  const query = params.toString();
  return `${API_ROUTES.queueItems}${query ? `?${query}` : ""}`;
}

function normalizeQueueItem(item: QueueItem): QueueItem {
  return {
    ...item,
    estimatedTimeMinutes:
      item.estimatedTimeMinutes === null ? null : Number(item.estimatedTimeMinutes),
    moodCompatibility: Number(item.moodCompatibility),
    intensityLevel: Number(item.intensityLevel),
    complexityLevel: Number(item.complexityLevel),
    commitmentLevel: Number(item.commitmentLevel),
    freshnessScore: Number(item.freshnessScore),
    timesRecommended: Number(item.timesRecommended),
    queuePosition: Number(item.queuePosition),
  };
}

function normalizeQueueList(response: QueueItemListResponse): QueueItemListResponse {
  return { ...response, results: response.results.map(normalizeQueueItem) };
}

export function useQueueItems(filters: QueueItemFilters = {}) {
  const key = queueListKey(filters);
  return useSWR(key, async (url: string) => normalizeQueueList(await fetcher<QueueItemListResponse>(url)));
}

export async function createQueueItem(request: QueueItemCreateRequest): Promise<QueueItem> {
  await getCsrfToken();
  const response = await api.post<QueueItem>(API_ROUTES.queueItems, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.queueItems));
  return normalizeQueueItem(response.data);
}

export async function updateQueueItem(id: string, request: QueueItemUpdateRequest): Promise<QueueItem> {
  await getCsrfToken();
  const response = await api.patch<QueueItem>(`${API_ROUTES.queueItems}${id}/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.queueItems));
  return normalizeQueueItem(response.data);
}

export async function deleteQueueItem(id: string): Promise<void> {
  await getCsrfToken();
  await api.delete(`${API_ROUTES.queueItems}${id}/`);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.queueItems));
}

export async function reorderQueueItems(itemIds: string[]): Promise<QueueReorderResponse> {
  await getCsrfToken();
  const response = await api.post<QueueReorderResponse>(`${API_ROUTES.queueItems}reorder/`, { itemIds });
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.queueItems));
  return { results: response.data.results.map(normalizeQueueItem) };
}

export async function recalculateQueue(): Promise<QueueRecalculateResponse> {
  await getCsrfToken();
  const response = await api.post<QueueRecalculateResponse>(API_ROUTES.queueRecalculate);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.queueItems));
  return {
    ...response.data,
    results: response.data.results.map(normalizeQueueItem),
    scores: response.data.scores.map((score) => ({
      ...score,
      score: Number(score.score),
      freshnessScore: Number(score.freshnessScore),
    })),
    summary: {
      ...response.data.summary,
      activeCount: Number(response.data.summary.activeCount),
      archivedCount: Number(response.data.summary.archivedCount),
      averageScore: Number(response.data.summary.averageScore),
    },
  };
}
