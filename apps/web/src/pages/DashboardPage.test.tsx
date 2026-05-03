import type { DashboardSummary } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useDashboardSummary } from "@/features/dashboard/dashboardApi";
import { createMediaItem } from "@/features/media/mediaApi";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { DashboardPage } from "@/pages/DashboardPage";

vi.mock("@/features/dashboard/dashboardApi", () => ({
  useDashboardSummary: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  createMediaItem: vi.fn(),
  updateMediaItem: vi.fn(),
}));

vi.mock("@/features/media/tasteApi", () => ({
  upsertMediaScores: vi.fn(),
  useTasteDimensions: vi.fn(),
}));

const summary: DashboardSummary = {
  counts: {
    totalMedia: 3,
    completedMedia: 1,
    plannedMedia: 1,
    droppedMedia: 1,
  },
  mediaTypeBreakdown: [
    { mediaType: "movie", count: 1 },
    { mediaType: "anime", count: 1 },
  ],
  recentActivity: [
    {
      id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      title: "Stalker",
      mediaType: "movie",
      status: "completed",
      personalRating: 9.5,
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ],
  highestRated: [
    {
      id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      title: "Stalker",
      mediaType: "movie",
      status: "completed",
      personalRating: 9.5,
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ],
  latestTasteEvolutionInsight: {
    key: "favorite_dimension",
    severity: "positive",
    title: "Atmosphere is carrying recent taste",
    body: "Your latest positive dimension leader is the clearest current taste anchor.",
    recommendation: "Use it as the first recommendation filter.",
    evidence: ["Favorite dimension: latest value Atmosphere."],
  },
  topTasteSignals: [
    {
      dimensionId: "6cc99274-279b-4cf7-8dd0-623ed19798e1",
      dimensionSlug: "atmosphere",
      dimensionName: "Atmosphere",
      dimensionDirection: "positive",
      averageScore: 9,
      scoreCount: 2,
    },
  ],
  generatedAt: "2026-01-03T00:00:00Z",
};

const mockedUseDashboardSummary = vi.mocked(useDashboardSummary);
const mockedUseTasteDimensions = vi.mocked(useTasteDimensions);
const mockedCreateMediaItem = vi.mocked(createMediaItem);
const mockedUpsertMediaScores = vi.mocked(upsertMediaScores);

function renderDashboard() {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseDashboardSummary.mockReturnValue({
      data: summary,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>);
    mockedUseTasteDimensions.mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTasteDimensions>);
    mockedCreateMediaItem.mockResolvedValue({
      id: "new-media-id",
      title: "New media",
      originalTitle: "",
      mediaType: "movie",
      releaseYear: null,
      countryLanguage: "",
      creator: "",
      status: "planned",
      personalRating: null,
      startedDate: null,
      completedDate: null,
      runtimeMinutes: null,
      episodeCount: null,
      pageCount: null,
      audiobookLengthMinutes: null,
      notes: "",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    });
    mockedUpsertMediaScores.mockResolvedValue({ results: [] });
  });

  it("renders dashboard metrics and connected summary cards", () => {
    renderDashboard();

    expect(screen.getByRole("heading", { name: /private media command center/i })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("heading", { name: /media type breakdown/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /latest taste shift/i })).toBeInTheDocument();
    expect(screen.getByText(/atmosphere is carrying recent taste/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open taste evolution/i })).toHaveAttribute("href", "/taste-evolution");
    expect(screen.getAllByRole("link", { name: /open insights|insights/i }).some((link) => link.getAttribute("href") === "/insights")).toBe(true);
    expect(screen.getByRole("heading", { name: /top taste signals/i })).toBeInTheDocument();
    expect(screen.getAllByText(/stalker/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/atmosphere/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /evaluate candidate/i })).toHaveAttribute("href", "/candidates");
    expect(screen.getAllByRole("link", { name: /insights/i }).some((link) => link.getAttribute("href") === "/insights")).toBe(true);
    expect(screen.getByRole("link", { name: /tonight mode/i })).toHaveAttribute("href", "/tonight");
  });

  it("opens add media from the dashboard quick action", async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole("button", { name: /add media/i }));
    expect(screen.getByRole("dialog", { name: /add media/i })).toBeInTheDocument();
  });

  it("renders empty dashboard state", () => {
    mockedUseDashboardSummary.mockReturnValue({
      data: {
        ...summary,
        counts: { totalMedia: 0, completedMedia: 0, plannedMedia: 0, droppedMedia: 0 },
        mediaTypeBreakdown: [],
        recentActivity: [],
        highestRated: [],
        topTasteSignals: [],
        latestTasteEvolutionInsight: null,
      },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardSummary>);

    renderDashboard();

    expect(screen.getByText(/ready for its first media item/i)).toBeInTheDocument();
    expect(screen.getByText(/no media types yet/i)).toBeInTheDocument();
    expect(screen.getByText(/score media to reveal taste signals/i)).toBeInTheDocument();
  });
});
