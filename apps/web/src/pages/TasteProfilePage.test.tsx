import type { TasteProfileSummary } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTasteProfile } from "@/features/taste-profile/tasteProfileApi";
import { TasteProfilePage } from "@/pages/TasteProfilePage";

vi.mock("@/features/taste-profile/tasteProfileApi", () => ({
  useTasteProfile: vi.fn(),
}));

const profile: TasteProfileSummary = {
  generatedSummary: "You tend to reward strong atmosphere and punish generic work quickly.",
  isEmpty: false,
  confidence: "high",
  evidenceCounts: {
    mediaCount: 8,
    scoredMediaCount: 6,
    scoreCount: 24,
    aftertasteCount: 3,
  },
  strongestDimensions: [
    {
      dimensionSlug: "atmosphere",
      dimensionName: "Atmosphere",
      dimensionDirection: "positive",
      averageScore: 8.7,
      scoreCount: 6,
      evidenceLabel: "6 scores",
    },
  ],
  weakestDimensions: [
    {
      dimensionSlug: "dialogue",
      dimensionName: "Dialogue",
      dimensionDirection: "positive",
      averageScore: 5.2,
      scoreCount: 4,
      evidenceLabel: "4 scores",
    },
  ],
  negativeSignals: [
    {
      slug: "genericness",
      label: "Genericness warning",
      warningCount: 2,
      averageScore: 7.5,
      evidenceLabel: "2 high genericness scores",
    },
  ],
  mediumPreferences: [
    {
      mediaType: "movie",
      averageRating: 8.1,
      mediaCount: 4,
      completedCount: 3,
      scoreCount: 12,
    },
    {
      mediaType: "novel",
      averageRating: 6.4,
      mediaCount: 2,
      completedCount: 1,
      scoreCount: 5,
    },
  ],
  strongestMediumPreference: {
    mediaType: "movie",
    averageRating: 8.1,
    mediaCount: 4,
    completedCount: 3,
    scoreCount: 12,
  },
  weakestMediumPreference: {
    mediaType: "novel",
    averageRating: 6.4,
    mediaCount: 2,
    completedCount: 1,
    scoreCount: 5,
  },
  recentlyInfluentialWorks: [
    {
      id: "media-1",
      title: "Arrival",
      mediaType: "movie",
      personalRating: 8.5,
      stayedWithMeScore: 9,
      worthTime: true,
      feltGeneric: false,
      appetiteEffect: "more_like_this",
      updatedAt: "2026-01-05T00:00:00Z",
    },
  ],
  generatedAt: "2026-01-06T00:00:00Z",
};

const emptyProfile: TasteProfileSummary = {
  ...profile,
  generatedSummary: "Not enough evidence yet.",
  isEmpty: true,
  confidence: "low",
  evidenceCounts: {
    mediaCount: 0,
    scoredMediaCount: 0,
    scoreCount: 0,
    aftertasteCount: 0,
  },
  strongestDimensions: [],
  weakestDimensions: [],
  negativeSignals: [],
  mediumPreferences: [],
  strongestMediumPreference: null,
  weakestMediumPreference: null,
  recentlyInfluentialWorks: [],
};

const mockedUseTasteProfile = vi.mocked(useTasteProfile);

function swrResult(data: TasteProfileSummary, overrides: Partial<ReturnType<typeof useTasteProfile>> = {}) {
  return {
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useTasteProfile>;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TasteProfilePage />
    </MemoryRouter>,
  );
}

describe("TasteProfilePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseTasteProfile.mockReturnValue(swrResult(profile));
  });

  it("renders a flat evidence dashboard with profile signals and ranked sections", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockedUseTasteProfile.mockReturnValue(swrResult(profile, { mutate }));

    renderPage();

    expect(screen.getByRole("heading", { name: "Taste Profile" })).toBeInTheDocument();
    const signals = screen.getByRole("region", { name: /taste signals/i });
    expect(signals).toHaveTextContent("Atmosphere");
    expect(signals).toHaveTextContent("Genericness");
    expect(signals).toHaveTextContent("Movie");
    expect(signals).toHaveTextContent("High");

    expect(screen.getByRole("region", { name: /taste summary/i })).toHaveTextContent(
      "You tend to reward strong atmosphere and punish generic work quickly.",
    );
    expect(screen.getByRole("region", { name: /strongest dimensions/i })).toHaveTextContent("Atmosphere");
    expect(screen.getByRole("region", { name: /weakest dimensions/i })).toHaveTextContent("Dialogue");
    expect(screen.getByRole("region", { name: /medium preferences/i })).toHaveTextContent("8.1/10");
    expect(screen.getByRole("region", { name: /taste red flags/i })).toHaveTextContent("2 warnings");

    const works = screen.getByRole("region", { name: /influential works/i });
    expect(within(works).getByRole("link", { name: /Arrival/ })).toHaveAttribute("href", "/library/media-1");

    await user.click(screen.getByRole("button", { name: "Refresh Profile" }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("keeps a focused empty state when the profile has no evidence", () => {
    mockedUseTasteProfile.mockReturnValue(swrResult(emptyProfile));

    renderPage();

    expect(screen.getByText("Taste Profile needs more evidence")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /taste signals/i })).toHaveTextContent("Needs data");
    expect(screen.getByRole("region", { name: /medium preferences/i })).toHaveTextContent(
      "Add rated media to calculate medium tendencies.",
    );
  });

  it("shows the error state without rendering stale profile regions", () => {
    mockedUseTasteProfile.mockReturnValue({
      data: undefined,
      error: new Error("Request failed"),
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useTasteProfile>);

    renderPage();

    expect(screen.getByText("Taste Profile unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /taste signals/i })).not.toBeInTheDocument();
  });
});
