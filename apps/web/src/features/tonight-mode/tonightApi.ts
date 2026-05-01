import type { TonightModeRequest, TonightModeResponse } from "@canonos/contracts";

import { getCsrfToken } from "@/features/auth/authApi";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";

export async function generateTonightPlan(request: TonightModeRequest): Promise<TonightModeResponse> {
  await getCsrfToken();
  const response = await api.post<TonightModeResponse>(API_ROUTES.tonightMode, request);
  return response.data;
}
