import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { AftertasteLogPage } from "@/pages/AftertasteLogPage";
import { APP_ROUTES } from "@/app/routeConstants";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import { RouteErrorFallback } from "@/components/feedback/RouteErrorFallback";
import { DashboardPage } from "@/pages/DashboardPage";
import { CandidateEvaluatorPage } from "@/pages/CandidateEvaluatorPage";
import { MediaArchaeologistPage } from "@/pages/MediaArchaeologistPage";
import { CriticCouncilPage } from "@/pages/CriticCouncilPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { MediaDetailPage } from "@/pages/MediaDetailPage";
import { QueuePage } from "@/pages/QueuePage";
import { TonightModePage } from "@/pages/TonightModePage";
import { TasteProfilePage } from "@/pages/TasteProfilePage";
import { TasteEvolutionPage } from "@/pages/TasteEvolutionPage";
import { CompletionDetoxPage } from "@/pages/CompletionDetoxPage";
import { TasteGraphPage } from "@/pages/TasteGraphPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { SettingsPage } from "@/pages/SettingsPage";

export const protectedRouteChildren: RouteObject[] = [
  { index: true, element: <DashboardPage /> },
  { path: APP_ROUTES.library.slice(1), element: <LibraryPage /> },
  { path: "library/:mediaId", element: <MediaDetailPage /> },
  { path: APP_ROUTES.candidates.slice(1), element: <CandidateEvaluatorPage /> },
  { path: APP_ROUTES.discovery.slice(1), element: <MediaArchaeologistPage /> },
  { path: APP_ROUTES.criticCouncil.slice(1), element: <CriticCouncilPage /> },
  { path: APP_ROUTES.tonight.slice(1), element: <TonightModePage /> },
  { path: APP_ROUTES.tasteProfile.slice(1), element: <TasteProfilePage /> },
  { path: APP_ROUTES.tasteEvolution.slice(1), element: <TasteEvolutionPage /> },
  { path: APP_ROUTES.completionDetox.slice(1), element: <CompletionDetoxPage /> },
  { path: APP_ROUTES.tasteGraph.slice(1), element: <TasteGraphPage /> },
  { path: APP_ROUTES.aftertasteLog.slice(1), element: <AftertasteLogPage /> },
  { path: APP_ROUTES.queue.slice(1), element: <QueuePage /> },
  { path: APP_ROUTES.settings.slice(1), element: <SettingsPage /> },
];

export const appRoutes: RouteObject[] = [
  {
    element: <PublicRoute />,
    children: [
      { path: APP_ROUTES.login, element: <LoginPage /> },
      { path: APP_ROUTES.register, element: <RegisterPage /> },
    ],
    errorElement: <RouteErrorFallback />,
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        path: APP_ROUTES.dashboard,
        element: <AppLayout />,
        errorElement: <RouteErrorFallback />,
        children: protectedRouteChildren,
      },
    ],
  },
  { path: "*", element: <RouteErrorFallback /> },
];

export function createAppRouter() {
  return createBrowserRouter(appRoutes);
}

export const router = createAppRouter();
