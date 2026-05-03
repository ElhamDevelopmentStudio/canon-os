import type { MediaItemListResponse, TasteDimension } from "@canonos/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMediaItem, deleteMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { LibraryPage } from "@/pages/LibraryPage";

vi.mock("@/features/media/tasteApi", () => ({
  upsertMediaScores: vi.fn(),
  useTasteDimensions: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  createMediaItem: vi.fn(),
  deleteMediaItem: vi.fn(),
  updateMediaItem: vi.fn(),
  useMediaItems: vi.fn(),
}));

const sampleList: MediaItemListResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      title: "Stalker",
      originalTitle: "Сталкер",
      mediaType: "movie",
      releaseYear: 1979,
      countryLanguage: "Soviet Union / Russian",
      creator: "Andrei Tarkovsky",
      status: "completed",
      personalRating: 9.5,
      startedDate: "2026-01-02",
      completedDate: "2026-01-02",
      runtimeMinutes: 162,
      episodeCount: null,
      pageCount: null,
      audiobookLengthMinutes: null,
      notes: "Dense, patient, and atmospheric.",
      createdAt: "2026-01-02T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ],
};

const mockedUseMediaItems = vi.mocked(useMediaItems);
const mockedCreateMediaItem = vi.mocked(createMediaItem);
const mockedDeleteMediaItem = vi.mocked(deleteMediaItem);
const mockedUseTasteDimensions = vi.mocked(useTasteDimensions);
const mockedUpsertMediaScores = vi.mocked(upsertMediaScores);

const sampleDimensions: TasteDimension[] = [
  {
    id: "6cc99274-279b-4cf7-8dd0-623ed19798e1",
    name: "Story depth",
    slug: "story_depth",
    description: "How layered the story is.",
    direction: "positive",
    isDefault: true,
  },
];

function renderLibrary(initialRoute = "/library") {
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseTasteDimensions.mockReturnValue({
      data: sampleDimensions,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTasteDimensions>);
    mockedUpsertMediaScores.mockResolvedValue({ results: [] });
    mockedUseMediaItems.mockReturnValue({
      data: sampleList,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useMediaItems>);
  });

  it("renders media rows with filters and actions", () => {
    renderLibrary();

    expect(screen.getByRole("heading", { name: /library/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /stalker/i })).toHaveAttribute(
      "href",
      "/library/8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
    );
    expect(screen.getAllByText(/movie/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/filter by media type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add media/i })).toBeInTheDocument();
  });


  it("hydrates advanced filters from the URL and clears active chips", async () => {
    const user = userEvent.setup();
    renderLibrary("/library?creator=Tarkovsky&ratingMin=8&genericnessMax=3&completedFrom=2026-01-01");

    expect(mockedUseMediaItems).toHaveBeenLastCalledWith(
      expect.objectContaining({
        creator: "Tarkovsky",
        ratingMin: "8",
        genericnessMax: "3",
        completedFrom: "2026-01-01",
      }),
    );
    expect(screen.getByLabelText(/active filters/i)).toHaveTextContent("Creator: Tarkovsky");
    expect(screen.getByLabelText(/active filters/i)).toHaveTextContent("Max genericness: 3");

    await user.click(screen.getByRole("button", { name: /advanced filters/i }));
    const advancedFilters = screen.getByLabelText(/advanced library filters/i);
    expect(within(advancedFilters).getByLabelText(/^creator$/i)).toHaveValue("Tarkovsky");
    expect(within(advancedFilters).getByLabelText(/minimum rating/i)).toHaveValue(8);

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    await waitFor(() => expect(screen.queryByLabelText(/active filters/i)).not.toBeInTheDocument());
    expect(mockedUseMediaItems).toHaveBeenLastCalledWith({});
  });

  it("updates advanced filters through accessible controls", async () => {
    const user = userEvent.setup();
    renderLibrary();

    await user.click(screen.getByRole("button", { name: /advanced filters/i }));
    const advancedFilters = screen.getByLabelText(/advanced library filters/i);
    await user.type(within(advancedFilters).getByLabelText(/^creator$/i), "Kurosawa");
    await user.type(within(advancedFilters).getByLabelText(/maximum regret/i), "2");

    await waitFor(() =>
      expect(mockedUseMediaItems).toHaveBeenLastCalledWith(
        expect.objectContaining({ creator: "Kurosawa", regretMax: "2" }),
      ),
    );
    expect(screen.getByLabelText(/active filters/i)).toHaveTextContent("Creator: Kurosawa");
    expect(screen.getByLabelText(/active filters/i)).toHaveTextContent("Max regret: 2");
  });

  it("creates and deletes media through connected actions", async () => {
    const user = userEvent.setup();
    mockedCreateMediaItem.mockResolvedValue(sampleList.results[0]);
    mockedDeleteMediaItem.mockResolvedValue();
    renderLibrary();

    await user.click(screen.getByRole("button", { name: /add media/i }));
    const dialog = screen.getByRole("dialog", { name: /add media/i });
    await user.type(within(dialog).getByLabelText(/^title$/i), "Mushishi");
    await user.selectOptions(within(dialog).getByLabelText(/media type/i), "anime");
    await user.clear(within(dialog).getByLabelText(/^score$/i));
    await user.type(within(dialog).getByLabelText(/^score$/i), "8.5");
    await user.click(within(dialog).getByRole("button", { name: /save media/i }));

    expect(mockedCreateMediaItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mushishi", mediaType: "anime" }),
    );
    expect(mockedUpsertMediaScores).toHaveBeenCalledWith(
      sampleList.results[0].id,
      { scores: [{ dimensionId: sampleDimensions[0].id, note: "", score: 8.5 }] },
    );

    await user.click(screen.getByRole("button", { name: /delete stalker/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockedDeleteMediaItem).toHaveBeenCalledWith(sampleList.results[0].id);
  });
});
