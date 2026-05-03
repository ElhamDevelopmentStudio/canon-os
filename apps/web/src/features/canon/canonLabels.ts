import type {
  CanonItemCanonStatus,
  CanonItemCompletionStatus,
  CanonSeasonStatus,
  CanonTheme,
  CanonThemeKey,
} from "@canonos/contracts";

import type { StatusTone } from "@/components/data-display/StatusPill";

export const canonThemes: CanonTheme[] = [
  {
    key: "moral_collapse",
    label: "Moral collapse",
    description: "Pressure, choice, consequence, and the point where identity breaks.",
    starterPrompts: ["What early warning signs were ignored?", "Which collapse felt earned?"],
  },
  {
    key: "anti_heroes_done_right",
    label: "Anti-heroes done right",
    description: "Complicated protagonists whose flaws reveal something instead of posing.",
    starterPrompts: ["Where did charisma hide harm?", "What did the work refuse to excuse?"],
  },
  {
    key: "forgotten_masterpieces",
    label: "Forgotten masterpieces",
    description: "Overlooked works that still feel alive, specific, and worth defending.",
    starterPrompts: ["Why did this disappear?", "What should be restored to conversation?"],
  },
  {
    key: "modern_works_worth_it",
    label: "Modern works worth it",
    description: "Recent works that justify attention despite hype, trend-chasing, or fatigue.",
    starterPrompts: ["What is genuinely modern here?", "What should future works learn?"],
  },
  {
    key: "atmosphere_over_plot",
    label: "Atmosphere over plot",
    description: "Texture, mood, rhythm, place, and image as the primary reason to stay.",
    starterPrompts: ["What stayed after plot faded?", "Where did mood become meaning?"],
  },
  {
    key: "custom",
    label: "Custom",
    description: "A user-defined exploration path or private canon shelf.",
    starterPrompts: ["What question should this season answer?", "What belongs here and why?"],
  },
];

export const canonThemeLabels = Object.fromEntries(
  canonThemes.map((theme) => [theme.key, theme.label]),
) as Record<CanonThemeKey, string>;

export const canonSeasonStatusLabels: Record<CanonSeasonStatus, string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

export const canonSeasonStatusTone: Record<CanonSeasonStatus, StatusTone> = {
  planned: "neutral",
  active: "active",
  paused: "warning",
  completed: "success",
};

export const canonItemStatusLabels: Record<CanonItemCompletionStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
};

export const canonItemStatusTone: Record<CanonItemCompletionStatus, StatusTone> = {
  planned: "neutral",
  in_progress: "active",
  completed: "success",
  skipped: "warning",
};

export const canonItemCanonStatusLabels: Record<CanonItemCanonStatus, string> = {
  unmarked: "Unmarked",
  personal_canon: "Personal canon",
  near_canon: "Near-canon",
  rejected: "Rejected",
  historically_important: "Historically important, not loved",
};

export const canonItemCanonStatusTone: Record<CanonItemCanonStatus, StatusTone> = {
  unmarked: "neutral",
  personal_canon: "success",
  near_canon: "active",
  rejected: "warning",
  historically_important: "neutral",
};
