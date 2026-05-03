import type { DetoxDecision, DetoxRule, DetoxTimeSavedSummary, MediaItem } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateDetox, updateDetoxRule, useDetoxDecisions, useDetoxRules, useDetoxTimeSaved } from "@/features/detox/detoxApi";
import { updateMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { CompletionDetoxPage } from "@/pages/CompletionDetoxPage";

vi.mock("@/features/detox/detoxApi", () => ({
  evaluateDetox: vi.fn(),
  updateDetoxRule: vi.fn(),
  useDetoxDecisions: vi.fn(),
  useDetoxRules: vi.fn(),
  useDetoxTimeSaved: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  updateMediaItem: vi.fn(),
  useMediaItems: vi.fn(),
}));

const rule: DetoxRule = {
  id: "rule-1",
  key: "movie_30_minute_sample",
  name: "Movie 30 minute sample",
  description: "Check whether the movie has enough pull.",
  mediaType: "movie",
  sampleLimit: 30,
  condition: { maxMotivation: 4 },
  isEnabled: true,
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const media: MediaItem = {
  id: "media-1",
  title: "Low Pull Film",
  originalTitle: "",
  mediaType: "movie",
  releaseYear: null,
  countryLanguage: "",
  creator: "",
  status: "consuming",
  personalRating: 4,
  startedDate: null,
  completedDate: null,
  runtimeMinutes: 120,
  episodeCount: null,
  pageCount: null,
  audiobookLengthMinutes: null,
  notes: "",
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const decision: DetoxDecision = {
  id: "decision-1",
  mediaItemId: media.id,
  mediaItemTitle: media.title,
  mediaType: "movie",
  ruleId: rule.id,
  ruleName: rule.name,
  decision: "drop",
  reason: "Movie 30 minute sample matched and motivation is 2/10. Dropping is a practical option.",
  estimatedTimeSavedMinutes: 85,
  progressValue: 35,
  motivationScore: 2,
  createdAt: "2026-01-03T00:00:00Z",
};

const timeSaved: DetoxTimeSavedSummary = {
  totalMinutes: 85,
  currentMonthMinutes: 85,
  decisionCount: 1,
  entries: [
    {
      decisionId: decision.id,
      mediaItemId: media.id,
      mediaItemTitle: media.title,
      decision: "drop",
      estimatedTimeSavedMinutes: 85,
      createdAt: decision.createdAt,
    },
  ],
};

const mockedUseDetoxRules = vi.mocked(useDetoxRules);
const mockedUseDetoxDecisions = vi.mocked(useDetoxDecisions);
const mockedUseDetoxTimeSaved = vi.mocked(useDetoxTimeSaved);
const mockedUseMediaItems = vi.mocked(useMediaItems);
const mockedEvaluateDetox = vi.mocked(evaluateDetox);
const mockedUpdateDetoxRule = vi.mocked(updateDetoxRule);
const mockedUpdateMediaItem = vi.mocked(updateMediaItem);

function swrResult<T>(data: T) {
  return {
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  };
}

function renderPage() {
  render(
    <MemoryRouter>
      <CompletionDetoxPage />
    </MemoryRouter>,
  );
}

describe("CompletionDetoxPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseDetoxRules.mockReturnValue(swrResult({ count: 1, next: null, previous: null, results: [rule] }) as unknown as ReturnType<typeof useDetoxRules>);
    mockedUseDetoxDecisions.mockReturnValue(swrResult({ count: 0, next: null, previous: null, results: [] }) as unknown as ReturnType<typeof useDetoxDecisions>);
    mockedUseDetoxTimeSaved.mockReturnValue(swrResult({ totalMinutes: 0, currentMonthMinutes: 0, decisionCount: 0, entries: [] }) as unknown as ReturnType<typeof useDetoxTimeSaved>);
    mockedUseMediaItems.mockReturnValue(swrResult({ count: 1, next: null, previous: null, results: [media] }) as unknown as ReturnType<typeof useMediaItems>);
    mockedEvaluateDetox.mockResolvedValue({ decision, matchedRule: rule, mediaItem: media, timeSavedSummary: timeSaved });
    mockedUpdateDetoxRule.mockResolvedValue({ ...rule, isEnabled: false });
    mockedUpdateMediaItem.mockResolvedValue({ ...media, status: "dropped" });
  });

  it("renders metrics, active rules, evaluation form, and decision history empty state", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Completion Detox" })).toBeInTheDocument();
    expect(screen.getByText("Total time saved")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /active detox rules/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disable movie 30 minute sample/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/media item/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current progress/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current motivation/i)).toBeInTheDocument();
    expect(screen.getByText(/no detox decisions yet/i)).toBeInTheDocument();
  });

  it("evaluates a drop decision and can mark the media as dropped", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(screen.getByLabelText(/current progress/i));
    await user.type(screen.getByLabelText(/current progress/i), "35");
    await user.clear(screen.getByLabelText(/current motivation/i));
    await user.type(screen.getByLabelText(/current motivation/i), "2");
    await user.click(screen.getByRole("button", { name: /evaluate drop\/pause/i }));

    expect(mockedEvaluateDetox).toHaveBeenCalledWith({ mediaItemId: media.id, progressValue: 35, motivationScore: 2 });
    expect(await screen.findByRole("heading", { name: /detox decision result/i })).toBeInTheDocument();
    expect(screen.getByText(/dropping is a practical option/i)).toBeInTheDocument();
    expect(screen.getByText("1h 25m")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /mark as dropped/i }));
    expect(mockedUpdateMediaItem).toHaveBeenCalledWith(media.id, { status: "dropped" });
    expect(await screen.findByText(/low pull film marked as dropped/i)).toBeInTheDocument();
  });

  it("toggles detox rules", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /disable movie 30 minute sample/i }));

    expect(mockedUpdateDetoxRule).toHaveBeenCalledWith(rule.id, { isEnabled: false });
  });
});
