import type { UserSettings, UserSettingsUpdateRequest } from "@canonos/contracts";
import useSWR from "swr";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    recommendation: {
      ...settings.recommendation,
      modernMediaSkepticismLevel: Number(settings.recommendation.modernMediaSkepticismLevel),
      genericnessSensitivity: Number(settings.recommendation.genericnessSensitivity),
      preferredScoringStrictness: Number(settings.recommendation.preferredScoringStrictness),
    },
  };
}

export function useUserSettings() {
  return useSWR(API_ROUTES.authSettings, async (url: string) =>
    normalizeSettings(await fetcher<UserSettings>(url)),
  );
}

export async function updateUserSettings(request: UserSettingsUpdateRequest): Promise<UserSettings> {
  await getCsrfToken();
  const response = await api.patch<UserSettings>(API_ROUTES.authSettings, request);
  return normalizeSettings(response.data);
}
