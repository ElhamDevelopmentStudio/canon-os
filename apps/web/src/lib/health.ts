import useSWR from "swr";

import { api } from "@/lib/api";

export type HealthCheck = {
  status: "ok";
  service: string;
  version: string;
};

export const HEALTH_CHECK_PATH = "/health/";

export async function getHealthCheck(): Promise<HealthCheck> {
  const response = await api.get<HealthCheck>(HEALTH_CHECK_PATH);
  return response.data;
}

export function useHealthCheck() {
  return useSWR<HealthCheck>(HEALTH_CHECK_PATH, getHealthCheck);
}
