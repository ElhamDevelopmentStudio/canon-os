import type { TasteEvolutionSnapshot, TasteEvolutionTimelineResponse } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateTasteEvolutionSnapshot,
  useTasteEvolutionTimeline,
} from "@/features/evolution/evolutionApi";
import { TasteEvolutionPage } from "@/pages/TasteEvolutionPage";

vi.mock("@/features/evolution/evolutionApi", () => ({
  generateTasteEvolutionSnapshot: vi.fn(),
  useTasteEvolutionTimeline: vi.fn(),
}));

const snapshot: TasteEvolutionSnapshot = {
  id: "c6ad29d7-bd03-48de-9382-41f75f61fd62",
  snapshotPeriod: "monthly",
  snapshotDate: "2026-02-28",
  aggregateData: {
    isEmpty: false,
    generatedSummary: "Average rating is up and Atmosphere is the latest favorite dimension.",
    evidenceCounts: {
      mediaCount: 3,
      completedMediaCount: 2,
      ratedMediaCount: 2,
      scoredMediaCount: 2,
      scoreCount: 6,
      aftertasteCount: 2,
      snapshotMonthCount: 2,
    },
    ratingTrend: {
      key: "rating",
      label: "Rating trend",
      direction: "up",
      summary: "Average rating is up to 9.0/10 from 6.5/10.",
      currentValue: 9,
      previousValue: 6.5,
      points: [
        { period: "2026-01", label: "Jan 2026", value: 6.5, count: 1, meta: {} },
        { period: "2026-02", label: "Feb 2026", value: 9, count: 1, meta: {} },
      ],
    },
    mediaTypeTrend: {
      key: "media_type",
      label: "Medium trend",
      direction: "new",
      summary: "Dominant medium shifted from Movie to Anime.",
      currentValue: "Anime",
      previousValue: "Movie",
      points: [
        { period: "2026-01", label: "Jan 2026", value: 1, count: 1, meta: { mediaType: "movie", mediaTypeLabel: "Movie" } },
        { period: "2026-02", label: "Feb 2026", value: 1, count: 1, meta: { mediaType: "anime", mediaTypeLabel: "Anime" } },
      ],
    },
    genericnessToleranceTrend: {
      key: "genericness_tolerance",
      label: "Genericness tolerance",
      direction: "down",
      summary: "Genericness tolerance is down to 10.0/100.",
      currentValue: 10,
      previousValue: 80,
      points: [{ period: "2026-02", label: "Feb 2026", value: 10, count: 2, meta: {} }],
    },
    regretTrend: {
      key: "regret",
      label: "Regret trend",
      direction: "up",
      summary: "Regret pressure is up to 90.0/100.",
      currentValue: 90,
      previousValue: 5,
      points: [{ period: "2026-02", label: "Feb 2026", value: 90, count: 2, meta: {} }],
    },
    completionFatigueTrend: {
      key: "completion_fatigue",
      label: "Completion fatigue",
      direction: "up",
      summary: "Completion fatigue is up to 50.0/100.",
      currentValue: 50,
      previousValue: 0,
      points: [{ period: "2026-02", label: "Feb 2026", value: 50, count: 3, meta: {} }],
    },
    favoriteDimensionTrend: {
      key: "favorite_dimension",
      label: "Favorite dimension",
      direction: "new",
      summary: "Favorite positive dimension shifted from Story depth to Atmosphere.",
      currentValue: "Atmosphere",
      previousValue: "Story depth",
      points: [
        { period: "2026-02", label: "Feb 2026", value: 9.5, count: 2, meta: { dimensionName: "Atmosphere", dimensionSlug: "atmosphere" } },
      ],
    },
  },
  insights: [
    {
      key: "genericness_tolerance_low",
      severity: "warning",
      title: "Genericness tolerance is tightening",
      body: "Recent evidence shows a low tolerance score.",
      recommendation: "Favor works with originality before committing time.",
      evidence: ["Genericness tolerance: latest value 10."],
    },
  ],
  createdAt: "2026-02-28T00:00:00Z",
  updatedAt: "2026-02-28T00:00:00Z",
};

const timeline: TasteEvolutionTimelineResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [snapshot],
};

const mockedUseTasteEvolutionTimeline = vi.mocked(useTasteEvolutionTimeline);
const mockedGenerateTasteEvolutionSnapshot = vi.mocked(generateTasteEvolutionSnapshot);

function renderPage() {
  render(
    <MemoryRouter>
      <TasteEvolutionPage />
    </MemoryRouter>,
  );
}

describe("TasteEvolutionPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseTasteEvolutionTimeline.mockReturnValue({
      data: timeline,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTasteEvolutionTimeline>);
    mockedGenerateTasteEvolutionSnapshot.mockResolvedValue(snapshot);
  });

  it("renders snapshot metrics, insights, trends, and history", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Taste Evolution Journal" })).toBeInTheDocument();
    expect(screen.getByText("Genericness tolerance is tightening")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rating trend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Medium trend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Genericness tolerance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Regret trend" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Completion fatigue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Favorite dimension" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Snapshot history" })).toBeInTheDocument();
  });

  it("generates a snapshot from the page action", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Generate Snapshot" }));

    expect(mockedGenerateTasteEvolutionSnapshot).toHaveBeenCalledWith();
  });

  it("renders empty timeline state", () => {
    mockedUseTasteEvolutionTimeline.mockReturnValue({
      data: { count: 0, next: null, previous: null, results: [] },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTasteEvolutionTimeline>);

    renderPage();

    expect(screen.getByText("No taste evolution snapshots yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Generate Snapshot" }).length).toBeGreaterThan(0);
  });
});
