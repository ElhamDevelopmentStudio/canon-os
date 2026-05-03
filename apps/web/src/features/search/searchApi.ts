import type { UnifiedSearchResponse } from "@canonos/contracts";
import useSWR from "swr";

import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function searchKey(query: string, limit = 5): string | null {
  const normalized = query.trim();
  if (normalized.length < 2) return null;
  const params = new URLSearchParams({ q: normalized, limit: String(limit) });
  return `${API_ROUTES.globalSearch}?${params.toString()}`;
}

export function useUnifiedSearch(query: string, limit = 5) {
  return useSWR(searchKey(query, limit), fetcher<UnifiedSearchResponse>);
}
