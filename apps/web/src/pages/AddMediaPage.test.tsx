import type { ExternalMediaMatch, TasteDimension } from "@canonos/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMediaItem } from "@/features/media/mediaApi";
import { upsertMediaScores, useTasteDimensions } from "@/features/media/tasteApi";
import { attachMetadata, searchMetadata } from "@/features/metadata/metadataApi";
import { AddMediaPage } from "@/pages/AddMediaPage";

vi.mock("@/features/media/mediaApi", () => ({
  createMediaItem: vi.fn(),
}));

vi.mock("@/features/media/tasteApi", () => ({
  upsertMediaScores: vi.fn(),
  useTasteDimensions: vi.fn(),
}));

vi.mock("@/features/metadata/metadataApi", () => ({
  attachMetadata: vi.fn(),
  searchMetadata: vi.fn(),
}));

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

const duneMatch: ExternalMediaMatch = {
  provider: "movie_tv",
  providerItemId: "tmdb:movie:438631",
  mediaType: "movie",
  title: "Dune: Part Two",
  originalTitle: "Dune: Part Two",
  description: "Paul Atreides unites with Chani and the Fremen.",
  releaseYear: 2024,
  creator: "Denis Villeneuve",
  imageUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
  externalRating: 8.4,
  externalPopularity: 322,
  confidence: 0.96,
  sourceUrl: "https://www.themoviedb.org/movie/438631",
  rawPayload: { sourceProvider: "tmdb", genres: ["Science Fiction"], runtime: 166 },
};

const mockedSearchMetadata = vi.mocked(searchMetadata);
const mockedCreateMediaItem = vi.mocked(createMediaItem);
const mockedAttachMetadata = vi.mocked(attachMetadata);
const mockedUseTasteDimensions = vi.mocked(useTasteDimensions);
const mockedUpsertMediaScores = vi.mocked(upsertMediaScores);

function renderAddMediaPage() {
  window.history.pushState({}, "", "/library/new");
  render(
    <BrowserRouter>
      <AddMediaPage />
    </BrowserRouter>,
  );
}

describe("AddMediaPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedSearchMetadata.mockResolvedValue({ count: 1, results: [duneMatch] });
    mockedCreateMediaItem.mockResolvedValue({
      id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      title: "Dune: Part Two",
      originalTitle: "Dune: Part Two",
      mediaType: "movie",
      releaseYear: 2024,
      countryLanguage: "",
      creator: "Denis Villeneuve",
      status: "planned",
      personalRating: 8.5,
      startedDate: null,
      completedDate: null,
      runtimeMinutes: null,
      episodeCount: null,
      pageCount: null,
      audiobookLengthMinutes: null,
      notes: "Paul Atreides unites with Chani and the Fremen.",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    });
    mockedAttachMetadata.mockResolvedValue({
      id: "9a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      mediaItemId: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      provider: "movie_tv",
      providerItemId: "tmdb:movie:438631",
      normalizedTitle: "Dune: Part Two",
      normalizedDescription: "Paul Atreides unites with Chani and the Fremen.",
      imageUrl: "",
      externalRating: 8.4,
      externalPopularity: 322,
      sourceUrl: "https://www.themoviedb.org/movie/438631",
      rawPayload: {},
      lastRefreshedAt: "2026-01-03T00:00:00Z",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    });
    mockedUpsertMediaScores.mockResolvedValue({ results: [] });
    mockedUseTasteDimensions.mockReturnValue({
      data: sampleDimensions,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useTasteDimensions>);
  });

  it("searches one chosen category, shows details, configures scoring, and saves a queued batch", async () => {
    const user = userEvent.setup();
    renderAddMediaPage();
    const searchRegion = screen.getByRole("region", { name: /search public metadata/i });

    await user.type(within(searchRegion).getByLabelText(/movie title/i), "Dune");
    await user.click(within(searchRegion).getByRole("button", { name: /^search$/i }));

    await waitFor(() =>
      expect(mockedSearchMetadata).toHaveBeenCalledWith({
        query: "Dune",
        mediaType: "movie",
        provider: "movie_tv",
      }),
    );
    const searchParams = new URLSearchParams(window.location.search);
    expect(searchParams.get("q")).toBe("Dune");
    expect(searchParams.get("type")).toBe("movie");
    expect(searchParams.get("provider")).toBe("movie_tv");
    await user.click(screen.getByRole("heading", { name: /dune: part two/i }));

    const details = screen.getByRole("dialog", { name: /dune: part two/i });
    expect(within(details).getByText(/science fiction/i)).toBeInTheDocument();
    expect(within(details).queryByText(/rawPayload/i)).not.toBeInTheDocument();
    expect(within(details).queryByText(/\{"sourceProvider"/i)).not.toBeInTheDocument();
    await user.click(within(details).getByRole("button", { name: /add this title/i }));
    await user.click(within(details).getByRole("button", { name: /close/i }));

    await user.click(screen.getByRole("button", { name: /actions for dune: part two/i }));
    await user.click(screen.getByRole("button", { name: /configure/i }));
    const config = screen.getByRole("dialog", { name: /dune: part two/i });
    await user.click(within(config).getByRole("button", { name: /strong/i }));
    await user.click(within(config).getByRole("button", { name: /taste scores/i }));
    await user.type(within(config).getByLabelText(/story depth numeric score/i), "8");
    await user.click(within(config).getByRole("button", { name: /apply/i }));

    await user.click(screen.getByRole("button", { name: /save 1 title/i }));

    await waitFor(() =>
      expect(mockedCreateMediaItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Dune: Part Two",
          mediaType: "movie",
          personalRating: 8.5,
        }),
      ),
    );
    expect(mockedAttachMetadata).toHaveBeenCalledWith("8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9", duneMatch);
    expect(mockedUpsertMediaScores).toHaveBeenCalledWith(
      "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      { scores: [{ dimensionId: sampleDimensions[0].id, note: "", score: 8 }] },
    );
  });

  it("clears queued selections when the batch category changes", async () => {
    const user = userEvent.setup();
    renderAddMediaPage();
    const searchRegion = screen.getByRole("region", { name: /search public metadata/i });

    await user.type(within(searchRegion).getByLabelText(/movie title/i), "Dune");
    await user.click(within(searchRegion).getByRole("button", { name: /^search$/i }));
    await user.click(await screen.findByRole("button", { name: /^add$/i }));
    expect(screen.getByRole("complementary", { name: /selected movie titles/i })).toBeInTheDocument();
    expect(screen.getAllByText(/dune: part two/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^anime/i }));

    expect(screen.queryByText(/dune: part two/i)).not.toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /selected anime titles/i })).toBeInTheDocument();
  });
});
