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
