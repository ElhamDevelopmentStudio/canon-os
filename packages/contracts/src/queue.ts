import type { MediaType } from "./media";

export const QUEUE_PRIORITIES = ["start_soon", "sample_first", "later"] as const;
export type QueuePriority = (typeof QUEUE_PRIORITIES)[number];

export type QueueItem = {
  id: string;
  mediaItemId: string | null;
  candidateId: string | null;
  title: string;
  mediaType: MediaType;
  priority: QueuePriority;
  reason: string;
  estimatedTimeMinutes: number | null;
  bestMood: string;
  moodCompatibility: number;
  intensityLevel: number;
  complexityLevel: number;
  commitmentLevel: number;
  freshnessScore: number;
  lastRecommendedAt: string | null;
  timesRecommended: number;
  isArchived: boolean;
  queuePosition: number;
  createdAt: string;
  updatedAt: string;
};

export type QueueItemCreateRequest = {
  mediaItemId?: string | null;
  candidateId?: string | null;
  title?: string;
  mediaType?: MediaType;
  priority: QueuePriority;
  reason?: string;
  estimatedTimeMinutes?: number | null;
  bestMood?: string;
  moodCompatibility?: number;
  intensityLevel?: number;
  complexityLevel?: number;
  commitmentLevel?: number;
  freshnessScore?: number;
  timesRecommended?: number;
  isArchived?: boolean;
};

export type QueueItemUpdateRequest = Partial<QueueItemCreateRequest & { queuePosition: number }>;

export type QueueItemListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: QueueItem[];
};

export type QueueReorderRequest = {
  itemIds: string[];
};

export type QueueReorderResponse = {
  results: QueueItem[];
};

export type QueueScore = {
  itemId: string;
  score: number;
  freshnessScore: number;
  priority: QueuePriority;
  isArchived: boolean;
  reason: string;
};

export type QueueRecalculateSummary = {
  activeCount: number;
  archivedCount: number;
  averageScore: number;
  topInsight: string;
  fatigueWarnings: string[];
};

export type QueueRecalculateResponse = {
  results: QueueItem[];
  scores: QueueScore[];
  summary: QueueRecalculateSummary;
};
