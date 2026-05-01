import type {
  AftertasteCreateRequest,
  AftertasteEntry,
  AftertasteEntryFilters,
  AftertasteEntryListResponse,
  AftertastePrompt,
  AftertasteUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function aftertasteListKey(filters: AftertasteEntryFilters = {}) {
  const params = new URLSearchParams();
  if (filters.mediaItemId) params.set("mediaItemId", filters.mediaItemId);
  const query = params.toString();
  return `${API_ROUTES.aftertaste}${query ? `?${query}` : ""}`;
}

function normalizeAftertasteEntry(entry: AftertasteEntry): AftertasteEntry {
  return {
    ...entry,
    stayedWithMeScore: Number(entry.stayedWithMeScore),
  };
}

function normalizeAftertasteList(response: AftertasteEntryListResponse): AftertasteEntryListResponse {
  return { ...response, results: response.results.map(normalizeAftertasteEntry) };
}

async function revalidateAftertasteCaches() {
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.aftertaste));
  await globalMutate((key) => typeof key === "string" && key.startsWith(API_ROUTES.mediaItems));
}

export function useAftertasteEntries(filters: AftertasteEntryFilters = {}) {
  const key = aftertasteListKey(filters);
  return useSWR(key, async (url: string) => normalizeAftertasteList(await fetcher<AftertasteEntryListResponse>(url)));
}

export function useAftertastePrompts() {
  return useSWR(API_ROUTES.aftertastePrompts, fetcher<AftertastePrompt[]>);
}

export async function createAftertasteEntry(request: AftertasteCreateRequest): Promise<AftertasteEntry> {
  await getCsrfToken();
  const response = await api.post<AftertasteEntry>(API_ROUTES.aftertaste, request);
  await revalidateAftertasteCaches();
  return normalizeAftertasteEntry(response.data);
}

export async function updateAftertasteEntry(id: string, request: AftertasteUpdateRequest): Promise<AftertasteEntry> {
  await getCsrfToken();
  const response = await api.patch<AftertasteEntry>(`${API_ROUTES.aftertaste}${id}/`, request);
  await revalidateAftertasteCaches();
  return normalizeAftertasteEntry(response.data);
}

export async function deleteAftertasteEntry(id: string): Promise<void> {
  await getCsrfToken();
  await api.delete(`${API_ROUTES.aftertaste}${id}/`);
  await revalidateAftertasteCaches();
}
