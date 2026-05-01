import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";

vi.mock("@/lib/health", () => ({
  useHealthCheck: () => ({
    data: { status: "ok", service: "canonos-api", version: "0.1.0" },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  }),
}));

describe("App", () => {
  it("renders the CanonOS foundation shell", async () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /canonos media judgment os/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /choose better media/i })).toBeInTheDocument();
    expect(screen.getByText(/canonos-api is ok/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recheck health/i })).toBeInTheDocument();
  });
});
