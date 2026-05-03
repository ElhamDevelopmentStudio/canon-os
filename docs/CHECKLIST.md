# CanonOS Development Task Checklist

**Document type:** Execution checklist / Codex task plan
**Project:** CanonOS — Personal Media Intelligence System
**Version:** 1.0
**Intended executor:** Codex or another coding agent
**Primary goal:** Build CanonOS from zero to a complete production-grade product, not only an MVP.
**Development rule:** Frontend and backend must progress in parallel. Do not complete the entire backend before starting frontend, and do not complete the entire frontend before starting backend.

---

# 1. How To Use This Checklist

This document is designed so a coding agent can work through the project without losing direction across sessions.

## 1.1 Completion Rules

- Each task must be small enough to complete in one focused coding step.
- Mark a task as complete only after the implementation is committed or clearly saved.
- A parent milestone is complete only when every child task under it is complete.
- Do not skip frontend tasks while backend tasks are unfinished, and do not skip backend tasks while frontend tasks are unfinished.
- When a task changes the API, update frontend API contracts or client types in the same milestone.
- When a task changes frontend behavior, confirm the backend endpoint or mock exists.
- When a task changes data shape, update serializers, frontend types, validation, and tests.
- When a task changes user-facing behavior, create or update the matching manual test document in `docs/manual-tests/`.
- Every completed implementation task must pass the applicable verification gates listed in section 1.4.
- At the end of every working session, update the **Last Completed Task Summary** section at the bottom of this document.

## 1.2 Parallel Development Rule

Each milestone is split into parallel tracks:

- **Shared / Monorepo Track**: repo structure, configs, shared types, shared rules.
- **Backend Track**: Django REST Framework, PostgreSQL, Redis, Celery, API docs.
- **Frontend Track**: React, Vite, Tailwind, shadcn/ui, Zustand, SWR, Axios.
- **Integration Track**: connects frontend and backend behavior.
- **QA Track**: tests, validation, regressions, accessibility, acceptance checks.

Work should usually proceed in this order inside each milestone:

1. Shared contract or schema task.
2. Backend minimal implementation task.
3. Frontend minimal implementation task.
4. Integration task.
5. Test/QA task.

This keeps both sides moving together.

## 1.3 Status Marking Convention

Use these checklist marks:

- `[ ]` Not started
- `[x]` Completed
- `[~]` In progress, but not finished
- `[!]` Blocked, with reason written next to it

Example:

- `[!] MVP-M04-BE-007 Add media search endpoint — blocked because MediaItem model migration failed.`

## 1.4 Verification Gates

All implementation work must pass these gates before the task or milestone can be marked complete:

1. Lint
2. Typecheck
3. Tests
4. Build
5. E2E

Default commands:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`

If the commands are not available yet, the active task must add the missing scripts or mark the gate as blocked with `[!]`.

## 1.5 Manual Test Documentation Rule

Every user-facing feature milestone must create or update one manual test document:

- Auth: `docs/manual-tests/auth.md`
- Library and media detail: `docs/manual-tests/media-library.md`
- Taste scoring/profile: `docs/manual-tests/taste.md`
- Dashboard: `docs/manual-tests/dashboard.md`
- Candidate evaluator: `docs/manual-tests/candidate-evaluator.md`
- Queue and Tonight Mode: `docs/manual-tests/queue-tonight.md`
- Media Archaeologist: `docs/manual-tests/media-archaeologist.md`
- Narrative DNA: `docs/manual-tests/narrative-dna.md`
- Aftertaste log: `docs/manual-tests/aftertaste-log.md`
- Settings and portability: `docs/manual-tests/settings-portability.md`

Use `docs/manual-tests/TEMPLATE.md` as the format. Each manual test doc must include a happy path, one error path, and one useful edge case when relevant.

## 1.6 Resolved Implementation Defaults

Use these defaults unless the user explicitly changes them:

| Decision | Default |
| --- | --- |
| Runtime model | Local-first private web app, with optional private cloud deployment later. |
| User model | Single-user MVP behavior, but keep owner/user fields in schemas so multi-user support can be added without rewriting data models. |
| Initial data entry | Manual entry plus CSV/JSON import and JSON/CSV export in the MVP. Metadata providers come later. |
| AI provider | Provider abstraction only. Product behavior must remain deterministic and inspectable first. |
| Rating depth | Quick scorecard for normal use, with advanced fields where the SRS requires them. |
| Social features | Out of scope. |
| Mobile support | Responsive web UI from day one; native apps later. |
| Full content ingestion | Do not ingest full copyrighted scripts/books unless legally available and explicitly enabled. |

---

# 2. Product Scope Summary

CanonOS is a personal media intelligence system for someone who consumes movies, TV shows, anime, novels, and audiobooks extensively. It must help the user decide what is actually worth their time based on:

- Personal history
- Current mood
- Energy level
- Available time
- Taste standards
- Dislike of generic media
- Openness to genuinely good modern works
- Cross-medium interests
- Burnout and completion fatigue
- Long-term taste evolution

CanonOS must not be a generic recommendation app. It must become a personal decision system.

---

# 3. Required Technology Stack

## 3.1 Monorepo

- Monorepo root with apps and packages.
- Shared packages for types, constants, validation helpers, API contracts, and configuration.
- Separate frontend and backend apps.
- Separate worker/service area where needed.

## 3.2 Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui, customized where needed
- Axios
- SWR
- Zustand
- React Router
- Form validation library chosen during implementation
- Component-first design using shared layouts and reusable page sections

## 3.3 Backend

- Django
- Django REST Framework
- PostgreSQL
- Celery
- Redis
- RabbitMQ only if required for reliable queue separation
- Swagger/OpenAPI
- Scalar API documentation UI
- Django admin for internal inspection
- Environment-based settings
- Structured logging
- Tests

---

# 4. High-Level Phases

The project is divided into two major phases:

1. **MVP Phase**
   Build the smallest reliable version that is actually useful: library, taste profile, candidate evaluator, tonight mode, aftertaste log, dashboard, basic recommendation logic, and basic JSON/CSV import/export.

2. **Complete Product Phase**
   Expand CanonOS into the full product: TasteGraph, Anti-Generic Filter, Media Archaeologist, Narrative DNA Analyzer, Critic Council, Taste Evolution Journal, Completion Detox, Personal Canon Builder, Cross-Medium Adaptation Intelligence, analytics, advanced import/export, advanced QA, deployment, and production hardening.

---

# 5. MVP Phase

The MVP must be useful immediately. It must let the user record media, import and export owned data, evaluate candidates, choose what to consume tonight, reflect after completion, and see basic taste insights.

---

## MVP-M01 — Monorepo Foundation

**Goal:** Create a clean monorepo foundation that supports parallel frontend and backend development.

### Shared / Monorepo Tasks

- [x] MVP-M01-SH-000 Initialize Git repository.
- [x] MVP-M01-SH-001 Create root project directory structure.
- [x] MVP-M01-SH-002 Create `/apps` directory.
- [x] MVP-M01-SH-003 Create `/apps/web` directory.
- [x] MVP-M01-SH-004 Create `/apps/api` directory.
- [x] MVP-M01-SH-005 Create `/packages` directory.
- [x] MVP-M01-SH-006 Create `/packages/contracts` directory.
- [x] MVP-M01-SH-007 Create `/packages/config` directory.
- [x] MVP-M01-SH-008 Create `/packages/api-client` directory.
- [x] MVP-M01-SH-009 Create `/docs` directory.
- [x] MVP-M01-SH-010 Create `/infra` directory.
- [x] MVP-M01-SH-011 Create root `README.md`.
- [x] MVP-M01-SH-012 Add project overview to root `README.md`.
- [x] MVP-M01-SH-013 Add stack overview to root `README.md`.
- [x] MVP-M01-SH-014 Add local development instructions placeholder to root `README.md`.
- [x] MVP-M01-SH-015 Create root `.gitignore`.
- [x] MVP-M01-SH-016 Add frontend ignore rules to `.gitignore`.
- [x] MVP-M01-SH-017 Add Python ignore rules to `.gitignore`.
- [x] MVP-M01-SH-018 Add environment file ignore rules to `.gitignore`.
- [x] MVP-M01-SH-019 Create root `.editorconfig`.
- [x] MVP-M01-SH-020 Create root `.env.example`.
- [x] MVP-M01-SH-021 Add frontend environment variables to `.env.example`.
- [x] MVP-M01-SH-022 Add backend environment variables to `.env.example`.
- [x] MVP-M01-SH-023 Add PostgreSQL variables to `.env.example`.
- [x] MVP-M01-SH-024 Add Redis variables to `.env.example`.
- [x] MVP-M01-SH-025 Add Celery variables to `.env.example`.
- [x] MVP-M01-SH-026 Create root task runner documentation section.
- [x] MVP-M01-SH-027 Decide package manager for frontend workspace.
- [x] MVP-M01-SH-028 Add `pnpm-workspace.yaml` workspace configuration.
- [x] MVP-M01-SH-029 Add script for running frontend app.
- [x] MVP-M01-SH-030 Add script for running backend app.
- [x] MVP-M01-SH-031 Add script for running backend worker.
- [x] MVP-M01-SH-032 Add script for running all local services.
- [x] MVP-M01-SH-033 Add script for stopping all local services.
- [x] MVP-M01-SH-034 Add `docs/architecture.md` placeholder.
- [x] MVP-M01-SH-035 Add `docs/api.md` placeholder.
- [x] MVP-M01-SH-036 Add `docs/frontend.md` placeholder.
- [x] MVP-M01-SH-037 Add `docs/backend.md` placeholder.
- [x] MVP-M01-SH-038 Add `docs/testing.md` placeholder.
- [x] MVP-M01-SH-039 Add `docs/deployment.md` placeholder.
- [x] MVP-M01-SH-040 Create root `package.json`.
- [x] MVP-M01-SH-041 Add root `lint` script.
- [x] MVP-M01-SH-042 Add root `typecheck` script.
- [x] MVP-M01-SH-043 Add root `test` script.
- [x] MVP-M01-SH-044 Add root `build` script.
- [x] MVP-M01-SH-045 Add root `e2e` script.
- [x] MVP-M01-SH-046 Create `.github/workflows` directory.
- [x] MVP-M01-SH-047 Add GitHub Actions CI workflow for lint, typecheck, tests, build, and E2E.
- [x] MVP-M01-SH-048 Document branch protection rules in `docs/deployment.md`.
- [x] MVP-M01-SH-049 Create `docs/manual-tests` directory and template.

### Backend Tasks

- [x] MVP-M01-BE-001 Initialize Django project inside `/apps/api`.
- [x] MVP-M01-BE-002 Create backend Python dependency file.
- [x] MVP-M01-BE-003 Add Django dependency.
- [x] MVP-M01-BE-004 Add Django REST Framework dependency.
- [x] MVP-M01-BE-005 Add PostgreSQL driver dependency.
- [x] MVP-M01-BE-006 Add Celery dependency.
- [x] MVP-M01-BE-007 Add Redis dependency.
- [x] MVP-M01-BE-008 Add OpenAPI documentation dependency.
- [x] MVP-M01-BE-009 Create environment settings module.
- [x] MVP-M01-BE-010 Configure database settings from environment variables.
- [x] MVP-M01-BE-011 Configure Redis URL from environment variables.
- [x] MVP-M01-BE-012 Configure installed Django apps.
- [x] MVP-M01-BE-013 Configure DRF base settings.
- [x] MVP-M01-BE-014 Configure backend CORS support.
- [x] MVP-M01-BE-015 Add health check app.
- [x] MVP-M01-BE-016 Add `/api/health/` endpoint.
- [x] MVP-M01-BE-017 Add health check serializer if needed.
- [x] MVP-M01-BE-018 Add backend test command.
- [x] MVP-M01-BE-019 Add first health check test.
- [x] MVP-M01-BE-020 Run initial backend migrations.

### Frontend Tasks

- [x] MVP-M01-FE-001 Initialize Vite React TypeScript app inside `/apps/web`.
- [x] MVP-M01-FE-002 Add Tailwind CSS.
- [x] MVP-M01-FE-003 Configure Tailwind content paths.
- [x] MVP-M01-FE-004 Add shadcn/ui setup.
- [x] MVP-M01-FE-005 Add Axios dependency.
- [x] MVP-M01-FE-006 Add SWR dependency.
- [x] MVP-M01-FE-007 Add Zustand dependency.
- [x] MVP-M01-FE-008 Add React Router dependency.
- [x] MVP-M01-FE-009 Create frontend environment variable file example.
- [x] MVP-M01-FE-010 Create `src/app` directory.
- [x] MVP-M01-FE-011 Create `src/pages` directory.
- [x] MVP-M01-FE-012 Create `src/components` directory.
- [x] MVP-M01-FE-013 Create `src/components/layout` directory.
- [x] MVP-M01-FE-014 Create `src/components/ui` directory.
- [x] MVP-M01-FE-015 Create `src/features` directory.
- [x] MVP-M01-FE-016 Create `src/lib` directory.
- [x] MVP-M01-FE-017 Create `src/stores` directory.
- [x] MVP-M01-FE-018 Create `src/types` directory.
- [x] MVP-M01-FE-019 Create `src/routes` directory.
- [x] MVP-M01-FE-020 Add base CSS reset through Tailwind.
- [x] MVP-M01-FE-021 Add placeholder app shell.
- [x] MVP-M01-FE-022 Add temporary home page.
- [x] MVP-M01-FE-023 Add frontend test command placeholder.
- [x] MVP-M01-FE-024 Confirm Vite dev server starts.

### Integration Tasks

- [x] MVP-M01-INT-001 Create frontend Axios instance.
- [x] MVP-M01-INT-002 Read API base URL from environment variable.
- [x] MVP-M01-INT-003 Create frontend health check API function.
- [x] MVP-M01-INT-004 Add temporary health status display to home page.
- [x] MVP-M01-INT-005 Confirm frontend can call backend health endpoint locally.
- [x] MVP-M01-INT-006 Add CORS fix if frontend cannot reach backend.

### QA Tasks

- [x] MVP-M01-QA-001 Confirm backend starts without errors.
- [x] MVP-M01-QA-002 Confirm frontend starts without errors.
- [x] MVP-M01-QA-003 Confirm PostgreSQL connection works.
- [x] MVP-M01-QA-004 Confirm Redis connection works.
- [x] MVP-M01-QA-005 Confirm health endpoint returns success.
- [x] MVP-M01-QA-006 Confirm root README has enough setup instructions for another agent.

---

## MVP-M02 — Shared Design System And Global Layout

**Goal:** Create the common frontend structure that every page must use.

### Shared / Monorepo Tasks

- [x] MVP-M02-SH-001 Add low-fidelity wireframe document references to `/docs/frontend.md`.
- [x] MVP-M02-SH-002 Define route naming convention in `/docs/frontend.md`.
- [x] MVP-M02-SH-003 Define shared component naming convention in `/docs/frontend.md`.
- [x] MVP-M02-SH-004 Define frontend feature folder convention in `/docs/frontend.md`.
- [x] MVP-M02-SH-005 Define API client naming convention in `/docs/frontend.md`.

### Frontend Tasks

- [x] MVP-M02-FE-001 Create `AppShell` layout component.
- [x] MVP-M02-FE-002 Create persistent left sidebar component.
- [x] MVP-M02-FE-003 Create top header component.
- [x] MVP-M02-FE-004 Create main content wrapper component.
- [x] MVP-M02-FE-005 Create page title component.
- [x] MVP-M02-FE-006 Create page subtitle component.
- [x] MVP-M02-FE-007 Create section card component.
- [x] MVP-M02-FE-008 Create metric card component.
- [x] MVP-M02-FE-009 Create empty state component.
- [x] MVP-M02-FE-010 Create error state component.
- [x] MVP-M02-FE-011 Create loading state component.
- [x] MVP-M02-FE-012 Create confirmation dialog component.
- [x] MVP-M02-FE-013 Create form field wrapper component.
- [x] MVP-M02-FE-014 Create rating input component.
- [x] MVP-M02-FE-015 Create score badge component.
- [x] MVP-M02-FE-016 Create status pill component.
- [x] MVP-M02-FE-017 Create media type badge component.
- [x] MVP-M02-FE-018 Create command/search input component placeholder.
- [x] MVP-M02-FE-019 Create page action bar component.
- [x] MVP-M02-FE-020 Create responsive mobile sidebar state.
- [x] MVP-M02-FE-021 Add sidebar navigation item for Dashboard.
- [x] MVP-M02-FE-022 Add sidebar navigation item for Library.
- [x] MVP-M02-FE-023 Add sidebar navigation item for Candidates.
- [x] MVP-M02-FE-024 Add sidebar navigation item for Tonight Mode.
- [x] MVP-M02-FE-025 Add sidebar navigation item for Taste Profile.
- [x] MVP-M02-FE-026 Add sidebar navigation item for Aftertaste Log.
- [x] MVP-M02-FE-027 Add sidebar navigation item for Queue.
- [x] MVP-M02-FE-028 Add sidebar navigation item for Settings.
- [x] MVP-M02-FE-029 Implement active sidebar item highlighting.
- [x] MVP-M02-FE-030 Implement collapsed sidebar visual state.
- [x] MVP-M02-FE-031 Store sidebar collapsed state in Zustand.
- [x] MVP-M02-FE-032 Create global app store.
- [x] MVP-M02-FE-033 Add theme mode field to global app store.
- [x] MVP-M02-FE-034 Add theme toggle button placeholder.
- [x] MVP-M02-FE-035 Apply consistent spacing to layout.
- [x] MVP-M02-FE-036 Apply consistent typography to layout.
- [x] MVP-M02-FE-037 Confirm all placeholder pages use `AppShell`.

### Backend Tasks

- [x] MVP-M02-BE-001 Add API root endpoint listing available MVP endpoints.
- [x] MVP-M02-BE-002 Add OpenAPI schema endpoint.
- [x] MVP-M02-BE-003 Add Swagger UI endpoint.
- [x] MVP-M02-BE-004 Add Scalar API documentation endpoint.
- [x] MVP-M02-BE-005 Add test for OpenAPI schema availability.
- [x] MVP-M02-BE-006 Add test for API root endpoint availability.

### Integration Tasks

- [x] MVP-M02-INT-001 Add frontend route constants file.
- [x] MVP-M02-INT-002 Add API route constants file.
- [x] MVP-M02-INT-003 Add app navigation config file.
- [x] MVP-M02-INT-004 Confirm route constants match sidebar navigation.
- [x] MVP-M02-INT-005 Confirm no page uses a custom sidebar design.

### QA Tasks

- [x] MVP-M02-QA-001 Verify sidebar appears on all app pages.
- [x] MVP-M02-QA-002 Verify top header appears on all app pages.
- [x] MVP-M02-QA-003 Verify mobile layout does not break at narrow width.
- [x] MVP-M02-QA-004 Verify shared loading state renders correctly.
- [x] MVP-M02-QA-005 Verify shared empty state renders correctly.
- [x] MVP-M02-QA-006 Verify shared error state renders correctly.

---

## MVP-M03 — Authentication And User Foundation

**Goal:** Add simple user identity support so CanonOS can store personal data safely.

### Shared / Contract Tasks

- [x] MVP-M03-SH-001 Define `UserProfile` type in shared types.
- [x] MVP-M03-SH-002 Define `AuthSession` type in shared types.
- [x] MVP-M03-SH-003 Define `LoginRequest` type.
- [x] MVP-M03-SH-004 Define `RegisterRequest` type.
- [x] MVP-M03-SH-005 Define `AuthResponse` type.
- [x] MVP-M03-SH-006 Document auth flow in `/docs/api.md`.

### Backend Tasks

- [x] MVP-M03-BE-001 Create accounts app.
- [x] MVP-M03-BE-002 Configure custom user model if needed.
- [x] MVP-M03-BE-003 Create user profile model.
- [x] MVP-M03-BE-004 Add profile display name field.
- [x] MVP-M03-BE-005 Add profile timezone field.
- [x] MVP-M03-BE-006 Add profile preferred language field.
- [x] MVP-M03-BE-007 Create migration for profile model.
- [x] MVP-M03-BE-008 Create user profile serializer.
- [x] MVP-M03-BE-009 Create current user endpoint.
- [x] MVP-M03-BE-010 Create profile update endpoint.
- [x] MVP-M03-BE-011 Add token or session authentication configuration.
- [x] MVP-M03-BE-012 Create register endpoint.
- [x] MVP-M03-BE-013 Create login endpoint.
- [x] MVP-M03-BE-014 Create logout endpoint.
- [x] MVP-M03-BE-015 Add permission class for authenticated endpoints.
- [x] MVP-M03-BE-016 Add test for registration.
- [x] MVP-M03-BE-017 Add test for login.
- [x] MVP-M03-BE-018 Add test for current user endpoint.
- [x] MVP-M03-BE-019 Add test for profile update endpoint.
- [x] MVP-M03-BE-020 Register profile model in Django admin.

### Frontend Tasks

- [x] MVP-M03-FE-001 Create auth API client file.
- [x] MVP-M03-FE-002 Create auth Zustand store.
- [x] MVP-M03-FE-003 Add current user field to auth store.
- [x] MVP-M03-FE-004 Add auth token/session field to auth store if needed.
- [x] MVP-M03-FE-005 Add login action to auth store.
- [x] MVP-M03-FE-006 Add logout action to auth store.
- [x] MVP-M03-FE-007 Add register action to auth store.
- [x] MVP-M03-FE-008 Create Login page skeleton.
- [x] MVP-M03-FE-009 Add email field to Login page.
- [x] MVP-M03-FE-010 Add password field to Login page.
- [x] MVP-M03-FE-011 Add login submit button.
- [x] MVP-M03-FE-012 Add login error message state.
- [x] MVP-M03-FE-013 Create Register page skeleton.
- [x] MVP-M03-FE-014 Add email field to Register page.
- [x] MVP-M03-FE-015 Add password field to Register page.
- [x] MVP-M03-FE-016 Add display name field to Register page.
- [x] MVP-M03-FE-017 Add register submit button.
- [x] MVP-M03-FE-018 Add auth route guard component.
- [x] MVP-M03-FE-019 Add public route guard component.
- [x] MVP-M03-FE-020 Add logout button to header user menu.
- [x] MVP-M03-FE-021 Add loading state while current user loads.
- [x] MVP-M03-FE-022 Add redirect after successful login.
- [x] MVP-M03-FE-023 Add redirect after successful registration.

### Integration Tasks

- [x] MVP-M03-INT-001 Connect login form to login endpoint.
- [x] MVP-M03-INT-002 Connect register form to register endpoint.
- [x] MVP-M03-INT-003 Connect logout button to logout endpoint.
- [x] MVP-M03-INT-004 Connect app boot to current user endpoint.
- [x] MVP-M03-INT-005 Confirm unauthenticated users cannot access app pages.
- [x] MVP-M03-INT-006 Confirm authenticated users cannot access login/register unnecessarily.

### QA Tasks

- [x] MVP-M03-QA-001 Test registration from UI.
- [x] MVP-M03-QA-002 Test login from UI.
- [x] MVP-M03-QA-003 Test logout from UI.
- [x] MVP-M03-QA-004 Test refresh while logged in.
- [x] MVP-M03-QA-005 Test refresh while logged out.
- [x] MVP-M03-QA-006 Confirm auth endpoints appear in OpenAPI docs.
- [x] MVP-M03-QA-007 Create or update `docs/manual-tests/auth.md`.

---

## MVP-M04 — Core Media Library Data Model

**Goal:** Create the foundation for storing all consumed and planned media.

### Shared / Contract Tasks

- [x] MVP-M04-SH-001 Define `MediaType` enum.
- [x] MVP-M04-SH-002 Add media type value for movie.
- [x] MVP-M04-SH-003 Add media type value for tv_show.
- [x] MVP-M04-SH-004 Add media type value for anime.
- [x] MVP-M04-SH-005 Add media type value for novel.
- [x] MVP-M04-SH-006 Add media type value for audiobook.
- [x] MVP-M04-SH-007 Define `ConsumptionStatus` enum.
- [x] MVP-M04-SH-008 Add status value for planned.
- [x] MVP-M04-SH-009 Add status value for consuming.
- [x] MVP-M04-SH-010 Add status value for completed.
- [x] MVP-M04-SH-011 Add status value for paused.
- [x] MVP-M04-SH-012 Add status value for dropped.
- [x] MVP-M04-SH-013 Define `MediaItem` type.
- [x] MVP-M04-SH-014 Define `MediaItemCreateRequest` type.
- [x] MVP-M04-SH-015 Define `MediaItemUpdateRequest` type.
- [x] MVP-M04-SH-016 Define `MediaItemListResponse` type.
- [x] MVP-M04-SH-017 Document media library API contract.

### Backend Tasks

- [x] MVP-M04-BE-001 Create media app.
- [x] MVP-M04-BE-002 Create MediaItem model.
- [x] MVP-M04-BE-003 Add owner/user foreign key to MediaItem.
- [x] MVP-M04-BE-004 Add title field.
- [x] MVP-M04-BE-005 Add original title field.
- [x] MVP-M04-BE-006 Add media type field.
- [x] MVP-M04-BE-007 Add release year field.
- [x] MVP-M04-BE-008 Add country/language field.
- [x] MVP-M04-BE-009 Add creator/director/author text field.
- [x] MVP-M04-BE-010 Add status field.
- [x] MVP-M04-BE-011 Add personal rating field.
- [x] MVP-M04-BE-012 Add started date field.
- [x] MVP-M04-BE-013 Add completed date field.
- [x] MVP-M04-BE-014 Add runtime minutes field.
- [x] MVP-M04-BE-015 Add episode count field.
- [x] MVP-M04-BE-016 Add page count field.
- [x] MVP-M04-BE-017 Add audiobook length minutes field.
- [x] MVP-M04-BE-018 Add notes field.
- [x] MVP-M04-BE-019 Add created at field.
- [x] MVP-M04-BE-020 Add updated at field.
- [x] MVP-M04-BE-021 Add database indexes for owner and status.
- [x] MVP-M04-BE-022 Add database index for media type.
- [x] MVP-M04-BE-023 Add database index for title search.
- [x] MVP-M04-BE-024 Create migration for MediaItem.
- [x] MVP-M04-BE-025 Create MediaItem serializer.
- [x] MVP-M04-BE-026 Create MediaItem list endpoint.
- [x] MVP-M04-BE-027 Create MediaItem detail endpoint.
- [x] MVP-M04-BE-028 Create MediaItem create endpoint.
- [x] MVP-M04-BE-029 Create MediaItem update endpoint.
- [x] MVP-M04-BE-030 Create MediaItem delete endpoint.
- [x] MVP-M04-BE-031 Add filtering by media type.
- [x] MVP-M04-BE-032 Add filtering by status.
- [x] MVP-M04-BE-033 Add search by title.
- [x] MVP-M04-BE-034 Add ordering by updated date.
- [x] MVP-M04-BE-035 Add pagination.
- [x] MVP-M04-BE-036 Register MediaItem in Django admin.
- [x] MVP-M04-BE-037 Add test for creating media item.
- [x] MVP-M04-BE-038 Add test for listing media items.
- [x] MVP-M04-BE-039 Add test for updating media item.
- [x] MVP-M04-BE-040 Add test for deleting media item.
- [x] MVP-M04-BE-041 Add test that users cannot see other users' items.

### Frontend Tasks

- [x] MVP-M04-FE-001 Create media API client file.
- [x] MVP-M04-FE-002 Create `useMediaItems` SWR hook.
- [x] MVP-M04-FE-003 Create `useMediaItem` SWR hook.
- [x] MVP-M04-FE-004 Create media mutation helpers.
- [x] MVP-M04-FE-005 Create Library page skeleton.
- [x] MVP-M04-FE-006 Add Library page title.
- [x] MVP-M04-FE-007 Add Library page action bar.
- [x] MVP-M04-FE-008 Add Add Media button.
- [x] MVP-M04-FE-009 Add media type filter control.
- [x] MVP-M04-FE-010 Add status filter control.
- [x] MVP-M04-FE-011 Add title search input.
- [x] MVP-M04-FE-012 Add Library table/list component.
- [x] MVP-M04-FE-013 Add media item row component.
- [x] MVP-M04-FE-014 Add media type badge to row.
- [x] MVP-M04-FE-015 Add status pill to row.
- [x] MVP-M04-FE-016 Add personal rating display to row.
- [x] MVP-M04-FE-017 Add updated date display to row.
- [x] MVP-M04-FE-018 Add row action menu.
- [x] MVP-M04-FE-019 Add Edit action to row action menu.
- [x] MVP-M04-FE-020 Add Delete action to row action menu.
- [x] MVP-M04-FE-021 Create Add/Edit Media modal.
- [x] MVP-M04-FE-022 Add title field to media modal.
- [x] MVP-M04-FE-023 Add original title field to media modal.
- [x] MVP-M04-FE-024 Add media type select to media modal.
- [x] MVP-M04-FE-025 Add release year field to media modal.
- [x] MVP-M04-FE-026 Add creator/director/author field to media modal.
- [x] MVP-M04-FE-027 Add status select to media modal.
- [x] MVP-M04-FE-028 Add personal rating field to media modal.
- [x] MVP-M04-FE-029 Add notes field to media modal.
- [x] MVP-M04-FE-030 Add save button to media modal.
- [x] MVP-M04-FE-031 Add cancel button to media modal.
- [x] MVP-M04-FE-032 Add delete confirmation dialog.
- [x] MVP-M04-FE-033 Create Media Detail page skeleton.
- [x] MVP-M04-FE-034 Add detail header section.
- [x] MVP-M04-FE-035 Add detail metadata section.
- [x] MVP-M04-FE-036 Add detail notes section.
- [x] MVP-M04-FE-037 Add edit button on detail page.
- [x] MVP-M04-FE-038 Add delete button on detail page.
- [x] MVP-M04-FE-039 Add loading state to Library page.
- [x] MVP-M04-FE-040 Add empty state to Library page.
- [x] MVP-M04-FE-041 Add error state to Library page.

### Integration Tasks

- [x] MVP-M04-INT-001 Connect Library page to media list endpoint.
- [x] MVP-M04-INT-002 Connect Add Media modal to create endpoint.
- [x] MVP-M04-INT-003 Connect Edit Media modal to update endpoint.
- [x] MVP-M04-INT-004 Connect Delete action to delete endpoint.
- [x] MVP-M04-INT-005 Connect filters to backend query parameters.
- [x] MVP-M04-INT-006 Connect search input to backend search parameter.
- [x] MVP-M04-INT-007 Revalidate SWR list after create.
- [x] MVP-M04-INT-008 Revalidate SWR list after update.
- [x] MVP-M04-INT-009 Revalidate SWR list after delete.
- [x] MVP-M04-INT-010 Confirm Media Detail page loads backend data.

### QA Tasks

- [x] MVP-M04-QA-001 Create media item from UI.
- [x] MVP-M04-QA-002 Edit media item from UI.
- [x] MVP-M04-QA-003 Delete media item from UI.
- [x] MVP-M04-QA-004 Search media item from UI.
- [x] MVP-M04-QA-005 Filter media items by type from UI.
- [x] MVP-M04-QA-006 Filter media items by status from UI.
- [x] MVP-M04-QA-007 Confirm media endpoints appear in OpenAPI docs.
- [x] MVP-M04-QA-008 Confirm Library page matches low-fidelity wireframe.
- [x] MVP-M04-QA-009 Create or update `docs/manual-tests/media-library.md`.

---

## MVP-M05 — Taste Dimensions And Personal Scores

**Goal:** Capture why the user likes or dislikes media beyond simple ratings.

### Shared / Contract Tasks

- [x] MVP-M05-SH-001 Define `TasteDimension` type.
- [x] MVP-M05-SH-002 Define `MediaScore` type.
- [x] MVP-M05-SH-003 Define score range as 0 to 10.
- [x] MVP-M05-SH-004 Define default taste dimensions list.
- [x] MVP-M05-SH-005 Add default dimension for story depth.
- [x] MVP-M05-SH-006 Add default dimension for character depth.
- [x] MVP-M05-SH-007 Add default dimension for atmosphere.
- [x] MVP-M05-SH-008 Add default dimension for originality.
- [x] MVP-M05-SH-009 Add default dimension for dialogue.
- [x] MVP-M05-SH-010 Add default dimension for emotional impact.
- [x] MVP-M05-SH-011 Add default dimension for intellectual impact.
- [x] MVP-M05-SH-012 Add default dimension for pacing.
- [x] MVP-M05-SH-013 Add default dimension for ending quality.
- [x] MVP-M05-SH-014 Add default dimension for memorability.
- [x] MVP-M05-SH-015 Add default dimension for rewatch/read value.
- [x] MVP-M05-SH-016 Add default dimension for genericness.
- [x] MVP-M05-SH-017 Add default dimension for regret score.
- [x] MVP-M05-SH-018 Document scoring definitions in `/docs/product-scoring.md`.

### Backend Tasksdjango rest 

- [x] MVP-M05-BE-001 Create TasteDimension model.
- [x] MVP-M05-BE-002 Add owner/user foreign key to TasteDimension.
- [x] MVP-M05-BE-003 Add dimension name field.
- [x] MVP-M05-BE-004 Add dimension slug field.
- [x] MVP-M05-BE-005 Add dimension description field.
- [x] MVP-M05-BE-006 Add dimension direction field.
- [x] MVP-M05-BE-007 Add is default field.
- [x] MVP-M05-BE-008 Create MediaScore model.
- [x] MVP-M05-BE-009 Add media item foreign key to MediaScore.
- [x] MVP-M05-BE-010 Add taste dimension foreign key to MediaScore.
- [x] MVP-M05-BE-011 Add score value field.
- [x] MVP-M05-BE-012 Add score note field.
- [x] MVP-M05-BE-013 Add unique constraint for media item and dimension.
- [x] MVP-M05-BE-014 Create migrations for scoring models.
- [x] MVP-M05-BE-015 Create seed function for default taste dimensions.
- [x] MVP-M05-BE-016 Run default dimensions creation on user registration.
- [x] MVP-M05-BE-017 Create TasteDimension serializer.
- [x] MVP-M05-BE-018 Create MediaScore serializer.
- [x] MVP-M05-BE-019 Create dimensions list endpoint.
- [x] MVP-M05-BE-020 Create media scores list endpoint.
- [x] MVP-M05-BE-021 Create media scores bulk upsert endpoint.
- [x] MVP-M05-BE-022 Add scores to media detail response.
- [x] MVP-M05-BE-023 Register TasteDimension in Django admin.
- [x] MVP-M05-BE-024 Register MediaScore in Django admin.
- [x] MVP-M05-BE-025 Add test for default dimension creation.
- [x] MVP-M05-BE-026 Add test for listing dimensions.
- [x] MVP-M05-BE-027 Add test for bulk score update.
- [x] MVP-M05-BE-028 Add test that score values cannot exceed range.

### Frontend Tasks

- [x] MVP-M05-FE-001 Create taste API client file.
- [x] MVP-M05-FE-002 Create `useTasteDimensions` SWR hook.
- [x] MVP-M05-FE-003 Create media scores API client functions.
- [x] MVP-M05-FE-004 Create dimension score row component.
- [x] MVP-M05-FE-005 Create dimension score grid component.
- [x] MVP-M05-FE-006 Add dimension score grid to Add/Edit Media modal.
- [x] MVP-M05-FE-007 Add dimension score grid to Media Detail page.
- [x] MVP-M05-FE-008 Add score note input to dimension score row.
- [x] MVP-M05-FE-009 Add score save behavior to media modal.
- [x] MVP-M05-FE-010 Add score save behavior to Media Detail page.
- [x] MVP-M05-FE-011 Add genericness score visual indicator.
- [x] MVP-M05-FE-012 Add regret score visual indicator.
- [x] MVP-M05-FE-013 Add memorability score visual indicator.
- [x] MVP-M05-FE-014 Add score validation messages.
- [x] MVP-M05-FE-015 Add loading state for dimensions.
- [x] MVP-M05-FE-016 Add fallback state if dimensions are missing.

### Integration Tasks

- [x] MVP-M05-INT-001 Fetch dimensions when media modal opens.
- [x] MVP-M05-INT-002 Submit scores after media item create.
- [x] MVP-M05-INT-003 Submit scores after media item update.
- [x] MVP-M05-INT-004 Load existing scores on detail page.
- [x] MVP-M05-INT-005 Revalidate media detail after score update.
- [x] MVP-M05-INT-006 Confirm scores appear in API response.

### QA Tasks

- [x] MVP-M05-QA-001 Create completed media with dimension scores.
- [x] MVP-M05-QA-002 Edit scores for existing media.
- [x] MVP-M05-QA-003 Confirm invalid scores are rejected.
- [x] MVP-M05-QA-004 Confirm default dimensions exist for new user.
- [x] MVP-M05-QA-005 Confirm scoring UI matches shared design style.
- [x] MVP-M05-QA-006 Create or update `docs/manual-tests/taste.md`.

---

## MVP-M06 — Dashboard MVP

**Goal:** Show the user a useful overview of library, current queue, and taste signals.

### Shared / Contract Tasks

- [x] MVP-M06-SH-001 Define `DashboardSummary` type.
- [x] MVP-M06-SH-002 Define dashboard count fields.
- [x] MVP-M06-SH-003 Define recent activity item type.
- [x] MVP-M06-SH-004 Define top taste signal type.
- [x] MVP-M06-SH-005 Document dashboard API contract.

### Backend Tasks

- [x] MVP-M06-BE-001 Create dashboard app or dashboard service module.
- [x] MVP-M06-BE-002 Add total media count query.
- [x] MVP-M06-BE-003 Add completed media count query.
- [x] MVP-M06-BE-004 Add planned media count query.
- [x] MVP-M06-BE-005 Add dropped media count query.
- [x] MVP-M06-BE-006 Add count by media type query.
- [x] MVP-M06-BE-007 Add recent updated media query.
- [x] MVP-M06-BE-008 Add highest rated recent items query.
- [x] MVP-M06-BE-009 Add average score by taste dimension query.
- [x] MVP-M06-BE-010 Add dashboard summary serializer.
- [x] MVP-M06-BE-011 Create dashboard summary endpoint.
- [x] MVP-M06-BE-012 Add test for dashboard summary endpoint.
- [x] MVP-M06-BE-013 Add test for empty dashboard summary.

### Frontend Tasks

- [x] MVP-M06-FE-001 Create dashboard API client file.
- [x] MVP-M06-FE-002 Create `useDashboardSummary` SWR hook.
- [x] MVP-M06-FE-003 Create Dashboard page skeleton.
- [x] MVP-M06-FE-004 Add Dashboard page title.
- [x] MVP-M06-FE-005 Add total library metric card.
- [x] MVP-M06-FE-006 Add completed count metric card.
- [x] MVP-M06-FE-007 Add planned count metric card.
- [x] MVP-M06-FE-008 Add dropped count metric card.
- [x] MVP-M06-FE-009 Add media type breakdown card.
- [x] MVP-M06-FE-010 Add recent activity card.
- [x] MVP-M06-FE-011 Add top taste signals card.
- [x] MVP-M06-FE-012 Add quick action button for Add Media.
- [x] MVP-M06-FE-013 Add quick action button for Evaluate Candidate.
- [x] MVP-M06-FE-014 Add quick action button for Tonight Mode.
- [x] MVP-M06-FE-015 Add loading state to Dashboard.
- [x] MVP-M06-FE-016 Add empty state to Dashboard.
- [x] MVP-M06-FE-017 Add error state to Dashboard.

### Integration Tasks

- [x] MVP-M06-INT-001 Connect Dashboard page to dashboard summary endpoint.
- [x] MVP-M06-INT-002 Connect Add Media quick action to media modal or page.
- [x] MVP-M06-INT-003 Connect Evaluate Candidate quick action to Candidate page.
- [x] MVP-M06-INT-004 Connect Tonight Mode quick action to Tonight Mode page.
- [x] MVP-M06-INT-005 Confirm dashboard updates after adding media.

### QA Tasks

- [x] MVP-M06-QA-001 Confirm empty dashboard renders correctly.
- [x] MVP-M06-QA-002 Confirm dashboard with media renders correctly.
- [x] MVP-M06-QA-003 Confirm metric counts are accurate.
- [x] MVP-M06-QA-004 Confirm Dashboard page matches wireframe layout.
- [x] MVP-M06-QA-005 Create or update `docs/manual-tests/dashboard.md`.

---

## MVP-M07 — Candidate Evaluator MVP

**Goal:** Let the user enter a possible title and receive a practical recommendation decision.

### Shared / Contract Tasks

- [x] MVP-M07-SH-001 Define `Candidate` type.
- [x] MVP-M07-SH-002 Define `CandidateStatus` enum.
- [x] MVP-M07-SH-003 Add status value for unevaluated.
- [x] MVP-M07-SH-004 Add status value for watch_now.
- [x] MVP-M07-SH-005 Add status value for sample.
- [x] MVP-M07-SH-006 Add status value for delay.
- [x] MVP-M07-SH-007 Add status value for skip.
- [x] MVP-M07-SH-008 Define `CandidateEvaluation` type.
- [x] MVP-M07-SH-009 Define `EvaluationDecision` enum.
- [x] MVP-M07-SH-010 Define candidate evaluator request type.
- [x] MVP-M07-SH-011 Define candidate evaluator response type.
- [x] MVP-M07-SH-012 Document candidate evaluator scoring rules.

### Backend Tasks

- [x] MVP-M07-BE-001 Create candidates app.
- [x] MVP-M07-BE-002 Create Candidate model.
- [x] MVP-M07-BE-003 Add owner/user foreign key to Candidate.
- [x] MVP-M07-BE-004 Add title field.
- [x] MVP-M07-BE-005 Add media type field.
- [x] MVP-M07-BE-006 Add release year field.
- [x] MVP-M07-BE-007 Add known creator field.
- [x] MVP-M07-BE-008 Add premise field.
- [x] MVP-M07-BE-009 Add source of interest field.
- [x] MVP-M07-BE-010 Add hype level field.
- [x] MVP-M07-BE-011 Add expected genericness field.
- [x] MVP-M07-BE-012 Add expected time cost field.
- [x] MVP-M07-BE-013 Add status field.
- [x] MVP-M07-BE-014 Add created at field.
- [x] MVP-M07-BE-015 Add updated at field.
- [x] MVP-M07-BE-016 Create CandidateEvaluation model.
- [x] MVP-M07-BE-017 Add candidate foreign key to evaluation.
- [x] MVP-M07-BE-018 Add decision field.
- [x] MVP-M07-BE-019 Add confidence score field.
- [x] MVP-M07-BE-020 Add likely fit score field.
- [x] MVP-M07-BE-021 Add risk score field.
- [x] MVP-M07-BE-022 Add reasons_for JSON/text field.
- [x] MVP-M07-BE-023 Add reasons_against JSON/text field.
- [x] MVP-M07-BE-024 Add best mood field.
- [x] MVP-M07-BE-025 Add recommended action field.
- [x] MVP-M07-BE-026 Create migrations for candidates.
- [x] MVP-M07-BE-027 Create Candidate serializer.
- [x] MVP-M07-BE-028 Create CandidateEvaluation serializer.
- [x] MVP-M07-BE-029 Create candidate list endpoint.
- [x] MVP-M07-BE-030 Create candidate create endpoint.
- [x] MVP-M07-BE-031 Create candidate detail endpoint.
- [x] MVP-M07-BE-032 Create candidate update endpoint.
- [x] MVP-M07-BE-033 Create candidate delete endpoint.
- [x] MVP-M07-BE-034 Create evaluator service function.
- [x] MVP-M07-BE-035 Implement simple heuristic score using user scores.
- [x] MVP-M07-BE-036 Implement genericness penalty.
- [x] MVP-M07-BE-037 Implement time cost penalty.
- [x] MVP-M07-BE-038 Implement high-confidence favorite type bonus.
- [x] MVP-M07-BE-039 Implement decision mapping from score to action.
- [x] MVP-M07-BE-040 Create evaluate candidate endpoint.
- [x] MVP-M07-BE-041 Register Candidate in Django admin.
- [x] MVP-M07-BE-042 Register CandidateEvaluation in Django admin.
- [x] MVP-M07-BE-043 Add test for candidate creation.
- [x] MVP-M07-BE-044 Add test for candidate evaluation.
- [x] MVP-M07-BE-045 Add test for genericness penalty.
- [x] MVP-M07-BE-046 Add test for candidate privacy by user.

### Frontend Tasks

- [x] MVP-M07-FE-001 Create candidate API client file.
- [x] MVP-M07-FE-002 Create `useCandidates` SWR hook.
- [x] MVP-M07-FE-003 Create candidate evaluation mutation helper.
- [x] MVP-M07-FE-004 Create Candidates page skeleton.
- [x] MVP-M07-FE-005 Add Candidates page title.
- [x] MVP-M07-FE-006 Add New Candidate button.
- [x] MVP-M07-FE-007 Create Candidate form card.
- [x] MVP-M07-FE-008 Add title field to Candidate form.
- [x] MVP-M07-FE-009 Add media type select to Candidate form.
- [x] MVP-M07-FE-010 Add release year field to Candidate form.
- [x] MVP-M07-FE-011 Add creator field to Candidate form.
- [x] MVP-M07-FE-012 Add premise textarea to Candidate form.
- [x] MVP-M07-FE-013 Add source of interest field.
- [x] MVP-M07-FE-014 Add hype level input.
- [x] MVP-M07-FE-015 Add expected genericness input.
- [x] MVP-M07-FE-016 Add expected time cost input.
- [x] MVP-M07-FE-017 Add Evaluate button.
- [x] MVP-M07-FE-018 Add Save Candidate button.
- [x] MVP-M07-FE-019 Create Candidate result card.
- [x] MVP-M07-FE-020 Add decision badge to result card.
- [x] MVP-M07-FE-021 Add confidence score to result card.
- [x] MVP-M07-FE-022 Add reasons for list to result card.
- [x] MVP-M07-FE-023 Add reasons against list to result card.
- [x] MVP-M07-FE-024 Add best mood display to result card.
- [x] MVP-M07-FE-025 Add recommended action display.
- [x] MVP-M07-FE-026 Add Add To Queue button.
- [x] MVP-M07-FE-027 Add Add To Library button.
- [x] MVP-M07-FE-028 Add Skip Candidate button.
- [x] MVP-M07-FE-029 Create candidate history list.
- [x] MVP-M07-FE-030 Add loading state for candidate evaluation.
- [x] MVP-M07-FE-031 Add empty state for candidate history.
- [x] MVP-M07-FE-032 Add error state for candidate operations.

### Integration Tasks

- [x] MVP-M07-INT-001 Connect Candidate form to candidate create endpoint.
- [x] MVP-M07-INT-002 Connect Evaluate button to evaluate endpoint.
- [x] MVP-M07-INT-003 Display evaluation result after evaluation.
- [x] MVP-M07-INT-004 Save evaluated candidate to candidate history.
- [x] MVP-M07-INT-005 Connect Add To Library button to media create endpoint.
- [x] MVP-M07-INT-006 Connect Skip Candidate button to candidate status update.
- [x] MVP-M07-INT-007 Revalidate candidates after status change.

### QA Tasks

- [x] MVP-M07-QA-001 Create candidate from UI.
- [x] MVP-M07-QA-002 Evaluate candidate from UI.
- [x] MVP-M07-QA-003 Confirm result has decision and explanation.
- [x] MVP-M07-QA-004 Add evaluated candidate to library.
- [x] MVP-M07-QA-005 Skip evaluated candidate.
- [x] MVP-M07-QA-006 Confirm Candidate page matches wireframe.
- [x] MVP-M07-QA-007 Create or update `docs/manual-tests/candidate-evaluator.md`.

---

## MVP-M08 — Queue MVP

**Goal:** Add a practical queue/watchlist for titles the user may consume soon.

### Shared / Contract Tasks

- [x] MVP-M08-SH-001 Define `QueueItem` type.
- [x] MVP-M08-SH-002 Define `QueuePriority` enum.
- [x] MVP-M08-SH-003 Define queue item create request.
- [x] MVP-M08-SH-004 Define queue item update request.
- [x] MVP-M08-SH-005 Document queue API contract.

### Backend Tasks

- [x] MVP-M08-BE-001 Create queue app or module.
- [x] MVP-M08-BE-002 Create QueueItem model.
- [x] MVP-M08-BE-003 Add owner/user foreign key to QueueItem.
- [x] MVP-M08-BE-004 Add optional media item foreign key.
- [x] MVP-M08-BE-005 Add optional candidate foreign key.
- [x] MVP-M08-BE-006 Add title snapshot field.
- [x] MVP-M08-BE-007 Add media type snapshot field.
- [x] MVP-M08-BE-008 Add priority field.
- [x] MVP-M08-BE-009 Add reason field.
- [x] MVP-M08-BE-010 Add estimated time minutes field.
- [x] MVP-M08-BE-011 Add best mood field.
- [x] MVP-M08-BE-012 Add queue position field.
- [x] MVP-M08-BE-013 Add created at field.
- [x] MVP-M08-BE-014 Add updated at field.
- [x] MVP-M08-BE-015 Create migration for QueueItem.
- [x] MVP-M08-BE-016 Create QueueItem serializer.
- [x] MVP-M08-BE-017 Create queue list endpoint.
- [x] MVP-M08-BE-018 Create queue create endpoint.
- [x] MVP-M08-BE-019 Create queue update endpoint.
- [x] MVP-M08-BE-020 Create queue delete endpoint.
- [x] MVP-M08-BE-021 Create queue reorder endpoint.
- [x] MVP-M08-BE-022 Register QueueItem in Django admin.
- [x] MVP-M08-BE-023 Add test for queue create.
- [x] MVP-M08-BE-024 Add test for queue reorder.
- [x] MVP-M08-BE-025 Add test for queue delete.

### Frontend Tasks

- [x] MVP-M08-FE-001 Create queue API client file.
- [x] MVP-M08-FE-002 Create `useQueueItems` SWR hook.
- [x] MVP-M08-FE-003 Create Queue page skeleton.
- [x] MVP-M08-FE-004 Add Queue page title.
- [x] MVP-M08-FE-005 Add Add Queue Item button.
- [x] MVP-M08-FE-006 Create queue item card component.
- [x] MVP-M08-FE-007 Add priority badge to queue item card.
- [x] MVP-M08-FE-008 Add best mood display to queue item card.
- [x] MVP-M08-FE-009 Add estimated time display to queue item card.
- [x] MVP-M08-FE-010 Add reason display to queue item card.
- [x] MVP-M08-FE-011 Add move up button.
- [x] MVP-M08-FE-012 Add move down button.
- [x] MVP-M08-FE-013 Add edit queue item button.
- [x] MVP-M08-FE-014 Add remove queue item button.
- [x] MVP-M08-FE-015 Create queue item modal.
- [x] MVP-M08-FE-016 Add title field to queue item modal.
- [x] MVP-M08-FE-017 Add media type select to queue item modal.
- [x] MVP-M08-FE-018 Add priority select to queue item modal.
- [x] MVP-M08-FE-019 Add best mood field to queue item modal.
- [x] MVP-M08-FE-020 Add estimated time field to queue item modal.
- [x] MVP-M08-FE-021 Add reason textarea to queue item modal.
- [x] MVP-M08-FE-022 Add save button to queue item modal.
- [x] MVP-M08-FE-023 Add empty state to Queue page.
- [x] MVP-M08-FE-024 Add loading state to Queue page.
- [x] MVP-M08-FE-025 Add error state to Queue page.

### Integration Tasks

- [x] MVP-M08-INT-001 Connect Add To Queue from Candidate page to queue create endpoint.
- [x] MVP-M08-INT-002 Connect Queue page to queue list endpoint.
- [x] MVP-M08-INT-003 Connect queue item edit to update endpoint.
- [x] MVP-M08-INT-004 Connect queue item remove to delete endpoint.
- [x] MVP-M08-INT-005 Connect move up/down buttons to reorder endpoint.
- [x] MVP-M08-INT-006 Revalidate queue after changes.

### QA Tasks

- [x] MVP-M08-QA-001 Add queue item manually.
- [x] MVP-M08-QA-002 Add queue item from candidate evaluation.
- [x] MVP-M08-QA-003 Reorder queue items.
- [x] MVP-M08-QA-004 Delete queue item.
- [x] MVP-M08-QA-005 Confirm Queue page matches wireframe.
- [x] MVP-M08-QA-006 Create or update `docs/manual-tests/queue-tonight.md`.

---

## MVP-M09 — Tonight Mode MVP

**Goal:** Recommend what the user should consume next based on current mood, time, and energy.

### Shared / Contract Tasks

- [x] MVP-M09-SH-001 Define `TonightModeRequest` type.
- [x] MVP-M09-SH-002 Define `TonightModeRecommendation` type.
- [x] MVP-M09-SH-003 Define `EnergyLevel` enum.
- [x] MVP-M09-SH-004 Define `FocusLevel` enum.
- [x] MVP-M09-SH-005 Define `DesiredEffect` enum.
- [x] MVP-M09-SH-006 Define `RiskTolerance` enum.
- [x] MVP-M09-SH-007 Document Tonight Mode recommendation rules.

### Backend Tasks

- [x] MVP-M09-BE-001 Create Tonight Mode service module.
- [x] MVP-M09-BE-002 Create TonightModeSession model.
- [x] MVP-M09-BE-003 Add owner/user foreign key to session.
- [x] MVP-M09-BE-004 Add available minutes field.
- [x] MVP-M09-BE-005 Add energy level field.
- [x] MVP-M09-BE-006 Add focus level field.
- [x] MVP-M09-BE-007 Add desired effect field.
- [x] MVP-M09-BE-008 Add preferred media types field.
- [x] MVP-M09-BE-009 Add risk tolerance field.
- [x] MVP-M09-BE-010 Add generated recommendations field.
- [x] MVP-M09-BE-011 Add created at field.
- [x] MVP-M09-BE-012 Create migration for TonightModeSession.
- [x] MVP-M09-BE-013 Create TonightModeSession serializer.
- [x] MVP-M09-BE-014 Implement queue candidate collection.
- [x] MVP-M09-BE-015 Implement planned media candidate collection.
- [x] MVP-M09-BE-016 Implement estimated time filter.
- [x] MVP-M09-BE-017 Implement energy compatibility score.
- [x] MVP-M09-BE-018 Implement focus compatibility score.
- [x] MVP-M09-BE-019 Implement desired effect compatibility score.
- [x] MVP-M09-BE-020 Implement risk tolerance score.
- [x] MVP-M09-BE-021 Implement final ranking formula.
- [x] MVP-M09-BE-022 Return safe choice recommendation.
- [x] MVP-M09-BE-023 Return challenging choice recommendation.
- [x] MVP-M09-BE-024 Return wildcard recommendation.
- [x] MVP-M09-BE-025 Create Tonight Mode recommendation endpoint.
- [x] MVP-M09-BE-026 Register TonightModeSession in Django admin.
- [x] MVP-M09-BE-027 Add test for Tonight Mode empty data.
- [x] MVP-M09-BE-028 Add test for time filtering.
- [x] MVP-M09-BE-029 Add test for three recommendation slots.

### Frontend Tasks

- [x] MVP-M09-FE-001 Create Tonight Mode API client file.
- [x] MVP-M09-FE-002 Create Tonight Mode page skeleton.
- [x] MVP-M09-FE-003 Add page title.
- [x] MVP-M09-FE-004 Add available time input.
- [x] MVP-M09-FE-005 Add energy level selector.
- [x] MVP-M09-FE-006 Add focus level selector.
- [x] MVP-M09-FE-007 Add desired effect selector.
- [x] MVP-M09-FE-008 Add media type preference multi-select.
- [x] MVP-M09-FE-009 Add risk tolerance selector.
- [x] MVP-M09-FE-010 Add Generate Tonight Plan button.
- [x] MVP-M09-FE-011 Create recommendation result grid.
- [x] MVP-M09-FE-012 Create safe choice card.
- [x] MVP-M09-FE-013 Create challenging choice card.
- [x] MVP-M09-FE-014 Create wildcard choice card.
- [x] MVP-M09-FE-015 Add recommendation reason display.
- [x] MVP-M09-FE-016 Add Start This button.
- [x] MVP-M09-FE-017 Add Not Tonight button.
- [x] MVP-M09-FE-018 Add Add To Queue button.
- [x] MVP-M09-FE-019 Add loading state while generating plan.
- [x] MVP-M09-FE-020 Add empty state when no recommendations exist.
- [x] MVP-M09-FE-021 Add error state for failed generation.

### Integration Tasks

- [x] MVP-M09-INT-001 Connect Tonight Mode form to recommendation endpoint.
- [x] MVP-M09-INT-002 Display generated recommendations.
- [x] MVP-M09-INT-003 Connect Start This button to media status update.
- [x] MVP-M09-INT-004 Connect Not Tonight button to queue priority lowering.
- [x] MVP-M09-INT-005 Connect Add To Queue button to queue endpoint.
- [x] MVP-M09-INT-006 Persist Tonight Mode session after generation.

### QA Tasks

- [x] MVP-M09-QA-001 Generate recommendations with empty queue.
- [x] MVP-M09-QA-002 Generate recommendations with queue items.
- [x] MVP-M09-QA-003 Generate recommendations with planned media.
- [x] MVP-M09-QA-004 Confirm time limit affects recommendations.
- [x] MVP-M09-QA-005 Confirm Tonight Mode page matches wireframe.
- [x] MVP-M09-QA-006 Create or update `docs/manual-tests/queue-tonight.md`.

---

## MVP-M10 — Aftertaste Log MVP

**Goal:** Let the user reflect after finishing or dropping something so the system learns deeper signals.

### Shared / Contract Tasks

- [x] MVP-M10-SH-001 Define `AftertasteEntry` type.
- [x] MVP-M10-SH-002 Define `AftertasteCreateRequest` type.
- [x] MVP-M10-SH-003 Define `AftertastePrompt` type.
- [x] MVP-M10-SH-004 Define default aftertaste prompt list.
- [x] MVP-M10-SH-005 Document aftertaste API contract.

### Backend Tasks

- [x] MVP-M10-BE-001 Create aftertaste app.
- [x] MVP-M10-BE-002 Create AftertasteEntry model.
- [x] MVP-M10-BE-003 Add owner/user foreign key.
- [x] MVP-M10-BE-004 Add media item foreign key.
- [x] MVP-M10-BE-005 Add worth_time boolean field.
- [x] MVP-M10-BE-006 Add stayed_with_me score field.
- [x] MVP-M10-BE-007 Add felt_alive boolean field.
- [x] MVP-M10-BE-008 Add felt_generic boolean field.
- [x] MVP-M10-BE-009 Add completion_reason field.
- [x] MVP-M10-BE-010 Add what_worked text field.
- [x] MVP-M10-BE-011 Add what_failed text field.
- [x] MVP-M10-BE-012 Add final_thoughts text field.
- [x] MVP-M10-BE-013 Add appetite_effect field.
- [x] MVP-M10-BE-014 Add created at field.
- [x] MVP-M10-BE-015 Create migration for AftertasteEntry.
- [x] MVP-M10-BE-016 Create AftertasteEntry serializer.
- [x] MVP-M10-BE-017 Create aftertaste list endpoint.
- [x] MVP-M10-BE-018 Create aftertaste create endpoint.
- [x] MVP-M10-BE-019 Create aftertaste detail endpoint.
- [x] MVP-M10-BE-020 Create aftertaste update endpoint.
- [x] MVP-M10-BE-021 Create aftertaste delete endpoint.
- [x] MVP-M10-BE-022 Add latest aftertaste entry to media detail response.
- [x] MVP-M10-BE-023 Register AftertasteEntry in Django admin.
- [x] MVP-M10-BE-024 Add test for aftertaste creation.
- [x] MVP-M10-BE-025 Add test for aftertaste list.
- [x] MVP-M10-BE-026 Add test for media ownership protection.

### Frontend Tasks

- [x] MVP-M10-FE-001 Create aftertaste API client file.
- [x] MVP-M10-FE-002 Create `useAftertasteEntries` SWR hook.
- [x] MVP-M10-FE-003 Create Aftertaste Log page skeleton.
- [x] MVP-M10-FE-004 Add Aftertaste page title.
- [x] MVP-M10-FE-005 Add New Reflection button.
- [x] MVP-M10-FE-006 Create aftertaste entry list component.
- [x] MVP-M10-FE-007 Create aftertaste entry card component.
- [x] MVP-M10-FE-008 Add media title to entry card.
- [x] MVP-M10-FE-009 Add worth time indicator to entry card.
- [x] MVP-M10-FE-010 Add stayed-with-me score to entry card.
- [x] MVP-M10-FE-011 Add felt generic indicator to entry card.
- [x] MVP-M10-FE-012 Add final thoughts preview to entry card.
- [x] MVP-M10-FE-013 Create Aftertaste form modal.
- [x] MVP-M10-FE-014 Add media item selector to form.
- [x] MVP-M10-FE-015 Add worth time control to form.
- [x] MVP-M10-FE-016 Add stayed with me score field.
- [x] MVP-M10-FE-017 Add felt alive control.
- [x] MVP-M10-FE-018 Add felt generic control.
- [x] MVP-M10-FE-019 Add completion reason field.
- [x] MVP-M10-FE-020 Add what worked textarea.
- [x] MVP-M10-FE-021 Add what failed textarea.
- [x] MVP-M10-FE-022 Add final thoughts textarea.
- [x] MVP-M10-FE-023 Add appetite effect select.
- [x] MVP-M10-FE-024 Add save button.
- [x] MVP-M10-FE-025 Add cancel button.
- [x] MVP-M10-FE-026 Add aftertaste prompt section to Media Detail page.
- [x] MVP-M10-FE-027 Add loading state to Aftertaste page.
- [x] MVP-M10-FE-028 Add empty state to Aftertaste page.
- [x] MVP-M10-FE-029 Add error state to Aftertaste page.

### Integration Tasks

- [x] MVP-M10-INT-001 Connect Aftertaste page to list endpoint.
- [x] MVP-M10-INT-002 Connect New Reflection form to create endpoint.
- [x] MVP-M10-INT-003 Connect edit action to update endpoint.
- [x] MVP-M10-INT-004 Connect delete action to delete endpoint.
- [x] MVP-M10-INT-005 Connect Media Detail aftertaste section to latest entry.
- [x] MVP-M10-INT-006 Revalidate aftertaste list after creation.

### QA Tasks

- [x] MVP-M10-QA-001 Create aftertaste entry from UI.
- [x] MVP-M10-QA-002 Edit aftertaste entry from UI.
- [x] MVP-M10-QA-003 Delete aftertaste entry from UI.
- [x] MVP-M10-QA-004 Confirm entry appears on Media Detail page.
- [x] MVP-M10-QA-005 Confirm Aftertaste page matches wireframe.
- [x] MVP-M10-QA-006 Create or update `docs/manual-tests/aftertaste-log.md`.

---

## MVP-M11 — Taste Profile MVP

**Goal:** Generate a simple profile of what the user tends to value and dislike.

### Shared / Contract Tasks

- [x] MVP-M11-SH-001 Define `TasteProfileSummary` type.
- [x] MVP-M11-SH-002 Define `TasteSignal` type.
- [x] MVP-M11-SH-003 Define `NegativeTasteSignal` type.
- [x] MVP-M11-SH-004 Define `MediumPreference` type.
- [x] MVP-M11-SH-005 Document taste profile API contract.

### Backend Tasks

- [x] MVP-M11-BE-001 Create taste profile service module.
- [x] MVP-M11-BE-002 Compute average rating by media type.
- [x] MVP-M11-BE-003 Compute average taste dimension score.
- [x] MVP-M11-BE-004 Compute high-value dimensions.
- [x] MVP-M11-BE-005 Compute low-value dimensions.
- [x] MVP-M11-BE-006 Compute high genericness warning count.
- [x] MVP-M11-BE-007 Compute high regret warning count.
- [x] MVP-M11-BE-008 Compute strongest medium preference.
- [x] MVP-M11-BE-009 Compute weakest medium preference.
- [x] MVP-M11-BE-010 Generate simple natural-language taste summary.
- [x] MVP-M11-BE-011 Create taste profile endpoint.
- [x] MVP-M11-BE-012 Add test for empty taste profile.
- [x] MVP-M11-BE-013 Add test for taste profile with scored media.
- [x] MVP-M11-BE-014 Add test for high genericness detection.

### Frontend Tasks

- [x] MVP-M11-FE-001 Create taste profile API client file.
- [x] MVP-M11-FE-002 Create `useTasteProfile` SWR hook.
- [x] MVP-M11-FE-003 Create Taste Profile page skeleton.
- [x] MVP-M11-FE-004 Add Taste Profile page title.
- [x] MVP-M11-FE-005 Add generated summary card.
- [x] MVP-M11-FE-006 Add strongest dimensions card.
- [x] MVP-M11-FE-007 Add weakest dimensions card.
- [x] MVP-M11-FE-008 Add medium preference card.
- [x] MVP-M11-FE-009 Add genericness warning card.
- [x] MVP-M11-FE-010 Add regret warning card.
- [x] MVP-M11-FE-011 Add recently influential works card.
- [x] MVP-M11-FE-012 Add Refresh Profile button.
- [x] MVP-M11-FE-013 Add loading state to Taste Profile page.
- [x] MVP-M11-FE-014 Add empty state to Taste Profile page.
- [x] MVP-M11-FE-015 Add error state to Taste Profile page.

### Integration Tasks

- [x] MVP-M11-INT-001 Connect Taste Profile page to endpoint.
- [x] MVP-M11-INT-002 Connect Refresh Profile button to revalidate SWR.
- [x] MVP-M11-INT-003 Confirm Taste Profile changes after scoring media.
- [x] MVP-M11-INT-004 Confirm Taste Profile changes after aftertaste entries.

### QA Tasks

- [x] MVP-M11-QA-001 Confirm empty profile shows helpful onboarding.
- [x] MVP-M11-QA-002 Confirm profile with data shows meaningful summary.
- [x] MVP-M11-QA-003 Confirm Refresh Profile button works.
- [x] MVP-M11-QA-004 Confirm Taste Profile page matches wireframe.
- [x] MVP-M11-QA-005 Create or update `docs/manual-tests/taste.md`.

---

## MVP-M12 — Settings MVP

**Goal:** Let the user configure basic personal preferences and product behavior.

### Shared / Contract Tasks

- [x] MVP-M12-SH-001 Define `UserSettings` type.
- [x] MVP-M12-SH-002 Define `RecommendationSettings` type.
- [x] MVP-M12-SH-003 Define `DisplaySettings` type.
- [x] MVP-M12-SH-004 Document settings API contract.

### Backend Tasks

- [x] MVP-M12-BE-001 Create UserSettings model.
- [x] MVP-M12-BE-002 Add owner/user one-to-one field.
- [x] MVP-M12-BE-003 Add default media types field.
- [x] MVP-M12-BE-004 Add default risk tolerance field.
- [x] MVP-M12-BE-005 Add modern media skepticism level field.
- [x] MVP-M12-BE-006 Add genericness sensitivity field.
- [x] MVP-M12-BE-007 Add preferred scoring strictness field.
- [x] MVP-M12-BE-008 Add theme preference field.
- [x] MVP-M12-BE-009 Create migration for UserSettings.
- [x] MVP-M12-BE-010 Create settings on user registration.
- [x] MVP-M12-BE-011 Create UserSettings serializer.
- [x] MVP-M12-BE-012 Create settings detail endpoint.
- [x] MVP-M12-BE-013 Create settings update endpoint.
- [x] MVP-M12-BE-014 Register UserSettings in Django admin.
- [x] MVP-M12-BE-015 Add test for default settings creation.
- [x] MVP-M12-BE-016 Add test for settings update.

### Frontend Tasks

- [x] MVP-M12-FE-001 Create settings API client file.
- [x] MVP-M12-FE-002 Create `useUserSettings` SWR hook.
- [x] MVP-M12-FE-003 Create Settings page skeleton.
- [x] MVP-M12-FE-004 Add Settings page title.
- [x] MVP-M12-FE-005 Add Profile settings section.
- [x] MVP-M12-FE-006 Add Display settings section.
- [x] MVP-M12-FE-007 Add Recommendation settings section.
- [x] MVP-M12-FE-008 Add default media types control.
- [x] MVP-M12-FE-009 Add default risk tolerance control.
- [x] MVP-M12-FE-010 Add modern media skepticism slider.
- [x] MVP-M12-FE-011 Add genericness sensitivity slider.
- [x] MVP-M12-FE-012 Add scoring strictness slider.
- [x] MVP-M12-FE-013 Add theme preference control.
- [x] MVP-M12-FE-014 Add Save Settings button.
- [x] MVP-M12-FE-015 Add Reset Changes button.
- [x] MVP-M12-FE-016 Add loading state to Settings page.
- [x] MVP-M12-FE-017 Add error state to Settings page.
- [x] MVP-M12-FE-018 Add saved confirmation toast.

### Integration Tasks

- [x] MVP-M12-INT-001 Connect Settings page to settings endpoint.
- [x] MVP-M12-INT-002 Connect Save Settings button to update endpoint.
- [x] MVP-M12-INT-003 Apply theme preference to app shell.
- [x] MVP-M12-INT-004 Use genericness sensitivity in candidate evaluator.
- [x] MVP-M12-INT-005 Use risk tolerance default in Tonight Mode.

### QA Tasks

- [x] MVP-M12-QA-001 Update settings from UI.
- [x] MVP-M12-QA-002 Confirm saved settings persist after refresh.
- [x] MVP-M12-QA-003 Confirm settings influence Candidate Evaluator.
- [x] MVP-M12-QA-004 Confirm settings influence Tonight Mode defaults.
- [x] MVP-M12-QA-005 Confirm Settings page matches wireframe.
- [x] MVP-M12-QA-006 Create or update `docs/manual-tests/settings-portability.md`.

---

## MVP-M13 — MVP Import, Export, And Backup Basics

**Goal:** Give the user a trustworthy way to bring existing media history into CanonOS and export owned data before the MVP becomes heavily used.

### Shared / Contract Tasks

- [x] MVP-M13-SH-001 Define `ImportBatch` type.
- [x] MVP-M13-SH-002 Define `ImportItemPreview` type.
- [x] MVP-M13-SH-003 Define `ExportRequest` type.
- [x] MVP-M13-SH-004 Define `ExportResult` type.
- [x] MVP-M13-SH-005 Document supported CSV import columns.
- [x] MVP-M13-SH-006 Document full-fidelity JSON import/export format.
- [x] MVP-M13-SH-007 Document import validation and no-partial-write rules.

### Backend Tasks

- [x] MVP-M13-BE-001 Create imports/exports service module.
- [x] MVP-M13-BE-002 Create ImportBatch model.
- [x] MVP-M13-BE-003 Create ImportItem model.
- [x] MVP-M13-BE-004 Create ExportJob model.
- [x] MVP-M13-BE-005 Add owner/user filtering to all import/export records.
- [x] MVP-M13-BE-006 Create CSV import parser.
- [x] MVP-M13-BE-007 Create JSON import parser.
- [x] MVP-M13-BE-008 Create import validation preview service.
- [x] MVP-M13-BE-009 Reject invalid rows without changing existing library data.
- [x] MVP-M13-BE-010 Create import confirm service using a database transaction.
- [x] MVP-M13-BE-011 Create full JSON export service for user-owned data.
- [x] MVP-M13-BE-012 Create media/rating CSV export service.
- [x] MVP-M13-BE-013 Create import preview endpoint.
- [x] MVP-M13-BE-014 Create import confirm endpoint.
- [x] MVP-M13-BE-015 Create export request endpoint.
- [x] MVP-M13-BE-016 Create export download endpoint.
- [x] MVP-M13-BE-017 Create local backup command using the JSON export service.
- [x] MVP-M13-BE-018 Add test for valid CSV import preview.
- [x] MVP-M13-BE-019 Add test for invalid import preserving existing records.
- [x] MVP-M13-BE-020 Add test for JSON export contents.
- [x] MVP-M13-BE-021 Add test that exported JSON can be imported into a fresh database.

### Frontend Tasks

- [x] MVP-M13-FE-001 Add Import/Export section to Settings.
- [x] MVP-M13-FE-002 Create portability API client file.
- [x] MVP-M13-FE-003 Add import file picker.
- [x] MVP-M13-FE-004 Add import source type selector.
- [x] MVP-M13-FE-005 Add import preview table.
- [x] MVP-M13-FE-006 Add validation errors and duplicate warnings.
- [x] MVP-M13-FE-007 Add Confirm Import button.
- [x] MVP-M13-FE-008 Add import loading, empty, error, and success states.
- [x] MVP-M13-FE-009 Add export format selector.
- [x] MVP-M13-FE-010 Add Request Export button.
- [x] MVP-M13-FE-011 Add Download Export button.
- [x] MVP-M13-FE-012 Add export loading, empty, error, and success states.

### Integration Tasks

- [x] MVP-M13-INT-001 Connect file picker to import preview endpoint.
- [x] MVP-M13-INT-002 Display import preview results before commit.
- [x] MVP-M13-INT-003 Connect Confirm Import button to import confirm endpoint.
- [x] MVP-M13-INT-004 Refresh Library and Dashboard after import completes.
- [x] MVP-M13-INT-005 Connect export request to export endpoint.
- [x] MVP-M13-INT-006 Connect Download Export button to download endpoint.
- [x] MVP-M13-INT-007 Confirm invalid import does not change visible library data.

### QA Tasks

- [x] MVP-M13-QA-001 Import a valid CSV.
- [x] MVP-M13-QA-002 Import an invalid CSV and confirm clear row errors.
- [x] MVP-M13-QA-003 Import a JSON export into a fresh database.
- [x] MVP-M13-QA-004 Export all data as JSON.
- [x] MVP-M13-QA-005 Export media library and ratings as CSV.
- [x] MVP-M13-QA-006 Confirm imported media appears in Dashboard and Library.
- [x] MVP-M13-QA-007 Confirm export is offered before destructive deletion flows exist.
- [x] MVP-M13-QA-008 Create or update `docs/manual-tests/settings-portability.md`.

---

## MVP-M14 — MVP API Documentation And Developer Experience

**Goal:** Make the MVP understandable to the next agent or developer.

### Backend Tasks

- [x] MVP-M14-BE-001 Confirm all MVP endpoints have serializers.
- [x] MVP-M14-BE-002 Confirm all MVP endpoints appear in OpenAPI schema.
- [x] MVP-M14-BE-003 Add endpoint descriptions for auth endpoints.
- [x] MVP-M14-BE-004 Add endpoint descriptions for media endpoints.
- [x] MVP-M14-BE-005 Add endpoint descriptions for scores endpoints.
- [x] MVP-M14-BE-006 Add endpoint descriptions for candidates endpoints.
- [x] MVP-M14-BE-007 Add endpoint descriptions for queue endpoints.
- [x] MVP-M14-BE-008 Add endpoint descriptions for Tonight Mode endpoint.
- [x] MVP-M14-BE-009 Add endpoint descriptions for aftertaste endpoints.
- [x] MVP-M14-BE-010 Add endpoint descriptions for settings endpoint.
- [x] MVP-M14-BE-011 Add endpoint descriptions for import/export endpoints.
- [x] MVP-M14-BE-012 Confirm Swagger UI loads successfully.
- [x] MVP-M14-BE-013 Confirm Scalar docs load successfully.

### Frontend Tasks

- [x] MVP-M14-FE-001 Add frontend page list to `/docs/frontend.md`.
- [x] MVP-M14-FE-002 Add shared layout rules to `/docs/frontend.md`.
- [x] MVP-M14-FE-003 Add shared component rules to `/docs/frontend.md`.
- [x] MVP-M14-FE-004 Add SWR usage pattern to `/docs/frontend.md`.
- [x] MVP-M14-FE-005 Add Zustand usage pattern to `/docs/frontend.md`.
- [x] MVP-M14-FE-006 Add API client usage pattern to `/docs/frontend.md`.
- [x] MVP-M14-FE-007 Add form handling pattern to `/docs/frontend.md`.
- [x] MVP-M14-FE-008 Add error handling pattern to `/docs/frontend.md`.

### Shared Tasks

- [x] MVP-M14-SH-001 Update root README with MVP features.
- [x] MVP-M14-SH-002 Update root README with local setup steps.
- [x] MVP-M14-SH-003 Update root README with service URLs.
- [x] MVP-M14-SH-004 Update root README with testing commands.
- [x] MVP-M14-SH-005 Update root README with API docs URL.
- [x] MVP-M14-SH-006 Update architecture doc with MVP module diagram in text form.
- [x] MVP-M14-SH-007 Update backend doc with app/module list.
- [x] MVP-M14-SH-008 Update testing doc with MVP test coverage.
- [x] MVP-M14-SH-009 Update README with import/export and backup basics.
- [x] MVP-M14-SH-010 Add GitHub Actions CI workflow if not completed in MVP-M01.
- [x] MVP-M14-SH-011 Document branch protection and PR checklist requirements.

### QA Tasks

- [x] MVP-M14-QA-001 Have a fresh agent follow README setup steps.
- [x] MVP-M14-QA-002 Confirm no hidden setup knowledge is required.
- [x] MVP-M14-QA-003 Confirm API docs are reachable from local environment.
- [x] MVP-M14-QA-004 Confirm frontend and backend docs agree on routes.
- [x] MVP-M14-QA-005 Confirm CI runs lint, typecheck, tests, build, and E2E.
- [x] MVP-M14-QA-006 Confirm branch protection requirements are documented for repository admins.

---

## MVP-M15 — MVP Testing, Bug Fixing, And Acceptance

**Goal:** Verify the MVP is stable and usable end-to-end.

### Backend QA Tasks

- [x] MVP-M15-BE-001 Run all backend tests.
- [x] MVP-M15-BE-002 Fix failing auth tests.
- [x] MVP-M15-BE-003 Fix failing media tests.
- [x] MVP-M15-BE-004 Fix failing scoring tests.
- [x] MVP-M15-BE-005 Fix failing candidate tests.
- [x] MVP-M15-BE-006 Fix failing queue tests.
- [x] MVP-M15-BE-007 Fix failing Tonight Mode tests.
- [x] MVP-M15-BE-008 Fix failing aftertaste tests.
- [x] MVP-M15-BE-009 Fix failing settings tests.
- [x] MVP-M15-BE-010 Fix failing import/export tests.
- [x] MVP-M15-BE-011 Confirm migrations run from clean database.
- [x] MVP-M15-BE-012 Confirm admin site loads.
- [x] MVP-M15-BE-013 Confirm no endpoint leaks another user's data.

### Frontend QA Tasks

- [x] MVP-M15-FE-001 Run frontend type check.
- [x] MVP-M15-FE-002 Fix TypeScript errors.
- [x] MVP-M15-FE-003 Run frontend build.
- [x] MVP-M15-FE-004 Fix build errors.
- [x] MVP-M15-FE-005 Confirm all routes render.
- [x] MVP-M15-FE-006 Confirm all sidebar links work.
- [x] MVP-M15-FE-007 Confirm all major buttons have handlers.
- [x] MVP-M15-FE-008 Confirm no major button is a dead placeholder.
- [x] MVP-M15-FE-009 Confirm loading states render on major pages.
- [x] MVP-M15-FE-010 Confirm empty states render on major pages.
- [x] MVP-M15-FE-011 Confirm error states render on major pages.
- [x] MVP-M15-FE-012 Confirm layout remains consistent on mobile width.

### End-To-End Acceptance Tasks

- [x] MVP-M15-E2E-001 Register a new user.
- [x] MVP-M15-E2E-002 Log in as the new user.
- [x] MVP-M15-E2E-003 Add a movie to Library.
- [x] MVP-M15-E2E-004 Add an anime to Library.
- [x] MVP-M15-E2E-005 Add a novel to Library.
- [x] MVP-M15-E2E-006 Score the movie with taste dimensions.
- [x] MVP-M15-E2E-007 Score the anime with taste dimensions.
- [x] MVP-M15-E2E-008 Create an aftertaste entry.
- [x] MVP-M15-E2E-009 Open Taste Profile and confirm it reflects data.
- [x] MVP-M15-E2E-010 Create a candidate.
- [x] MVP-M15-E2E-011 Evaluate the candidate.
- [x] MVP-M15-E2E-012 Add the candidate to Queue.
- [x] MVP-M15-E2E-013 Open Tonight Mode.
- [x] MVP-M15-E2E-014 Generate a Tonight Mode plan.
- [x] MVP-M15-E2E-015 Start one recommendation.
- [x] MVP-M15-E2E-016 Confirm Dashboard updates.
- [x] MVP-M15-E2E-017 Update Settings.
- [x] MVP-M15-E2E-018 Import a valid CSV media list.
- [x] MVP-M15-E2E-019 Export all user data as JSON.
- [x] MVP-M15-E2E-020 Export media library as CSV.
- [x] MVP-M15-E2E-021 Log out.
- [x] MVP-M15-E2E-022 Log back in.
- [x] MVP-M15-E2E-023 Confirm data persisted.

### MVP Sign-Off Tasks

- [x] MVP-M15-SIGN-001 Confirm MVP has no missing critical page.
- [x] MVP-M15-SIGN-002 Confirm MVP has no dead primary action.
- [x] MVP-M15-SIGN-003 Confirm MVP has clear API docs.
- [x] MVP-M15-SIGN-004 Confirm MVP has working local setup.
- [x] MVP-M15-SIGN-005 Confirm MVP is useful for logging and choosing media.
- [x] MVP-M15-SIGN-006 Confirm MVP can import and export user-owned data.
- [x] MVP-M15-SIGN-007 Confirm all manual test docs exist for MVP user-facing features.
- [x] MVP-M15-SIGN-008 Confirm lint, typecheck, tests, build, and E2E all pass.
- [x] MVP-M15-SIGN-009 Write MVP completion summary in Last Completed Task Summary section.

---

# 6. Complete Product Phase

The complete product phase expands CanonOS far beyond a simple MVP. At the end of this phase, CanonOS should feel like a full personal media intelligence system.

---

## CP-M01 — Production-Ready Monorepo Hardening

**Goal:** Make the repository reliable for long-term development.

### Shared Tasks

- [x] CP-M01-SH-001 Add consistent root lint command.
- [x] CP-M01-SH-002 Add consistent root test command.
- [x] CP-M01-SH-003 Add consistent root build command.
- [x] CP-M01-SH-004 Add pre-commit configuration.
- [x] CP-M01-SH-005 Add backend formatting hook.
- [x] CP-M01-SH-006 Add frontend formatting hook.
- [x] CP-M01-SH-007 Add frontend lint hook.
- [x] CP-M01-SH-008 Add backend lint hook.
- [x] CP-M01-SH-009 Add commit message convention documentation.
- [x] CP-M01-SH-010 Add code ownership or module ownership documentation.
- [x] CP-M01-SH-011 Add architecture decision records directory.
- [x] CP-M01-SH-012 Add first ADR for monorepo choice.
- [x] CP-M01-SH-013 Add ADR for API-first development.
- [x] CP-M01-SH-014 Add ADR for recommendation heuristic strategy.
- [x] CP-M01-SH-015 Add ADR for Celery/Redis usage.

### Backend Tasks

- [x] CP-M01-BE-001 Split backend settings into base/dev/test/prod files.
- [x] CP-M01-BE-002 Add structured logging settings.
- [x] CP-M01-BE-003 Add request ID middleware.
- [x] CP-M01-BE-004 Add API exception handler.
- [x] CP-M01-BE-005 Add consistent error response format.
- [x] CP-M01-BE-006 Add test for error response format.
- [x] CP-M01-BE-007 Add API version prefix.
- [x] CP-M01-BE-008 Add schema versioning note to API docs.
- [x] CP-M01-BE-009 Add database migration check command.
- [x] CP-M01-BE-010 Add backend seed command.

### Frontend Tasks

- [x] CP-M01-FE-001 Add global error boundary.
- [x] CP-M01-FE-002 Add route-level error fallback.
- [x] CP-M01-FE-003 Add API error normalization helper.
- [x] CP-M01-FE-004 Add toast notification system.
- [x] CP-M01-FE-005 Replace silent API failures with toasts where appropriate.
- [x] CP-M01-FE-006 Add shared mutation loading button component.
- [x] CP-M01-FE-007 Add shared destructive action button pattern.
- [x] CP-M01-FE-008 Add shared form footer component.
- [x] CP-M01-FE-009 Add shared page tabs component.
- [x] CP-M01-FE-010 Add frontend accessibility checklist to docs.

### QA Tasks

- [x] CP-M01-QA-001 Run root lint command.
- [x] CP-M01-QA-002 Run root test command.
- [x] CP-M01-QA-003 Run root build command.
- [x] CP-M01-QA-004 Confirm pre-commit hooks work.
- [x] CP-M01-QA-005 Confirm error handling behavior is consistent.

---

## CP-M02 — Advanced Metadata And External Provider Adapters

**Goal:** Support richer metadata without locking CanonOS to one provider.

### Shared / Contract Tasks

- [x] CP-M02-SH-001 Define `ExternalProvider` enum.
- [x] CP-M02-SH-002 Define `ExternalMediaMatch` type.
- [x] CP-M02-SH-003 Define `ExternalMetadataSnapshot` type.
- [x] CP-M02-SH-004 Define metadata refresh job type.
- [x] CP-M02-SH-005 Document provider adapter interface.

### Backend Tasks

- [x] CP-M02-BE-001 Create metadata app.
- [x] CP-M02-BE-002 Create ExternalMetadata model.
- [x] CP-M02-BE-003 Add media item foreign key.
- [x] CP-M02-BE-004 Add provider field.
- [x] CP-M02-BE-005 Add provider item ID field.
- [x] CP-M02-BE-006 Add raw payload JSON field.
- [x] CP-M02-BE-007 Add normalized title field.
- [x] CP-M02-BE-008 Add normalized description field.
- [x] CP-M02-BE-009 Add poster/image URL field.
- [x] CP-M02-BE-010 Add external rating field.
- [x] CP-M02-BE-011 Add external popularity field.
- [x] CP-M02-BE-012 Add last refreshed at field.
- [x] CP-M02-BE-013 Create provider adapter base class.
- [x] CP-M02-BE-014 Create movie/TV provider adapter placeholder.
- [x] CP-M02-BE-015 Create anime provider adapter placeholder.
- [x] CP-M02-BE-016 Create book provider adapter placeholder.
- [x] CP-M02-BE-017 Create audiobook provider adapter placeholder.
- [x] CP-M02-BE-018 Create metadata search service.
- [x] CP-M02-BE-019 Create metadata match endpoint.
- [x] CP-M02-BE-020 Create attach metadata endpoint.
- [x] CP-M02-BE-021 Create refresh metadata endpoint.
- [x] CP-M02-BE-022 Add Celery task for metadata refresh.
- [x] CP-M02-BE-023 Add test for provider adapter interface.
- [x] CP-M02-BE-024 Add test for attaching metadata.
- [x] CP-M02-BE-025 Add test for refreshing metadata job.

### Frontend Tasks

- [x] CP-M02-FE-001 Create metadata API client file.
- [x] CP-M02-FE-002 Add metadata search section to Add/Edit Media modal.
- [x] CP-M02-FE-003 Add Search Metadata button.
- [x] CP-M02-FE-004 Create external match result card.
- [x] CP-M02-FE-005 Add Attach Metadata button to result card.
- [x] CP-M02-FE-006 Add poster/image display to media detail page.
- [x] CP-M02-FE-007 Add external description display to media detail page.
- [x] CP-M02-FE-008 Add external source label to media detail page.
- [x] CP-M02-FE-009 Add Refresh Metadata button.
- [x] CP-M02-FE-010 Add metadata refresh loading state.
- [x] CP-M02-FE-011 Add metadata missing empty state.

### Integration Tasks

- [x] CP-M02-INT-001 Connect metadata search UI to match endpoint.
- [x] CP-M02-INT-002 Connect Attach Metadata button to attach endpoint.
- [x] CP-M02-INT-003 Connect Refresh Metadata button to refresh endpoint.
- [x] CP-M02-INT-004 Revalidate media detail after metadata attach.
- [x] CP-M02-INT-005 Revalidate media detail after refresh completes.

### QA Tasks

- [x] CP-M02-QA-001 Search metadata for a movie.
- [x] CP-M02-QA-002 Search metadata for anime.
- [x] CP-M02-QA-003 Search metadata for a novel.
- [x] CP-M02-QA-004 Attach metadata to a media item.
- [x] CP-M02-QA-005 Refresh metadata from UI.

---

## CP-M03 — TasteGraph Core

**Goal:** Build the graph layer that connects works, creators, themes, tags, scores, and personal reactions.

### Shared / Contract Tasks

- [x] CP-M03-SH-001 Define `GraphNode` type.
- [x] CP-M03-SH-002 Define `GraphEdge` type.
- [x] CP-M03-SH-003 Define graph node type enum.
- [x] CP-M03-SH-004 Define graph edge type enum.
- [x] CP-M03-SH-005 Define `TasteGraphSummary` type.
- [x] CP-M03-SH-006 Document TasteGraph concepts.

### Backend Tasks

- [x] CP-M03-BE-001 Create graph app.
- [x] CP-M03-BE-002 Create GraphNode model.
- [x] CP-M03-BE-003 Add owner/user foreign key to GraphNode.
- [x] CP-M03-BE-004 Add node type field.
- [x] CP-M03-BE-005 Add label field.
- [x] CP-M03-BE-006 Add slug field.
- [x] CP-M03-BE-007 Add metadata JSON field.
- [x] CP-M03-BE-008 Create GraphEdge model.
- [x] CP-M03-BE-009 Add owner/user foreign key to GraphEdge.
- [x] CP-M03-BE-010 Add source node foreign key.
- [x] CP-M03-BE-011 Add target node foreign key.
- [x] CP-M03-BE-012 Add edge type field.
- [x] CP-M03-BE-013 Add weight field.
- [x] CP-M03-BE-014 Add evidence text field.
- [x] CP-M03-BE-015 Create migrations for graph models.
- [x] CP-M03-BE-016 Create graph node serializer.
- [x] CP-M03-BE-017 Create graph edge serializer.
- [x] CP-M03-BE-018 Create graph summary endpoint.
- [x] CP-M03-BE-019 Create graph nodes list endpoint.
- [x] CP-M03-BE-020 Create graph edges list endpoint.
- [x] CP-M03-BE-021 Create graph rebuild service.
- [x] CP-M03-BE-022 Add media item node creation logic.
- [x] CP-M03-BE-023 Add creator node creation logic.
- [x] CP-M03-BE-024 Add media-to-creator edge logic.
- [x] CP-M03-BE-025 Add dimension-to-media edge logic.
- [x] CP-M03-BE-026 Add aftertaste-to-media edge logic.
- [x] CP-M03-BE-027 Create rebuild TasteGraph endpoint.
- [x] CP-M03-BE-028 Add Celery task for graph rebuild.
- [x] CP-M03-BE-029 Register graph models in admin.
- [x] CP-M03-BE-030 Add test for media node creation.
- [x] CP-M03-BE-031 Add test for creator node creation.
- [x] CP-M03-BE-032 Add test for graph rebuild.

### Frontend Tasks

- [x] CP-M03-FE-001 Create graph API client file.
- [x] CP-M03-FE-002 Create `useTasteGraphSummary` SWR hook.
- [x] CP-M03-FE-003 Create TasteGraph page skeleton.
- [x] CP-M03-FE-004 Add TasteGraph page title.
- [x] CP-M03-FE-005 Add graph summary cards.
- [x] CP-M03-FE-006 Add strongest connected themes section.
- [x] CP-M03-FE-007 Add strongest connected creators section.
- [x] CP-M03-FE-008 Add strongest connected media section.
- [x] CP-M03-FE-009 Add weak/negative signal section.
- [x] CP-M03-FE-010 Add Rebuild TasteGraph button.
- [x] CP-M03-FE-011 Add graph rebuild job status display.
- [x] CP-M03-FE-012 Add simple text graph view.
- [x] CP-M03-FE-013 Add loading state to TasteGraph page.
- [x] CP-M03-FE-014 Add empty state to TasteGraph page.
- [x] CP-M03-FE-015 Add error state to TasteGraph page.

### Integration Tasks

- [x] CP-M03-INT-001 Connect TasteGraph page to summary endpoint.
- [x] CP-M03-INT-002 Connect Rebuild button to rebuild endpoint.
- [x] CP-M03-INT-003 Show job running status after rebuild starts.
- [x] CP-M03-INT-004 Refresh graph summary after rebuild finishes.

### QA Tasks

- [x] CP-M03-QA-001 Rebuild graph with empty library.
- [x] CP-M03-QA-002 Rebuild graph with scored library.
- [x] CP-M03-QA-003 Confirm graph connects media to creators.
- [x] CP-M03-QA-004 Confirm graph connects media to taste dimensions.
- [x] CP-M03-QA-005 Confirm TasteGraph page follows shared layout.

---

## CP-M04 — Anti-Generic Filter

**Goal:** Add a powerful system for detecting genericness, weak fit, and time-waste risk while still allowing modern exceptions.

### Shared / Contract Tasks

- [x] CP-M04-SH-001 Define `GenericnessSignal` type.
- [x] CP-M04-SH-002 Define `PositiveExceptionSignal` type.
- [x] CP-M04-SH-003 Define `AntiGenericEvaluation` type.
- [x] CP-M04-SH-004 Define `AntiGenericRule` type.
- [x] CP-M04-SH-005 Document Anti-Generic Filter rules.

### Backend Tasks

- [x] CP-M04-BE-001 Create anti_generic app or module.
- [x] CP-M04-BE-002 Create AntiGenericRule model.
- [x] CP-M04-BE-003 Add owner/user foreign key to rule.
- [x] CP-M04-BE-004 Add rule name field.
- [x] CP-M04-BE-005 Add rule description field.
- [x] CP-M04-BE-006 Add rule weight field.
- [x] CP-M04-BE-007 Add is positive exception field.
- [x] CP-M04-BE-008 Add is enabled field.
- [x] CP-M04-BE-009 Create AntiGenericEvaluation model.
- [x] CP-M04-BE-010 Add candidate foreign key.
- [x] CP-M04-BE-011 Add media item foreign key nullable.
- [x] CP-M04-BE-012 Add genericness risk score.
- [x] CP-M04-BE-013 Add time waste risk score.
- [x] CP-M04-BE-014 Add positive exception score.
- [x] CP-M04-BE-015 Add detected signals JSON field.
- [x] CP-M04-BE-016 Add final verdict field.
- [x] CP-M04-BE-017 Create migrations for anti-generic models.
- [x] CP-M04-BE-018 Create default anti-generic rules seed.
- [x] CP-M04-BE-019 Add rule for fake complexity.
- [x] CP-M04-BE-020 Add rule for weak ending risk.
- [x] CP-M04-BE-021 Add rule for shallow darkness.
- [x] CP-M04-BE-022 Add rule for filler-heavy long series.
- [x] CP-M04-BE-023 Add rule for overhype mismatch.
- [x] CP-M04-BE-024 Add positive rule for auteur-driven modern work.
- [x] CP-M04-BE-025 Add positive rule for low popularity but strong fit.
- [x] CP-M04-BE-026 Implement anti-generic evaluation service.
- [x] CP-M04-BE-027 Connect anti-generic service to candidate evaluator.
- [x] CP-M04-BE-028 Create anti-generic evaluation endpoint.
- [x] CP-M04-BE-029 Create rules list endpoint.
- [x] CP-M04-BE-030 Create rule update endpoint.
- [x] CP-M04-BE-031 Register anti-generic models in admin.
- [x] CP-M04-BE-032 Add test for genericness risk scoring.
- [x] CP-M04-BE-033 Add test for positive exception scoring.
- [x] CP-M04-BE-034 Add test for disabled rule ignored.

### Frontend Tasks

- [x] CP-M04-FE-001 Create anti-generic API client file.
- [x] CP-M04-FE-002 Add Anti-Generic section to Candidate result card.
- [x] CP-M04-FE-003 Add genericness risk meter component.
- [x] CP-M04-FE-004 Add time waste risk meter component.
- [x] CP-M04-FE-005 Add positive exception meter component.
- [x] CP-M04-FE-006 Add detected red flags list.
- [x] CP-M04-FE-007 Add detected positive exceptions list.
- [x] CP-M04-FE-008 Add Anti-Generic Settings page section.
- [x] CP-M04-FE-009 Add rules list UI.
- [x] CP-M04-FE-010 Add rule enable/disable toggle.
- [x] CP-M04-FE-011 Add rule weight editor.
- [x] CP-M04-FE-012 Add save rule button.
- [x] CP-M04-FE-013 Add reset rules button.

### Integration Tasks

- [x] CP-M04-INT-001 Connect Candidate Evaluator to anti-generic endpoint.
- [x] CP-M04-INT-002 Display anti-generic result after candidate evaluation.
- [x] CP-M04-INT-003 Connect rules settings UI to rules endpoints.
- [x] CP-M04-INT-004 Re-run evaluation after rule update.

### QA Tasks

- [x] CP-M04-QA-001 Evaluate a high genericness candidate.
- [x] CP-M04-QA-002 Evaluate a modern positive exception candidate.
- [x] CP-M04-QA-003 Disable a rule and confirm output changes.
- [x] CP-M04-QA-004 Confirm Anti-Generic UI is understandable.

---

## CP-M05 — Adaptive Queue v2

**Goal:** Upgrade the queue from a static watchlist into a dynamic decision system.

### Backend Tasks

- [x] CP-M05-BE-001 Add mood compatibility field to QueueItem.
- [x] CP-M05-BE-002 Add intensity level field to QueueItem.
- [x] CP-M05-BE-003 Add complexity level field to QueueItem.
- [x] CP-M05-BE-004 Add commitment level field to QueueItem.
- [x] CP-M05-BE-005 Add freshness score field to QueueItem.
- [x] CP-M05-BE-006 Add last recommended at field.
- [x] CP-M05-BE-007 Add times recommended field.
- [x] CP-M05-BE-008 Create migration for queue v2 fields.
- [x] CP-M05-BE-009 Create queue scoring service.
- [x] CP-M05-BE-010 Add queue decay logic.
- [x] CP-M05-BE-011 Add queue priority recalculation endpoint.
- [x] CP-M05-BE-012 Add Celery task for queue recalculation.
- [x] CP-M05-BE-013 Add test for queue scoring.
- [x] CP-M05-BE-014 Add test for queue recalculation.

### Frontend Tasks

- [x] CP-M05-FE-001 Add mood compatibility display to queue item card.
- [x] CP-M05-FE-002 Add intensity display to queue item card.
- [x] CP-M05-FE-003 Add complexity display to queue item card.
- [x] CP-M05-FE-004 Add commitment display to queue item card.
- [x] CP-M05-FE-005 Add Recalculate Queue button.
- [x] CP-M05-FE-006 Add queue insight card.
- [x] CP-M05-FE-007 Add queue fatigue warning card.
- [x] CP-M05-FE-008 Add low-priority archive section.
- [x] CP-M05-FE-009 Add restore from archive action.

### Integration Tasks

- [x] CP-M05-INT-001 Connect Recalculate Queue button to endpoint.
- [x] CP-M05-INT-002 Refresh queue after recalculation.
- [x] CP-M05-INT-003 Use queue v2 fields in Tonight Mode ranking.
- [x] CP-M05-INT-004 Confirm low-priority archive behavior works.

### QA Tasks

- [x] CP-M05-QA-001 Recalculate queue with multiple items.
- [x] CP-M05-QA-002 Confirm queue order changes based on scores.
- [x] CP-M05-QA-003 Confirm archived queue items do not appear in Tonight Mode.

---

## CP-M06 — Media Archaeologist

**Goal:** Help the user find deep cuts, overlooked works, and non-obvious recommendations.

### Shared / Contract Tasks

- [x] CP-M06-SH-001 Define `DiscoverySearchRequest` type.
- [x] CP-M06-SH-002 Define `DiscoveryResult` type.
- [x] CP-M06-SH-003 Define `DiscoveryTrail` type.
- [x] CP-M06-SH-004 Define `DiscoveryReason` type.
- [x] CP-M06-SH-005 Document Media Archaeologist behavior.

### Backend Tasks

- [x] CP-M06-BE-001 Create discovery app.
- [x] CP-M06-BE-002 Create DiscoveryTrail model.
- [x] CP-M06-BE-003 Add owner/user foreign key.
- [x] CP-M06-BE-004 Add trail name field.
- [x] CP-M06-BE-005 Add trail theme field.
- [x] CP-M06-BE-006 Add trail description field.
- [x] CP-M06-BE-007 Add source media item foreign key nullable.
- [x] CP-M06-BE-008 Add result items JSON field.
- [x] CP-M06-BE-009 Add created at field.
- [x] CP-M06-BE-010 Create discovery service module.
- [x] CP-M06-BE-011 Implement underexplored media type detection.
- [x] CP-M06-BE-012 Implement underexplored era detection.
- [x] CP-M06-BE-013 Implement underexplored country/language detection.
- [x] CP-M06-BE-014 Implement creator-adjacent discovery logic.
- [x] CP-M06-BE-015 Implement theme-adjacent discovery logic.
- [x] CP-M06-BE-016 Implement obscure/deep-cut scoring placeholder.
- [x] CP-M06-BE-017 Create discovery generate endpoint.
- [x] CP-M06-BE-018 Create discovery trails list endpoint.
- [x] CP-M06-BE-019 Create discovery trail detail endpoint.
- [x] CP-M06-BE-020 Create save discovery trail endpoint.
- [x] CP-M06-BE-021 Add test for underexplored type detection.
- [x] CP-M06-BE-022 Add test for discovery trail creation.

### Frontend Tasks

- [x] CP-M06-FE-001 Create discovery API client file.
- [x] CP-M06-FE-002 Create Media Archaeologist page skeleton.
- [x] CP-M06-FE-003 Add page title.
- [x] CP-M06-FE-004 Add discovery mode selector.
- [x] CP-M06-FE-005 Add deep-cut search form.
- [x] CP-M06-FE-006 Add preferred medium selector.
- [x] CP-M06-FE-007 Add era selector.
- [x] CP-M06-FE-008 Add country/language selector.
- [x] CP-M06-FE-009 Add theme input.
- [x] CP-M06-FE-010 Add Generate Discovery Trail button.
- [x] CP-M06-FE-011 Create discovery result card.
- [x] CP-M06-FE-012 Add why this expands your taste section.
- [x] CP-M06-FE-013 Add why it may fail section.
- [x] CP-M06-FE-014 Add Add To Queue button.
- [x] CP-M06-FE-015 Add Save Trail button.
- [x] CP-M06-FE-016 Add saved trails list.
- [x] CP-M06-FE-017 Add loading state.
- [x] CP-M06-FE-018 Add empty state.
- [x] CP-M06-FE-019 Add error state.

### Integration Tasks

- [x] CP-M06-INT-001 Connect discovery form to generate endpoint.
- [x] CP-M06-INT-002 Connect Add To Queue from discovery result.
- [x] CP-M06-INT-003 Connect Save Trail button to save endpoint.
- [x] CP-M06-INT-004 Load saved discovery trails.

### QA Tasks

- [x] CP-M06-QA-001 Generate discovery trail with no filters.
- [x] CP-M06-QA-002 Generate discovery trail with media type filter.
- [x] CP-M06-QA-003 Save a discovery trail.
- [x] CP-M06-QA-004 Add discovery result to queue.

---

## CP-M07 — Narrative DNA Analyzer

**Goal:** Analyze works by story structure, themes, pacing, characters, and emotional effect.

### Shared / Contract Tasks

- [x] CP-M07-SH-001 Define `NarrativeDNA` type.
- [x] CP-M07-SH-002 Define `NarrativeTrait` type.
- [x] CP-M07-SH-003 Define `NarrativeAnalysisRequest` type.
- [x] CP-M07-SH-004 Define `NarrativeAnalysisResult` type.
- [x] CP-M07-SH-005 Document Narrative DNA trait definitions.

### Backend Tasks

- [x] CP-M07-BE-001 Create narrative app.
- [x] CP-M07-BE-002 Create NarrativeAnalysis model.
- [x] CP-M07-BE-003 Add owner/user foreign key.
- [x] CP-M07-BE-004 Add media item foreign key.
- [x] CP-M07-BE-005 Add analysis status field.
- [x] CP-M07-BE-006 Add character complexity score.
- [x] CP-M07-BE-007 Add plot complexity score.
- [x] CP-M07-BE-008 Add pacing density score.
- [x] CP-M07-BE-009 Add thematic weight score.
- [x] CP-M07-BE-010 Add moral ambiguity score.
- [x] CP-M07-BE-011 Add atmosphere score.
- [x] CP-M07-BE-012 Add ending dependency score.
- [x] CP-M07-BE-013 Add trope freshness score.
- [x] CP-M07-BE-014 Add analysis summary field.
- [x] CP-M07-BE-015 Add extracted traits JSON field.
- [x] CP-M07-BE-016 Add evidence notes field.
- [x] CP-M07-BE-017 Create migration for NarrativeAnalysis.
- [x] CP-M07-BE-018 Create narrative analysis serializer.
- [x] CP-M07-BE-019 Create narrative analysis service.
- [x] CP-M07-BE-020 Create manual analysis generation from user notes.
- [x] CP-M07-BE-021 Create optional AI provider abstraction.
- [x] CP-M07-BE-022 Create narrative analysis request endpoint.
- [x] CP-M07-BE-023 Create narrative analysis detail endpoint.
- [x] CP-M07-BE-024 Create Celery task for narrative analysis.
- [x] CP-M07-BE-025 Add test for manual analysis generation.
- [x] CP-M07-BE-026 Add test for analysis request endpoint.
- [x] CP-M07-BE-027 Add test for analysis status transitions.

### Frontend Tasks

- [x] CP-M07-FE-001 Create narrative API client file.
- [x] CP-M07-FE-002 Add Narrative DNA tab to Media Detail page.
- [x] CP-M07-FE-003 Create narrative trait score grid.
- [x] CP-M07-FE-004 Add character complexity display.
- [x] CP-M07-FE-005 Add plot complexity display.
- [x] CP-M07-FE-006 Add pacing density display.
- [x] CP-M07-FE-007 Add thematic weight display.
- [x] CP-M07-FE-008 Add moral ambiguity display.
- [x] CP-M07-FE-009 Add atmosphere display.
- [x] CP-M07-FE-010 Add ending dependency display.
- [x] CP-M07-FE-011 Add trope freshness display.
- [x] CP-M07-FE-012 Add Request Analysis button.
- [x] CP-M07-FE-013 Add analysis status badge.
- [x] CP-M07-FE-014 Add analysis summary section.
- [x] CP-M07-FE-015 Add extracted traits section.
- [x] CP-M07-FE-016 Add evidence notes section.
- [x] CP-M07-FE-017 Add loading state while analysis is running.
- [x] CP-M07-FE-018 Add empty state before analysis.
- [x] CP-M07-FE-019 Add error state for failed analysis.

### Integration Tasks

- [x] CP-M07-INT-001 Connect Request Analysis button to analysis endpoint.
- [x] CP-M07-INT-002 Poll or refresh analysis status.
- [x] CP-M07-INT-003 Display completed analysis on Media Detail page.
- [x] CP-M07-INT-004 Use narrative DNA fields in Candidate Evaluator.
- [x] CP-M07-INT-005 Use narrative DNA fields in TasteGraph rebuild.

### QA Tasks

- [x] CP-M07-QA-001 Request narrative analysis for media with notes.
- [x] CP-M07-QA-002 Confirm analysis status updates.
- [x] CP-M07-QA-003 Confirm completed analysis appears in UI.
- [x] CP-M07-QA-004 Confirm Candidate Evaluator uses narrative traits.

---

## CP-M08 — Critic Council

**Goal:** Add a multi-perspective recommendation interface that debates decisions.

### Shared / Contract Tasks

- [ ] CP-M08-SH-001 Define `CriticPersona` type.
- [ ] CP-M08-SH-002 Define `CriticOpinion` type.
- [ ] CP-M08-SH-003 Define `CouncilSession` type.
- [ ] CP-M08-SH-004 Define `CouncilFinalDecision` type.
- [ ] CP-M08-SH-005 Document critic persona behavior.

### Backend Tasks

- [ ] CP-M08-BE-001 Create council app.
- [ ] CP-M08-BE-002 Create CriticPersona model.
- [ ] CP-M08-BE-003 Add name field.
- [ ] CP-M08-BE-004 Add role field.
- [ ] CP-M08-BE-005 Add description field.
- [ ] CP-M08-BE-006 Add weight field.
- [ ] CP-M08-BE-007 Add is enabled field.
- [ ] CP-M08-BE-008 Create CouncilSession model.
- [ ] CP-M08-BE-009 Add owner/user foreign key.
- [ ] CP-M08-BE-010 Add candidate foreign key nullable.
- [ ] CP-M08-BE-011 Add media item foreign key nullable.
- [ ] CP-M08-BE-012 Add prompt/context field.
- [ ] CP-M08-BE-013 Add critic opinions JSON field.
- [ ] CP-M08-BE-014 Add final decision field.
- [ ] CP-M08-BE-015 Add final explanation field.
- [ ] CP-M08-BE-016 Seed default Ruthless Critic persona.
- [ ] CP-M08-BE-017 Seed default Historian persona.
- [ ] CP-M08-BE-018 Seed default Modern Defender persona.
- [ ] CP-M08-BE-019 Seed default Anime Specialist persona.
- [ ] CP-M08-BE-020 Seed default Literary Editor persona.
- [ ] CP-M08-BE-021 Seed default Mood Doctor persona.
- [ ] CP-M08-BE-022 Seed default Wildcard persona.
- [ ] CP-M08-BE-023 Create council generation service.
- [ ] CP-M08-BE-024 Create council session endpoint.
- [ ] CP-M08-BE-025 Create critic personas list endpoint.
- [ ] CP-M08-BE-026 Create critic persona update endpoint.
- [ ] CP-M08-BE-027 Add test for default personas.
- [ ] CP-M08-BE-028 Add test for council session generation.

### Frontend Tasks

- [ ] CP-M08-FE-001 Create council API client file.
- [ ] CP-M08-FE-002 Create Critic Council page skeleton.
- [ ] CP-M08-FE-003 Add page title.
- [ ] CP-M08-FE-004 Add council prompt form.
- [ ] CP-M08-FE-005 Add candidate selector.
- [ ] CP-M08-FE-006 Add media item selector.
- [ ] CP-M08-FE-007 Add Run Council button.
- [ ] CP-M08-FE-008 Create critic opinion card.
- [ ] CP-M08-FE-009 Add Ruthless Critic opinion display.
- [ ] CP-M08-FE-010 Add Historian opinion display.
- [ ] CP-M08-FE-011 Add Modern Defender opinion display.
- [ ] CP-M08-FE-012 Add Anime Specialist opinion display.
- [ ] CP-M08-FE-013 Add Literary Editor opinion display.
- [ ] CP-M08-FE-014 Add Mood Doctor opinion display.
- [ ] CP-M08-FE-015 Add Wildcard opinion display.
- [ ] CP-M08-FE-016 Add final council decision card.
- [ ] CP-M08-FE-017 Add Add Decision To Candidate button.
- [ ] CP-M08-FE-018 Add critic settings section.
- [ ] CP-M08-FE-019 Add enable/disable critic toggle.
- [ ] CP-M08-FE-020 Add critic weight control.

### Integration Tasks

- [ ] CP-M08-INT-001 Connect Run Council button to council endpoint.
- [ ] CP-M08-INT-002 Display critic opinions in correct order.
- [ ] CP-M08-INT-003 Connect critic settings to update endpoint.
- [ ] CP-M08-INT-004 Attach council result to candidate if selected.
- [ ] CP-M08-INT-005 Show council result from Candidate detail page.

### QA Tasks

- [ ] CP-M08-QA-001 Run council on a candidate.
- [ ] CP-M08-QA-002 Run council on a media item.
- [ ] CP-M08-QA-003 Disable a critic and rerun council.
- [ ] CP-M08-QA-004 Confirm final decision is visible and actionable.

---

## CP-M09 — Taste Evolution Journal

**Goal:** Track how the user's taste changes over time.

### Shared / Contract Tasks

- [ ] CP-M09-SH-001 Define `TasteEvolutionSnapshot` type.
- [ ] CP-M09-SH-002 Define `TasteTrend` type.
- [ ] CP-M09-SH-003 Define `TasteChangeInsight` type.
- [ ] CP-M09-SH-004 Document taste evolution rules.

### Backend Tasks

- [ ] CP-M09-BE-001 Create evolution app.
- [ ] CP-M09-BE-002 Create TasteEvolutionSnapshot model.
- [ ] CP-M09-BE-003 Add owner/user foreign key.
- [ ] CP-M09-BE-004 Add snapshot period field.
- [ ] CP-M09-BE-005 Add snapshot date field.
- [ ] CP-M09-BE-006 Add aggregate data JSON field.
- [ ] CP-M09-BE-007 Add insights JSON field.
- [ ] CP-M09-BE-008 Create snapshot generation service.
- [ ] CP-M09-BE-009 Compute rating trend by month.
- [ ] CP-M09-BE-010 Compute media type trend by month.
- [ ] CP-M09-BE-011 Compute genericness tolerance trend.
- [ ] CP-M09-BE-012 Compute regret trend.
- [ ] CP-M09-BE-013 Compute completion fatigue trend.
- [ ] CP-M09-BE-014 Compute favorite dimension trend.
- [ ] CP-M09-BE-015 Create generate evolution snapshot endpoint.
- [ ] CP-M09-BE-016 Create evolution timeline endpoint.
- [ ] CP-M09-BE-017 Add Celery scheduled task placeholder for monthly snapshot.
- [ ] CP-M09-BE-018 Add test for snapshot generation.
- [ ] CP-M09-BE-019 Add test for empty evolution timeline.

### Frontend Tasks

- [ ] CP-M09-FE-001 Create evolution API client file.
- [ ] CP-M09-FE-002 Create Taste Evolution page skeleton.
- [ ] CP-M09-FE-003 Add page title.
- [ ] CP-M09-FE-004 Add Generate Snapshot button.
- [ ] CP-M09-FE-005 Add taste timeline section.
- [ ] CP-M09-FE-006 Add rating trend display.
- [ ] CP-M09-FE-007 Add medium trend display.
- [ ] CP-M09-FE-008 Add genericness tolerance trend display.
- [ ] CP-M09-FE-009 Add regret trend display.
- [ ] CP-M09-FE-010 Add completion fatigue trend display.
- [ ] CP-M09-FE-011 Add current taste change insights card.
- [ ] CP-M09-FE-012 Add snapshot history list.
- [ ] CP-M09-FE-013 Add loading state.
- [ ] CP-M09-FE-014 Add empty state.
- [ ] CP-M09-FE-015 Add error state.

### Integration Tasks

- [ ] CP-M09-INT-001 Connect page to evolution timeline endpoint.
- [ ] CP-M09-INT-002 Connect Generate Snapshot button to endpoint.
- [ ] CP-M09-INT-003 Revalidate timeline after snapshot generation.
- [ ] CP-M09-INT-004 Show latest taste change insight on Dashboard.

### QA Tasks

- [ ] CP-M09-QA-001 Generate snapshot with empty data.
- [ ] CP-M09-QA-002 Generate snapshot with multiple completed works.
- [ ] CP-M09-QA-003 Confirm timeline renders snapshots.
- [ ] CP-M09-QA-004 Confirm Dashboard shows latest insight.

---

## CP-M10 — Completion Detox System

**Goal:** Help the user stop wasting time on mediocre or low-value media.

### Shared / Contract Tasks

- [ ] CP-M10-SH-001 Define `DetoxRule` type.
- [ ] CP-M10-SH-002 Define `DetoxDecision` type.
- [ ] CP-M10-SH-003 Define `TimeSavedEntry` type.
- [ ] CP-M10-SH-004 Document Completion Detox behavior.

### Backend Tasks

- [ ] CP-M10-BE-001 Create detox app.
- [ ] CP-M10-BE-002 Create DetoxRule model.
- [ ] CP-M10-BE-003 Add owner/user foreign key.
- [ ] CP-M10-BE-004 Add rule name field.
- [ ] CP-M10-BE-005 Add rule description field.
- [ ] CP-M10-BE-006 Add media type field nullable.
- [ ] CP-M10-BE-007 Add sample limit field.
- [ ] CP-M10-BE-008 Add condition JSON field.
- [ ] CP-M10-BE-009 Add is enabled field.
- [ ] CP-M10-BE-010 Create DetoxDecision model.
- [ ] CP-M10-BE-011 Add media item foreign key.
- [ ] CP-M10-BE-012 Add decision field.
- [ ] CP-M10-BE-013 Add reason field.
- [ ] CP-M10-BE-014 Add estimated time saved minutes field.
- [ ] CP-M10-BE-015 Add created at field.
- [ ] CP-M10-BE-016 Seed default movie sample rule.
- [ ] CP-M10-BE-017 Seed default TV episode sample rule.
- [ ] CP-M10-BE-018 Seed default anime episode sample rule.
- [ ] CP-M10-BE-019 Seed default novel page/sample rule.
- [ ] CP-M10-BE-020 Create detox evaluation service.
- [ ] CP-M10-BE-021 Create detox evaluate endpoint.
- [ ] CP-M10-BE-022 Create detox rules endpoint.
- [ ] CP-M10-BE-023 Create detox decision list endpoint.
- [ ] CP-M10-BE-024 Create time saved summary endpoint.
- [ ] CP-M10-BE-025 Add test for detox rule seed.
- [ ] CP-M10-BE-026 Add test for detox evaluation.
- [ ] CP-M10-BE-027 Add test for time saved summary.

### Frontend Tasks

- [ ] CP-M10-FE-001 Create detox API client file.
- [ ] CP-M10-FE-002 Create Completion Detox page skeleton.
- [ ] CP-M10-FE-003 Add page title.
- [ ] CP-M10-FE-004 Add time saved metric card.
- [ ] CP-M10-FE-005 Add active detox rules section.
- [ ] CP-M10-FE-006 Add rule toggle controls.
- [ ] CP-M10-FE-007 Add Detox Evaluate form.
- [ ] CP-M10-FE-008 Add media item selector to form.
- [ ] CP-M10-FE-009 Add current progress input.
- [ ] CP-M10-FE-010 Add current motivation input.
- [ ] CP-M10-FE-011 Add Evaluate Drop/Pause button.
- [ ] CP-M10-FE-012 Add detox decision result card.
- [ ] CP-M10-FE-013 Add Mark As Dropped button.
- [ ] CP-M10-FE-014 Add Mark As Paused button.
- [ ] CP-M10-FE-015 Add Continue Anyway button.
- [ ] CP-M10-FE-016 Add decision history list.

### Integration Tasks

- [ ] CP-M10-INT-001 Connect Detox page to rules endpoint.
- [ ] CP-M10-INT-002 Connect evaluation form to detox evaluate endpoint.
- [ ] CP-M10-INT-003 Connect Mark As Dropped to media status update.
- [ ] CP-M10-INT-004 Connect Mark As Paused to media status update.
- [ ] CP-M10-INT-005 Connect time saved metric to summary endpoint.
- [ ] CP-M10-INT-006 Show detox warning on Media Detail page.

### QA Tasks

- [ ] CP-M10-QA-001 Evaluate a show for dropping.
- [ ] CP-M10-QA-002 Mark a media item as dropped from detox decision.
- [ ] CP-M10-QA-003 Confirm time saved metric increases.
- [ ] CP-M10-QA-004 Disable a detox rule and confirm behavior changes.

---

## CP-M11 — Personal Canon Builder

**Goal:** Let the user create curated seasons/programs of exploration.

### Shared / Contract Tasks

- [ ] CP-M11-SH-001 Define `CanonSeason` type.
- [ ] CP-M11-SH-002 Define `CanonSeasonItem` type.
- [ ] CP-M11-SH-003 Define `CanonTheme` type.
- [ ] CP-M11-SH-004 Document Canon Builder behavior.

### Backend Tasks

- [ ] CP-M11-BE-001 Create canon app.
- [ ] CP-M11-BE-002 Create CanonSeason model.
- [ ] CP-M11-BE-003 Add owner/user foreign key.
- [ ] CP-M11-BE-004 Add title field.
- [ ] CP-M11-BE-005 Add theme field.
- [ ] CP-M11-BE-006 Add description field.
- [ ] CP-M11-BE-007 Add status field.
- [ ] CP-M11-BE-008 Add start date field.
- [ ] CP-M11-BE-009 Add end date field.
- [ ] CP-M11-BE-010 Create CanonSeasonItem model.
- [ ] CP-M11-BE-011 Add season foreign key.
- [ ] CP-M11-BE-012 Add media item foreign key nullable.
- [ ] CP-M11-BE-013 Add candidate foreign key nullable.
- [ ] CP-M11-BE-014 Add title snapshot field.
- [ ] CP-M11-BE-015 Add order field.
- [ ] CP-M11-BE-016 Add reason included field.
- [ ] CP-M11-BE-017 Add what to pay attention to field.
- [ ] CP-M11-BE-018 Add completion status field.
- [ ] CP-M11-BE-019 Create canon serializers.
- [ ] CP-M11-BE-020 Create seasons list endpoint.
- [ ] CP-M11-BE-021 Create season create endpoint.
- [ ] CP-M11-BE-022 Create season detail endpoint.
- [ ] CP-M11-BE-023 Create season update endpoint.
- [ ] CP-M11-BE-024 Create season delete endpoint.
- [ ] CP-M11-BE-025 Create season item add endpoint.
- [ ] CP-M11-BE-026 Create season item update endpoint.
- [ ] CP-M11-BE-027 Create season item reorder endpoint.
- [ ] CP-M11-BE-028 Create season item delete endpoint.
- [ ] CP-M11-BE-029 Add test for season creation.
- [ ] CP-M11-BE-030 Add test for season item reorder.

### Frontend Tasks

- [ ] CP-M11-FE-001 Create canon API client file.
- [ ] CP-M11-FE-002 Create Personal Canon page skeleton.
- [ ] CP-M11-FE-003 Add page title.
- [ ] CP-M11-FE-004 Add Create Season button.
- [ ] CP-M11-FE-005 Create season card component.
- [ ] CP-M11-FE-006 Add season status badge.
- [ ] CP-M11-FE-007 Add season progress display.
- [ ] CP-M11-FE-008 Create season form modal.
- [ ] CP-M11-FE-009 Add title field to season form.
- [ ] CP-M11-FE-010 Add theme field to season form.
- [ ] CP-M11-FE-011 Add description textarea.
- [ ] CP-M11-FE-012 Add Season Detail page skeleton.
- [ ] CP-M11-FE-013 Add season header.
- [ ] CP-M11-FE-014 Add season item list.
- [ ] CP-M11-FE-015 Create season item card.
- [ ] CP-M11-FE-016 Add reason included display.
- [ ] CP-M11-FE-017 Add what to pay attention to display.
- [ ] CP-M11-FE-018 Add Add Item button.
- [ ] CP-M11-FE-019 Add reorder controls.
- [ ] CP-M11-FE-020 Add mark item complete button.
- [ ] CP-M11-FE-021 Add season reflection section.

### Integration Tasks

- [ ] CP-M11-INT-001 Connect Canon page to seasons list endpoint.
- [ ] CP-M11-INT-002 Connect Create Season form to create endpoint.
- [ ] CP-M11-INT-003 Connect Season Detail page to detail endpoint.
- [ ] CP-M11-INT-004 Connect Add Item button to item add endpoint.
- [ ] CP-M11-INT-005 Connect reorder controls to reorder endpoint.
- [ ] CP-M11-INT-006 Connect mark complete button to item update endpoint.

### QA Tasks

- [ ] CP-M11-QA-001 Create a canon season.
- [ ] CP-M11-QA-002 Add three items to season.
- [ ] CP-M11-QA-003 Reorder season items.
- [ ] CP-M11-QA-004 Mark season item complete.
- [ ] CP-M11-QA-005 Confirm season progress updates.

---

## CP-M12 — Cross-Medium Adaptation Intelligence

**Goal:** Track and evaluate relationships between source material and adaptations.

### Shared / Contract Tasks

- [ ] CP-M12-SH-001 Define `AdaptationRelation` type.
- [ ] CP-M12-SH-002 Define `AdaptationPath` type.
- [ ] CP-M12-SH-003 Define `ExperienceOrderRecommendation` type.
- [ ] CP-M12-SH-004 Document adaptation intelligence behavior.

### Backend Tasks

- [ ] CP-M12-BE-001 Create adaptations app.
- [ ] CP-M12-BE-002 Create AdaptationRelation model.
- [ ] CP-M12-BE-003 Add owner/user foreign key.
- [ ] CP-M12-BE-004 Add source media item foreign key.
- [ ] CP-M12-BE-005 Add adaptation media item foreign key.
- [ ] CP-M12-BE-006 Add relation type field.
- [ ] CP-M12-BE-007 Add completeness field.
- [ ] CP-M12-BE-008 Add faithfulness score field.
- [ ] CP-M12-BE-009 Add pacing preservation score field.
- [ ] CP-M12-BE-010 Add soul preservation score field.
- [ ] CP-M12-BE-011 Add recommended experience order field.
- [ ] CP-M12-BE-012 Add notes field.
- [ ] CP-M12-BE-013 Create adaptation serializers.
- [ ] CP-M12-BE-014 Create relation list endpoint.
- [ ] CP-M12-BE-015 Create relation create endpoint.
- [ ] CP-M12-BE-016 Create relation update endpoint.
- [ ] CP-M12-BE-017 Create relation delete endpoint.
- [ ] CP-M12-BE-018 Create adaptation path recommendation service.
- [ ] CP-M12-BE-019 Create path recommendation endpoint.
- [ ] CP-M12-BE-020 Add test for relation creation.
- [ ] CP-M12-BE-021 Add test for path recommendation.

### Frontend Tasks

- [ ] CP-M12-FE-001 Create adaptations API client file.
- [ ] CP-M12-FE-002 Add Adaptations tab to Media Detail page.
- [ ] CP-M12-FE-003 Add relation list section.
- [ ] CP-M12-FE-004 Create adaptation relation card.
- [ ] CP-M12-FE-005 Add source/adaptation label display.
- [ ] CP-M12-FE-006 Add faithfulness score display.
- [ ] CP-M12-FE-007 Add pacing preservation score display.
- [ ] CP-M12-FE-008 Add soul preservation score display.
- [ ] CP-M12-FE-009 Add recommended order display.
- [ ] CP-M12-FE-010 Add Add Adaptation Relation button.
- [ ] CP-M12-FE-011 Create adaptation relation modal.
- [ ] CP-M12-FE-012 Add source selector.
- [ ] CP-M12-FE-013 Add adaptation selector.
- [ ] CP-M12-FE-014 Add relation type selector.
- [ ] CP-M12-FE-015 Add scores fields.
- [ ] CP-M12-FE-016 Add notes textarea.
- [ ] CP-M12-FE-017 Add Get Experience Path button.
- [ ] CP-M12-FE-018 Add path recommendation card.

### Integration Tasks

- [ ] CP-M12-INT-001 Connect relation modal to create endpoint.
- [ ] CP-M12-INT-002 Connect relation list to list endpoint.
- [ ] CP-M12-INT-003 Connect Get Experience Path button to recommendation endpoint.
- [ ] CP-M12-INT-004 Display path recommendation on Media Detail page.

### QA Tasks

- [ ] CP-M12-QA-001 Create novel-to-show adaptation relation.
- [ ] CP-M12-QA-002 Create anime-to-manga/source relation if applicable.
- [ ] CP-M12-QA-003 Generate experience path recommendation.
- [ ] CP-M12-QA-004 Confirm adaptations appear on both related media detail pages.

---

## CP-M13 — Advanced Import, Export, And Data Portability

**Goal:** Harden MVP portability with async processing, rollback, restore testing, richer validation, and larger library support.

### Shared / Contract Tasks

- [ ] CP-M13-SH-001 Extend import job type with async progress fields.
- [ ] CP-M13-SH-002 Extend export job type with async progress fields.
- [ ] CP-M13-SH-003 Define import rollback result type.
- [ ] CP-M13-SH-004 Document advanced import/export limits and restore steps.

### Backend Tasks

- [ ] CP-M13-BE-001 Add uploaded file storage reference to ImportBatch.
- [ ] CP-M13-BE-002 Add import rollback metadata.
- [ ] CP-M13-BE-003 Add export file retention metadata.
- [ ] CP-M13-BE-004 Add duplicate detection across imports.
- [ ] CP-M13-BE-005 Add import rollback service.
- [ ] CP-M13-BE-006 Add export restore validation service.
- [ ] CP-M13-BE-007 Add Celery task for large import execution.
- [ ] CP-M13-BE-008 Add Celery task for large export generation.
- [ ] CP-M13-BE-009 Connect import/export jobs to BackgroundJob records.
- [ ] CP-M13-BE-010 Add import rollback endpoint.
- [ ] CP-M13-BE-011 Add export restore dry-run endpoint.
- [ ] CP-M13-BE-012 Add file size and file type validation.
- [ ] CP-M13-BE-013 Add test for duplicate import detection.
- [ ] CP-M13-BE-014 Add test for import rollback.
- [ ] CP-M13-BE-015 Add test for large import job progress.
- [ ] CP-M13-BE-016 Add test for export restore dry run.

### Frontend Tasks

- [ ] CP-M13-FE-001 Add import history list.
- [ ] CP-M13-FE-002 Add import rollback action.
- [ ] CP-M13-FE-003 Add import job progress display.
- [ ] CP-M13-FE-004 Add export job progress display.
- [ ] CP-M13-FE-005 Add duplicate warning review UI.
- [ ] CP-M13-FE-006 Add restore dry-run result display.
- [ ] CP-M13-FE-007 Add file size/type error states.

### Integration Tasks

- [ ] CP-M13-INT-001 Connect import/export jobs to shared job status UI.
- [ ] CP-M13-INT-002 Connect rollback action to rollback endpoint.
- [ ] CP-M13-INT-003 Connect restore dry run to validation endpoint.
- [ ] CP-M13-INT-004 Refresh Library after rollback completes.

### QA Tasks

- [ ] CP-M13-QA-001 Import at least 500 media items.
- [ ] CP-M13-QA-002 Roll back an import and confirm records are removed.
- [ ] CP-M13-QA-003 Run export restore dry run.
- [ ] CP-M13-QA-004 Confirm invalid file types are rejected clearly.
- [ ] CP-M13-QA-005 Confirm import/export manual test doc covers rollback and restore.

---

## CP-M14 — Advanced Search, Filters, And Command Palette

**Goal:** Make CanonOS fast to navigate and search.

### Backend Tasks

- [ ] CP-M14-BE-001 Add unified search endpoint.
- [ ] CP-M14-BE-002 Search media items by title.
- [ ] CP-M14-BE-003 Search candidates by title.
- [ ] CP-M14-BE-004 Search queue items by title.
- [ ] CP-M14-BE-005 Search canon seasons by title/theme.
- [ ] CP-M14-BE-006 Add advanced media filters endpoint support.
- [ ] CP-M14-BE-007 Add filter by rating range.
- [ ] CP-M14-BE-008 Add filter by genericness range.
- [ ] CP-M14-BE-009 Add filter by regret score range.
- [ ] CP-M14-BE-010 Add filter by completion date range.
- [ ] CP-M14-BE-011 Add filter by creator.
- [ ] CP-M14-BE-012 Add test for unified search.
- [ ] CP-M14-BE-013 Add test for advanced filters.

### Frontend Tasks

- [ ] CP-M14-FE-001 Create search API client file.
- [ ] CP-M14-FE-002 Create command palette component.
- [ ] CP-M14-FE-003 Add keyboard shortcut to open command palette.
- [ ] CP-M14-FE-004 Add global search input inside command palette.
- [ ] CP-M14-FE-005 Add media result row.
- [ ] CP-M14-FE-006 Add candidate result row.
- [ ] CP-M14-FE-007 Add queue result row.
- [ ] CP-M14-FE-008 Add canon season result row.
- [ ] CP-M14-FE-009 Add navigation action from result row.
- [ ] CP-M14-FE-010 Add advanced filters drawer to Library page.
- [ ] CP-M14-FE-011 Add rating range filter.
- [ ] CP-M14-FE-012 Add genericness range filter.
- [ ] CP-M14-FE-013 Add regret score range filter.
- [ ] CP-M14-FE-014 Add completion date range filter.
- [ ] CP-M14-FE-015 Add creator filter.
- [ ] CP-M14-FE-016 Add Clear Filters button.
- [ ] CP-M14-FE-017 Add active filter chips.

### Integration Tasks

- [ ] CP-M14-INT-001 Connect command palette to unified search endpoint.
- [ ] CP-M14-INT-002 Navigate to selected media result.
- [ ] CP-M14-INT-003 Navigate to selected candidate result.
- [ ] CP-M14-INT-004 Connect advanced filters to Library endpoint.
- [ ] CP-M14-INT-005 Persist filter state in URL query parameters.

### QA Tasks

- [ ] CP-M14-QA-001 Search globally for a media item.
- [ ] CP-M14-QA-002 Search globally for a candidate.
- [ ] CP-M14-QA-003 Use command palette keyboard shortcut.
- [ ] CP-M14-QA-004 Apply advanced Library filters.
- [ ] CP-M14-QA-005 Clear advanced Library filters.

---

## CP-M15 — Notifications, Job Status, And Async UX

**Goal:** Make background jobs visible and understandable.

### Backend Tasks

- [ ] CP-M15-BE-001 Create jobs app.
- [ ] CP-M15-BE-002 Create BackgroundJob model.
- [ ] CP-M15-BE-003 Add owner/user foreign key.
- [ ] CP-M15-BE-004 Add job type field.
- [ ] CP-M15-BE-005 Add status field.
- [ ] CP-M15-BE-006 Add progress field.
- [ ] CP-M15-BE-007 Add message field.
- [ ] CP-M15-BE-008 Add result JSON field.
- [ ] CP-M15-BE-009 Add created at field.
- [ ] CP-M15-BE-010 Add completed at field.
- [ ] CP-M15-BE-011 Create job status endpoint.
- [ ] CP-M15-BE-012 Create jobs list endpoint.
- [ ] CP-M15-BE-013 Connect metadata refresh to BackgroundJob.
- [ ] CP-M15-BE-014 Connect graph rebuild to BackgroundJob.
- [ ] CP-M15-BE-015 Connect narrative analysis to BackgroundJob.
- [ ] CP-M15-BE-016 Connect import/export to BackgroundJob.
- [ ] CP-M15-BE-017 Add test for job creation.
- [ ] CP-M15-BE-018 Add test for job status endpoint.

### Frontend Tasks

- [ ] CP-M15-FE-001 Create jobs API client file.
- [ ] CP-M15-FE-002 Create `useBackgroundJob` polling hook.
- [ ] CP-M15-FE-003 Create job status badge component.
- [ ] CP-M15-FE-004 Create job progress component.
- [ ] CP-M15-FE-005 Create Jobs page skeleton.
- [ ] CP-M15-FE-006 Add jobs list table.
- [ ] CP-M15-FE-007 Add job type display.
- [ ] CP-M15-FE-008 Add job status display.
- [ ] CP-M15-FE-009 Add job progress display.
- [ ] CP-M15-FE-010 Add job result display.
- [ ] CP-M15-FE-011 Add notifications dropdown to header.
- [ ] CP-M15-FE-012 Add recent job notifications.

### Integration Tasks

- [ ] CP-M15-INT-001 Connect job status components to job endpoints.
- [ ] CP-M15-INT-002 Replace isolated job polling with shared hook.
- [ ] CP-M15-INT-003 Show job notification when graph rebuild completes.
- [ ] CP-M15-INT-004 Show job notification when narrative analysis completes.
- [ ] CP-M15-INT-005 Show job notification when import/export completes.

### QA Tasks

- [ ] CP-M15-QA-001 Start graph rebuild and track job status.
- [ ] CP-M15-QA-002 Start metadata refresh and track job status.
- [ ] CP-M15-QA-003 Start export and track job status.
- [ ] CP-M15-QA-004 Confirm completed jobs appear in notification dropdown.

---

## CP-M16 — Data Visualization And Insight Pages

**Goal:** Add useful visual insight screens while keeping them simple and readable.

### Backend Tasks

- [ ] CP-M16-BE-001 Create analytics app.
- [ ] CP-M16-BE-002 Create media consumption timeline endpoint.
- [ ] CP-M16-BE-003 Create rating distribution endpoint.
- [ ] CP-M16-BE-004 Create media type distribution endpoint.
- [ ] CP-M16-BE-005 Create dimension trend endpoint.
- [ ] CP-M16-BE-006 Create genericness vs satisfaction endpoint.
- [ ] CP-M16-BE-007 Create regret vs time cost endpoint.
- [ ] CP-M16-BE-008 Create top creators endpoint.
- [ ] CP-M16-BE-009 Create top themes endpoint.
- [ ] CP-M16-BE-010 Add test for analytics endpoints with empty data.
- [ ] CP-M16-BE-011 Add test for analytics endpoints with sample data.

### Frontend Tasks

- [ ] CP-M16-FE-001 Create analytics API client file.
- [ ] CP-M16-FE-002 Create Insights page skeleton.
- [ ] CP-M16-FE-003 Add page title.
- [ ] CP-M16-FE-004 Add consumption timeline chart component.
- [ ] CP-M16-FE-005 Add rating distribution chart component.
- [ ] CP-M16-FE-006 Add media type distribution chart component.
- [ ] CP-M16-FE-007 Add dimension trend display.
- [ ] CP-M16-FE-008 Add genericness vs satisfaction insight card.
- [ ] CP-M16-FE-009 Add regret vs time cost insight card.
- [ ] CP-M16-FE-010 Add top creators card.
- [ ] CP-M16-FE-011 Add top themes card.
- [ ] CP-M16-FE-012 Add loading state.
- [ ] CP-M16-FE-013 Add empty state.
- [ ] CP-M16-FE-014 Add error state.

### Integration Tasks

- [ ] CP-M16-INT-001 Connect Insights page to analytics endpoints.
- [ ] CP-M16-INT-002 Add Insights link to sidebar.
- [ ] CP-M16-INT-003 Link Dashboard insights preview to Insights page.

### QA Tasks

- [ ] CP-M16-QA-001 Confirm Insights page works with empty data.
- [ ] CP-M16-QA-002 Confirm Insights page works with sample data.
- [ ] CP-M16-QA-003 Confirm visualizations are readable on mobile.

---

## CP-M17 — Advanced Settings And Personalization

**Goal:** Let the user tune CanonOS to their standards and current lifestyle.

### Backend Tasks

- [ ] CP-M17-BE-001 Add recommendation formula weights to UserSettings.
- [ ] CP-M17-BE-002 Add default Tonight Mode values to UserSettings.
- [ ] CP-M17-BE-003 Add preferred recommendation strictness field.
- [ ] CP-M17-BE-004 Add allow modern exceptions field.
- [ ] CP-M17-BE-005 Add burnout sensitivity field.
- [ ] CP-M17-BE-006 Add completion detox strictness field.
- [ ] CP-M17-BE-007 Add notification preferences field.
- [ ] CP-M17-BE-008 Create migration for advanced settings.
- [ ] CP-M17-BE-009 Update settings serializer.
- [ ] CP-M17-BE-010 Update recommendation services to use advanced settings.
- [ ] CP-M17-BE-011 Add test for strictness effect on Candidate Evaluator.
- [ ] CP-M17-BE-012 Add test for allow modern exceptions effect.

### Frontend Tasks

- [ ] CP-M17-FE-001 Add Advanced Recommendation Settings section.
- [ ] CP-M17-FE-002 Add formula weight controls.
- [ ] CP-M17-FE-003 Add default Tonight Mode controls.
- [ ] CP-M17-FE-004 Add recommendation strictness control.
- [ ] CP-M17-FE-005 Add allow modern exceptions toggle.
- [ ] CP-M17-FE-006 Add burnout sensitivity control.
- [ ] CP-M17-FE-007 Add detox strictness control.
- [ ] CP-M17-FE-008 Add notification preferences controls.
- [ ] CP-M17-FE-009 Add Reset To Recommended Defaults button.
- [ ] CP-M17-FE-010 Add explanation text for each setting.

### Integration Tasks

- [ ] CP-M17-INT-001 Connect advanced settings to settings endpoint.
- [ ] CP-M17-INT-002 Confirm changed settings affect Candidate Evaluator.
- [ ] CP-M17-INT-003 Confirm changed settings affect Tonight Mode.
- [ ] CP-M17-INT-004 Confirm changed settings affect Detox decisions.

### QA Tasks

- [ ] CP-M17-QA-001 Save advanced settings.
- [ ] CP-M17-QA-002 Reset advanced settings.
- [ ] CP-M17-QA-003 Verify settings persist after refresh.
- [ ] CP-M17-QA-004 Verify settings change recommendation behavior.

---

## CP-M18 — Security, Privacy, And Data Protection

**Goal:** Protect personal media history, taste data, and private notes.

### Backend Tasks

- [ ] CP-M18-BE-001 Audit every queryset for owner/user filtering.
- [ ] CP-M18-BE-002 Add tests for cross-user access on media endpoints.
- [ ] CP-M18-BE-003 Add tests for cross-user access on candidate endpoints.
- [ ] CP-M18-BE-004 Add tests for cross-user access on queue endpoints.
- [ ] CP-M18-BE-005 Add tests for cross-user access on aftertaste endpoints.
- [ ] CP-M18-BE-006 Add tests for cross-user access on graph endpoints.
- [ ] CP-M18-BE-007 Add rate limiting for auth endpoints.
- [ ] CP-M18-BE-008 Add rate limiting for expensive generation endpoints.
- [ ] CP-M18-BE-009 Add secure cookie/session settings for production.
- [ ] CP-M18-BE-010 Add CSRF configuration if session auth is used.
- [ ] CP-M18-BE-011 Add sensitive settings validation.
- [ ] CP-M18-BE-012 Add data deletion endpoint.
- [ ] CP-M18-BE-013 Add account deletion endpoint.
- [ ] CP-M18-BE-014 Add privacy export endpoint if not covered by export module.
- [ ] CP-M18-BE-015 Add audit log model for sensitive operations.
- [ ] CP-M18-BE-016 Log account deletion request.
- [ ] CP-M18-BE-017 Log data export request.
- [ ] CP-M18-BE-018 Add test for account deletion.
- [ ] CP-M18-BE-019 Add test for data deletion.

### Frontend Tasks

- [ ] CP-M18-FE-001 Add Privacy section to Settings page.
- [ ] CP-M18-FE-002 Add Export My Data button.
- [ ] CP-M18-FE-003 Add Delete All CanonOS Data button.
- [ ] CP-M18-FE-004 Add Delete Account button.
- [ ] CP-M18-FE-005 Add strong confirmation dialog for data deletion.
- [ ] CP-M18-FE-006 Add strong confirmation dialog for account deletion.
- [ ] CP-M18-FE-007 Add visible explanation of private data stored.
- [ ] CP-M18-FE-008 Add visible explanation of external metadata usage.
- [ ] CP-M18-FE-009 Add privacy success/error toasts.

### Integration Tasks

- [ ] CP-M18-INT-001 Connect Export My Data to export endpoint.
- [ ] CP-M18-INT-002 Connect Delete All Data button to data deletion endpoint.
- [ ] CP-M18-INT-003 Connect Delete Account button to account deletion endpoint.
- [ ] CP-M18-INT-004 Redirect to registration/login after account deletion.

### QA Tasks

- [ ] CP-M18-QA-001 Confirm users cannot access each other's media.
- [ ] CP-M18-QA-002 Confirm users cannot access each other's candidates.
- [ ] CP-M18-QA-003 Confirm users cannot access each other's graph data.
- [ ] CP-M18-QA-004 Confirm export works before deletion.
- [ ] CP-M18-QA-005 Confirm data deletion removes personal records.
- [ ] CP-M18-QA-006 Confirm account deletion removes or anonymizes account.

---

## CP-M19 — Performance And Scalability

**Goal:** Keep the app fast even with thousands of media items and many analyses.

### Backend Tasks

- [ ] CP-M19-BE-001 Add pagination checks to all list endpoints.
- [ ] CP-M19-BE-002 Add select_related/prefetch_related to media list queries.
- [ ] CP-M19-BE-003 Add select_related/prefetch_related to media detail queries.
- [ ] CP-M19-BE-004 Add select_related/prefetch_related to queue queries.
- [ ] CP-M19-BE-005 Add select_related/prefetch_related to candidate queries.
- [ ] CP-M19-BE-006 Add database index review for media items.
- [ ] CP-M19-BE-007 Add database index review for scores.
- [ ] CP-M19-BE-008 Add database index review for graph nodes and edges.
- [ ] CP-M19-BE-009 Add caching to dashboard summary endpoint.
- [ ] CP-M19-BE-010 Add caching to taste profile endpoint.
- [ ] CP-M19-BE-011 Add caching to analytics endpoints.
- [ ] CP-M19-BE-012 Add cache invalidation after media changes.
- [ ] CP-M19-BE-013 Add cache invalidation after score changes.
- [ ] CP-M19-BE-014 Add cache invalidation after aftertaste changes.
- [ ] CP-M19-BE-015 Add test for pagination.
- [ ] CP-M19-BE-016 Add basic performance test with large sample dataset.

### Frontend Tasks

- [ ] CP-M19-FE-001 Add pagination controls to Library page.
- [ ] CP-M19-FE-002 Add pagination controls to Candidates page.
- [ ] CP-M19-FE-003 Add pagination controls to Aftertaste page.
- [ ] CP-M19-FE-004 Add pagination controls to Jobs page.
- [ ] CP-M19-FE-005 Add SWR deduping configuration.
- [ ] CP-M19-FE-006 Add SWR retry configuration.
- [ ] CP-M19-FE-007 Add debounced search input behavior.
- [ ] CP-M19-FE-008 Add lazy-loaded routes for major pages.
- [ ] CP-M19-FE-009 Add skeleton loading components for large lists.
- [ ] CP-M19-FE-010 Avoid rendering full large lists without pagination.

### QA Tasks

- [ ] CP-M19-QA-001 Seed at least 1000 media items.
- [ ] CP-M19-QA-002 Confirm Library page remains usable.
- [ ] CP-M19-QA-003 Confirm Dashboard loads in acceptable time.
- [ ] CP-M19-QA-004 Confirm Taste Profile loads in acceptable time.
- [ ] CP-M19-QA-005 Confirm search remains usable with large dataset.

---

## CP-M20 — Accessibility, Responsiveness, And UI Polish

**Goal:** Ensure the product feels clean, consistent, and usable.

### Frontend Tasks

- [ ] CP-M20-FE-001 Audit all pages for consistent sidebar usage.
- [ ] CP-M20-FE-002 Audit all pages for consistent header usage.
- [ ] CP-M20-FE-003 Audit all pages for consistent page title style.
- [ ] CP-M20-FE-004 Audit all pages for consistent action bar style.
- [ ] CP-M20-FE-005 Audit all buttons for clear labels.
- [ ] CP-M20-FE-006 Audit all icon-only buttons for accessible labels.
- [ ] CP-M20-FE-007 Audit all form fields for labels.
- [ ] CP-M20-FE-008 Audit all dialogs for titles.
- [ ] CP-M20-FE-009 Audit keyboard navigation in sidebar.
- [ ] CP-M20-FE-010 Audit keyboard navigation in dialogs.
- [ ] CP-M20-FE-011 Audit keyboard navigation in command palette.
- [ ] CP-M20-FE-012 Audit focus states.
- [ ] CP-M20-FE-013 Audit mobile layout for Dashboard.
- [ ] CP-M20-FE-014 Audit mobile layout for Library.
- [ ] CP-M20-FE-015 Audit mobile layout for Candidate Evaluator.
- [ ] CP-M20-FE-016 Audit mobile layout for Tonight Mode.
- [ ] CP-M20-FE-017 Audit mobile layout for Media Detail.
- [ ] CP-M20-FE-018 Audit empty states for usefulness.
- [ ] CP-M20-FE-019 Audit error states for usefulness.
- [ ] CP-M20-FE-020 Audit loading states for clarity.
- [ ] CP-M20-FE-021 Add final UI polish pass to score badges.
- [ ] CP-M20-FE-022 Add final UI polish pass to cards.
- [ ] CP-M20-FE-023 Add final UI polish pass to modals.
- [ ] CP-M20-FE-024 Add final UI polish pass to tables/lists.

### QA Tasks

- [ ] CP-M20-QA-001 Navigate entire app with keyboard only.
- [ ] CP-M20-QA-002 Confirm main dialogs are keyboard accessible.
- [ ] CP-M20-QA-003 Confirm forms have clear labels.
- [ ] CP-M20-QA-004 Confirm mobile layout works at common widths.
- [ ] CP-M20-QA-005 Confirm no page visually contradicts shared wireframe system.

---

## CP-M21 — Deployment And Infrastructure

**Goal:** Make CanonOS deployable as a complete product.

### Shared / Infra Tasks

- [ ] CP-M21-INF-001 Create Dockerfile for backend.
- [ ] CP-M21-INF-002 Create Dockerfile for frontend.
- [ ] CP-M21-INF-003 Create Dockerfile or command for Celery worker.
- [x] CP-M21-INF-004 Create local Docker Compose file.
- [x] CP-M21-INF-005 Add PostgreSQL service to Compose.
- [x] CP-M21-INF-006 Add Redis service to Compose.
- [ ] CP-M21-INF-007 Add backend service to Compose.
- [ ] CP-M21-INF-008 Add frontend service to Compose.
- [ ] CP-M21-INF-009 Add Celery worker service to Compose.
- [ ] CP-M21-INF-010 Add Celery beat service if scheduled tasks are used.
- [ ] CP-M21-INF-011 Add RabbitMQ service only if required.
- [x] CP-M21-INF-012 Add environment variable documentation for Docker.
- [ ] CP-M21-INF-013 Add production deployment checklist.
- [ ] CP-M21-INF-014 Add database backup instructions.
- [ ] CP-M21-INF-015 Add static/media file handling instructions.

### Backend Tasks

- [ ] CP-M21-BE-001 Configure production allowed hosts.
- [ ] CP-M21-BE-002 Configure production CORS.
- [ ] CP-M21-BE-003 Configure production database URL.
- [ ] CP-M21-BE-004 Configure production Redis URL.
- [ ] CP-M21-BE-005 Configure production static files.
- [ ] CP-M21-BE-006 Configure production logging.
- [ ] CP-M21-BE-007 Add health endpoint checks for database and Redis.
- [ ] CP-M21-BE-008 Add migration command to deployment docs.
- [ ] CP-M21-BE-009 Add collect static command if needed.

### Frontend Tasks

- [ ] CP-M21-FE-001 Configure production API base URL.
- [ ] CP-M21-FE-002 Add frontend production build command.
- [ ] CP-M21-FE-003 Confirm Vite build output works.
- [ ] CP-M21-FE-004 Add static hosting notes.
- [ ] CP-M21-FE-005 Add runtime environment notes if needed.

### QA Tasks

- [ ] CP-M21-QA-001 Build backend Docker image.
- [ ] CP-M21-QA-002 Build frontend Docker image.
- [ ] CP-M21-QA-003 Run full app through Docker Compose.
- [ ] CP-M21-QA-004 Confirm frontend can reach backend in Compose.
- [ ] CP-M21-QA-005 Confirm backend can reach PostgreSQL in Compose.
- [ ] CP-M21-QA-006 Confirm backend can reach Redis in Compose.
- [ ] CP-M21-QA-007 Confirm Celery worker processes a test job.
- [ ] CP-M21-QA-008 Confirm production build does not fail.

---

## CP-M22 — Full Product Regression And Final Acceptance

**Goal:** Confirm the complete product is finished and does not lack major functionality.

### Backend Regression Tasks

- [ ] CP-M22-BE-001 Run all backend tests.
- [ ] CP-M22-BE-002 Fix all failing backend tests.
- [ ] CP-M22-BE-003 Run migration from empty database.
- [ ] CP-M22-BE-004 Run seed command.
- [ ] CP-M22-BE-005 Confirm all API docs load.
- [ ] CP-M22-BE-006 Confirm all endpoints require authentication where needed.
- [ ] CP-M22-BE-007 Confirm background jobs work.
- [ ] CP-M22-BE-008 Confirm import/export works.
- [ ] CP-M22-BE-009 Confirm cache invalidation works.

### Frontend Regression Tasks

- [ ] CP-M22-FE-001 Run frontend type check.
- [ ] CP-M22-FE-002 Fix all TypeScript errors.
- [ ] CP-M22-FE-003 Run frontend build.
- [ ] CP-M22-FE-004 Fix all build errors.
- [ ] CP-M22-FE-005 Visit every sidebar route.
- [ ] CP-M22-FE-006 Visit every detail route.
- [ ] CP-M22-FE-007 Open every modal.
- [ ] CP-M22-FE-008 Submit every form with valid data.
- [ ] CP-M22-FE-009 Submit every form with invalid data.
- [ ] CP-M22-FE-010 Confirm every destructive action has confirmation.
- [ ] CP-M22-FE-011 Confirm every async job has status feedback.
- [ ] CP-M22-FE-012 Confirm every primary action has a visible result.

### Full End-To-End Acceptance Tasks

- [ ] CP-M22-E2E-001 Register a new user.
- [ ] CP-M22-E2E-002 Update user settings.
- [ ] CP-M22-E2E-003 Import sample media library.
- [ ] CP-M22-E2E-004 Attach metadata to imported media.
- [ ] CP-M22-E2E-005 Score several media items.
- [ ] CP-M22-E2E-006 Create aftertaste entries.
- [ ] CP-M22-E2E-007 Rebuild TasteGraph.
- [ ] CP-M22-E2E-008 View TasteGraph summary.
- [ ] CP-M22-E2E-009 Evaluate a candidate with Anti-Generic Filter.
- [ ] CP-M22-E2E-010 Run Critic Council on the candidate.
- [ ] CP-M22-E2E-011 Add candidate to Adaptive Queue.
- [ ] CP-M22-E2E-012 Recalculate queue.
- [ ] CP-M22-E2E-013 Generate Tonight Mode plan.
- [ ] CP-M22-E2E-014 Start recommended media.
- [ ] CP-M22-E2E-015 Run Completion Detox on a low-value item.
- [ ] CP-M22-E2E-016 Create a Personal Canon season.
- [ ] CP-M22-E2E-017 Add items to Canon season.
- [ ] CP-M22-E2E-018 Create adaptation relation.
- [ ] CP-M22-E2E-019 Generate adaptation experience path.
- [ ] CP-M22-E2E-020 Generate Media Archaeologist discovery trail.
- [ ] CP-M22-E2E-021 Save discovery trail.
- [ ] CP-M22-E2E-022 Request Narrative DNA analysis.
- [ ] CP-M22-E2E-023 Confirm analysis job completes.
- [ ] CP-M22-E2E-024 Open Taste Evolution page.
- [ ] CP-M22-E2E-025 Generate evolution snapshot.
- [ ] CP-M22-E2E-026 Open Insights page.
- [ ] CP-M22-E2E-027 Use command palette to navigate.
- [ ] CP-M22-E2E-028 Export all user data.
- [ ] CP-M22-E2E-029 Log out and log back in.
- [ ] CP-M22-E2E-030 Confirm all important data persisted.

### Final Product Sign-Off Tasks

- [ ] CP-M22-SIGN-001 Confirm product includes Library.
- [ ] CP-M22-SIGN-002 Confirm product includes Taste Profile.
- [ ] CP-M22-SIGN-003 Confirm product includes Candidate Evaluator.
- [ ] CP-M22-SIGN-004 Confirm product includes Anti-Generic Filter.
- [ ] CP-M22-SIGN-005 Confirm product includes Adaptive Queue.
- [ ] CP-M22-SIGN-006 Confirm product includes Tonight Mode.
- [ ] CP-M22-SIGN-007 Confirm product includes Aftertaste Log.
- [ ] CP-M22-SIGN-008 Confirm product includes TasteGraph.
- [ ] CP-M22-SIGN-009 Confirm product includes Media Archaeologist.
- [ ] CP-M22-SIGN-010 Confirm product includes Narrative DNA Analyzer.
- [ ] CP-M22-SIGN-011 Confirm product includes Critic Council.
- [ ] CP-M22-SIGN-012 Confirm product includes Taste Evolution Journal.
- [ ] CP-M22-SIGN-013 Confirm product includes Completion Detox.
- [ ] CP-M22-SIGN-014 Confirm product includes Personal Canon Builder.
- [ ] CP-M22-SIGN-015 Confirm product includes Cross-Medium Adaptation Intelligence.
- [ ] CP-M22-SIGN-016 Confirm product includes import/export.
- [ ] CP-M22-SIGN-017 Confirm product includes full API docs.
- [ ] CP-M22-SIGN-018 Confirm product includes background jobs.
- [ ] CP-M22-SIGN-019 Confirm product includes production deployment path.
- [ ] CP-M22-SIGN-020 Confirm final README explains complete product.
- [ ] CP-M22-SIGN-021 Confirm Last Completed Task Summary is updated with final completion summary.

---

# 7. Suggested Execution Rhythm For Codex

The following rhythm should be used for each coding session.

- [x] SESSION-001 Read the current milestone section.
- [x] SESSION-002 Read the Last Completed Task Summary at the bottom of this document.
- [x] SESSION-003 Select the next unchecked task in the current milestone.
- [x] SESSION-004 Complete exactly that task or a very small group of tightly related tasks.
- [x] SESSION-005 Run the smallest relevant check during development, then run all available verification gates before marking implementation complete.
- [x] SESSION-006 Mark completed tasks with `[x]`.
- [x] SESSION-007 Update the Last Completed Task Summary.
- [x] SESSION-008 Mention any blockers under the relevant task using `[!]`.

---

# 8. Definition Of Done

## 8.1 MVP Definition Of Done

The MVP is done only when:

- [ ] The app runs locally.
- [ ] A user can register, log in, and log out.
- [ ] A user can add, edit, delete, search, and filter media.
- [ ] A user can score media by custom taste dimensions.
- [x] A user can create aftertaste entries.
- [x] A user can evaluate a candidate.
- [x] A user can add candidates to queue.
- [x] A user can generate a Tonight Mode recommendation.
- [x] A user can view a basic Taste Profile.
- [ ] A user can view a useful Dashboard.
- [x] A user can update basic Settings.
- [ ] A user can import a CSV or JSON media history with validation preview.
- [ ] A user can export all owned data as JSON.
- [ ] A user can export media library and ratings as CSV.
- [ ] API docs are available through Swagger/OpenAPI and Scalar.
- [ ] The frontend uses the shared layout consistently.
- [ ] The backend prevents cross-user data leakage.
- [ ] Manual test docs exist for all MVP user-facing features.
- [ ] Lint, typecheck, tests, build, and E2E all pass.
- [ ] The README explains how to run the MVP.

## 8.2 Complete Product Definition Of Done

The complete product is done only when:

- [ ] All MVP features remain working.
- [ ] TasteGraph works and can be rebuilt.
- [ ] Anti-Generic Filter works and affects candidate evaluation.
- [ ] Adaptive Queue works and affects Tonight Mode.
- [ ] Media Archaeologist can generate discovery trails.
- [ ] Narrative DNA Analyzer can store and display narrative analysis.
- [ ] Critic Council can debate candidates and media items.
- [ ] Taste Evolution Journal can generate snapshots.
- [ ] Completion Detox can recommend dropping/pausing and track time saved.
- [ ] Personal Canon Builder can create exploration seasons.
- [ ] Cross-Medium Adaptation Intelligence can store relations and recommend experience order.
- [ ] Import/export works.
- [ ] Command palette and advanced search work.
- [ ] Background jobs have visible status.
- [ ] Analytics/Insights page works.
- [ ] Security and privacy tasks are complete.
- [ ] Performance tasks are complete.
- [ ] Accessibility and responsive UI tasks are complete.
- [ ] Deployment instructions and infrastructure files exist.
- [ ] All tests/builds pass.
- [ ] The final product does not have major dead buttons, missing pages, or undocumented critical behavior.

---

# 9. Last Completed Task Summary

This section must always be updated at the end of each coding session. It exists so the next chat session, agent run, or developer can continue without losing task flow.

## 9.1 Current Task State

**Last completed task ID:** CP-M07-QA-004.
**Last completed task name:** Confirm Candidate Evaluator uses narrative traits.
**Last completed milestone:** CP-M07 — Narrative DNA Analyzer.
**Current phase:** Complete Product Phase.
**Current milestone:** CP-M08 — Critic Council.
**Next recommended task:** CP-M08-SH-001 Define `CriticPersona` type.

## 9.2 Brief Summary Of What Was Done In The Last Completed Task

CP-M07 Narrative DNA Analyzer is complete. Shared contracts now define NarrativeDNA, traits, requests, results, status events, source bases, and candidate narrative signals. Backend work adds the owner-scoped narrative app, NarrativeAnalysis model/migration/admin, deterministic local heuristic provider plus disabled external-provider abstraction, request/detail/list/correction endpoints, status transitions, Celery task, Candidate Evaluator narrative-signal scoring, TasteGraph narrative trait nodes/edges, API root/schema coverage, and backend tests. Frontend work adds the Media Detail Narrative DNA tab with request/refresh, status badge, score grid, summary, extracted traits, evidence notes, loading/empty/error states, candidate narrative-signal display, docs/manual tests, and Playwright browser-to-backend coverage for analysis plus candidate integration.

## 9.3 Important Notes For The Next Agent

- Use the SRS and Lo-Fi wireframe documents as the source of product and UI truth.
- Keep the sidebar, header, spacing, page structure, empty states, loading states, and error states consistent across all pages.
- Do not invent a different design for individual pages.
- Do not build backend-only for many milestones before building frontend.
- Do not build frontend-only for many milestones before connecting backend behavior.
- Every major UI button must either work or be clearly delayed to a future milestone in this checklist.
- Every new backend endpoint should appear in OpenAPI/Swagger/Scalar documentation.
- Every new data model should have migration, serializer, API behavior, and tests where relevant.
- Every new frontend feature should have loading, empty, and error handling where relevant.
- Every user-facing feature milestone should add or update its manual test doc under `docs/manual-tests/`.
- MVP import/export is now required before MVP acceptance, while CP-M13 is reserved for advanced portability hardening.
