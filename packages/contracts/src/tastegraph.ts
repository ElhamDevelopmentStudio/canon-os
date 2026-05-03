import type { MediaType } from "./media";

export const GRAPH_NODE_TYPES = [
  "media",
  "creator",
  "dimension",
  "aftertaste_signal",
  "theme",
  "tag",
  "medium",
  "narrative_trait",
] as const;
export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];

export const GRAPH_EDGE_TYPES = [
  "created_by",
  "dimension_signal",
  "aftertaste_signal",
  "medium_signal",
  "tagged_as",
  "theme_signal",
  "narrative_signal",
] as const;
export type GraphEdgeType = (typeof GRAPH_EDGE_TYPES)[number];

export type GraphNode = {
  id: string;
  nodeType: GraphNodeType;
  label: string;
  slug: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GraphEdge = {
  id: string;
  sourceNodeId: string;
  sourceLabel: string;
  targetNodeId: string;
  targetLabel: string;
  edgeType: GraphEdgeType;
  weight: number;
  evidence: string;
  createdAt: string;
  updatedAt: string;
};

export type TasteGraphEvidenceCounts = {
  mediaNodeCount: number;
  creatorNodeCount: number;
  dimensionNodeCount: number;
  aftertasteSignalNodeCount: number;
  narrativeTraitNodeCount: number;
  edgeCount: number;
};

export type TasteGraphSummaryItem = {
  id: string;
  label: string;
  nodeType: GraphNodeType;
  mediaType?: MediaType;
  weight: number;
  evidenceCount: number;
  evidenceLabel: string;
};

export type TasteGraphSummary = {
  generatedAt: string;
  isEmpty: boolean;
  nodeCount: number;
  edgeCount: number;
  evidenceCounts: TasteGraphEvidenceCounts;
  strongestThemes: TasteGraphSummaryItem[];
  strongestCreators: TasteGraphSummaryItem[];
  strongestMedia: TasteGraphSummaryItem[];
  weakNegativeSignals: TasteGraphSummaryItem[];
  textGraph: string[];
};

export const GRAPH_REBUILD_JOB_STATUSES = ["completed", "failed"] as const;
export type GraphRebuildJobStatus = (typeof GRAPH_REBUILD_JOB_STATUSES)[number];

export type GraphRebuildJob = {
  id: string;
  status: GraphRebuildJobStatus;
  message: string;
  nodeCount: number;
  edgeCount: number;
  startedAt: string;
  finishedAt: string;
};
