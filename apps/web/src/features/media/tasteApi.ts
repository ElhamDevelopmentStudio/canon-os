import type {
  MediaScore,
  MediaScoresBulkUpsertRequest,
  MediaScoresResponse,
  TasteDimension,
} from "@canonos/contracts";
import useSWR, { mutate as globalMutate } from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeScore(score: MediaScore): MediaScore {
  return { ...score, score: Number(score.score) };
}

function normalizeScores(response: MediaScoresResponse): MediaScoresResponse {
  return { ...response, results: response.results.map(normalizeScore) };
}

export function useTasteDimensions(enabled = true) {
  return useSWR(enabled ? API_ROUTES.tasteDimensions : null, fetcher<TasteDimension[]>);
}

export async function upsertMediaScores(
  mediaItemId: string,
  request: MediaScoresBulkUpsertRequest,
): Promise<MediaScoresResponse> {
  await getCsrfToken();
  const response = await api.put<MediaScoresResponse>(
    `${API_ROUTES.mediaItems}${mediaItemId}/scores/`,
    request,
  );
  await globalMutate(`${API_ROUTES.mediaItems}${mediaItemId}/`);
  return normalizeScores(response.data);
}
