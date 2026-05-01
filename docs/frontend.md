# CanonOS Frontend Notes

The web app lives in `apps/web` and uses React, Vite, TypeScript, Tailwind CSS, shadcn/ui-compatible component patterns, Axios, SWR, Zustand, and React Router.

## Current Foundation

- App entrypoint: `apps/web/src/main.tsx`
- Router: `apps/web/src/app/router.tsx`
- App providers: `apps/web/src/app/providers.tsx`
- App shell: `apps/web/src/components/shell/AppShell.tsx`
- Sidebar: `apps/web/src/components/shell/LeftSidebar.tsx`
- Header: `apps/web/src/components/shell/TopHeader.tsx`
- Route constants: `apps/web/src/app/routeConstants.ts`
- Navigation config: `apps/web/src/app/navigation.ts`
- API route constants: `apps/web/src/lib/apiRouteConstants.ts`
- API client: `apps/web/src/lib/api.ts`
- Health API function and SWR hook: `apps/web/src/lib/health.ts`
- Tailwind globals: `apps/web/src/styles/globals.css`
- shadcn/ui config: `apps/web/components.json`

## Low-Fidelity Wireframe References

The first design-system pass is grounded in the Lo-Fi documents that already live beside the feature folders. Treat them as implementation references before creating any new screen-specific layout:

- Shared layout and navigation: `apps/web/src/components/shell/docs/01_SHARED_LAYOUT_AND_NAVIGATION.md`
- Shared UI component rules: `apps/web/src/components/ui/docs/02_SHARED_COMPONENTS_AND_UI_RULES.md`
- Error, empty, loading, and modal patterns: `apps/web/src/components/feedback/docs/34_ERROR_EMPTY_LOADING_MODAL_PATTERNS.md`
- Page and route map: `apps/web/src/features/shared/03_PAGE_LIST_AND_ROUTING_MAP.md`
- Feature-level page sketches: `apps/web/src/features/**/<number>_*.md`

## Route Naming Convention

- Route constants live in `apps/web/src/app/routeConstants.ts` as `APP_ROUTES`.
- Constant keys use camelCase and describe product areas, for example `tasteProfile` and `aftertasteLog`.
- URL paths use lowercase kebab-case, for example `/taste-profile` and `/aftertaste-log`.
- The dashboard remains `/`.
- New pages must be registered through the shared router and must render inside `AppShell`; no page should create its own sidebar or top header.

## Shared Component Naming Convention

- Shared React components use PascalCase file names and PascalCase exports.
- Layout primitives live in `src/components/layout`.
- Shell/navigation primitives live in `src/components/shell`.
- Feedback components live in `src/components/feedback`.
- Form primitives live in `src/components/forms`.
- Data display components live in `src/components/data-display`.
- shadcn-compatible low-level UI primitives live in `src/components/ui`.
- Feature-specific components should stay inside the relevant `src/features/<feature-name>` folder until reused by at least two product areas.

## Frontend Feature Folder Convention

- Feature folders live under `apps/web/src/features/<feature-name>` and use lowercase kebab-case.
- Feature docs may stay beside the feature until implemented.
- Data-backed feature code should group API hooks, local components, and tests close to the feature.
- Shared reusable code must move out to `src/components`, `src/lib`, or `src/stores` before a second feature duplicates it.

## API Client Naming Convention

- Root Axios setup lives in `apps/web/src/lib/api.ts`.
- Stable backend path constants live in `apps/web/src/lib/apiRouteConstants.ts`.
- Feature API files should use `<feature>Api.ts`, for example `mediaApi.ts` or `authApi.ts`.
- SWR hooks should use `use<Resource>` naming, for example `useHealthCheck` and `useMediaItems`.
- Mutation helpers should use verb-first names, for example `createMediaItem` and `updateProfile`.

## UI Requirements

- Every user-facing screen needs loading, empty, error, and success states where relevant.
- Keyboard navigation, visible focus, labels, and semantic structure are required.
- The frontend displays server-produced scores and explanations; it does not own recommendation truth.
- Sidebar, header, spacing, typography, and page actions must be shared through the design-system components.

## Local Commands

```bash
corepack pnpm --filter @canonos/web run dev
corepack pnpm --filter @canonos/web run lint
corepack pnpm --filter @canonos/web run typecheck
corepack pnpm --filter @canonos/web run test
corepack pnpm --filter @canonos/web run build
```

## Health Integration

Set `VITE_API_BASE_URL=http://localhost:8000/api` in `apps/web/.env` or the root `.env`. The dashboard calls `GET /health/` through the shared Axios client and displays loading, success, and error states.

## Auth Integration

- Public routes: `/login` and `/register`.
- Protected app routes render only after `ProtectedRoute` confirms `GET /api/auth/me/` succeeds.
- `PublicRoute` redirects authenticated users away from login/register and back to the dashboard.
- Session state lives in `apps/web/src/stores/authStore.ts` and stores the current user plus CSRF token metadata only; Django owns the actual session cookie.
- Auth API calls live in `apps/web/src/features/auth/authApi.ts` and use the shared Axios client with credentials and CSRF header support.

## Media Library UI

- `/library` renders the data-backed Library page.
- `/library/:mediaId` renders the Media Detail page.
- Library data calls live in `apps/web/src/features/media/mediaApi.ts`.
- Shared media labels live in `apps/web/src/features/media/mediaLabels.ts`.
- Add/Edit media uses `apps/web/src/features/media/MediaFormModal.tsx` and the shared form/feedback components.
- The Library page must keep loading, empty, error, success, search, filter, create, edit, and delete states visible and consistent with the shared design system.
