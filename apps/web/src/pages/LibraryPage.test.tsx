import type { MediaItemListResponse } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMediaItem, deleteMediaItem, useMediaItems } from "@/features/media/mediaApi";
import { LibraryPage } from "@/pages/LibraryPage";

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

function renderLibrary() {
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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

  it("creates and deletes media through connected actions", async () => {
    const user = userEvent.setup();
    mockedCreateMediaItem.mockResolvedValue(sampleList.results[0]);
    mockedDeleteMediaItem.mockResolvedValue();
    renderLibrary();

    await user.click(screen.getByRole("button", { name: /add media/i }));
    const dialog = screen.getByRole("dialog", { name: /add media/i });
    await user.type(within(dialog).getByLabelText(/^title$/i), "Mushishi");
    await user.selectOptions(within(dialog).getByLabelText(/media type/i), "anime");
    await user.click(within(dialog).getByRole("button", { name: /save media/i }));

    expect(mockedCreateMediaItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mushishi", mediaType: "anime" }),
    );

    await user.click(screen.getByRole("button", { name: /delete stalker/i }));
    await user.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(mockedDeleteMediaItem).toHaveBeenCalledWith(sampleList.results[0].id);
  });
});
