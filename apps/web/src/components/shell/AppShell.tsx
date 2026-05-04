import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { MainContent } from "@/components/layout/MainContent";
import { LeftSidebar } from "@/components/shell/LeftSidebar";
import { TopHeader } from "@/components/shell/TopHeader";
import { CommandPalette } from "@/features/search/CommandPalette";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

export function AppShell() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const themeMode = useAppStore((state) => state.themeMode);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.classList.toggle(
        "dark",
        themeMode === "dark" || (themeMode === "system" && Boolean(mediaQuery?.matches)),
      );
    };
    applyTheme();
    if (themeMode !== "system" || !mediaQuery) return;
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themeMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={cn("min-h-screen lg:grid lg:grid-cols-[18rem_1fr]", sidebarCollapsed && "lg:grid-cols-[5rem_1fr]")}>
        <LeftSidebar />
        <div className="min-w-0">
          <TopHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
          <MainContent>
            <Outlet />
          </MainContent>
        </div>
      </div>
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}
