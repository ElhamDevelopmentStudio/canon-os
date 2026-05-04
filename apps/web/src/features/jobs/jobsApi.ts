import type { BackgroundJob, BackgroundJobListResponse, PaginationParams } from "@canonos/contracts";
import useSWR from "swr";

import { API_ROUTES } from "@/lib/apiRouteConstants";
import { normalizePaginatedResponse, paginationParams } from "@/lib/pagination";
import { fetcher } from "@/lib/swr";
import { isActiveBackgroundJobStatus } from "@/features/jobs/jobLabels";

function normalizeJob(job: BackgroundJob): BackgroundJob {
  return {
    ...job,
    progressTotal: Number(job.progressTotal),
    progressProcessed: Number(job.progressProcessed),
    progressPercent: Number(job.progressPercent),
  };
}

function normalizeJobList(response: BackgroundJobListResponse | BackgroundJob[]): BackgroundJobListResponse {
  const paginated = normalizePaginatedResponse(response);
  return { ...paginated, results: paginated.results.map(normalizeJob) };
}

function hasActiveJobs(response: BackgroundJobListResponse | undefined): boolean {
  return response?.results.some((job) => isActiveBackgroundJobStatus(job.status)) ?? false;
}

export function backgroundJobKey(jobId: string | null | undefined) {
  return jobId ? `${API_ROUTES.backgroundJobs}${jobId}/` : null;
}

function backgroundJobsKey(params: PaginationParams = {}) {
  const query = paginationParams(params).toString();
  return `${API_ROUTES.backgroundJobs}${query ? `?${query}` : ""}`;
}

export function useBackgroundJobs(params: PaginationParams = {}) {
  return useSWR(
    backgroundJobsKey(params),
    async (url: string) =>
      normalizeJobList(await fetcher<BackgroundJobListResponse | BackgroundJob[]>(url)),
    {
      refreshInterval: (latest) => (hasActiveJobs(latest) ? 1_500 : 0),
    },
  );
}

export function useBackgroundJob(jobId: string | null | undefined) {
  return useSWR(
    backgroundJobKey(jobId),
    async (url: string) => normalizeJob(await fetcher<BackgroundJob>(url)),
    {
      refreshInterval: (latest) => (latest && isActiveBackgroundJobStatus(latest.status) ? 1_500 : 0),
      shouldRetryOnError: false,
    },
  );
}
