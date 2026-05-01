import { BookOpen, Compass, Gauge, Library, Moon, Settings, Sparkles } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", to: "/", icon: Gauge },
  { label: "Library", to: "/library", icon: Library },
  { label: "Evaluate", to: "/evaluate", icon: Sparkles },
  { label: "Tonight", to: "/tonight", icon: Moon },
  { label: "Taste", to: "/taste", icon: BookOpen },
  { label: "Discover", to: "/discover", icon: Compass },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[17rem_1fr]">
        <aside className="border-b border-border bg-card/80 p-4 lg:border-b-0 lg:border-r">
          <a className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" href="/">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">CanonOS</p>
            <h1 className="mt-2 text-2xl font-semibold text-card-foreground">Media judgment OS</h1>
          </a>
          <nav aria-label="Primary navigation" className="mt-8 grid gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary",
                    isActive && "bg-muted text-foreground",
                  )
                }
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
