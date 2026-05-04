import type { AftertasteEntryListResponse, AftertastePrompt, MediaItemListResponse } from "@canonos/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAftertasteEntry,
  deleteAftertasteEntry,
  updateAftertasteEntry,
  useAftertasteEntries,
  useAftertastePrompts,
} from "@/features/aftertaste/aftertasteApi";
import { useMediaItems } from "@/features/media/mediaApi";
import { AftertasteLogPage } from "@/pages/AftertasteLogPage";

vi.mock("@/features/aftertaste/aftertasteApi", () => ({
  createAftertasteEntry: vi.fn(),
  deleteAftertasteEntry: vi.fn(),
  updateAftertasteEntry: vi.fn(),
  useAftertasteEntries: vi.fn(),
  useAftertastePrompts: vi.fn(),
}));

vi.mock("@/features/media/mediaApi", () => ({
  useMediaItems: vi.fn(),
}));

const aftertasteList: AftertasteEntryListResponse = {
  count: 60,
  next: "/api/aftertaste/?page=2",
  previous: null,
  results: [
    {
      id: "d5c3f86f-8a7f-44f6-8ad4-103b7d79f5db",
      mediaItemId: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
      mediaTitle: "Stalker",
      worthTime: true,
      stayedWithMeScore: 9,
      feltAlive: true,
      feltGeneric: false,
      completionReason: "Completed",
      whatWorked: "Patience and atmosphere.",
      whatFailed: "Nothing important.",
      finalThoughts: "Still lingering.",
      appetiteEffect: "more_like_this",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ],
};

const mediaList: MediaItemListResponse = {
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

const prompts: AftertastePrompt[] = [
  { id: "worth_time", label: "Was it worth the time?", helperText: "Capture whether it justified the time." },
];

const mockedUseAftertasteEntries = vi.mocked(useAftertasteEntries);
const mockedUseAftertastePrompts = vi.mocked(useAftertastePrompts);
const mockedUseMediaItems = vi.mocked(useMediaItems);

function renderAftertasteLog(initialRoute = "/aftertaste") {
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AftertasteLogPage />
    </MemoryRouter>,
  );
}

describe("AftertasteLogPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createAftertasteEntry).mockResolvedValue(aftertasteList.results[0]);
    vi.mocked(updateAftertasteEntry).mockResolvedValue(aftertasteList.results[0]);
    vi.mocked(deleteAftertasteEntry).mockResolvedValue();
    mockedUseAftertasteEntries.mockReturnValue({
      data: aftertasteList,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAftertasteEntries>);
    mockedUseMediaItems.mockReturnValue({
      data: mediaList,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useMediaItems>);
    mockedUseAftertastePrompts.mockReturnValue({
      data: prompts,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useAftertastePrompts>);
  });

  it("renders paginated reflections and keeps media choices bounded", async () => {
    const user = userEvent.setup();

    renderAftertasteLog();

    expect(screen.getByRole("heading", { name: /aftertaste log/i })).toBeInTheDocument();
    expect(screen.getByText("Stalker")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /reflection pagination/i })).toHaveTextContent(
      "Showing 1-25 of 60 reflections",
    );
    expect(mockedUseMediaItems).toHaveBeenCalledWith({ pageSize: "100" });

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(mockedUseAftertasteEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: "2" }),
      ),
    );
  });
});
