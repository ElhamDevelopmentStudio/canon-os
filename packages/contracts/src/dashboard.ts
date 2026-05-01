import type { ConsumptionStatus, MediaType } from "./media";
import type { TasteDimensionDirection } from "./taste";

export type DashboardCounts = {
  totalMedia: number;
  completedMedia: number;
  plannedMedia: number;
  droppedMedia: number;
};

export type DashboardMediaTypeBreakdown = {
  mediaType: MediaType;
  count: number;
};

export type DashboardMediaItem = {
  id: string;
  title: string;
  mediaType: MediaType;
  status: ConsumptionStatus;
  personalRating: number | null;
  updatedAt: string;
};

export type DashboardTopTasteSignal = {
  dimensionId: string;
  dimensionSlug: string;
  dimensionName: string;
  dimensionDirection: TasteDimensionDirection;
  averageScore: number;
  scoreCount: number;
};

export type DashboardSummary = {
  counts: DashboardCounts;
  mediaTypeBreakdown: DashboardMediaTypeBreakdown[];
  recentActivity: DashboardMediaItem[];
  highestRated: DashboardMediaItem[];
  topTasteSignals: DashboardTopTasteSignal[];
  generatedAt: string;
};
