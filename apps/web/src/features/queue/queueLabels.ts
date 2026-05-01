import type { QueuePriority } from "@canonos/contracts";

import type { StatusTone } from "@/components/data-display/StatusPill";

export const queuePriorityLabels: Record<QueuePriority, string> = {
  start_soon: "Start Soon",
  sample_first: "Sample First",
  later: "Delay / Archive",
};

export const queuePriorityTone: Record<QueuePriority, StatusTone> = {
  start_soon: "success",
  sample_first: "active",
  later: "warning",
};
