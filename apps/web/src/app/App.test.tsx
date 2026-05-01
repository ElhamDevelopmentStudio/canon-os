import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/App";
import { APP_NAVIGATION } from "@/app/navigation";
import { APP_ROUTES } from "@/app/routeConstants";
import { protectedRouteChildren } from "@/app/router";
import { useAuthStore } from "@/stores/authStore";

vi.mock("@/lib/health", () => ({
  useHealthCheck: () => ({
    data: { status: "ok", service: "canonos-api", version: "0.1.0" },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  }),
}));

const authenticatedUser = {
  id: 1,
  email: "reader@example.com",
  username: "reader@example.com",
  profile: {
    id: 1,
    displayName: "Canon Reader",
    timezone: "UTC",
    preferredLanguage: "en",
  },
};

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
    document.documentElement.className = "";
    useAuthStore.setState({ currentUser: authenticatedUser, status: "authenticated", error: null, csrfToken: null });
  });

  it("renders the shared CanonOS app shell for authenticated users", async () => {
    render(<App />);

    expect(screen.getByRole("link", { name: /canonos dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /choose better media/i })).toBeInTheDocument();
    expect(screen.getByText(/canonos-api is ok/i)).toBeInTheDocument();
    expect(screen.getByText(/canon reader/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log out/i })).toBeInTheDocument();
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
    expect(protectedRouteChildren).toHaveLength(APP_NAVIGATION.length);
  });

  it("redirects unauthenticated app routes to login", async () => {
    useAuthStore.setState({ currentUser: null, status: "unauthenticated", error: null, csrfToken: null });
    window.history.pushState({}, "", APP_ROUTES.library);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders register form for unauthenticated users", async () => {
    useAuthStore.setState({ currentUser: null, status: "unauthenticated", error: null, csrfToken: null });
    window.history.pushState({}, "", APP_ROUTES.register);

    render(<App />);

    expect(await screen.findByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
