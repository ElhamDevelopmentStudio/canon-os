import type { GraphRebuildJob, TasteGraphSummary } from "@canonos/contracts";
import useSWR from "swr";

import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/apiRouteConstants";
import { fetcher } from "@/lib/swr";

function normalizeSummary(summary: TasteGraphSummary): TasteGraphSummary {
  const normalizeItems = (items: TasteGraphSummary["strongestThemes"]) =>
    items.map((item) => ({
      ...item,
      weight: Number(item.weight),
      evidenceCount: Number(item.evidenceCount),
    }));

  return {
    ...summary,
    nodeCount: Number(summary.nodeCount),
    edgeCount: Number(summary.edgeCount),
    evidenceCounts: {
      mediaNodeCount: Number(summary.evidenceCounts.mediaNodeCount),
      creatorNodeCount: Number(summary.evidenceCounts.creatorNodeCount),
      dimensionNodeCount: Number(summary.evidenceCounts.dimensionNodeCount),
      aftertasteSignalNodeCount: Number(summary.evidenceCounts.aftertasteSignalNodeCount),
      edgeCount: Number(summary.evidenceCounts.edgeCount),
    },
    strongestThemes: normalizeItems(summary.strongestThemes),
    strongestCreators: normalizeItems(summary.strongestCreators),
    strongestMedia: normalizeItems(summary.strongestMedia),
    weakNegativeSignals: normalizeItems(summary.weakNegativeSignals),
  };
}

function normalizeJob(job: GraphRebuildJob): GraphRebuildJob {
  return {
    ...job,
    nodeCount: Number(job.nodeCount),
    edgeCount: Number(job.edgeCount),
  };
}

export function useTasteGraphSummary() {
  return useSWR(API_ROUTES.tasteGraphSummary, async (url: string) => normalizeSummary(await fetcher<TasteGraphSummary>(url)));
}

export async function rebuildTasteGraph(): Promise<GraphRebuildJob> {
  const response = await api.post<GraphRebuildJob>(API_ROUTES.tasteGraphRebuild);
  return normalizeJob(response.data);
}
