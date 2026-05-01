export const AFTERTASTE_APPETITE_EFFECTS = [
  "more_like_this",
  "less_like_this",
  "only_in_mood",
  "no_change",
] as const;
export type AftertasteAppetiteEffect = (typeof AFTERTASTE_APPETITE_EFFECTS)[number];

export type AftertastePrompt = {
  id: string;
  label: string;
  helperText: string;
};

export const DEFAULT_AFTERTASTE_PROMPTS: AftertastePrompt[] = [
  {
    id: "worth_time",
    label: "Was it worth the time?",
    helperText: "Capture whether the whole experience justified the hours spent.",
  },
  {
    id: "stayed_with_me",
    label: "How strongly did it stay with you?",
    helperText: "Use 0–10 for memorability, afterimage, and lingering thought.",
  },
  {
    id: "felt_alive",
    label: "Did it feel alive?",
    helperText: "Mark works that felt specific, authored, surprising, or emotionally true.",
  },
  {
    id: "felt_generic",
    label: "Did it feel generic?",
    helperText: "Flag works that felt formulaic, forgettable, hollow, or copy-pasted.",
  },
  {
    id: "what_worked",
    label: "What worked?",
    helperText: "Name the scenes, structure, craft, ideas, or feelings that landed.",
  },
  {
    id: "what_failed",
    label: "What failed?",
    helperText: "Name the weaknesses, fatigue, regret, or genericness signals.",
  },
  {
    id: "final_thoughts",
    label: "Final thoughts",
    helperText: "Summarize the aftertaste you want future recommendations to remember.",
  },
];

export type AftertasteEntry = {
  id: string;
  mediaItemId: string;
  mediaTitle: string;
  worthTime: boolean;
  stayedWithMeScore: number;
  feltAlive: boolean;
  feltGeneric: boolean;
  completionReason: string;
  whatWorked: string;
  whatFailed: string;
  finalThoughts: string;
  appetiteEffect: AftertasteAppetiteEffect;
  createdAt: string;
  updatedAt: string;
};

export type AftertasteCreateRequest = {
  mediaItemId: string;
  worthTime: boolean;
  stayedWithMeScore: number;
  feltAlive: boolean;
  feltGeneric: boolean;
  completionReason?: string;
  whatWorked?: string;
  whatFailed?: string;
  finalThoughts?: string;
  appetiteEffect: AftertasteAppetiteEffect;
};

export type AftertasteUpdateRequest = Partial<AftertasteCreateRequest>;

export type AftertasteEntryListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AftertasteEntry[];
};

export type AftertasteEntryFilters = {
  mediaItemId?: string;
};
