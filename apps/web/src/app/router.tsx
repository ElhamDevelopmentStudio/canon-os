import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { createBrowserRouter, type RouteObject } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";
import { APP_ROUTES } from "@/app/routeConstants";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PublicRoute } from "@/components/auth/PublicRoute";
import { RouteErrorFallback } from "@/components/feedback/RouteErrorFallback";

const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LibraryPage = lazy(() => import("@/pages/LibraryPage").then((module) => ({ default: module.LibraryPage })));
const AddMediaPage = lazy(() => import("@/pages/AddMediaPage").then((module) => ({ default: module.AddMediaPage })));
const MediaDetailPage = lazy(() => import("@/pages/MediaDetailPage").then((module) => ({ default: module.MediaDetailPage })));
const CandidateEvaluatorPage = lazy(() => import("@/pages/CandidateEvaluatorPage").then((module) => ({ default: module.CandidateEvaluatorPage })));
const MediaArchaeologistPage = lazy(() => import("@/pages/MediaArchaeologistPage").then((module) => ({ default: module.MediaArchaeologistPage })));
const CriticCouncilPage = lazy(() => import("@/pages/CriticCouncilPage").then((module) => ({ default: module.CriticCouncilPage })));
const TonightModePage = lazy(() => import("@/pages/TonightModePage").then((module) => ({ default: module.TonightModePage })));
const TasteProfilePage = lazy(() => import("@/pages/TasteProfilePage").then((module) => ({ default: module.TasteProfilePage })));
const TasteEvolutionPage = lazy(() => import("@/pages/TasteEvolutionPage").then((module) => ({ default: module.TasteEvolutionPage })));
const InsightsPage = lazy(() => import("@/pages/InsightsPage").then((module) => ({ default: module.InsightsPage })));
const CompletionDetoxPage = lazy(() => import("@/pages/CompletionDetoxPage").then((module) => ({ default: module.CompletionDetoxPage })));
const PersonalCanonPage = lazy(() => import("@/pages/PersonalCanonPage").then((module) => ({ default: module.PersonalCanonPage })));
const CanonSeasonDetailPage = lazy(() => import("@/pages/CanonSeasonDetailPage").then((module) => ({ default: module.CanonSeasonDetailPage })));
const TasteGraphPage = lazy(() => import("@/pages/TasteGraphPage").then((module) => ({ default: module.TasteGraphPage })));
const AftertasteLogPage = lazy(() => import("@/pages/AftertasteLogPage").then((module) => ({ default: module.AftertasteLogPage })));
const QueuePage = lazy(() => import("@/pages/QueuePage").then((module) => ({ default: module.QueuePage })));
const JobsPage = lazy(() => import("@/pages/JobsPage").then((module) => ({ default: module.JobsPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/RegisterPage").then((module) => ({ default: module.RegisterPage })));

const pageLoadingFallback = (
  <div className="rounded-2xl border border-border bg-card p-6 text-sm font-medium text-muted-foreground" role="status">
    Loading page…
  </div>
);

type RoutablePage = ComponentType | LazyExoticComponent<ComponentType>;

function pageElement(Page: RoutablePage) {
  return (
    <Suspense fallback={pageLoadingFallback}>
      <Page />
    </Suspense>
  );
}

export const protectedRouteChildren: RouteObject[] = [
  { index: true, element: pageElement(DashboardPage) },
  { path: APP_ROUTES.library.slice(1), element: pageElement(LibraryPage) },
  { path: APP_ROUTES.libraryNew.slice(1), element: pageElement(AddMediaPage) },
  { path: "library/:mediaId", element: pageElement(MediaDetailPage) },
  { path: APP_ROUTES.candidates.slice(1), element: pageElement(CandidateEvaluatorPage) },
  { path: APP_ROUTES.discovery.slice(1), element: pageElement(MediaArchaeologistPage) },
  { path: APP_ROUTES.criticCouncil.slice(1), element: pageElement(CriticCouncilPage) },
  { path: APP_ROUTES.tonight.slice(1), element: pageElement(TonightModePage) },
  { path: APP_ROUTES.tasteProfile.slice(1), element: pageElement(TasteProfilePage) },
  { path: APP_ROUTES.tasteEvolution.slice(1), element: pageElement(TasteEvolutionPage) },
  { path: APP_ROUTES.insights.slice(1), element: pageElement(InsightsPage) },
  { path: APP_ROUTES.completionDetox.slice(1), element: pageElement(CompletionDetoxPage) },
  { path: APP_ROUTES.seasons.slice(1), element: pageElement(PersonalCanonPage) },
  { path: "seasons/:seasonId", element: pageElement(CanonSeasonDetailPage) },
  { path: APP_ROUTES.tasteGraph.slice(1), element: pageElement(TasteGraphPage) },
  { path: APP_ROUTES.aftertasteLog.slice(1), element: pageElement(AftertasteLogPage) },
  { path: APP_ROUTES.queue.slice(1), element: pageElement(QueuePage) },
  { path: APP_ROUTES.jobs.slice(1), element: pageElement(JobsPage) },
  { path: APP_ROUTES.settings.slice(1), element: pageElement(SettingsPage) },
];

export const appRoutes: RouteObject[] = [
  {
    element: <PublicRoute />,
    children: [
      { path: APP_ROUTES.login, element: pageElement(LoginPage) },
      { path: APP_ROUTES.register, element: pageElement(RegisterPage) },
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
