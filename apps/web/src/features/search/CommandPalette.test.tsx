import type { UnifiedSearchResponse } from "@canonos/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "@/features/search/CommandPalette";
import { useUnifiedSearch } from "@/features/search/searchApi";

vi.mock("@/features/search/searchApi", () => ({
  useUnifiedSearch: vi.fn(),
}));

const mockedUseUnifiedSearch = vi.mocked(useUnifiedSearch);

const searchResponse: UnifiedSearchResponse = {
  query: "solaris",
  count: 4,
  results: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      type: "media",
      title: "Solaris Archive",
      subtitle: "Library item",
      description: "Andrei Tarkovsky · 1972 · completed",
      targetUrl: "/library/11111111-1111-4111-8111-111111111111",
      metadata: { mediaType: "movie" },
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      type: "candidate",
      title: "Solaris Candidate",
      subtitle: "Candidate",
      description: "Soderbergh · unevaluated",
      targetUrl: "/candidates?candidateId=22222222-2222-4222-8222-222222222222",
      metadata: { mediaType: "movie" },
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      type: "queue_item",
      title: "Solaris Queue",
      subtitle: "Queue item",
      description: "sample first · active",
      targetUrl: "/queue?queueItemId=33333333-3333-4333-8333-333333333333",
      metadata: { mediaType: "movie" },
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      type: "canon_season",
      title: "Solaris Season",
      subtitle: "Canon season",
      description: "Modern works worth it · active",
      targetUrl: "/seasons/44444444-4444-4444-8444-444444444444",
      metadata: { theme: "modern_works_worth_it" },
    },
  ],
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}{location.search}</span>;
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedUseUnifiedSearch.mockReturnValue({
      data: searchResponse,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useUnifiedSearch>);
  });

  it("renders all global result types and navigates when a result is selected", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CommandPalette open onClose={onClose} />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.type(screen.getByRole("searchbox", { name: /global search/i }), "solaris");

    expect(screen.getByRole("button", { name: /solaris archive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solaris candidate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solaris queue/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /solaris season/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /solaris candidate/i }));

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/candidates?candidateId=22222222-2222-4222-8222-222222222222",
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("focuses search on open and closes from the keyboard", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CommandPalette open onClose={onClose} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("searchbox", { name: /global search/i })).toHaveFocus());

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
