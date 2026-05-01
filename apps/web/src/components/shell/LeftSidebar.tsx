import { ChevronLeft, Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { APP_NAVIGATION } from "@/app/navigation";
import { APP_ROUTES } from "@/app/routeConstants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";

export function LeftSidebar() {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const toggleSidebarCollapsed = useAppStore((state) => state.toggleSidebarCollapsed);

  return (
    <>
      <button
        aria-controls="app-sidebar"
        aria-expanded={mobileSidebarOpen}
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary lg:hidden"
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <span className="sr-only">Open navigation</span>
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>
      {mobileSidebarOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-border bg-card/95 p-4 shadow-xl transition duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
          mobileSidebarOpen && "translate-x-0",
          sidebarCollapsed && "lg:w-20",
        )}
        id="app-sidebar"
      >
        <div className="flex items-start justify-between gap-3">
          <NavLink
            aria-label="CanonOS dashboard"
            className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            to={APP_ROUTES.dashboard}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">CanonOS</p>
            <h1 className={cn("mt-2 text-xl font-semibold text-card-foreground", sidebarCollapsed && "lg:sr-only")}>
              Media judgment OS
            </h1>
          </NavLink>
          <Button
            aria-label="Close navigation"
            className="lg:hidden"
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <nav aria-label="Primary navigation" className="mt-8 grid gap-1">
          {APP_NAVIGATION.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary",
                  isActive && "bg-muted text-foreground",
                  sidebarCollapsed && "lg:justify-center lg:px-2",
                )
              }
              key={item.route}
              title={sidebarCollapsed ? item.label : undefined}
              to={item.route}
              onClick={() => setMobileSidebarOpen(false)}
            >
              <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className={cn(sidebarCollapsed && "lg:sr-only")}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden pt-4 lg:block">
          <Button
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full gap-2"
            type="button"
            variant="secondary"
            onClick={toggleSidebarCollapsed}
          >
            <ChevronLeft aria-hidden="true" className={cn("h-4 w-4 transition", sidebarCollapsed && "rotate-180")} />
            <span className={cn(sidebarCollapsed && "sr-only")}>Collapse</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
