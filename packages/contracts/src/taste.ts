export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

export const TASTE_DIMENSION_DIRECTIONS = ["positive", "negative"] as const;
export type TasteDimensionDirection = (typeof TASTE_DIMENSION_DIRECTIONS)[number];

export type TasteDimension = {
  id: string;
  name: string;
  slug: string;
  description: string;
  direction: TasteDimensionDirection;
  isDefault: boolean;
};

export type DefaultTasteDimension = Omit<TasteDimension, "id" | "isDefault">;

export const DEFAULT_TASTE_DIMENSIONS = [
  {
    slug: "story_depth",
    name: "Story depth",
    description: "How meaningful, layered, and worth thinking about the story feels.",
    direction: "positive",
  },
  {
    slug: "character_depth",
    name: "Character depth",
    description: "How complex, consistent, and memorable the characters feel.",
    direction: "positive",
  },
  {
    slug: "atmosphere",
    name: "Atmosphere",
    description: "Strength of mood, setting, tone, visual/prose/audio identity.",
    direction: "positive",
  },
  {
    slug: "originality",
    name: "Originality",
    description: "How non-generic, creatively alive, or surprising the execution feels.",
    direction: "positive",
  },
  {
    slug: "dialogue",
    name: "Dialogue",
    description: "Quality of dialogue for screen works or prose voice for books.",
    direction: "positive",
  },
  {
    slug: "emotional_impact",
    name: "Emotional impact",
    description: "How strongly the work affected you emotionally.",
    direction: "positive",
  },
  {
    slug: "intellectual_impact",
    name: "Intellectual impact",
    description: "How much it provoked thought or changed perspective.",
    direction: "positive",
  },
  {
    slug: "pacing",
    name: "Pacing",
    description: "How well the work uses time and avoids filler.",
    direction: "positive",
  },
  {
    slug: "ending_quality",
    name: "Ending quality",
    description: "How satisfying, fitting, or powerful the ending feels.",
    direction: "positive",
  },
  {
    slug: "memorability",
    name: "Memorability",
    description: "How much remains after days or weeks.",
    direction: "positive",
  },
  {
    slug: "rewatch_read_value",
    name: "Rewatch/read value",
    description: "Likelihood of rewatching, rereading, relistening, or recommending to a similar self.",
    direction: "positive",
  },
  {
    slug: "genericness",
    name: "Genericness",
    description: "How manufactured, predictable, hollow, or trend-driven it felt.",
    direction: "negative",
  },
  {
    slug: "regret_score",
    name: "Regret score",
    description: "How much you regret spending time on it.",
    direction: "negative",
  },
] as const satisfies readonly DefaultTasteDimension[];

export type MediaScore = {
  id: string;
  mediaItemId: string;
  dimensionId: string;
  dimensionSlug: string;
  dimensionName: string;
  dimensionDirection: TasteDimensionDirection;
  score: number;
  note: string;
  updatedAt: string;
};

export type MediaScoreUpsert = {
  dimensionId: string;
  score: number | null;
  note?: string;
};

export type MediaScoresBulkUpsertRequest = {
  scores: MediaScoreUpsert[];
};

export type MediaScoresResponse = {
  results: MediaScore[];
};


export type TasteProfileConfidence = "low" | "medium" | "high";

export type TasteSignal = {
  dimensionSlug: string;
  dimensionName: string;
  dimensionDirection: TasteDimensionDirection;
  averageScore: number;
  scoreCount: number;
  evidenceLabel: string;
};

export type NegativeTasteSignal = {
  slug: "genericness" | "regret_score";
  label: string;
  warningCount: number;
  averageScore: number | null;
  evidenceLabel: string;
};

export type MediumPreference = {
  mediaType: import("./media").MediaType;
  averageRating: number | null;
  mediaCount: number;
  completedCount: number;
  scoreCount: number;
};

export type TasteProfileEvidenceCounts = {
  mediaCount: number;
  scoredMediaCount: number;
  scoreCount: number;
  aftertasteCount: number;
};

export type TasteProfileInfluentialWork = {
  id: string;
  title: string;
  mediaType: import("./media").MediaType;
  personalRating: number | null;
  stayedWithMeScore: number | null;
  worthTime: boolean | null;
  feltGeneric: boolean | null;
  appetiteEffect: import("./aftertaste").AftertasteAppetiteEffect | null;
  updatedAt: string;
};

export type TasteProfileSummary = {
  generatedSummary: string;
  isEmpty: boolean;
  confidence: TasteProfileConfidence;
  evidenceCounts: TasteProfileEvidenceCounts;
  strongestDimensions: TasteSignal[];
  weakestDimensions: TasteSignal[];
  negativeSignals: NegativeTasteSignal[];
  mediumPreferences: MediumPreference[];
  strongestMediumPreference: MediumPreference | null;
  weakestMediumPreference: MediumPreference | null;
  recentlyInfluentialWorks: TasteProfileInfluentialWork[];
  generatedAt: string;
};
