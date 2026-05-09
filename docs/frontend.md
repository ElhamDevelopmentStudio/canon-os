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
- Tailwind globals: `apps/web/src/styles/globals.css`
- shadcn/ui config: `apps/web/components.json`

## MVP Page List

All product pages are registered in `apps/web/src/app/routeConstants.ts` and rendered through `apps/web/src/app/router.tsx`.

| Route | Page | API-backed responsibilities |
| --- | --- | --- |
| `/` | Dashboard | Authenticated overview, dashboard summary, recent activity, quick media create. |
| `/library` | Media Library | Create, list, filter, edit, and delete user-owned media. |
| `/library/:mediaId` | Media Detail | Read one media item, update taste scores, run Narrative DNA, manage adaptation relations/path recommendations, and show latest aftertaste. |
| `/candidates` | Candidate Evaluator | Create/update/evaluate candidates, add candidates to library or queue. |
| `/discover` | Media Archaeologist | Generate deep-cut discovery trails, save trails, and add results to queue. |
| `/critic-council` | Critic Council | Run critic debates, tune critic personas, apply final decisions to candidates. |
| `/tonight` | Tonight Mode | Generate and act on recommendations from queue and context. |
| `/taste-profile` | Taste Profile | Show taste dimensions, score rollups, red flags, and influential works. |
| `/taste-evolution` | Taste Evolution Journal | Generate/list snapshots, show rating/medium/genericness/regret/fatigue/favorite-dimension trends, and expose current insight. |
| `/insights` | Insights | Show consumption, rating, medium, dimension, genericness, regret, creator, and Narrative DNA trait analytics. |
| `/completion-detox` | Completion Detox | Evaluate sample boundaries, toggle rules, mark media dropped/paused, show time saved, and list decisions. |
| `/seasons` | Personal Canon | Create and list themed canon seasons with progress. |
| `/seasons/:seasonId` | Canon Season Detail | Add mixed-source season items, reorder, complete, canon-mark, and reflect. |
| `/aftertaste-log` | Aftertaste Log | Load prompts, create/edit/delete reflections for completed media. |
| `/queue` | Adaptive Queue | Create/list/edit/reorder/delete queue items, recalculate priority, and restore archived items. |
| `/jobs` | Background Jobs | View recent imports, exports, metadata refreshes, graph rebuilds, and narrative jobs. |
| `/settings` | Settings | Update profile/settings and run import/export flows. |
| `/login` | Login | Public login form. Redirects authenticated users to `/`. |
| `/register` | Register | Public registration form. Redirects authenticated users to `/`. |

## Low-Fidelity Wireframe References

Treat the existing Lo-Fi documents as implementation references before creating new screen-specific layout:

- Shared layout and navigation: `apps/web/src/components/shell/docs/01_SHARED_LAYOUT_AND_NAVIGATION.md`
- Shared UI component rules: `apps/web/src/components/ui/docs/02_SHARED_COMPONENTS_AND_UI_RULES.md`
- Error, empty, loading, and modal patterns: `apps/web/src/components/feedback/docs/34_ERROR_EMPTY_LOADING_MODAL_PATTERNS.md`
- Page and route map: `apps/web/src/features/shared/03_PAGE_LIST_AND_ROUTING_MAP.md`
- Feature-level page sketches: `apps/web/src/features/**/<number>_*.md`

## Shared Layout Rules

- Every authenticated app page renders inside `AppShell`; do not create feature-specific sidebars or top headers.
- Navigation items live only in `apps/web/src/app/navigation.ts` and routes live only in `APP_ROUTES`.
- Page content should use shared layout primitives from `src/components/layout` for headers, grids, cards, panels, and responsive spacing.
- Primary page actions belong in the page header area; secondary/destructive actions stay close to their affected record.
- Mobile width must preserve the same feature coverage as desktop: no hidden primary action may become unreachable.
- Use semantic landmarks and headings so Playwright and assistive technology can find pages by accessible roles.

## Shared Component Rules

- Shared React components use PascalCase file names and PascalCase exports.
- Layout primitives live in `src/components/layout`.
- Shell/navigation primitives live in `src/components/shell`.
- Feedback components live in `src/components/feedback`.
- Form primitives live in `src/components/forms`.
- Data display components live in `src/components/data-display`.
- shadcn-compatible low-level UI primitives live in `src/components/ui`.
- Feature-specific components stay in `src/features/<feature-name>` until reused by at least two product areas.
- Prefer accessible roles, labels, headings, and button text over `data-testid`. Add a test id only when no semantic selector is practical.

## Frontend Feature Folder Convention

- Feature folders live under `apps/web/src/features/<feature-name>` and use lowercase kebab-case.
- Feature docs may stay beside the feature until implemented.
- Data-backed feature code should group API hooks, local components, and tests close to the feature.
- Shared reusable code must move out to `src/components`, `src/lib`, or `src/stores` before a second feature duplicates it.

## API Client Usage Pattern

- Root Axios setup lives in `apps/web/src/lib/api.ts` and is the only place that configures `baseURL`, `withCredentials`, CSRF header handling, and response normalization.
- Stable backend path constants live in `apps/web/src/lib/apiRouteConstants.ts`; feature code should not hardcode `/api/...` strings.
- Feature API files use `<feature>Api.ts`, for example `mediaApi.ts`, `candidateApi.ts`, or `settingsApi.ts`.
- Mutation helpers use verb-first names, for example `createMediaItem`, `updateProfile`, and `deleteQueueItem`.
- Browser e2e must call the real Vite app and shared Axios client. Do not mock frontend API modules in Playwright tests.

## SWR Usage Pattern

- SWR hooks use `use<Resource>` names, for example `useDashboardSummary`, `useMediaItems`, and `useTasteDimensions`.
- Keep SWR keys stable and derived from `API_ROUTES` plus explicit filter/search parameters.
- Mutations should revalidate the smallest affected SWR keys first; revalidate broader dashboard/profile keys only when the mutation changes aggregate data.
- Pages must expose loading, success, empty, and error states for data-backed areas where practical.
- Use browser e2e for the user-facing happy path and at least one practical empty or error state for every new API-backed page.

## Zustand Usage Pattern

- Zustand stores are for client UI/session state only. Django owns authenticated session truth through cookies.
- Auth state lives in `apps/web/src/stores/authStore.ts` and stores the current user plus CSRF token metadata only; never seed this store in browser e2e.
- Feature stores should stay small, serializable, and UI-focused. Server-owned data belongs in SWR/API responses, not long-lived client stores.
- A store action that triggers a backend write should call a feature API helper and then revalidate SWR keys rather than duplicating cache state.

## Form Handling Pattern

- Forms should prefer accessible labels, helper text, and inline validation messages.
- Submit buttons must show pending state and must be disabled while a write is in flight.
- Server validation errors should remain visible near the relevant field or at the top of the form when field mapping is not possible.
- Unsafe methods (`POST`, `PATCH`, `DELETE`) must go through the shared Axios client so browser CSRF and session cookies are exercised.
- Create/edit modals should reset after success and preserve user input after validation failures.

## Error Handling Pattern

- Use shared feedback components for page-level errors, inline form errors, empty states, loading states, and confirmation dialogs.
- The app has a global error boundary plus route-level fallback so render errors do not blank the whole screen.
- API load failures should show visible page errors and emit a toast notification when practical.
- API errors should be translated into user-friendly copy without hiding diagnostic detail from logs/tests.
- Browser e2e fails on unexpected console errors and failed `/api/` responses. Explicitly allow only the expected error responses in tests.
- Destructive actions require a confirmation affordance and should revalidate affected lists after success.
- New shared mutation buttons, destructive action buttons, form footers, and page tabs should be reused before creating feature-local variants.

## UI Requirements

- Every user-facing screen needs loading, empty, error, and success states where relevant.
- Keyboard navigation, visible focus, labels, and semantic structure are required.
- The frontend displays server-produced scores and explanations; it does not own recommendation truth.
- Sidebar, header, spacing, typography, and page actions must be shared through the design-system components.

## Accessibility And Responsive UI Contract

- Every modal or confirmation dialog must use `DialogShell` or a wrapper with the same behavior: accessible title/description, `role="dialog"`, `aria-modal="true"`, Escape close handling, focus trap, initial focus, and focus restoration.
- Dialog forms should mark the first useful field with `data-autofocus="true"` when no explicit initial focus ref is passed.
- Every visible button, link, icon-only action, input, select, and textarea must have a useful accessible name or label. Prefer visible text and semantic labels over test ids.
- Keyboard users must be able to reach sidebar navigation, top-header actions, command palette search, dialog controls, destructive confirmations, and primary page actions without a mouse.
- Mobile layouts must keep primary actions reachable and avoid page-level horizontal overflow at common phone widths.
- Reduced-motion users should not receive unnecessary transitions or animations; keep `prefers-reduced-motion: reduce` behavior intact in global styles.
- Scores, statuses, and warning badges must include text or screen-reader copy that communicates meaning without relying on color alone.
- Browser e2e should cover new responsive/accessibility behavior with real routes and accessible selectors whenever practical.

## Local Commands

```bash
corepack pnpm --filter @canonos/web run dev
corepack pnpm --filter @canonos/web run lint
corepack pnpm --filter @canonos/web run typecheck
corepack pnpm --filter @canonos/web run test
corepack pnpm --filter @canonos/web run build
corepack pnpm --filter @canonos/web run e2e
```

## API Integration

Set `VITE_API_BASE_URL=http://localhost:8000/api` in the root `.env` when bypassing the Vite dev server. The Vite config loads frontend environment variables from the repository root only; when `VITE_API_BASE_URL` is omitted, the shared client uses `/api` and the Vite dev server proxies `/api` to `http://localhost:8000`, configurable with root `VITE_API_PROXY_TARGET`.

Because the shared Axios client sends cookies with `withCredentials: true`, direct `localhost:5173` to `localhost:8000` requests also require backend credentialed CORS with root `DJANGO_CORS_ALLOW_CREDENTIALS=true`.

## Feature Notes

### Auth Integration

- Public routes: `/login` and `/register`.
- Protected app routes render only after `ProtectedRoute` confirms `GET /api/auth/me/` returns an authenticated session.
- `PublicRoute` redirects authenticated users away from login/register and back to the dashboard.
- Auth API calls live in `apps/web/src/features/auth/authApi.ts` and use the shared Axios client with credentials and CSRF header support.

### Dashboard UI

The Dashboard page uses `apps/web/src/features/dashboard/dashboardApi.ts` and `useDashboardSummary` to render library metrics, media type breakdowns, recent activity, highest-rated items, and top taste signals. Quick actions link to Candidate Evaluator and Tonight Mode, while Add Media opens the shared `MediaFormModal` and revalidates the dashboard summary after save.

### Media Library UI

- Library API calls live in `apps/web/src/features/media/mediaApi.ts`.
- Shared media labels live in `apps/web/src/features/media/mediaLabels.ts`.
- Add/Edit media uses `apps/web/src/features/media/MediaFormModal.tsx` and shared form/feedback components.
- Media Detail uses `apps/web/src/features/media/DimensionScoreGrid.tsx` for dimensional scores.

### Taste Scorecard UI

The grid loads default dimensions with `useTasteDimensions`, validates the 0-10 score range, saves score notes, and highlights genericness, regret, and memorability signals. Score writes use `upsertMediaScores` from `apps/web/src/features/media/tasteApi.ts`.

### Candidate Evaluator UI

Candidate API calls live in `apps/web/src/features/candidate-evaluator/candidateApi.ts`. The page supports save, evaluate, add-to-library, add-to-queue, skip, result explanation, history selection, loading, empty, error, and success states. Evaluation results include the server-provided Anti-Generic section with verdict, genericness risk, time-waste risk, positive exceptions, and detected red flags.

### Media Archaeologist UI

Media Archaeologist lives at `/discover`. Discovery API calls live in `apps/web/src/features/discovery/discoveryApi.ts`, and labels live in `apps/web/src/features/discovery/discoveryLabels.ts`. The page supports mode, medium, era, country/language, theme, mood, creator, favorite-work, and narrative-pattern inputs; generated result cards with discovery/obscurity/confidence scores; expansion and risk explanations; Save Trail; saved trail list/delete; Add To Queue; loading, empty, error, and success states.

### Narrative DNA UI

Narrative DNA lives inside Media Detail as a real tab next to the Taste scorecard. API calls live in `apps/web/src/features/narrative/narrativeApi.ts`, and labels live in `apps/web/src/features/narrative/narrativeLabels.ts`. The tab supports empty, loading/running, error, and completed states; optional manual notes; Request/Refresh Narrative DNA; status badge; eight trait scores; extracted trait descriptions; source basis/confidence; and evidence notes that state the allowed data basis. Candidate Evaluator displays `Narrative DNA signals` when completed analyses affect scoring, and TasteGraph signal counts include narrative trait nodes after rebuild.


### Critic Council UI

Critic Council lives at `/critic-council`. API calls live in `apps/web/src/features/critic-council/councilApi.ts`, and labels live in `apps/web/src/features/critic-council/councilLabels.ts`. The page supports prompt entry, candidate/media selectors, Run Council, final decision display, Add Decision To Candidate, ordered critic opinion cards, recent council history, and critic settings for enabled toggles plus weights. Candidate Evaluator displays attached Critic Council results for the selected candidate.

### Queue And Tonight Mode UI

Queue API calls live in `apps/web/src/features/queue/queueApi.ts`. The Queue page supports search, filters, add/edit modal, remove confirmation, move up/down reorder, Recalculate Queue, Queue v2 metric displays, insight/fatigue cards, low-priority archive visibility, restore, loading, empty, error, and success states. Tonight Mode uses queue v2 fields plus settings defaults to generate deterministic recommendations and supports starting, queueing, and deferring recommendations while excluding archived queue items.

### Module Chat UI

Module chat lives in `apps/web/src/features/chat`. `ModuleChatPanel` is shared by Tonight Mode, Candidate Evaluator, Media Archaeologist, Completion Detox, and Aftertaste Log. The panel uses persisted backend chat sessions, asks for missing context one question at a time, and then renders results through each module's existing backend service output. The frontend must not compute recommendation truth from chat text; chat-generated results should hydrate the normal module state when practical.

### Aftertaste And Taste Profile UI

Aftertaste API calls live in `apps/web/src/features/aftertaste-log/aftertasteApi.ts`. Taste Profile reads aggregate backend signals and should never recompute recommendation truth on the client.

### Settings And Portability UI

Settings API calls live in `apps/web/src/features/settings/settingsApi.ts`. Anti-Generic rule API calls live in `apps/web/src/features/anti-generic-filter/antiGenericApi.ts`. The Settings page owns profile preferences, theme preferences, Advanced Recommendation Settings, Anti-Generic rule toggles/weights/reset, import preview/confirm, JSON export, media/ratings CSV export, and Privacy and security controls. Advanced Recommendation Settings include default media and risk preferences, default Tonight Mode context, formula weights, recommendation strictness, modern exception behavior, burnout sensitivity, Completion Detox strictness, notification preferences, and a reset-to-recommended-defaults action. Import/export flows must preserve user-owned data boundaries and expose invalid-row feedback before confirm.

The Privacy and security panel loads `GET /api/auth/data/`, explains private CanonOS data and external metadata boundaries, lets users request a JSON privacy export, and exposes two destructive flows with strong typed confirmations:

- **Delete All CanonOS Data** requires `DELETE MY DATA`, calls `DELETE /api/auth/data/delete/`, revalidates product caches, and keeps the signed-in account.
- **Delete Account** requires `DELETE MY ACCOUNT`, calls `DELETE /api/auth/account/`, clears the browser session state, resets cached app data, and redirects to Register.

Both destructive actions use success/error toasts and must stay accessible through labels, semantic buttons, focusable dialogs, and visible confirmation copy.

## Metadata enrichment UI

The media add/edit dialog includes an external metadata search section. Search results can prefill public fields, and existing media items can attach a provider snapshot. The media detail page shows attached provider source, description, image, rating/popularity hints, missing-metadata empty state, and a refresh action.

## TasteGraph UI

The TasteGraph page lives at `/taste-graph`. It uses `useTasteGraphSummary`, exposes a **Rebuild TasteGraph** action, and renders loading, empty, error, success, rebuild status, a compact evidence map, graph counters, ranked signal lanes, weak/negative signal lanes, and a simple text graph ledger.


### Completion Detox UI

Completion Detox lives at `/completion-detox`. API calls live in `apps/web/src/features/detox/detoxApi.ts`. The page supports loading, empty, error, and success states; total/current-month time saved metrics; active sample rule toggles; media selector; current progress and motivation inputs; Evaluate Drop/Pause; decision result actions for Mark As Dropped, Mark As Paused, and Continue Anyway; and decision history. Media Detail shows a checkpoint warning when a planned/consuming item has an enabled matching detox rule.

### Personal Canon UI

Personal Canon lives at `/seasons` and `/seasons/:seasonId`. API calls live in `apps/web/src/features/canon/canonApi.ts`, and labels live in `apps/web/src/features/canon/canonLabels.ts`. The list page supports loading, empty, error, and success states; create season modal; season cards; status badges; item counts; and progress bars. The detail page supports mixed media/candidate/custom item creation, reason and attention notes, reorder controls, completion toggles, canon status controls, reflection prompts, and summary notes.

### Taste Evolution UI

Taste Evolution lives at `/taste-evolution`. API calls live in `apps/web/src/features/evolution/evolutionApi.ts`. The page supports loading, empty, error, and success states; Generate Snapshot; trend cards for ratings, mediums, genericness tolerance, regret, completion fatigue, and favorite dimension; current insight cards; and snapshot history. The Dashboard summary displays the latest saved taste change insight when available.

## Background Jobs

Background Jobs lives at `/jobs`. API calls and polling hooks live in `apps/web/src/features/jobs/jobsApi.ts`; reusable status UI lives in `JobStatusBadge`, `JobProgress`, `JobResultSummary`, `JobStatusCard`, and `NotificationsDropdown`. The header dropdown shows recent job notifications, while the Jobs page shows loading, empty, error, and success states with status, progress, result details, and manual refresh.

### Insights UI

Insights lives at `/insights`. API calls live in `apps/web/src/features/insights/analyticsApi.ts`. The page supports loading, empty, error, and success states; metric cards; simple responsive bar visualizations for consumption, ratings, and media types; dimension trend cards; genericness/satisfaction and regret/time-cost insight cards; top creator rankings; and top theme rankings derived from Narrative DNA traits. The Dashboard links to Insights from the quick actions and media type preview.

## Performance And Large List Pattern

API-backed pages must not render full large datasets in the browser. Use the shared helpers added for CP-M19:

- `PaginationControls` for accessible Previous/Next controls and count copy.
- `ListSkeleton` for large-list loading states.
- `useDebouncedValue` for search inputs that call list APIs.
- `paginationParams`, `pageFromSearchParams`, and `DEFAULT_PAGE_SIZE` for stable URL-backed page state.

Library, Candidate History, Aftertaste Log, and Background Jobs use URL-backed page parameters. Library and Candidate search inputs are debounced, and list API clients include `page` / `pageSize` in stable SWR keys.

SWR is configured globally with a deduping interval and bounded retry behavior. Avoid feature-local retry loops unless the endpoint has a documented reason.

Major product routes are lazy-loaded through the app router. Keep route components accessible during loading and prefer shared skeletons inside pages once data fetching starts.
