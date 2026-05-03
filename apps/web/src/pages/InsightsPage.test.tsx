import type { AnalyticsInsights } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAnalyticsInsights } from "@/features/insights/analyticsApi";
import { InsightsPage } from "@/pages/InsightsPage";

vi.mock("@/features/insights/analyticsApi", () => ({
  useAnalyticsInsights: vi.fn(),
}));

const insights: AnalyticsInsights = {
  consumptionTimeline: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    points: [
      { period: "2026-01", label: "Jan 2026", completedCount: 1, droppedCount: 0, totalCount: 1, averageRating: 9.5 },
      { period: "2026-02", label: "Feb 2026", completedCount: 1, droppedCount: 1, totalCount: 2, averageRating: 5.5 },
    ],
  },
  ratingDistribution: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    ratedCount: 3,
    averageRating: 6.83,
    buckets: [
      { bucket: "0-2", label: "0–2", minRating: 0, maxRating: 2, count: 0 },
      { bucket: "2-4", label: "2–4", minRating: 2, maxRating: 4, count: 1 },
      { bucket: "4-6", label: "4–6", minRating: 4, maxRating: 6, count: 0 },
      { bucket: "6-8", label: "6–8", minRating: 6, maxRating: 8, count: 0 },
      { bucket: "8-10", label: "8–10", minRating: 8, maxRating: 10, count: 2 },
    ],
  },
  mediaTypeDistribution: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    totalCount: 3,
    results: [
      { mediaType: "movie", count: 1, completedCount: 1, averageRating: 9.5, sharePercent: 33.3 },
      { mediaType: "novel", count: 1, completedCount: 1, averageRating: 8, sharePercent: 33.3 },
      { mediaType: "tv_show", count: 1, completedCount: 0, averageRating: 3, sharePercent: 33.3 },
    ],
  },
  dimensionTrends: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    dimensions: [
      {
        dimensionId: "872f8109-e123-47d8-91fd-331807910d70",
        dimensionSlug: "atmosphere",
        dimensionName: "Atmosphere",
        dimensionDirection: "positive",
        averageScore: 8.75,
        scoreCount: 2,
        points: [{ period: "2026-02", label: "Feb 2026", averageScore: 8.75, scoreCount: 2 }],
      },
    ],
  },
  genericnessSatisfaction: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    averageGenericness: 4.67,
    averageSatisfaction: 6.83,
    insight: "Genericness and satisfaction are mixed; use individual outliers as decision evidence.",
    points: [
      { mediaItemId: "9f6786ce-b66b-4828-8f30-32d6bfd96721", title: "Stalker", mediaType: "movie", genericnessScore: 2, satisfactionScore: 9.5 },
    ],
  },
  regretTimeCost: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    averageRegret: 4.5,
    totalHighRegretMinutes: 135,
    insight: "High-regret items account for 135 estimated minutes.",
    points: [
      { mediaItemId: "9f6786ce-b66b-4828-8f30-32d6bfd96722", title: "Forgettable Filler", mediaType: "tv_show", regretScore: 8, timeCostMinutes: 135 },
    ],
  },
  topCreators: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    results: [
      { creator: "Andrei Tarkovsky", count: 1, completedCount: 1, averageRating: 9.5, bestTitle: "Stalker", negativeSignalCount: 0 },
    ],
  },
  topThemes: {
    isEmpty: false,
    generatedAt: "2026-02-04T00:00:00Z",
    results: [
      { key: "atmosphere", label: "Atmosphere", count: 1, averageScore: 96, exampleTitle: "Stalker" },
    ],
  },
};

const mockedUseAnalyticsInsights = vi.mocked(useAnalyticsInsights);

function renderPage() {
  render(
    <MemoryRouter>
      <InsightsPage />
    </MemoryRouter>,
  );
}

describe("InsightsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseAnalyticsInsights.mockReturnValue({
      data: insights,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAnalyticsInsights>);
  });

  it("renders analytics sections and sample insight data", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /readable patterns from your media history/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Consumption timeline" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rating distribution" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Media type distribution" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dimension trends" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Genericness vs satisfaction" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Regret vs time cost" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top creators" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Top themes" })).toBeInTheDocument();
    expect(screen.getAllByText("Atmosphere").length).toBeGreaterThan(0);
    expect(screen.getByText("Andrei Tarkovsky")).toBeInTheDocument();
    expect(screen.getByText("Forgettable Filler")).toBeInTheDocument();
  });

  it("renders empty insights state", () => {
    mockedUseAnalyticsInsights.mockReturnValue({
      data: {
        ...insights,
        consumptionTimeline: { ...insights.consumptionTimeline, isEmpty: true, points: [] },
        ratingDistribution: { ...insights.ratingDistribution, isEmpty: true, ratedCount: 0 },
        mediaTypeDistribution: { ...insights.mediaTypeDistribution, isEmpty: true, totalCount: 0, results: [] },
        dimensionTrends: { ...insights.dimensionTrends, isEmpty: true, dimensions: [] },
        genericnessSatisfaction: { ...insights.genericnessSatisfaction, isEmpty: true, points: [], averageGenericness: null, averageSatisfaction: null },
        regretTimeCost: { ...insights.regretTimeCost, isEmpty: true, points: [], averageRegret: null, totalHighRegretMinutes: 0 },
        topCreators: { ...insights.topCreators, isEmpty: true, results: [] },
        topThemes: { ...insights.topThemes, isEmpty: true, results: [] },
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAnalyticsInsights>);

    renderPage();

    expect(screen.getByText(/ready for your first evidence trail/i)).toBeInTheDocument();
    expect(screen.getByText(/finish or drop media/i)).toBeInTheDocument();
    expect(screen.getByText(/run narrative dna analysis/i)).toBeInTheDocument();
  });

  it("renders loading and error states", () => {
    mockedUseAnalyticsInsights.mockReturnValue({
      data: undefined,
      error: new Error("Analytics API failed"),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAnalyticsInsights>);

    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Analytics API failed");
  });
});
