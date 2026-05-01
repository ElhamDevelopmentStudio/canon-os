import type { DashboardSummary } from "@canonos/contracts";
import useSWR from "swr";

import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeSummary(summary: DashboardSummary): DashboardSummary {
  return {
    ...summary,
    highestRated: summary.highestRated.map((item) => ({
      ...item,
      personalRating: item.personalRating === null ? null : Number(item.personalRating),
    })),
    recentActivity: summary.recentActivity.map((item) => ({
      ...item,
      personalRating: item.personalRating === null ? null : Number(item.personalRating),
    })),
    topTasteSignals: summary.topTasteSignals.map((signal) => ({
      ...signal,
      averageScore: Number(signal.averageScore),
    })),
  };
}

export function useDashboardSummary() {
  return useSWR(API_ROUTES.dashboardSummary, async (url: string) =>
    normalizeSummary(await fetcher<DashboardSummary>(url)),
  );
}
