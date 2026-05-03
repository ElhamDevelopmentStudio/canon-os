export const UNIFIED_SEARCH_RESULT_TYPES = ["media", "candidate", "queue_item", "canon_season"] as const;
export type UnifiedSearchResultType = (typeof UNIFIED_SEARCH_RESULT_TYPES)[number];

export type UnifiedSearchResult = {
  id: string;
  type: UnifiedSearchResultType;
  title: string;
  subtitle: string;
  description: string;
  targetUrl: string;
  metadata: Record<string, unknown>;
};

export type UnifiedSearchResponse = {
  query: string;
  count: number;
  results: UnifiedSearchResult[];
};
