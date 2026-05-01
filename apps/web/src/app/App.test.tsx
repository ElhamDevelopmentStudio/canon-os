import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { APP_NAVIGATION } from "@/app/navigation";
import { APP_ROUTES } from "@/app/routeConstants";
import { appRoutes } from "@/app/router";
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
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
    document.documentElement.className = "";
  });

  it("renders the shared CanonOS app shell", async () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /canonos dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /choose better media/i })).toBeInTheDocument();
    expect(screen.getByText(/canonos-api is ok/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recheck health/i })).toBeInTheDocument();

    for (const item of APP_NAVIGATION) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.route);
    }
  });

  it("supports theme toggle and collapsed sidebar state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /toggle theme mode/i }));
    expect(document.documentElement).toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("keeps route constants aligned with navigation", () => {
    const navRoutes = APP_NAVIGATION.map((item) => item.route);

    expect(navRoutes).toEqual([
      APP_ROUTES.dashboard,
      APP_ROUTES.library,
      APP_ROUTES.candidates,
      APP_ROUTES.tonight,
      APP_ROUTES.tasteProfile,
      APP_ROUTES.aftertasteLog,
      APP_ROUTES.queue,
      APP_ROUTES.settings,
    ]);
    expect(new Set(navRoutes).size).toBe(navRoutes.length);
    expect(appRoutes[0].children).toHaveLength(APP_NAVIGATION.length);
  });
});
