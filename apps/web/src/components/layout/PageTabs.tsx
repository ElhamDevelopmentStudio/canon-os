import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

export function PageTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: PageTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}) {
  const selectedTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div>
      <div aria-label="Page sections" className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={tab.id === selectedTab.id}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary",
              tab.id === selectedTab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
            id={`${tab.id}-tab`}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${selectedTab.id}-tab`}
        className="mt-4"
        id={`${selectedTab.id}-panel`}
        role="tabpanel"
      >
        {selectedTab.panel}
      </div>
    </div>
  );
}
