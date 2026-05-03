import type {
  CanonSeason,
  CanonSeasonCreateRequest,
  CanonSeasonItem,
  CanonSeasonItemCreateRequest,
  CanonSeasonItemReorderResponse,
  CanonSeasonItemUpdateRequest,
  CanonSeasonListResponse,
  CanonSeasonUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeItem(item: CanonSeasonItem): CanonSeasonItem {
  return { ...item, order: Number(item.order) };
}

function normalizeSeason(season: CanonSeason): CanonSeason {
  return {
    ...season,
    itemCount: Number(season.itemCount),
    completedItemCount: Number(season.completedItemCount),
    progressPercent: Number(season.progressPercent),
    items: [...season.items].map(normalizeItem).sort((a, b) => a.order - b.order),
  };
}

function normalizeSeasonList(response: CanonSeasonListResponse): CanonSeasonListResponse {
  return { ...response, results: response.results.map(normalizeSeason) };
}

function seasonDetailPath(id: string): string {
  return `${API_ROUTES.canonSeasons}${id}/`;
}

export function useCanonSeasons() {
  return useSWR(API_ROUTES.canonSeasons, async (url: string) =>
    normalizeSeasonList(await fetcher<CanonSeasonListResponse>(url)),
  );
}

export function useCanonSeason(id: string | undefined) {
  return useSWR(id ? seasonDetailPath(id) : null, async (url: string) =>
    normalizeSeason(await fetcher<CanonSeason>(url)),
  );
}

export async function createCanonSeason(request: CanonSeasonCreateRequest): Promise<CanonSeason> {
  await getCsrfToken();
  const response = await api.post<CanonSeason>(API_ROUTES.canonSeasons, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
  return normalizeSeason(response.data);
}

export async function updateCanonSeason(
  id: string,
  request: CanonSeasonUpdateRequest,
): Promise<CanonSeason> {
  await getCsrfToken();
  const response = await api.patch<CanonSeason>(seasonDetailPath(id), request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
  return normalizeSeason(response.data);
}

export async function deleteCanonSeason(id: string): Promise<void> {
  await getCsrfToken();
  await api.delete(seasonDetailPath(id));
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
}

export async function addCanonSeasonItem(
  seasonId: string,
  request: CanonSeasonItemCreateRequest,
): Promise<CanonSeasonItem> {
  await getCsrfToken();
  const response = await api.post<CanonSeasonItem>(`${seasonDetailPath(seasonId)}items/`, request);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
  return normalizeItem(response.data);
}

export async function updateCanonSeasonItem(
  seasonId: string,
  itemId: string,
  request: CanonSeasonItemUpdateRequest,
): Promise<CanonSeasonItem> {
  await getCsrfToken();
  const response = await api.patch<CanonSeasonItem>(
    `${seasonDetailPath(seasonId)}items/${itemId}/`,
    request,
  );
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
  return normalizeItem(response.data);
}

export async function reorderCanonSeasonItems(
  seasonId: string,
  itemIds: string[],
): Promise<CanonSeasonItemReorderResponse> {
  await getCsrfToken();
  const response = await api.post<CanonSeasonItemReorderResponse>(
    `${seasonDetailPath(seasonId)}items/reorder/`,
    { itemIds },
  );
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
  return {
    results: response.data.results.map(normalizeItem),
    season: normalizeSeason(response.data.season),
  };
}

export async function deleteCanonSeasonItem(seasonId: string, itemId: string): Promise<void> {
  await getCsrfToken();
  await api.delete(`${seasonDetailPath(seasonId)}items/${itemId}/`);
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.canonSeasons));
}
