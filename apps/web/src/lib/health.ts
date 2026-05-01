import useSWR from "swr";

export type HealthCheck = {
  status: "ok";
  service: string;
  version: string;
};

export function useHealthCheck() {
  return useSWR<HealthCheck>("/health/");
}
