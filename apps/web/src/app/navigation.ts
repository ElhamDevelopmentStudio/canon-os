import {
  BookOpen,
  ClipboardList,
  Compass,
  Gauge,
  Library,
  MessageSquare,
  ListChecks,
  Moon,
  Network,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { APP_ROUTES, type AppRoutePath } from "@/app/routeConstants";

export type NavigationItem = {
  label: string;
  route: AppRoutePath;
  icon: LucideIcon;
  description: string;
};

export const APP_NAVIGATION: NavigationItem[] = [
  {
    label: "Dashboard",
    route: APP_ROUTES.dashboard,
    icon: Gauge,
    description: "Decision overview and recent signals.",
  },
  {
    label: "Library",
    route: APP_ROUTES.library,
    icon: Library,
    description: "Owned, consumed, planned, paused, and dropped media.",
  },
  {
    label: "Candidates",
    route: APP_ROUTES.candidates,
    icon: Sparkles,
    description: "Pre-watch, pre-read, and pre-listen evaluations.",
  },
  {
    label: "Media Archaeologist",
    route: APP_ROUTES.discovery,
    icon: Compass,
    description: "Deep-cut discovery trails and cross-medium expansion maps.",
  },
  {
    label: "Critic Council",
    route: APP_ROUTES.criticCouncil,
    icon: MessageSquare,
    description: "Multi-perspective debates for candidates and media decisions.",
  },
  {
    label: "Tonight Mode",
    route: APP_ROUTES.tonight,
    icon: Moon,
    description: "Shortlist options for current mood, time, and energy.",
  },
  {
    label: "Taste Profile",
    route: APP_ROUTES.tasteProfile,
    icon: BookOpen,
    description: "Personal standards, patterns, and taste evolution.",
  },
  {
    label: "TasteGraph",
    route: APP_ROUTES.tasteGraph,
    icon: Network,
    description: "Graph connections between media, creators, dimensions, and reactions.",
  },
  {
    label: "Aftertaste Log",
    route: APP_ROUTES.aftertasteLog,
    icon: ClipboardList,
    description: "Reflections after finishing or dropping media.",
  },
  {
    label: "Queue",
    route: APP_ROUTES.queue,
    icon: ListChecks,
    description: "Prioritized candidates and planned consumption.",
  },
  {
    label: "Settings",
    route: APP_ROUTES.settings,
    icon: Settings,
    description: "Preferences, data portability, and integrations.",
  },
];
