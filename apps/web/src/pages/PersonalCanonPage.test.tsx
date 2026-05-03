import type { Candidate, CanonSeason, MediaItem } from "@canonos/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addCanonSeasonItem,
  createCanonSeason,
  reorderCanonSeasonItems,
  updateCanonSeason,
  updateCanonSeasonItem,
  useCanonSeason,
  useCanonSeasons,
} from "@/features/canon/canonApi";
import { useCandidates } from "@/features/candidate-evaluator/candidateApi";
import { useMediaItems } from "@/features/media/mediaApi";
import { CanonSeasonDetailPage } from "@/pages/CanonSeasonDetailPage";
import { PersonalCanonPage } from "@/pages/PersonalCanonPage";

vi.mock("@/features/canon/canonApi", () => ({
  addCanonSeasonItem: vi.fn(),
  createCanonSeason: vi.fn(),
  deleteCanonSeasonItem: vi.fn(),
  reorderCanonSeasonItems: vi.fn(),
  updateCanonSeason: vi.fn(),
  updateCanonSeasonItem: vi.fn(),
  useCanonSeason: vi.fn(),
  useCanonSeasons: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  useMediaItems: vi.fn(),
}));

vi.mock("@/features/candidate-evaluator/candidateApi", () => ({
  useCandidates: vi.fn(),
}));

const mediaItem: MediaItem = {
  id: "media-1",
  title: "Stalker",
  originalTitle: "",
  mediaType: "movie",
  releaseYear: 1979,
  countryLanguage: "Russian",
  creator: "Andrei Tarkovsky",
  status: "planned",
  personalRating: null,
  startedDate: null,
  completedDate: null,
  runtimeMinutes: 162,
  episodeCount: null,
  pageCount: null,
  audiobookLengthMinutes: null,
  notes: "",
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const candidate: Candidate = {
  id: "candidate-1",
  title: "Roadside Picnic",
  mediaType: "novel",
  releaseYear: 1972,
  knownCreator: "Strugatsky brothers",
  premise: "",
  sourceOfInterest: "",
  hypeLevel: null,
  expectedGenericness: null,
  expectedTimeCostMinutes: 360,
  status: "sample",
  latestEvaluation: null,
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const season: CanonSeason = {
  id: "season-1",
  title: "Atmosphere Over Plot",
  theme: "atmosphere_over_plot",
  description: "Texture-first works for slow attention.",
  status: "active",
  startDate: "2026-05-04",
  endDate: null,
  reflectionNotes: "",
  reflectionPrompts: ["Which sensory details stayed with you after the plot faded?"],
  itemCount: 2,
  completedItemCount: 1,
  progressPercent: 50,
  items: [
    {
      id: "item-1",
      mediaItemId: mediaItem.id,
      candidateId: null,
      titleSnapshot: mediaItem.title,
      mediaType: "movie",
      order: 1,
      reasonIncluded: "Defines patient atmosphere.",
      whatToPayAttentionTo: "Notice image rhythm and silence.",
      completionStatus: "completed",
      canonStatus: "personal_canon",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    },
    {
      id: "item-2",
      mediaItemId: null,
      candidateId: candidate.id,
      titleSnapshot: candidate.title,
      mediaType: "novel",
      order: 2,
      reasonIncluded: "Source text contrast.",
      whatToPayAttentionTo: "Compare density.",
      completionStatus: "planned",
      canonStatus: "unmarked",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ],
  createdAt: "2026-01-03T00:00:00Z",
  updatedAt: "2026-01-03T00:00:00Z",
};

const mockedUseCanonSeasons = vi.mocked(useCanonSeasons);
const mockedUseCanonSeason = vi.mocked(useCanonSeason);
const mockedUseMediaItems = vi.mocked(useMediaItems);
const mockedUseCandidates = vi.mocked(useCandidates);
const mockedCreateCanonSeason = vi.mocked(createCanonSeason);
const mockedAddCanonSeasonItem = vi.mocked(addCanonSeasonItem);
const mockedReorderCanonSeasonItems = vi.mocked(reorderCanonSeasonItems);
const mockedUpdateCanonSeasonItem = vi.mocked(updateCanonSeasonItem);
const mockedUpdateCanonSeason = vi.mocked(updateCanonSeason);

function swrResult<T>(data: T) {
  return {
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  };
}

describe("Personal Canon pages", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseCanonSeasons.mockReturnValue(swrResult({ count: 1, next: null, previous: null, results: [season] }) as unknown as ReturnType<typeof useCanonSeasons>);
    mockedUseCanonSeason.mockReturnValue(swrResult(season) as unknown as ReturnType<typeof useCanonSeason>);
    mockedUseMediaItems.mockReturnValue(swrResult({ count: 1, next: null, previous: null, results: [mediaItem] }) as unknown as ReturnType<typeof useMediaItems>);
    mockedUseCandidates.mockReturnValue(swrResult({ count: 1, next: null, previous: null, results: [candidate] }) as unknown as ReturnType<typeof useCandidates>);
    mockedCreateCanonSeason.mockResolvedValue(season);
    mockedAddCanonSeasonItem.mockResolvedValue(season.items[0]);
    mockedReorderCanonSeasonItems.mockResolvedValue({ results: [...season.items].reverse(), season });
    mockedUpdateCanonSeasonItem.mockResolvedValue({ ...season.items[1], completionStatus: "completed" });
    mockedUpdateCanonSeason.mockResolvedValue({ ...season, reflectionNotes: "A season reflection." });
  });

  it("renders season cards and creates a canon season", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PersonalCanonPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Personal Canon" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: season.title })).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create Season" }));
    await user.type(screen.getByLabelText("Title"), "Moral Collapse Season");
    await user.selectOptions(screen.getByLabelText("Theme"), "moral_collapse");
    await user.type(screen.getByLabelText("Description"), "A focused exploration path.");
    await user.click(screen.getByRole("button", { name: "Save Season" }));

    expect(mockedCreateCanonSeason).toHaveBeenCalledWith(expect.objectContaining({
      title: "Moral Collapse Season",
      theme: "moral_collapse",
    }));
  });

  it("renders detail items, adds, reorders, completes, and saves reflection notes", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/seasons/season-1"]}>
        <Routes>
          <Route path="/seasons/:seasonId" element={<CanonSeasonDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: season.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: mediaItem.title })).toBeInTheDocument();
    expect(screen.getAllByText("Reason included")[0]).toBeInTheDocument();
    expect(screen.getAllByText("What to pay attention to")[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Item" }));
    await user.selectOptions(screen.getByLabelText("Source type"), "media");
    await user.selectOptions(screen.getByLabelText("Media item"), mediaItem.id);
    await user.type(screen.getByLabelText("Reason included"), "Essential atmosphere checkpoint.");
    await user.click(screen.getByRole("button", { name: "Save Item" }));
    expect(mockedAddCanonSeasonItem).toHaveBeenCalledWith("season-1", expect.objectContaining({ mediaItemId: mediaItem.id }));

    await user.click(screen.getByRole("button", { name: `Move ${candidate.title} up` }));
    expect(mockedReorderCanonSeasonItems).toHaveBeenCalledWith("season-1", ["item-2", "item-1"]);

    await user.click(screen.getAllByRole("button", { name: "Mark Complete" })[0]);
    expect(mockedUpdateCanonSeasonItem).toHaveBeenCalledWith("season-1", "item-2", { completionStatus: "completed" });

    await user.selectOptions(screen.getByLabelText(`Canon status for ${candidate.title}`), "near_canon");
    expect(mockedUpdateCanonSeasonItem).toHaveBeenCalledWith("season-1", "item-2", { canonStatus: "near_canon" });

    await user.type(screen.getByLabelText(/Summary notes/), "A season reflection.");
    await user.click(screen.getByRole("button", { name: "Save Reflection" }));
    expect(mockedUpdateCanonSeason).toHaveBeenCalledWith("season-1", { reflectionNotes: "A season reflection." });
  });
});
