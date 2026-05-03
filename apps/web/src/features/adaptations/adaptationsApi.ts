import type {
  AdaptationPath,
  AdaptationRelation,
  AdaptationRelationCreateRequest,
  AdaptationRelationListResponse,
  AdaptationRelationUpdateRequest,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

type RelationFilters = {
  mediaItemId?: string;
  sourceMediaItemId?: string;
  adaptationMediaItemId?: string;
};

function normalizeRelation(relation: AdaptationRelation): AdaptationRelation {
  return {
    ...relation,
    faithfulnessScore:
      relation.faithfulnessScore === null ? null : Number(relation.faithfulnessScore),
    pacingPreservationScore:
      relation.pacingPreservationScore === null ? null : Number(relation.pacingPreservationScore),
    soulPreservationScore:
      relation.soulPreservationScore === null ? null : Number(relation.soulPreservationScore),
  };
}

function normalizeRelationList(response: AdaptationRelationListResponse): AdaptationRelationListResponse {
  return { ...response, results: response.results.map(normalizeRelation) };
}

function normalizePath(path: AdaptationPath): AdaptationPath {
  return {
    ...path,
    relations: path.relations.map(normalizeRelation),
    recommendation: {
      ...path.recommendation,
      confidenceScore: Number(path.recommendation.confidenceScore),
    },
  };
}

function relationListKey(filters: RelationFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.mediaItemId) params.set("mediaItemId", filters.mediaItemId);
  if (filters.sourceMediaItemId) params.set("sourceMediaItemId", filters.sourceMediaItemId);
  if (filters.adaptationMediaItemId) {
    params.set("adaptationMediaItemId", filters.adaptationMediaItemId);
  }
  const query = params.toString();
  return `${API_ROUTES.adaptationRelations}${query ? `?${query}` : ""}`;
}

function adaptationPathKey(mediaItemId: string): string {
  return `${API_ROUTES.mediaItems}${mediaItemId}/adaptation-map/`;
}

function isAdaptationCacheKey(key: unknown): key is string {
  return typeof key === "string" && (
    key.startsWith(API_ROUTES.adaptationRelations) ||
    (key.startsWith(API_ROUTES.mediaItems) && key.includes("/adaptation-"))
  );
}

export function useAdaptationRelations(mediaItemId: string | undefined) {
  return useSWR(mediaItemId ? relationListKey({ mediaItemId }) : null, async (url: string) =>
    normalizeRelationList(await fetcher<AdaptationRelationListResponse>(url)),
  );
}

export function useAdaptationMap(mediaItemId: string | undefined) {
  return useSWR(mediaItemId ? adaptationPathKey(mediaItemId) : null, async (url: string) =>
    normalizePath(await fetcher<AdaptationPath>(url)),
  );
}

export async function createAdaptationRelation(
  request: AdaptationRelationCreateRequest,
): Promise<AdaptationRelation> {
  await getCsrfToken();
  const response = await api.post<AdaptationRelation>(API_ROUTES.adaptationRelations, request);
  await globalMutate(isAdaptationCacheKey);
  return normalizeRelation(response.data);
}

export async function updateAdaptationRelation(
  id: string,
  request: AdaptationRelationUpdateRequest,
): Promise<AdaptationRelation> {
  await getCsrfToken();
  const response = await api.patch<AdaptationRelation>(`${API_ROUTES.adaptationRelations}${id}/`, request);
  await globalMutate(isAdaptationCacheKey);
  return normalizeRelation(response.data);
}

export async function deleteAdaptationRelation(id: string): Promise<void> {
  await getCsrfToken();
  await api.delete(`${API_ROUTES.adaptationRelations}${id}/`);
  await globalMutate(isAdaptationCacheKey);
}

export async function generateAdaptationPath(mediaItemId: string): Promise<AdaptationPath> {
  await getCsrfToken();
  const response = await api.post<AdaptationPath>(`${API_ROUTES.mediaItems}${mediaItemId}/adaptation-path/`);
  await globalMutate(isAdaptationCacheKey);
  return normalizePath(response.data);
}
