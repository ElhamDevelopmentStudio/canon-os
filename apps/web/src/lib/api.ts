import axios from "axios";

import { normalizeApiError } from "@/lib/errors";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 20_000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);
