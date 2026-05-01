import type { AuthResponse, LoginRequest, ProfileUpdateRequest, RegisterRequest, UserProfile } from "@canonos/contracts";

import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";

export async function getCsrfToken(): Promise<AuthResponse> {
  const response = await api.get<AuthResponse>(API_ROUTES.authCsrf);
  return response.data;
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const response = await api.get<AuthResponse>(API_ROUTES.authMe);
  return response.data;
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  await getCsrfToken();
  const response = await api.post<AuthResponse>(API_ROUTES.authLogin, request);
  return response.data;
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  await getCsrfToken();
  const response = await api.post<AuthResponse>(API_ROUTES.authRegister, request);
  return response.data;
}

export async function logout(): Promise<AuthResponse> {
  await getCsrfToken();
  const response = await api.post<AuthResponse>(API_ROUTES.authLogout);
  return response.data;
}

export async function updateProfile(request: ProfileUpdateRequest): Promise<UserProfile> {
  await getCsrfToken();
  const response = await api.patch<UserProfile>(API_ROUTES.authProfile, request);
  return response.data;
}
