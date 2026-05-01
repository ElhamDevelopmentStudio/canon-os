import type { QueueItem, QueueItemListResponse } from "@canonos/contracts";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQueueItem,
  deleteQueueItem,
  reorderQueueItems,
  updateQueueItem,
  useQueueItems,
} from "@/features/queue/queueApi";
import { QueuePage } from "@/pages/QueuePage";

vi.mock("@/features/queue/queueApi", () => ({
  createQueueItem: vi.fn(),
  deleteQueueItem: vi.fn(),
  reorderQueueItems: vi.fn(),
  updateQueueItem: vi.fn(),
  useQueueItems: vi.fn(),
}));

const queueItems: QueueItem[] = [
  {
    id: "91a250c9-a8ec-44e6-8fe9-3df55ef96e82",
    mediaItemId: null,
    candidateId: null,
    title: "Stalker",
    mediaType: "movie",
    priority: "start_soon",
    reason: "High fit and worth focused attention.",
    estimatedTimeMinutes: 162,
    bestMood: "Deep focus",
    queuePosition: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "8a3f2c28-74b6-4a2d-b3fe-c19dbb8a60d9",
    mediaItemId: null,
    candidateId: null,
    title: "Perfect Blue",
    mediaType: "anime",
    priority: "sample_first",
    reason: "Evaluation recommended sampling.",
    estimatedTimeMinutes: 81,
    bestMood: "Focused and curious",
    queuePosition: 2,
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  },
];

const sampleList: QueueItemListResponse = {
  count: 2,
  next: null,
  previous: null,
  results: queueItems,
};

const mockedUseQueueItems = vi.mocked(useQueueItems);
const mockedCreateQueueItem = vi.mocked(createQueueItem);
const mockedUpdateQueueItem = vi.mocked(updateQueueItem);
const mockedDeleteQueueItem = vi.mocked(deleteQueueItem);
const mockedReorderQueueItems = vi.mocked(reorderQueueItems);

function mockQueue(data: QueueItemListResponse = sampleList) {
  mockedUseQueueItems.mockReturnValue({
    data,
    error: undefined,
    isLoading: false,
    isValidating: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useQueueItems>);
}

describe("QueuePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockQueue();
    mockedCreateQueueItem.mockResolvedValue(queueItems[0]);
    mockedUpdateQueueItem.mockResolvedValue({ ...queueItems[0], priority: "later" });
    mockedDeleteQueueItem.mockResolvedValue();
    mockedReorderQueueItems.mockResolvedValue({ results: [...queueItems].reverse() });
  });

  it("renders queue columns and cards", () => {
    render(<QueuePage />);

    expect(screen.getByRole("heading", { name: /adaptive queue/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /start soon/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sample first/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /delay \/ archive/i })).toBeInTheDocument();
    expect(screen.getByText("Stalker")).toBeInTheDocument();
    expect(screen.getByText("Perfect Blue")).toBeInTheDocument();
  });

  it("creates and edits a queue item", async () => {
    const user = userEvent.setup();
    render(<QueuePage />);

    await user.click(screen.getByRole("button", { name: /add queue item/i }));
    const addDialog = screen.getByRole("dialog", { name: /add queue item/i });
    await user.clear(within(addDialog).getByLabelText(/^title$/i));
    await user.type(within(addDialog).getByLabelText(/^title$/i), "Roadside Picnic");
    await user.selectOptions(within(addDialog).getByLabelText(/media type/i), "novel");
    await user.selectOptions(within(addDialog).getByLabelText(/priority/i), "start_soon");
    await user.type(within(addDialog).getByLabelText(/best mood/i), "Deep reading focus");
    await user.type(within(addDialog).getByLabelText(/reason/i), "Short and high-fit science fiction.");
    await user.click(within(addDialog).getByRole("button", { name: /^save$/i }));

    expect(mockedCreateQueueItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Roadside Picnic", mediaType: "novel", priority: "start_soon" }),
    );

    await user.click(screen.getByRole("button", { name: /edit stalker/i }));
    const editDialog = screen.getByRole("dialog", { name: /edit queue item/i });
    await user.selectOptions(within(editDialog).getByLabelText(/priority/i), "later");
    await user.click(within(editDialog).getByRole("button", { name: /^save$/i }));

    expect(mockedUpdateQueueItem).toHaveBeenCalledWith(
      queueItems[0].id,
      expect.objectContaining({ priority: "later" }),
    );
  });

  it("reorders and deletes queue items", async () => {
    const user = userEvent.setup();
    render(<QueuePage />);

    await user.click(screen.getByRole("button", { name: /move perfect blue up/i }));
    expect(mockedReorderQueueItems).toHaveBeenCalledWith([queueItems[1].id, queueItems[0].id]);

    await user.click(screen.getByRole("button", { name: /remove stalker/i }));
    await user.click(screen.getByRole("button", { name: /^remove$/i }));
    expect(mockedDeleteQueueItem).toHaveBeenCalledWith(queueItems[0].id);
  });
});
