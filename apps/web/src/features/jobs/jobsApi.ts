import type { BackgroundJob } from "@canonos/contracts";
import useSWR from "swr";

import { API_ROUTES } from "@/lib/apiRouteConstants";
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

function hasActiveJobs(jobs: BackgroundJob[] | undefined): boolean {
  return jobs?.some((job) => isActiveBackgroundJobStatus(job.status)) ?? false;
}

export function backgroundJobKey(jobId: string | null | undefined) {
  return jobId ? `${API_ROUTES.backgroundJobs}${jobId}/` : null;
}

export function useBackgroundJobs() {
  return useSWR(
    API_ROUTES.backgroundJobs,
    async (url: string) => (await fetcher<BackgroundJob[]>(url)).map(normalizeJob),
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
