import type { TonightModeRecommendation, TonightModeResponse, UserSettings } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateMediaItem } from "@/features/media/mediaApi";
import { createQueueItem, updateQueueItem } from "@/features/queue/queueApi";
import { useUserSettings } from "@/features/settings/settingsApi";
import { generateTonightPlan } from "@/features/tonight-mode/tonightApi";
import { TonightModePage } from "@/pages/TonightModePage";

vi.mock("@/features/settings/settingsApi", () => ({
  useUserSettings: vi.fn(),
}));

vi.mock("@/features/tonight-mode/tonightApi", () => ({
  generateTonightPlan: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  updateMediaItem: vi.fn(),
}));

vi.mock("@/features/queue/queueApi", () => ({
  createQueueItem: vi.fn(),
  updateQueueItem: vi.fn(),
}));

const safeRecommendation: TonightModeRecommendation = {
  slot: "safe",
  source: "queue",
  title: "Calm Film",
  mediaType: "movie",
  reason: "Short, high-fit, and low commitment for tonight.",
  score: 91,
  estimatedTimeMinutes: 95,
  queueItemId: "queue-1",
  mediaItemId: "media-1",
  candidateId: null,
  priority: "start_soon",
  moodCompatibility: 88,
  intensityLevel: 3,
  complexityLevel: 4,
  commitmentLevel: 5,
  freshnessScore: 76,
};

const wildcardRecommendation: TonightModeRecommendation = {
  slot: "wildcard",
  source: "planned_media",
  title: "Strange Novel",
  mediaType: "novel",
  reason: "A fresher planned option if you want a stronger turn.",
  score: 78,
  estimatedTimeMinutes: 45,
  queueItemId: null,
  mediaItemId: null,
  candidateId: "candidate-1",
  priority: null,
  moodCompatibility: 70,
  intensityLevel: 6,
  complexityLevel: 7,
  commitmentLevel: 4,
  freshnessScore: 92,
};

const plan: TonightModeResponse = {
  session: {
    id: "session-1",
    availableMinutes: 120,
    energyLevel: "medium",
    focusLevel: "deep",
    desiredEffect: "quality",
    preferredMediaTypes: ["movie", "novel"],
    riskTolerance: "medium",
    recommendations: [safeRecommendation, wildcardRecommendation],
    createdAt: "2026-01-06T00:00:00Z",
  },
  recommendations: [safeRecommendation, wildcardRecommendation],
  safeChoice: safeRecommendation,
  challengingChoice: null,
  wildcardChoice: wildcardRecommendation,
};

const settings: UserSettings = {
  id: 1,
  profile: {
    id: 1,
    displayName: "Test User",
    timezone: "UTC",
    preferredLanguage: "en",
  },
  display: {
    themePreference: "system",
  },
  recommendation: {
    defaultMediaTypes: ["movie", "novel"],
    defaultRiskTolerance: "medium",
    modernMediaSkepticismLevel: 5,
    genericnessSensitivity: 6,
    preferredScoringStrictness: 5,
    recommendationFormulaWeights: {
      personalFit: 30,
      moodFit: 20,
      qualitySignal: 20,
      genericnessPenalty: 10,
      regretRiskPenalty: 10,
      commitmentCostPenalty: 10,
    },
    defaultTonightMode: {
      availableMinutes: 120,
      energyLevel: "medium",
      focusLevel: "deep",
      desiredEffect: "quality",
    },
    preferredRecommendationStrictness: 5,
    allowModernExceptions: true,
    burnoutSensitivity: 5,
    completionDetoxStrictness: 5,
    notificationPreferences: {
      browserNotifications: false,
      emailDigest: false,
      recommendationReminders: false,
      completionDetoxReminders: false,
    },
  },
  updatedAt: "2026-01-06T00:00:00Z",
};

const mockedUseUserSettings = vi.mocked(useUserSettings);
const mockedGenerateTonightPlan = vi.mocked(generateTonightPlan);
const mockedUpdateMediaItem = vi.mocked(updateMediaItem);
const mockedUpdateQueueItem = vi.mocked(updateQueueItem);
const mockedCreateQueueItem = vi.mocked(createQueueItem);

function swrResult<T>(data: T) {
  return {
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  };
}

describe("TonightModePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseUserSettings.mockReturnValue(swrResult(settings) as unknown as ReturnType<typeof useUserSettings>);
    mockedGenerateTonightPlan.mockResolvedValue(plan);
    mockedUpdateMediaItem.mockResolvedValue({} as Awaited<ReturnType<typeof updateMediaItem>>);
    mockedUpdateQueueItem.mockResolvedValue({} as Awaited<ReturnType<typeof updateQueueItem>>);
    mockedCreateQueueItem.mockResolvedValue({} as Awaited<ReturnType<typeof createQueueItem>>);
  });

  it("renders a compact check-in, visible constraints, and generated recommendation rows", async () => {
    const user = userEvent.setup();
    render(<TonightModePage />);

    expect(screen.getByRole("heading", { name: "Tonight Mode" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /tonight constraints/i })).toHaveTextContent("120 min");
    expect(screen.getByRole("region", { name: /tonight check-in/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /tonight plan/i })).toHaveTextContent("No plan generated yet");

    await user.click(screen.getByRole("button", { name: "Generate Tonight Plan" }));

    expect(mockedGenerateTonightPlan).toHaveBeenCalledWith({
      availableMinutes: 120,
      energyLevel: "medium",
      focusLevel: "deep",
      desiredEffect: "quality",
      preferredMediaTypes: ["movie", "novel"],
      riskTolerance: "medium",
    });
    expect(await screen.findByText("Tonight Mode plan generated.")).toBeInTheDocument();

    const recommendations = screen.getByRole("region", { name: /tonight recommendations/i });
    expect(within(recommendations).getByText("Start with Calm Film")).toBeInTheDocument();
    expect(within(recommendations).getByText("Safe choice")).toBeInTheDocument();
    expect(within(recommendations).getByText("Wildcard choice")).toBeInTheDocument();
  });

  it("handles recommendation actions", async () => {
    const user = userEvent.setup();
    render(<TonightModePage />);

    await user.click(screen.getByRole("button", { name: "Generate Tonight Plan" }));
    await screen.findByText("Calm Film");

    const safeRow = screen.getByText("Calm Film").closest("article");
    expect(safeRow).not.toBeNull();
    await user.click(within(safeRow as HTMLElement).getByRole("button", { name: "Start This" }));
    expect(mockedUpdateMediaItem).toHaveBeenCalledWith("media-1", { status: "consuming" });

    await user.click(within(safeRow as HTMLElement).getByRole("button", { name: "Not Tonight" }));
    expect(mockedUpdateQueueItem).toHaveBeenCalledWith("queue-1", {
      priority: "later",
      reason: "Short, high-fit, and low commitment for tonight. Not tonight: current mood or energy was wrong.",
    });

    const wildcardRow = screen.getByText("Strange Novel").closest("article");
    expect(wildcardRow).not.toBeNull();
    await user.click(within(wildcardRow as HTMLElement).getByRole("button", { name: "Add To Queue" }));
    expect(mockedCreateQueueItem).toHaveBeenCalledWith({
      mediaItemId: null,
      candidateId: "candidate-1",
      title: "Strange Novel",
      mediaType: "novel",
      priority: "sample_first",
      reason: "A fresher planned option if you want a stronger turn.",
      estimatedTimeMinutes: 45,
      bestMood: "Medium energy / Deep focus",
    });
  });

  it("validates available time before generating", async () => {
    const user = userEvent.setup();
    render(<TonightModePage />);

    await user.clear(screen.getByLabelText("Available time (minutes)"));
    await user.click(screen.getByRole("button", { name: "Generate Tonight Plan" }));

    expect(mockedGenerateTonightPlan).not.toHaveBeenCalled();
    expect(screen.getByText("Enter at least 1 available minute before generating a Tonight Mode plan.")).toBeInTheDocument();
  });
});
