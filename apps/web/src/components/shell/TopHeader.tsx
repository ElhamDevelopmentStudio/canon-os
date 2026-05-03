import { LogOut, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { APP_ROUTES } from "@/app/routeConstants";
import { CommandSearchInput } from "@/components/forms/CommandSearchInput";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/features/jobs/NotificationsDropdown";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

export function TopHeader({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const themeMode = useAppStore((state) => state.themeMode);
  const toggleThemeMode = useAppStore((state) => state.toggleThemeMode);
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate(APP_ROUTES.login, { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-3 pl-12 lg:pl-0">
        <a
          className="sr-only rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-primary"
          href="#main-content"
        >
          Skip to content
        </a>
        <CommandSearchInput
          aria-label="Open command palette"
          className="hidden max-w-md flex-1 md:block"
          readOnly
          value=""
          onClick={onOpenCommandPalette}
          onFocus={onOpenCommandPalette}
        />
        <div className="ml-auto flex items-center gap-2">
          {currentUser ? (
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline" title={currentUser.email}>
              {currentUser.profile.displayName}
            </span>
          ) : null}
          <NotificationsDropdown />
          <Button aria-label="Toggle theme mode" size="sm" type="button" variant="secondary" onClick={toggleThemeMode}>
            {themeMode === "dark" ? (
              <Sun aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Moon aria-hidden="true" className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">{themeMode === "dark" ? "Light" : "Dark"}</span>
          </Button>
          <Button aria-label="Log out" size="sm" type="button" variant="ghost" onClick={() => void handleLogout()}>
            <LogOut aria-hidden="true" className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
