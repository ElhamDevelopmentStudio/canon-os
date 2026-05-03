export const NARRATIVE_ANALYSIS_STATUSES = ["queued", "running", "completed", "failed"] as const;
export type NarrativeAnalysisStatus = (typeof NARRATIVE_ANALYSIS_STATUSES)[number];

export const NARRATIVE_SOURCE_BASES = [
  "user_notes",
  "metadata",
  "manual_analysis",
  "mixed_notes_metadata",
  "manual_correction",
] as const;
export type NarrativeSourceBasis = (typeof NARRATIVE_SOURCE_BASES)[number];

export const NARRATIVE_TRAIT_KEYS = [
  "character_complexity",
  "plot_complexity",
  "pacing_density",
  "thematic_weight",
  "moral_ambiguity",
  "atmosphere",
  "ending_dependency",
  "trope_freshness",
] as const;
export type NarrativeTraitKey = (typeof NARRATIVE_TRAIT_KEYS)[number];

export type NarrativeTrait = {
  key: NarrativeTraitKey;
  label: string;
  description: string;
  score: number;
  confidenceScore: number;
  evidence: string;
  source: string;
};

export type NarrativeDNA = {
  characterComplexityScore: number;
  plotComplexityScore: number;
  pacingDensityScore: number;
  thematicWeightScore: number;
  moralAmbiguityScore: number;
  atmosphereScore: number;
  endingDependencyScore: number;
  tropeFreshnessScore: number;
  confidenceScore: number;
  analysisSummary: string;
  extractedTraits: NarrativeTrait[];
  evidenceNotes: string;
  sourceBasis: NarrativeSourceBasis;
  provider: string;
  algorithmVersion: string;
};

export type NarrativeStatusEvent = {
  status: NarrativeAnalysisStatus;
  at: string;
};

export type NarrativeAnalysisResult = NarrativeDNA & {
  id: string;
  mediaItemId: string;
  mediaTitle: string;
  status: NarrativeAnalysisStatus;
  statusEvents: NarrativeStatusEvent[];
  errorMessage: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NarrativeAnalysisRequest = {
  manualNotes?: string;
  forceRefresh?: boolean;
  provider?: "local_heuristic" | "external_ai";
};

export type NarrativeAnalysisUpdateRequest = Partial<
  Pick<
    NarrativeDNA,
    | "characterComplexityScore"
    | "plotComplexityScore"
    | "pacingDensityScore"
    | "thematicWeightScore"
    | "moralAmbiguityScore"
    | "atmosphereScore"
    | "endingDependencyScore"
    | "tropeFreshnessScore"
    | "analysisSummary"
    | "evidenceNotes"
  >
>;

export type NarrativeAnalysisListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: NarrativeAnalysisResult[];
};

export type CandidateNarrativeSignal = {
  traitKey: NarrativeTraitKey;
  label: string;
  impact: number;
  averageScore: number;
  evidence: string;
};
