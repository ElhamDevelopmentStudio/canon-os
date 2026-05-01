## Document Control

| Field | Value |
| --- | --- |
| Document name | CanonOS Software Design Document (SDS) |
| System | CanonOS - personal media intelligence platform |
| Version | 1.0 |
| Date | May 1, 2026 |
| Status | Design baseline for implementation planning |
| Primary audience | Project owner, developers, technical reviewers, future AI coding agents |
| Reference | CanonOS SRS already completed and treated as the product requirements baseline |
| Core stack | Monorepo; React + Vite; Tailwind; shadcn/ui; Axios; SWR; Zustand; DRF; Celery; PostgreSQL; Swagger + Scalar; Redis; RabbitMQ optional only when needed |

### How to Read This SDS

This SDS translates the CanonOS requirements into a buildable technical design. It explains what to build, how the system is divided, what each module owns, how data flows through the system, and how the chosen stack should be used.

The document intentionally uses simple language. When a design choice is optional, it is marked as Optional or Later Phase. When a design choice is part of the MVP, it is marked as MVP.

This document is not a user story list. It is the technical map that developers should follow after the SRS.

## Table of Contents

- 1. Executive Summary
- 2. Design Goals and Boundaries
- 3. System Architecture
- 4. Technology Stack Decisions
- 5. Monorepo and Package Design
- 6. Frontend Design
- 7. Backend Design
- 8. Database Design
- 9. API Design
- 10. Recommendation, Taste, and Scoring Design
- 11. Asynchronous Processing Design
- 12. Metadata Provider Design
- 13. Search and Discovery Design
- 14. Authentication, Authorization, and Security
- 15. Deployment and Runtime Design
- 16. Testing Strategy
- 17. Observability and Operations
- 18. Implementation Roadmap
- 19. Risks, Tradeoffs, and Mitigations
- 20. Appendices
## 1. Executive Summary

CanonOS is a private personal media intelligence system for someone who watches movies, series, anime, reads novels, and listens to audiobooks extensively. Its purpose is not to be another generic recommendation app. Its purpose is to help the user decide what is actually worth their time, based on their history, standards, current mood, fatigue, and dislike of generic media.

The system must respect an important product principle: CanonOS is skeptical of generic modern media, but it must not blindly reject modern media. It should identify modern works that are actually worthwhile and separate them from hollow, overhyped, or algorithmic-feeling content.

CanonOS is designed as a monorepo product with a React + Vite frontend and a Django REST Framework backend. PostgreSQL stores the canonical data model. Redis is used for caching and as the default Celery broker in the MVP. RabbitMQ is not required for the MVP and should only be introduced if queue reliability, routing complexity, or throughput makes Redis insufficient.

### 1.1 Core Product Capabilities

- Library tracking for movies, TV shows, anime, novels, audiobooks, and source/adaptation relationships.
- TasteGraph: a living model of the user's positive taste, negative taste, fatigue patterns, and evolving standards.
- Anti-Generic Filter: a scoring layer that detects likely time-wasters, hollow prestige, shallow darkness, filler, fake complexity, weak endings, and trend-chasing content.
- Candidate Evaluator: a tool that evaluates a specific title before the user commits time to it.
- Tonight Mode: a decision engine that chooses what fits the user's mood, time, energy, focus, and risk tolerance right now.
- Aftertaste Journal: post-consumption logging that captures whether something stayed with the user after finishing.
- Media Archaeologist: deep-cut discovery for obscure, old, foreign, cult, under-discussed, or overlooked works.
- Critic Council: an explanation interface where several critic personas evaluate recommendations from different angles.
- Cross-Medium Adaptation Intelligence: guidance on whether to watch, read, listen, skip, or consume source material first.
### 1.2 Core Technical Principle

CanonOS should be deterministic first and AI-assisted second. The user must be able to understand why the system recommends, delays, samples, or rejects a candidate. AI may enrich metadata, summarize notes, classify themes, or generate explanation text, but the underlying score should remain inspectable.

## 2. Design Goals and Boundaries

### 2.1 Design Goals

- Make the system useful for a high-volume media consumer who has already watched/read/listened to many obvious masterpieces.
- Build a platform that evolves with the user's taste instead of freezing their taste profile forever.
- Keep all recommendations explainable through visible factors, not hidden algorithmic guesses.
- Use a monorepo structure so frontend, backend, API contracts, generated clients, documentation, and infrastructure live together.
- Prefer simple, durable infrastructure over unnecessary complexity.
- Make imports, exports, backups, and manual overrides first-class because the user's media history is valuable personal data.
- Support cross-medium reasoning: movie to novel, anime to audiobook, TV to source material, and so on.
### 2.2 In Scope

| Area | Included in Design |
| --- | --- |
| Frontend | SPA built with React + Vite, Tailwind, shadcn/ui, Axios, SWR, Zustand, React Router, forms, dashboard, library, candidate evaluator, tonight mode, taste profile, journal, discovery, settings. |
| Backend | Django REST Framework API, Django services, PostgreSQL models, serializers, viewsets, permissions, OpenAPI schema, Swagger UI, Scalar docs. |
| Async processing | Celery workers for metadata enrichment, import processing, taste recalculation, recommendation cache refresh, AI enrichment, and exports. |
| Data | Canonical media model, user library entries, taste dimensions, ratings, aftertaste logs, recommendation runs, queue items, seasons, adaptation relations, imports, jobs, audit events. |
| Discovery | Deep-cut candidate generation, filtering, saved candidates, reasoned rankings, optional semantic matching. |
| Security | Cookie-based authentication, CSRF protection, permission checks, secret management, audit logs, privacy-aware design. |
| Deployment | Docker-based local development and production-ready service split: web, API, worker, beat, PostgreSQL, Redis, optional reverse proxy. |

### 2.3 Out of Scope for MVP

- Native mobile applications. A mobile-friendly web UI is included; native apps are later phase.
- Social network features such as followers, public profiles, public reviews, or friend feeds.
- Automatic streaming-service availability checking. This can be added later through provider adapters.
- Automatic playback tracking from streaming platforms. Manual logging and imports are the MVP path.
- Full real-time collaboration. CanonOS is primarily a personal system.
- Heavy multi-tenant SaaS billing, subscriptions, and public onboarding flows.
### 2.4 User Roles

| Role | Description | Permissions |
| --- | --- | --- |
| Owner/User | The main person using CanonOS. | Can manage their library, evaluate candidates, update taste data, run imports/exports, and configure settings. |
| Admin | A technical/admin role. In a personal deployment this may be the same person as the owner. | Can access Django admin, repair metadata, review jobs, manage provider configuration, and run maintenance actions. |
| System Worker | Celery worker process. | Runs background jobs but does not act as a user. It must only process authorized user-scoped data. |
| Metadata Provider | External source used for enrichment. | Can provide metadata through a provider adapter; never owns canonical user data. |
| AI Provider | Optional external or local AI service used for enrichment and explanation. | Can classify, summarize, or generate explanations only when enabled by configuration. |

## 3. System Architecture

### 3.1 High-Level Architecture

```text

+------------------+        HTTPS/API        +--------------------------+
| React + Vite Web | <---------------------> | Django REST Framework API|
| Tailwind/shadcn  |                         | Swagger + Scalar Docs    |
| SWR/Zustand      |                         +------------+-------------+
+--------+---------+                                      |
         |                                                |
         |                                                v
         |                                  +---------------------------+
         |                                  | PostgreSQL                |
         |                                  | Canonical media/user data |
         |                                  +---------------------------+
         |                                                |
         |                                                v
         |                                  +---------------------------+
         |                                  | Redis                     |
         |                                  | Cache + Celery broker MVP |
         |                                  +---------------------------+
         |                                                |
         |                                                v
         |                                  +---------------------------+
         +--------------------------------> | Celery Workers + Beat     |
                                            | Metadata, scoring, import |
                                            +-------------+-------------+
                                                          |
                                                          v
                                            +---------------------------+
                                            | Optional external systems |
                                            | Metadata APIs, AI, backup |
                                            +---------------------------+
```

### 3.2 Architecture Style

CanonOS uses a layered architecture. The frontend is a client application. The backend owns business rules, database writes, scoring calculations, and provider orchestration. The frontend should never calculate final recommendation scores; it should display server-produced scores and explanations.

| Layer | Responsibility | Important Rule |
| --- | --- | --- |
| Frontend UI | Screens, components, user interactions, visual states, forms. | Does not own business truth. It presents and edits data through the API. |
| API layer | DRF viewsets/views, serializers, permissions, request validation. | Thin layer. It should call services rather than contain complex logic. |
| Service layer | Business operations such as evaluating candidates, recalculating taste, creating aftertaste logs, importing data. | This is where core product logic lives. |
| Selector/query layer | Reusable database read queries. | Keeps views and services from duplicating complex query logic. |
| Model layer | Database schema and model-level constraints. | Models enforce relational integrity, not full product workflows. |
| Task layer | Celery background jobs. | Tasks should call services. Tasks should be retry-safe and idempotent when possible. |
| Provider layer | External metadata and AI adapters. | Adapters normalize external data into internal DTOs. |

### 3.3 Core Data Flow: Evaluating a Candidate

1. User enters or selects a candidate title in the Candidate Evaluator UI.
1. Frontend sends candidate data and current context to POST /api/v1/evaluations/.
1. Backend resolves or creates the MediaItem record.
1. Backend fetches existing metadata. If metadata is incomplete, it schedules an enrichment job and marks confidence accordingly.
1. EvaluationService loads the user's TasteGraph, recent fatigue signals, mood/context, and known media signals.
1. Scoring engine calculates taste fit, anti-generic risk, mood fit, commitment fit, novelty, and confidence.
1. Explanation builder creates plain-language reasons, warnings, and suggested action.
1. Evaluation result is stored in CandidateEvaluation and returned to the UI.
1. SWR cache updates the evaluation detail and related candidate lists.
### 3.4 Core Data Flow: Tonight Mode

1. User enters current mood, time available, energy level, focus level, medium preference, and risk tolerance.
1. Frontend sends the context to POST /api/v1/queue/tonight/.
1. Backend filters available library items, saved candidates, deep cuts, and delayed items.
1. QueueService scores options against the current context and the user's taste profile.
1. Backend returns a short ranked menu: best choice, safe choice, challenging choice, wildcard, and avoid tonight.
1. User can accept, reject, defer, or mark a choice as wrong. This feedback updates future scoring.
## 4. Technology Stack Decisions

### 4.1 Required Stack

| Layer | Tool | Purpose | Decision |
| --- | --- | --- | --- |
| Monorepo | pnpm workspaces + root scripts | Manage frontend apps and TypeScript packages in one repository. | MVP |
| Frontend | React + Vite | Fast SPA development and build tooling. | MVP |
| Styling | Tailwind CSS | Utility-first styling and design tokens. | MVP |
| UI components | shadcn/ui | Accessible component patterns that can be customized. | MVP |
| HTTP client | Axios | Typed API calls, interceptors, cookie/CSRF handling. | MVP |
| Server state | SWR | Fetch caching, revalidation, mutation, loading/error states. | MVP |
| Client state | Zustand | Small local UI state stores for mood drafts, filters, panels, command palette. | MVP |
| Backend | Django REST Framework | REST API, serializers, permissions, browsable development patterns. | MVP |
| Database | PostgreSQL | Canonical relational data store. | MVP |
| Async jobs | Celery | Background tasks for imports, enrichment, scoring, exports, and AI. | MVP |
| Cache/broker | Redis | Cache and default Celery broker/result backend for MVP. | MVP |
| API docs | OpenAPI + Swagger UI + Scalar | Developer-friendly API exploration and generated clients. | MVP |
| Message broker | RabbitMQ | More durable/advanced queue routing if Redis becomes insufficient. | Optional later |

### 4.2 Additional Recommended Libraries

| Area | Recommended Libraries | Reason |
| --- | --- | --- |
| Frontend routing | react-router-dom | Defines app routes such as Library, Candidate Evaluator, Tonight Mode, Taste Profile, Settings. |
| Frontend forms | react-hook-form + zod + @hookform/resolvers | Fast forms with schema validation and useful error messages. |
| Frontend icons | lucide-react | Consistent iconography that pairs well with shadcn/ui. |
| Frontend charts | recharts or lightweight chart components | Taste evolution, score breakdowns, media history, and fatigue charts. |
| Frontend dates | date-fns | Date formatting, relative dates, completed dates, journal dates. |
| Backend API schema | drf-spectacular | Generates OpenAPI schema used by Swagger, Scalar, and frontend types. |
| Backend filters | django-filter | Filtering by medium, status, year, rating, tags, and completion state. |
| Backend CORS | django-cors-headers | Only needed if local frontend and backend run on different origins. |
| Backend cache | django-redis | Django cache backed by Redis. |
| Backend DB driver | psycopg | PostgreSQL driver for Django. |
| Backend test | pytest, pytest-django, factory-boy | Repeatable unit/API/database tests. |
| Python quality | ruff, mypy, django-stubs | Linting, formatting, and type checks. |
| Optional semantic search | pgvector | Embedding similarity search inside PostgreSQL when enabled. |

### 4.3 RabbitMQ Decision

RabbitMQ is not part of the MVP runtime by default. Redis is enough for the first version because CanonOS is primarily a personal system and the background jobs are predictable.

Introduce RabbitMQ only if at least one of these becomes true:

- Celery jobs become high-volume and Redis broker behavior becomes a bottleneck.
- The system needs more durable queue semantics and more reliable delivery guarantees.
- The system needs complex routing between many queue types, priorities, or worker pools.
- There are many external provider jobs where failure isolation is critical.
## 5. Monorepo and Package Design

### 5.1 Repository Structure

```text

canonos/
  apps/
    web/                         # React + Vite frontend
      src/
        app/                     # app shell, router, providers
        features/                # feature modules: library, taste, queue, etc.
        components/              # app-specific components
        hooks/                   # app-level hooks
        stores/                  # Zustand stores
        lib/                     # axios, swr keys, formatting, utilities
        styles/                  # Tailwind entry and theme globals
      public/
      package.json
      vite.config.ts
      tailwind.config.ts

    api/                         # Django + DRF backend
      manage.py
      pyproject.toml
      config/                    # Django settings, urls, celery, asgi/wsgi
      canonos/
        accounts/
        media/
        library/
        taste/
        evaluations/
        queueing/
        journal/
        discovery/
        adaptations/
        imports/
        ai/
        jobs/
        audit/
        common/
      tests/

  packages/
    api-client/                  # generated OpenAPI TS types + Axios wrapper
    contracts/                   # shared enums and generated DTO types
    ui/                          # optional shared UI wrappers around shadcn
    design-tokens/               # colors, spacing, typography tokens
    config/                      # shared ESLint, Prettier, TS config
    utils/                       # safe shared TypeScript utilities

  infra/
    docker/
      api.Dockerfile
      web.Dockerfile
      worker.Dockerfile
    compose/
      docker-compose.dev.yml
      docker-compose.prod.yml
    nginx/
      nginx.conf

  docs/
    srs/
    sds/
    adr/                         # architecture decision records
    api/

  scripts/
    generate-api-client.sh
    reset-dev-db.sh
    export-openapi.sh
    backup-db.sh

  package.json                   # root workspace scripts
  pnpm-workspace.yaml
  turbo.json                     # optional task orchestration
  README.md
```

### 5.2 Package Responsibilities

| Package/App | Responsibility | Must Not Do |
| --- | --- | --- |
| apps/web | Render the CanonOS user interface and call the API. | Must not calculate final recommendation scores or bypass API validation. |
| apps/api | Own the database, business logic, scoring, permissions, OpenAPI schema, and background job entrypoints. | Must not depend on frontend packages. |
| packages/api-client | Expose typed Axios functions generated or derived from OpenAPI. | Must not contain UI state or business rules. |
| packages/contracts | Expose TypeScript enums and DTOs that match the API schema. | Must not become a second backend model layer. |
| packages/ui | Reusable UI primitives and customized shadcn wrappers. | Must not contain feature-specific API calls. |
| packages/design-tokens | Shared colors, spacing, typography, and Tailwind token inputs. | Must not contain layout-specific CSS. |
| packages/config | Shared TypeScript, ESLint, Prettier, and formatting settings. | Must not contain app runtime logic. |
| infra | Docker, reverse proxy, compose files, deployment scripts. | Must not contain application business logic. |

### 5.3 Root Scripts

| Command | Purpose |
| --- | --- |
| pnpm dev | Start frontend and backend development services where possible. |
| pnpm web:dev | Start Vite frontend. |
| pnpm api:dev | Start Django development server. |
| pnpm worker:dev | Start Celery worker for local development. |
| pnpm beat:dev | Start Celery beat scheduler for local development. |
| pnpm lint | Run frontend linting and backend linting through scripts. |
| pnpm test | Run frontend and backend tests. |
| pnpm openapi:export | Generate OpenAPI JSON from DRF. |
| pnpm api-client:generate | Generate TypeScript API types/client from OpenAPI. |
| pnpm db:migrate | Run Django migrations. |
| pnpm compose:dev | Start local Docker Compose stack. |

## 6. Frontend Design

### 6.1 Frontend Architecture

The frontend is a React SPA built with Vite. It should use feature-based organization so each major CanonOS module has its own screens, components, hooks, and feature utilities. Server data comes through SWR. Local UI-only state lives in Zustand. API calls go through a single Axios client.

```text

apps/web/src/
  app/
    App.tsx
    router.tsx
    providers.tsx             # SWRConfig, theme, auth bootstrap
    layouts/
      AppLayout.tsx
      AuthLayout.tsx
  features/
    auth/
    dashboard/
    library/
    media/
    candidate-evaluator/
    tonight-mode/
    taste-profile/
    aftertaste-journal/
    discovery/
    seasons/
    adaptations/
    imports-exports/
    settings/
  components/
    ui/                       # shadcn generated components
    shell/                    # sidebar, topbar, command palette
    feedback/                 # empty states, errors, skeletons
  hooks/
  lib/
    api.ts                    # Axios instance
    swr.ts                    # keys, fetcher, mutation helpers
    errors.ts
    format.ts
    constants.ts
  stores/
    uiStore.ts
    moodStore.ts
    filterStore.ts
  styles/
    globals.css
```

### 6.2 Routes

| Route | Page | Purpose |
| --- | --- | --- |
| /login | Login | Authenticate the user. |
| / | Dashboard | Show current recommendations, recent activity, active queue, and system insights. |
| /library | Library | Search, filter, sort, and manage consumed or planned media. |
| /library/:entryId | Library Entry Detail | Show personal status, scores, notes, aftertaste logs, and related recommendations. |
| /media/:mediaId | Media Detail | Show canonical media metadata, credits, taxonomy, adaptation links, and user-specific entries. |
| /evaluate | Candidate Evaluator | Evaluate a title before committing to it. |
| /tonight | Tonight Mode | Select what to watch/read/listen to based on current context. |
| /taste | Taste Profile | Show TasteGraph, positive/negative patterns, dimensions, fatigue, and evolution. |
| /journal | Aftertaste Journal | Review and add post-consumption reflections. |
| /discover | Media Archaeologist | Find deep cuts and underexplored territory. |
| /seasons | Personal Canon Seasons | Curate exploration seasons and themed programs. |
| /adaptations | Adaptation Intelligence | Compare source material, adaptations, and best consumption path. |
| /imports | Imports and Exports | Import old lists and export CanonOS data. |
| /settings | Settings | Manage profile, dimensions, providers, privacy, and developer options. |

### 6.3 State Management Rules

| State Type | Tool | Examples | Rule |
| --- | --- | --- | --- |
| Server data | SWR | Library entries, media items, evaluations, taste profile, queue, jobs. | Use SWR for all API-backed data. Use mutate after writes. |
| HTTP transport | Axios | GET/POST/PATCH/DELETE API calls, CSRF header, credentials. | All requests go through one configured Axios instance. |
| Local UI state | Zustand | Sidebar state, filters, current mood draft, selected rows, command palette state. | Do not store server truth in Zustand. |
| Form state | react-hook-form | Add media, edit library entry, evaluation form, aftertaste log. | Validate with zod before sending to API. |
| URL state | React Router | Search terms, filters, selected tabs, sort order when shareable. | Use URL query params for bookmarkable views. |

### 6.4 Axios Client Design

```text

// packages/api-client/src/client.ts
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const csrf = getCsrfTokenFromCookieOrMeta();
  if (csrf) config.headers["X-CSRFToken"] = csrf;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
);
```

Axios must include credentials because the MVP uses cookie-based auth. The client must normalize API errors so every page can show consistent messages.

### 6.5 SWR Key Design

| Data | SWR Key Pattern | Invalidated By |
| --- | --- | --- |
| Current user | ['me'] | login, logout, profile update |
| Library list | ['library', filters] | create/update/delete library entry |
| Media detail | ['media', mediaId] | metadata refresh, edit media |
| Evaluation detail | ['evaluation', evaluationId] | evaluation recalculation, feedback |
| Tonight recommendations | ['tonight', contextHash] | accept/reject/defer, mood changes |
| Taste profile | ['taste-profile', 'current'] | aftertaste log, score update, recalculation job |
| Jobs | ['jobs', filters] | task creation, polling, job completion |

### 6.6 Main UI Screens

| Screen | Required Sections |
| --- | --- |
| Dashboard | Current best next action, active queue, recent aftertaste prompts, recent completions, taste shifts, import/job warnings, saved candidates. |
| Library | Search bar, medium filters, status filters, rating filters, genericness filters, table/card view, bulk edit, add media button. |
| Media Detail | Canonical metadata, personal status, scores, notes, credits, taxonomy, similar works, adaptation map, evaluation history. |
| Candidate Evaluator | Candidate search/add form, context panel, score summary, recommendation label, factor breakdown, critic council explanation, action buttons. |
| Tonight Mode | Mood/time/focus form, ranked options, reasons, avoid-tonight section, accept/reject/defer controls. |
| Taste Profile | Positive patterns, negative patterns, dimension weights, fatigue signals, taste evolution charts, editable dimension settings. |
| Aftertaste Journal | Pending prompts, completed logs, delayed reflections, comparison of immediate rating versus later memory. |
| Discovery | Deep-cut search, filter by era/country/medium, risk/reward score, save/evaluate buttons. |
| Seasons | Create themed exploration season, reorder items, track progress, add reflections. |
| Settings | Profile, providers, API docs link, import/export, backups, privacy, feature flags. |

### 6.7 shadcn/ui Customization Rules

- Use shadcn/ui as a starting point, not as a strict visual identity. CanonOS should feel like a serious private research/workbench tool.
- Create custom variants for score cards, warning cards, candidate verdicts, and critic panels.
- Use Tailwind design tokens for semantic states: excellent, promising, risky, avoid, unknown, delayed, completed, dropped.
- All custom components should stay accessible: keyboard navigation, focus states, aria labels, readable contrast, and visible validation errors.
## 7. Backend Design

### 7.1 Backend Project Structure

```text

apps/api/
  config/
    settings/
      base.py
      local.py
      production.py
      test.py
    urls.py
    celery.py
    asgi.py
    wsgi.py
  canonos/
    common/                    # base models, errors, permissions, utils
    accounts/                  # user, auth, preferences
    media/                     # canonical media catalog, metadata, credits
    library/                   # user-specific media entries, statuses, scores
    taste/                     # dimensions, TasteGraph, profile snapshots
    evaluations/               # candidate evaluator and anti-generic filter
    queueing/                  # adaptive queue and tonight mode
    journal/                   # aftertaste logs and reflection prompts
    discovery/                 # deep-cut discovery and saved candidates
    adaptations/               # source/adaptation relations
    imports/                   # import batches and parsers
    ai/                        # provider-neutral AI/embedding interfaces
    jobs/                      # job status and task tracking
    audit/                     # audit events and system activity
```

### 7.2 Django App Responsibilities

| App | Owns | Examples |
| --- | --- | --- |
| common | Shared base models, errors, response helpers, permissions, constants. | TimestampedModel, UUIDModel, ServiceError, StandardErrorResponse. |
| accounts | User model, auth endpoints, user preferences, privacy settings. | User, UserPreference, LoginView, MeView. |
| media | Canonical media records independent of the user's personal opinion. | MediaItem, Creator, MediaCredit, ExternalId, TaxonomyTerm. |
| library | User-specific relationship to media. | UserMediaEntry, DimensionScore, Note, progress/status updates. |
| taste | Taste dimensions, profile snapshots, vectorized taste signals. | TasteProfileSnapshot, TasteDimensionDefinition, TasteSignal. |
| evaluations | Candidate evaluation, anti-generic filter, verdicts, explanations. | CandidateEvaluation, EvaluationFactor, EvaluationService. |
| queueing | Adaptive Queue and Tonight Mode. | QueueItem, TonightContext, QueueService. |
| journal | Aftertaste logging and delayed reflection prompts. | AftertasteLog, ReflectionPrompt. |
| discovery | Deep-cut discovery and saved candidates. | DiscoveryRun, SavedCandidate. |
| adaptations | Relationships between sources and adaptations. | AdaptationRelation, BestPathRecommendation. |
| imports | Import batches from CSV/JSON or external list exports. | ImportBatch, ImportItem, parser services. |
| ai | AI provider interface, prompt templates, embedding jobs. | LLMProvider, EmbeddingProvider, PromptTemplate. |
| jobs | Async task visibility and retries. | JobRecord, job progress endpoints. |
| audit | Important user/system events. | AuditEvent, ActivityFeed. |

### 7.3 Backend Layering Pattern

Each Django app should follow a predictable internal structure. This makes the backend easy for humans and future AI coding agents to understand.

```text

canonos/evaluations/
  models.py              # database models only
  serializers.py         # request/response validation and representation
  views.py               # DRF viewsets/views, thin controller layer
  urls.py                # endpoint registration
  services.py            # business logic and workflows
  selectors.py           # reusable read/query functions
  scoring.py             # pure scoring functions where possible
  tasks.py               # Celery task wrappers that call services
  permissions.py         # app-specific permission classes
  tests/
    test_api.py
    test_services.py
    test_scoring.py
```

### 7.4 Service Layer Rules

- Views validate the request and call services. Views should not contain scoring logic, import logic, or provider orchestration.
- Services accept typed input objects or validated serializer data and return model instances or DTOs.
- Selectors centralize complicated read queries so they can be reused by API views, services, and tasks.
- Pure scoring functions should be isolated so they can be unit-tested without a database.
- Celery tasks should be thin wrappers around services and should record JobRecord progress.
- Every user-scoped query must filter by user or enforce permissions before returning data.
### 7.5 API Documentation Design

The API must expose an OpenAPI schema generated from DRF. Swagger UI and Scalar must both be available because they serve different development preferences.

| Endpoint | Purpose | Access |
| --- | --- | --- |
| /api/schema/ | OpenAPI JSON/YAML schema. | Authenticated in production, optionally public in local dev. |
| /api/docs/swagger/ | Swagger UI API explorer. | Authenticated in production. |
| /api/docs/scalar/ | Scalar API documentation UI. | Authenticated in production. |

## 8. Database Design

### 8.1 Database Principles

- PostgreSQL is the canonical source of truth.
- Every major table uses a UUID primary key unless Django internals require otherwise.
- Every user-owned table includes user_id or is reachable through a user-owned parent.
- Core concepts use relational tables. Flexible metadata uses JSONB only when structure varies by provider or phase.
- All records include created_at and updated_at when meaningful.
- Soft deletion is used for user-facing destructive actions where recovery matters; hard deletion is allowed for temporary imports and caches.
- Indexes must be added for common filters: user, media type, status, completion date, rating, title search, provider IDs, and recommendation score.
### 8.2 Entity Relationship Summary

```text

User 1---* UserMediaEntry *---1 MediaItem
User 1---* AftertasteLog *---1 UserMediaEntry
User 1---* Note *---1 UserMediaEntry
User 1---* CandidateEvaluation *---1 MediaItem
User 1---* TasteProfileSnapshot
User 1---* RecommendationRun 1---* RecommendationItem *---1 MediaItem
User 1---* QueueItem *---1 MediaItem
User 1---* Season 1---* SeasonItem *---1 MediaItem
MediaItem 1---* ExternalId
MediaItem *---* Creator through MediaCredit
MediaItem *---* TaxonomyTerm through MediaTaxonomy
MediaItem *---* MediaItem through AdaptationRelation
ImportBatch 1---* ImportItem
JobRecord tracks Celery tasks and long-running operations
```

### 8.3 Core Tables

| Table | Key Fields | Purpose |
| --- | --- | --- |
| accounts_user | id, email, username, display_name, is_active, is_staff, date_joined | Custom user model. Even if the app starts personal, a custom user prevents painful migrations later. |
| user_preference | id, user_id, timezone, default_mediums, scoring_preferences_json, privacy_settings_json | Stores user-level configuration and scoring defaults. |
| media_item | id, canonical_title, original_title, medium, release_year, release_date, country, language, synopsis, runtime_minutes, episode_count, season_count, status, metadata_json | Canonical work record independent of personal opinion. |
| external_id | id, media_item_id, provider, external_id, url, confidence, raw_json | Links a MediaItem to external metadata providers. |
| creator | id, name, sort_name, birth_year, death_year, country, metadata_json | People or organizations such as directors, authors, screenwriters, studios, narrators. |
| media_credit | id, media_item_id, creator_id, role, credit_order, character_name, notes | Many-to-many relationship between MediaItem and Creator. |
| taxonomy_term | id, term_type, name, slug, description | Genres, themes, tropes, tones, structures, tags, and warnings. |
| media_taxonomy | id, media_item_id, taxonomy_term_id, source, confidence | Attaches taxonomy terms to media. |
| user_media_entry | id, user_id, media_item_id, status, personal_rating, regret_score, genericness_score, reconsume_value, progress_value, started_on, completed_on, dropped_on | The user's personal relationship with a media item. |
| dimension_definition | id, user_id nullable, key, label, description, scale_min, scale_max, default_weight, is_active | Defines scoring dimensions such as atmosphere, character depth, ending quality, memorability. |
| user_media_dimension_score | id, user_media_entry_id, dimension_id, score, weight_at_time, notes | Stores dimensional ratings for a specific consumed item. |
| note | id, user_id, user_media_entry_id, note_type, body, spoiler_level, created_at | User notes, quick thoughts, criticism, and private reflections. |
| aftertaste_log | id, user_id, user_media_entry_id, timing, stayed_with_me_score, memory_strength, worth_time_score, changed_standards, body | Post-consumption reflection, immediate or delayed. |

### 8.4 Evaluation and Recommendation Tables

| Table | Key Fields | Purpose |
| --- | --- | --- |
| candidate_evaluation | id, user_id, media_item_id, context_json, verdict, final_score, confidence, taste_fit_score, anti_generic_risk, mood_fit_score, commitment_fit_score, novelty_score, explanation_json | Stores a point-in-time evaluation of a candidate. |
| evaluation_factor | id, candidate_evaluation_id, factor_type, label, score_delta, severity, evidence_json | Breakdown of why the score changed. |
| taste_profile_snapshot | id, user_id, version, generated_at, summary_text, positive_patterns_json, negative_patterns_json, fatigue_json, vector_json | Snapshot of the user's current taste model. |
| taste_signal | id, user_id, source_type, source_id, signal_key, signal_value, weight, confidence, observed_at | Atomic signal used to build the TasteGraph. |
| recommendation_run | id, user_id, run_type, context_json, generated_at, status, algorithm_version | A batch of recommendations generated for a context. |
| recommendation_item | id, recommendation_run_id, media_item_id, rank, score, verdict, reasons_json, warnings_json | One ranked item inside a recommendation run. |
| queue_item | id, user_id, media_item_id, queue_type, priority, status, reason_json, scheduled_for, last_recommended_at | Adaptive queue entries for next-up decisions. |
| season | id, user_id, title, theme, description, status, start_date, end_date | Personal canon exploration season. |
| season_item | id, season_id, media_item_id, position, required, notes, status | Media item inside a season. |
| adaptation_relation | id, source_media_id, adaptation_media_id, relation_type, quality_note, recommended_order, confidence | Links sources to adaptations and stores best-path guidance. |

### 8.5 Operational Tables

| Table | Key Fields | Purpose |
| --- | --- | --- |
| import_batch | id, user_id, source_type, filename, status, total_items, processed_items, error_count, created_at | Tracks an import from CSV, JSON, or another list source. |
| import_item | id, import_batch_id, raw_json, matched_media_id, status, error_message | One imported row/item and its processing result. |
| job_record | id, user_id nullable, task_name, celery_task_id, status, progress, input_json, result_json, error_message, started_at, finished_at | Visible tracking for async jobs. |
| audit_event | id, user_id nullable, event_type, entity_type, entity_id, metadata_json, created_at | Records meaningful actions and system events. |
| provider_cache | id, provider, cache_key, payload_json, expires_at, created_at | Caches external metadata responses where allowed. |

### 8.6 Important Enums

| Enum | Values |
| --- | --- |
| medium | movie, tv_series, anime_series, anime_movie, novel, novella, short_story, audiobook, manga, light_novel, other |
| user_media_status | want, considering, watching, reading, listening, completed, paused, dropped, skipped, archived |
| evaluation_verdict | watch_now, read_now, listen_now, sample, delay, skip, source_first, adaptation_first, unknown |
| queue_type | tonight, long_term, deep_cut, comfort, challenge, wildcard, source_material |
| job_status | queued, running, succeeded, failed, canceled, retrying |
| term_type | genre, theme, trope, tone, structure, mood, warning, creator_pattern, pacing_pattern |

### 8.7 Indexing Plan

| Table | Indexes |
| --- | --- |
| media_item | LOWER(canonical_title), medium, release_year, country, language, full-text search vector on titles/synopsis. |
| external_id | Unique(provider, external_id); index media_item_id. |
| user_media_entry | Unique(user_id, media_item_id); indexes on user_id/status, user_id/completed_on, user_id/personal_rating, user_id/genericness_score. |
| candidate_evaluation | Indexes on user_id/created_at, user_id/verdict, user_id/final_score, media_item_id. |
| taste_signal | Indexes on user_id/signal_key, user_id/observed_at, source_type/source_id. |
| queue_item | Indexes on user_id/status/priority, user_id/queue_type, scheduled_for. |
| taxonomy_term | Unique(term_type, slug). |

## 9. API Design

### 9.1 API Conventions

- All endpoints live under /api/v1/.
- All response bodies use JSON.
- List endpoints use pagination with page, page_size, count, results.
- Filtering uses query parameters. Complex recommendation contexts use POST bodies.
- Unsafe methods require authentication and CSRF protection.
- All errors use a standard error envelope.
- OpenAPI schema must be updated whenever endpoints change.
### 9.2 Standard Error Shape

```text

{
  "error": {
    "code": "validation_error",
    "message": "One or more fields are invalid.",
    "details": {
      "field_name": ["This field is required."]
    },
    "request_id": "req_abc123"
  }
}
```

### 9.3 Endpoint Groups

| Group | Endpoints | Purpose |
| --- | --- | --- |
| Auth | GET /auth/csrf/; POST /auth/login/; POST /auth/logout/; GET /auth/me/ | Session auth and current user bootstrap. |
| User settings | GET/PATCH /users/me/preferences/ | Scoring preferences, privacy, default mediums, UI settings. |
| Media | GET/POST /media-items/; GET/PATCH /media-items/{id}/; GET /media-items/search/; POST /media-items/{id}/refresh-metadata/ | Canonical media catalog management and lookup. |
| Library | GET/POST /library/; GET/PATCH/DELETE /library/{id}/; GET /library/by-media/{media_id}/ | User-specific media status and personal rating. |
| Scores | GET/PUT /library/{id}/scores/ | Dimension scores for a library item. |
| Notes | GET/POST /notes/; PATCH/DELETE /notes/{id}/ | Private notes and reflections. |
| Aftertaste | GET/POST /aftertaste/; GET/PATCH /aftertaste/{id}/; GET /aftertaste/prompts/ | Immediate and delayed post-consumption logs. |
| Evaluations | POST /evaluations/; GET /evaluations/{id}/; POST /evaluations/{id}/recalculate/; POST /evaluations/compare/ | Candidate evaluator and anti-generic score. |
| Tonight Mode | POST /queue/tonight/; GET/POST /queue/items/; PATCH /queue/items/{id}/ | Context-aware next-up recommendations. |
| Taste | GET /taste/profile/current/; POST /taste/profile/recalculate/; GET /taste/evolution/ | TasteGraph and taste evolution. |
| Discovery | POST /discovery/deep-cuts/; POST /discovery/similar-by-dna/; GET/POST /discovery/saved-candidates/ | Deep-cut discovery and exploration. |
| Seasons | GET/POST /seasons/; GET/PATCH/DELETE /seasons/{id}/; POST /seasons/{id}/items/ | Personal canon exploration seasons. |
| Adaptations | GET/POST /adaptations/relations/; GET /media-items/{id}/adaptation-map/ | Source/adaptation intelligence. |
| Imports/Exports | POST /imports/; GET /imports/{id}/; POST /exports/; GET /exports/{id}/download/ | Data portability. |
| Jobs | GET /jobs/; GET /jobs/{id}/; POST /jobs/{id}/cancel/ | Async job visibility. |

### 9.4 Candidate Evaluation Request

```text

POST /api/v1/evaluations/
{
  "candidate": {
    "title": "Example Title",
    "medium": "movie",
    "release_year": 1998,
    "external_ids": [{"provider": "manual", "external_id": "example-1998"}]
  },
  "context": {
    "mood": "dark_but_meaningful",
    "energy_level": 3,
    "focus_level": 4,
    "time_available_minutes": 130,
    "risk_tolerance": "medium",
    "desired_effect": ["atmosphere", "moral_complexity"],
    "avoid": ["filler", "fake_complexity"]
  }
}
```

### 9.5 Candidate Evaluation Response

```text

{
  "id": "uuid",
  "media_item": {"id": "uuid", "title": "Example Title", "medium": "movie"},
  "verdict": "sample",
  "final_score": 72,
  "confidence": 0.68,
  "scores": {
    "taste_fit": 81,
    "anti_generic_risk": 38,
    "mood_fit": 74,
    "commitment_fit": 90,
    "novelty": 61
  },
  "summary": "Promising, but sample before committing.",
  "reasons": ["Strong atmosphere match", "Runtime fits tonight", "Potentially aligned themes"],
  "warnings": ["Ending reputation is unknown", "Some genericness risk from premise"],
  "recommended_action": "Watch the first 30 minutes, then continue only if the atmosphere and character writing land."
}
```

### 9.6 Tonight Mode Request and Response

```text

POST /api/v1/queue/tonight/
{
  "time_available_minutes": 90,
  "energy_level": 2,
  "focus_level": 3,
  "desired_effect": ["comfort", "quality"],
  "mediums": ["movie", "audiobook"],
  "risk_tolerance": "low",
  "avoid_tonight": ["long_series", "heavy_lore"]
}

Response:
{
  "context_id": "uuid",
  "best_choice": {...},
  "safe_choice": {...},
  "challenging_choice": {...},
  "wildcard_choice": {...},
  "avoid_tonight": [{"media_item": {...}, "reason": "Too long for current energy."}]
}
```

## 10. Recommendation, Taste, and Scoring Design

### 10.1 TasteGraph Purpose

TasteGraph is the internal model of the user's preferences, dislikes, standards, fatigue patterns, and current media appetite. It is not just a list of ratings. It stores why works succeeded or failed for the user.

| Signal Category | Examples |
| --- | --- |
| Positive taste | Moral complexity, atmosphere, strong endings, serious character writing, memorable dialogue, authorial voice. |
| Negative taste | Fake complexity, shallow darkness, weak endings, filler, plot-forced decisions, algorithmic streaming pacing. |
| Medium preference | Anime vs film vs series vs novel vs audiobook, affected by mood and fatigue. |
| Fatigue | Recent over-consumption of long shows, prestige dramas, generic thrillers, or low-density series. |
| Aftertaste | Whether the work stayed with the user days later, and whether immediate enjoyment became regret or appreciation. |
| Commitment tolerance | How willing the user currently is to start a long series or dense novel. |

### 10.2 Default Taste Dimensions

| Dimension | Meaning | Scale |
| --- | --- | --- |
| story_depth | How meaningful and layered the story is. | 0-10 |
| character_depth | How complex, consistent, and memorable the characters are. | 0-10 |
| atmosphere | Strength of mood, setting, tone, visual/prose/audio identity. | 0-10 |
| originality | How non-generic or creatively alive the work feels. | 0-10 |
| dialogue_or_prose | Quality of dialogue for screen works or prose for books/audiobooks. | 0-10 |
| emotional_impact | How strongly it affected the user emotionally. | 0-10 |
| intellectual_impact | How much it provoked thought or changed perspective. | 0-10 |
| pacing | How well the work uses time and avoids filler. | 0-10 |
| ending_quality | How satisfying, fitting, or powerful the ending is. | 0-10 |
| memorability | How much remains after days/weeks. | 0-10 |
| personal_resonance | How much it fits the user's private taste, not public consensus. | 0-10 |
| genericness | How manufactured, predictable, hollow, or trend-driven it felt. | 0-10 where 10 is very generic |
| regret | How much the user regrets spending time on it. | 0-10 where 10 is high regret |
| reconsume_value | Likelihood of rewatching, rereading, or recommending to similar self. | 0-10 |

### 10.3 Scoring Inputs

| Input | Source | Used For |
| --- | --- | --- |
| Personal ratings | UserMediaEntry and dimension scores | Taste fit and positive/negative signals. |
| Dropped/paused/skipped status | Library status | Negative preference and fatigue modeling. |
| Aftertaste logs | Journal | Memorability and long-term satisfaction. |
| Current context | Tonight Mode or Candidate Evaluator form | Mood fit and commitment fit. |
| Media metadata | MediaItem, credits, taxonomy, providers | Medium fit, runtime, era, creator, theme, genre, adaptation status. |
| Similarity signals | Taxonomy and optional embeddings | Discovery and Narrative DNA matching. |
| External quality hints | Provider adapters if enabled | Confidence and warning signals, never final authority. |

### 10.4 Score Formulas

Scores are 0-100 unless otherwise stated. Every formula must be versioned. Store algorithm_version on CandidateEvaluation and RecommendationRun.

```text

TasteFitScore = weighted_match(candidate_signals, user_positive_signals)
              - weighted_match(candidate_signals, user_negative_signals)
              + creator_affinity_bonus
              + medium_affinity_bonus

AntiGenericRisk = generic_premise_risk
                + weak_ending_risk
                + filler_risk
                + fake_complexity_risk
                + shallow_darkness_risk
                + overhype_mismatch_risk
                - authorial_voice_bonus
                - exceptional_execution_bonus

MoodFitScore = match(current_mood, candidate_mood_profile)
             + match(focus_level, complexity_required)
             + match(energy_level, intensity_required)

CommitmentFitScore = match(time_available, runtime_or_length)
                   - long_series_penalty_when_fatigued
                   - dense_work_penalty_when_low_focus

NoveltyScore = underexplored_area_bonus
             + non_duplicate_pattern_bonus
             - recently_overused_pattern_penalty

FinalCandidateScore = clamp(
    0.35 * TasteFitScore
  + 0.20 * MoodFitScore
  + 0.15 * CommitmentFitScore
  + 0.10 * NoveltyScore
  + 0.10 * QualityConfidenceScore
  - 0.25 * AntiGenericRisk
  - 0.10 * FatiguePenalty,
  0,
  100
)
```

The formula intentionally penalizes genericness heavily, but it does not reject modern works by year alone. A modern work with strong authorial voice, originality, execution, and taste fit can score highly.

### 10.5 Verdict Thresholds

| Final Score | Confidence | Default Verdict | Meaning |
| --- | --- | --- | --- |
| 85-100 | Any | watch_now/read_now/listen_now | Strong alignment. Commit unless current mood conflicts. |
| 70-84 | >= 0.60 | sample or watch_now | Promising. Commit if time/energy is good; otherwise sample. |
| 55-69 | Any | sample or delay | Potential but uncertain. Use short trial or save for later. |
| 40-54 | Any | delay or skip | Likely not worth current attention unless there is a special reason. |
| 0-39 | Any | skip | High mismatch or high genericness risk. |
| Any | < 0.45 | unknown | Not enough information. Ask for more data or enrich metadata. |

### 10.6 Critic Council Design

Critic Council is an explanation interface. It does not create a separate hidden score. Each critic reads the same score breakdown and produces a short perspective.

| Critic | Role | Output |
| --- | --- | --- |
| Ruthless Critic | Protects the user from generic, hollow, overhyped, or low-density media. | Warnings and skip/sample arguments. |
| Modern Defender | Prevents unfair rejection of recent works simply because they are modern. | Positive exception arguments. |
| Historian | Suggests older, foreign, obscure, or influential alternatives. | Context and deep-cut alternatives. |
| Anime Specialist | Handles anime pacing, adaptation, tropes, and source issues. | Anime-specific advice. |
| Literary Editor | Handles novels, prose, audiobooks, narration, density, and source material. | Read/listen path advice. |
| Mood Doctor | Checks whether the candidate fits the user's current state. | Delay/tonight suitability advice. |
| Wildcard | Surfaces risky but potentially rewarding options. | Risk/reward suggestion. |

### 10.7 AI Usage Rules

- AI is optional and provider-neutral. The app must work without AI using manual metadata and deterministic scoring.
- AI may classify themes, summarize user notes, generate critic explanations, extract story patterns, and create embeddings.
- AI must not invent facts about a work. Provider data and user data must remain separate from generated text.
- Every AI-generated explanation must be marked as generated if shown in an admin/debug view.
- AI prompts and model settings must be versioned so outputs can be compared over time.
## 11. Asynchronous Processing Design

### 11.1 Celery Architecture

Celery handles long-running and retryable work. Redis is the default broker/result backend for the MVP. Celery Beat handles scheduled jobs. RabbitMQ is optional later.

```text

API request -> create JobRecord -> enqueue Celery task -> worker calls service -> update JobRecord -> API/UI polls job status
```

### 11.2 Queue Names

| Queue | Purpose | Worker Type |
| --- | --- | --- |
| default | Small general jobs. | Standard worker. |
| metadata | External metadata enrichment and refresh. | Worker with provider API access. |
| imports | CSV/JSON parsing, matching, bulk creation. | Worker with larger timeout. |
| scoring | Taste profile recalculation and recommendation runs. | CPU-oriented worker. |
| ai | Optional AI classification, embeddings, and explanation generation. | Worker with AI provider credentials. |
| maintenance | Backups, cleanup, stale cache removal. | Scheduled worker/beat. |

### 11.3 Background Tasks

| Task | Trigger | Output | Retry Rule |
| --- | --- | --- | --- |
| enrich_media_metadata | Media created or manual refresh. | Updated MediaItem, ExternalId, credits, taxonomy. | Retry provider failures with exponential backoff. |
| process_import_batch | User uploads import file. | ImportItem matches, created library entries, error report. | Retry parsing only if failure is infrastructure-related. |
| recalculate_taste_profile | After rating/log update or manual request. | TasteProfileSnapshot and TasteSignals. | Safe to retry; idempotent by version. |
| generate_recommendation_run | Tonight Mode, discovery, scheduled refresh. | RecommendationRun and items. | Safe to retry with same context hash. |
| generate_embeddings | New media/taxonomy/notes when semantic search enabled. | Embedding vectors or pgvector rows. | Retry provider errors; skip if AI disabled. |
| build_critic_explanation | Evaluation created and AI explanation enabled. | Explanation JSON attached to evaluation. | Retry once or fall back to deterministic explanation. |
| create_export | User requests data export. | Downloadable JSON/CSV export file. | Retry filesystem/storage errors. |
| backup_database | Scheduled maintenance. | Database backup artifact. | Alert on failure. |

### 11.4 JobRecord Status Updates

Every long-running task should create or update a JobRecord. The UI should not guess task status from Celery internals. JobRecord is the user-visible source of truth.

```text

JobRecord fields used by the UI:
- status: queued | running | succeeded | failed | canceled | retrying
- progress: integer 0-100
- message: short human-readable status
- error_message: shown only when failed
- result_json: link ids, counts, output file id, or created entity ids
```

## 12. Metadata Provider Design

### 12.1 Provider Abstraction

CanonOS should not hard-code the app around one external provider. Providers change. The backend should define a provider interface and treat external metadata as enrichment, not as canonical user truth.

```text

class MetadataProvider:
    provider_name: str

    def search(self, query: str, medium: str | None) -> list[ProviderSearchResult]: ...
    def fetch_details(self, external_id: str) -> ProviderMediaDetails: ...
    def fetch_credits(self, external_id: str) -> list[ProviderCredit]: ...
    def normalize(self, payload: dict) -> NormalizedMediaDTO: ...
```

### 12.2 Provider Types

| Provider Type | Examples of Data | CanonOS Handling |
| --- | --- | --- |
| Movie/TV provider | Title, release date, runtime, credits, synopsis, genres. | Normalize to MediaItem, Creator, MediaCredit, TaxonomyTerm. |
| Anime provider | Anime-specific title variants, format, episodes, studios, source type. | Normalize medium carefully: anime_series, anime_movie, OVA if later added. |
| Book provider | Author, publication date, page count, description, editions. | Normalize source works and written media. |
| Audiobook provider | Narrator, duration, publisher, release date. | Normalize as audiobook and link to source work if known. |
| Manual provider | User-entered metadata. | Always available and used when external data is missing. |
| AI provider | Theme extraction, trope classification, explanation text. | Optional enrichment only. Never replaces user judgment. |

### 12.3 Metadata Conflict Resolution

- User edits override provider data for user-facing display when the user explicitly sets a value.
- Canonical metadata stores provider payloads separately from normalized fields.
- External IDs must be preserved so records can be refreshed or repaired later.
- When two providers disagree, prefer the provider configured as primary for that medium, but keep alternate data in raw_json.
- Never overwrite a user note, personal rating, status, or aftertaste log through metadata refresh.
## 13. Search and Discovery Design

### 13.1 Search Layers

| Layer | MVP Design | Later Upgrade |
| --- | --- | --- |
| Title search | PostgreSQL full-text search and trigram-like matching if enabled. | Dedicated search engine only if needed. |
| Faceted filtering | PostgreSQL filters: medium, year, country, status, score, tags, creator, runtime. | Saved advanced queries. |
| Semantic similarity | Optional pgvector embeddings inside PostgreSQL. | External vector DB only if PostgreSQL becomes insufficient. |
| Deep-cut discovery | Rules and filters for underexplored eras, countries, creators, and low-exposure taxonomy terms. | Provider crawling and curated lists. |
| Narrative DNA | Taxonomy + user dimensions + optional AI tags. | Script/subtitle/book text analysis later. |

### 13.2 Media Archaeologist Algorithm

```text

1. Identify underexplored user areas:
   - countries/languages with low exposure but high adjacent satisfaction
   - older decades with high satisfaction but low count
   - creators adjacent to favorites
   - themes with high impact but low recent exposure

2. Generate candidate pool:
   - saved candidates
   - provider search results
   - internal media items not consumed
   - source/adaptation relations

3. Filter obvious mismatches:
   - already dropped unless marked reconsider
   - high regret pattern match
   - too long for current commitment preference

4. Score candidates:
   - taste fit
   - novelty
   - underexplored bonus
   - anti-generic risk
   - confidence

5. Return a small explainable list, not a giant feed.
```

### 13.3 Discovery Output Rules

- Return fewer, better candidates. A list of 5 strong options is better than 100 weak options.
- Every candidate must include reasons, risks, confidence, and suggested action.
- The user must be able to save, evaluate, hide, reject, or mark a candidate as already known.
- Rejected candidates should teach the system why they were wrong.
## 14. Authentication, Authorization, and Security

### 14.1 Authentication Design

The MVP should use cookie-based session authentication served from the same site as the frontend. This avoids storing tokens in localStorage. The API must expose a CSRF endpoint so the frontend can safely send unsafe requests.

| Concern | Design |
| --- | --- |
| Login | POST /api/v1/auth/login/ sets an HTTP-only secure session cookie. |
| Logout | POST /api/v1/auth/logout/ clears the session. |
| Current user | GET /api/v1/auth/me/ returns the current user and settings needed to bootstrap the app. |
| CSRF | GET /api/v1/auth/csrf/ sets or returns a CSRF token used by Axios. |
| Same-origin production | Serve web and API under the same domain where possible. |
| Cross-origin local dev | Use django-cors-headers and explicit trusted origins only. |

### 14.2 Authorization Rules

- A user can only access their own user-specific entries, notes, aftertaste logs, evaluations, queue items, seasons, imports, exports, and jobs.
- Canonical MediaItem data can be shared internally, but user-specific overlays are private.
- Admin-only actions include provider configuration, forced metadata repair, global taxonomy cleanup, and direct job retries.
- All destructive operations should require authenticated user ownership and should be logged in audit_event.
### 14.3 Security Controls

| Area | Control |
| --- | --- |
| Secrets | Use environment variables or a secret manager. Never commit provider keys, AI keys, database passwords, or Django secret key. |
| Cookies | HTTP-only, Secure in production, SameSite=Lax by default. |
| CSRF | Required for POST/PATCH/PUT/DELETE. |
| Rate limiting | Add per-user and per-IP throttles for login, evaluation creation, metadata refresh, and AI jobs. |
| Input validation | DRF serializers validate API inputs. zod validates frontend forms before submission. |
| File uploads | Restrict import file size and type. Parse safely. Never execute uploaded content. |
| Audit | Log login, import, export, destructive actions, provider key changes, and admin actions. |
| Backups | Encrypt backups if stored outside the machine. |
| AI privacy | Only send user notes to AI providers when the feature is enabled and the user accepts the privacy tradeoff. |

## 15. Deployment and Runtime Design

### 15.1 Local Development Runtime

```text

Services in docker-compose.dev.yml:
- web: Vite dev server
- api: Django development server
- worker: Celery worker
- beat: Celery beat scheduler
- postgres: PostgreSQL database
- redis: cache and Celery broker
- optional mailhog: local email testing if email is added
```

### 15.2 Production Runtime

```text

Browser
  -> Reverse proxy / TLS
      -> web static assets or Vite-built frontend files
      -> api service running Django via gunicorn/uvicorn-compatible process
      -> worker service running Celery workers
      -> beat service running scheduled Celery jobs
      -> PostgreSQL
      -> Redis
      -> optional RabbitMQ later
```

### 15.3 Environment Variables

| Variable | Purpose | Required |
| --- | --- | --- |
| DJANGO_SETTINGS_MODULE | Select local, production, or test settings. | Yes |
| DJANGO_SECRET_KEY | Django cryptographic secret. | Yes |
| DATABASE_URL | PostgreSQL connection string. | Yes |
| REDIS_URL | Redis cache/broker URL. | Yes |
| CELERY_BROKER_URL | Celery broker URL. Defaults to Redis in MVP. | Yes |
| CELERY_RESULT_BACKEND | Celery result backend. Defaults to Redis in MVP. | Yes |
| ALLOWED_HOSTS | Allowed Django hosts. | Yes production |
| CSRF_TRUSTED_ORIGINS | Trusted frontend origins. | Yes production |
| CORS_ALLOWED_ORIGINS | Only needed for cross-origin local/prod setup. | Conditional |
| VITE_API_BASE_URL | Frontend API base URL. | Yes frontend |
| METADATA_PROVIDER_KEYS | Provider keys stored as individual env vars or secret references. | Conditional |
| AI_PROVIDER_KEY | AI feature provider key. | Optional |
| ENABLE_AI_FEATURES | Feature flag for AI enrichment. | Optional |
| ENABLE_PGVECTOR | Feature flag for vector search. | Optional |
| BACKUP_STORAGE_PATH | Where exports/backups are stored. | Conditional |

### 15.4 Deployment Steps

1. Build frontend assets using pnpm web:build.
1. Build API and worker images.
1. Run database migrations.
1. Collect static assets if Django serves docs/admin assets.
1. Start api, worker, beat, postgres, redis, and reverse proxy services.
1. Verify /api/health/, /api/schema/, Swagger, and Scalar.
1. Create admin user and configure providers.
1. Run smoke tests: login, add media, add library entry, evaluate candidate, create aftertaste log.
### 15.5 Backup and Restore

- Database backup is mandatory because the user's media history and taste data are the core value of the system.
- Backups should include PostgreSQL dumps and exported user data JSON.
- Uploads/import files and generated exports should be backed up if stored locally.
- A restore script should be tested during development, not only after disaster.
## 16. Testing Strategy

### 16.1 Backend Tests

| Test Type | What to Test |
| --- | --- |
| Model tests | Constraints, unique rules, enum behavior, soft deletion, timestamps. |
| Service tests | Candidate evaluation, taste recalculation, queue generation, import processing, adaptation guidance. |
| Scoring tests | Pure formula functions with fixed inputs and expected outputs. |
| API tests | Auth, permissions, serializers, filtering, pagination, endpoint responses. |
| Task tests | Celery task wrappers, JobRecord progress, retry-safe behavior. |
| Provider tests | Provider adapters with mocked external responses. |
| Migration tests | Important migrations and data integrity after schema changes. |

### 16.2 Frontend Tests

| Test Type | What to Test |
| --- | --- |
| Component tests | Score cards, verdict badges, forms, filters, critic panels, empty states. |
| Hook tests | SWR hooks, mutation helpers, error normalization. |
| Store tests | Zustand stores for mood, filters, UI state. |
| Route tests | Navigation and protected routes. |
| E2E tests | Login, add media, log completion, evaluate candidate, run tonight mode, export data. |

### 16.3 Golden Scoring Dataset

The recommendation engine needs a small golden dataset. It should include media examples with known expected verdicts so formula changes do not silently break the product.

| Scenario | Expected Behavior |
| --- | --- |
| High taste fit, low genericness, good mood fit | Watch/read/listen now. |
| High taste fit but low current energy | Delay or sample, not skip. |
| Modern work with strong authorial voice | Do not penalize simply for being modern. |
| Popular but generic and weak ending | Skip or sample with strong warning. |
| Long series during series fatigue | Delay even if generally good. |
| Low metadata confidence | Return unknown or sample, schedule enrichment. |

## 17. Observability and Operations

### 17.1 Logging

- Every request should have a request_id included in logs and error responses.
- Log important service operations: candidate evaluated, taste recalculated, import completed, export created, metadata refreshed.
- Do not log private note bodies or sensitive AI prompts by default.
- Celery tasks should log job id, user id if applicable, task name, status, and duration.
### 17.2 Health Checks

| Endpoint | Checks |
| --- | --- |
| GET /api/health/ | API process alive. |
| GET /api/health/db/ | Database connection and simple query. |
| GET /api/health/redis/ | Redis reachable. |
| GET /api/health/celery/ | Optional worker heartbeat or recent job check. |

### 17.3 Admin Operations

- View recent jobs and failed jobs.
- Retry failed metadata enrichment or import jobs.
- Recalculate taste profile for the current user.
- Repair duplicate media items by merging canonical records.
- Export user data.
- Review audit events for destructive actions.
## 18. Implementation Roadmap

| Phase | Goal | Deliverables |
| --- | --- | --- |
| Phase 0 - Foundation | Create the monorepo and development environment. | pnpm workspace, Vite app, Django app, Docker Compose, PostgreSQL, Redis, CI skeleton, Swagger/Scalar docs. |
| Phase 1 - Auth and Library | Make CanonOS usable as a tracker. | Login/logout, current user, media CRUD, library entries, statuses, basic ratings, notes, search/filter. |
| Phase 2 - Taste and Aftertaste | Capture useful taste data. | Dimension definitions, dimension scores, aftertaste logs, taste profile snapshots, basic charts. |
| Phase 3 - Candidate Evaluator | Evaluate one title before committing. | Candidate evaluation endpoint, anti-generic factors, verdicts, explanations, evaluation UI. |
| Phase 4 - Tonight Mode | Choose what fits now. | Mood/context form, adaptive queue, ranked options, accept/reject/defer feedback. |
| Phase 5 - Metadata and Imports | Reduce manual data entry. | Provider abstraction, metadata enrichment jobs, import batches, exports, job status UI. |
| Phase 6 - Discovery | Find deep cuts and underexplored territory. | Media Archaeologist, saved candidates, discovery runs, optional semantic search. |
| Phase 7 - Critic Council and Adaptations | Make advice richer and cross-medium. | Critic Council explanations, adaptation relation maps, source-first/adaptation-first advice. |
| Phase 8 - Polish and Hardening | Prepare for long-term personal reliance. | Backups, restore scripts, accessibility improvements, performance tuning, final docs. |

### 18.1 MVP Definition

The MVP is complete when the user can reliably use CanonOS to track media, log taste, evaluate a candidate, and get a useful tonight recommendation.

- Must have: auth, library, media detail, ratings, notes, aftertaste log, basic taste profile, candidate evaluator, tonight mode, API docs, backup/export.
- Can wait: full Critic Council, AI, semantic search, many external providers, native mobile, social features, advanced adaptation intelligence.
### 18.2 Definition of Done

- Feature has backend models/services/API if it stores or changes data.
- Feature has frontend screen or component if user-facing.
- Feature has tests for core business rules.
- Feature is documented in OpenAPI when it exposes an endpoint.
- Feature has loading, empty, error, and success states in the UI.
- Feature respects user ownership and permissions.
- Feature does not leak sensitive data into logs.
## 19. Risks, Tradeoffs, and Mitigations

| Risk | Why It Matters | Mitigation |
| --- | --- | --- |
| Recommendation logic becomes too vague | The user will not trust the system if it sounds like generic AI advice. | Use explicit scoring factors, deterministic formulas, and visible explanations. |
| Too much manual data entry | The user may stop using the system. | Add imports early and provider enrichment in Phase 5. |
| AI hallucination | Bad facts or invented claims would destroy trust. | Keep AI optional, cite provider/source fields internally, never let AI overwrite canonical facts. |
| Over-engineering infrastructure | The project may become too heavy before it is useful. | Use Redis for MVP; add RabbitMQ/search engines only when data proves need. |
| Taste model becomes an echo chamber | It may reject all modern works or all risky works. | Include Modern Defender logic, novelty score, wildcard options, and positive-exception bonuses. |
| Database grows messy from duplicate media | Duplicate titles will harm recommendations. | Use external IDs, merge tools, canonical records, and provider confidence. |
| User burnout misread as dislike | The system could learn the wrong preference. | Track mood, fatigue, completion context, and delayed aftertaste separately. |
| Long-running jobs fail silently | Imports and enrichment become unreliable. | Use JobRecord, retries, visible status, and admin retry controls. |

### 19.1 Key Tradeoffs

- REST API over GraphQL: REST is simpler, easier to document with Swagger/Scalar, and enough for the MVP.
- PostgreSQL full-text search over dedicated search service: simpler operations for a personal system.
- Redis broker over RabbitMQ for MVP: fewer services and enough for early Celery workloads.
- Cookie session auth over localStorage tokens: safer for a browser-first private application.
- Deterministic scoring over pure AI recommendation: more trustworthy, testable, and explainable.
## 20. Appendices

### 20.1 Frontend Feature Module Template

```text

features/library/
  pages/
    LibraryPage.tsx
    LibraryEntryDetailPage.tsx
  components/
    LibraryFilters.tsx
    LibraryTable.tsx
    LibraryEntryForm.tsx
    RatingDimensionEditor.tsx
  hooks/
    useLibraryEntries.ts
    useLibraryEntry.ts
    useUpdateLibraryEntry.ts
  schemas/
    libraryEntrySchema.ts
  types.ts
  index.ts
```

### 20.2 Backend App Template

```text

canonos/library/
  models.py
  serializers.py
  views.py
  urls.py
  services.py
  selectors.py
  permissions.py
  admin.py
  tasks.py
  tests/
    test_models.py
    test_api.py
    test_services.py
```

### 20.3 Example Service Interface

```text

@dataclass(frozen=True)
class EvaluationContext:
    mood: str | None
    energy_level: int | None
    focus_level: int | None
    time_available_minutes: int | None
    risk_tolerance: str
    desired_effect: list[str]
    avoid: list[str]

class CandidateEvaluationService:
    def evaluate(self, *, user: User, media_item: MediaItem, context: EvaluationContext) -> CandidateEvaluation:
        taste_profile = TasteProfileSelector.current_for_user(user)
        signals = CandidateSignalBuilder.build(media_item)
        scores = CandidateScoringEngine.score(taste_profile, signals, context)
        explanation = EvaluationExplanationBuilder.build(scores, signals, context)
        return CandidateEvaluation.objects.create(...)
```

### 20.4 Coding Conventions

| Area | Convention |
| --- | --- |
| Python naming | snake_case for modules, functions, fields. PascalCase for classes. |
| TypeScript naming | camelCase for variables/functions, PascalCase for components/types. |
| API URLs | Plural nouns with hyphens where needed: /media-items/, /saved-candidates/. |
| DTO names | Use clear suffixes: MediaItemDTO, CandidateEvaluationResponse, TonightContextRequest. |
| Service names | Action/domain names: CandidateEvaluationService, QueueService, TasteProfileService. |
| Tests | Backend test files test_*.py. Frontend tests *.test.tsx or *.test.ts. |
| Migrations | Small, reviewable migrations. Avoid mixing unrelated schema changes. |

### 20.5 OpenAPI and API Client Generation

1. Backend exposes /api/schema/ from DRF/OpenAPI tooling.
1. Root script exports schema to docs/api/openapi.json.
1. packages/api-client generates TypeScript types from openapi.json.
1. Frontend imports typed client functions from @canonos/api-client.
1. CI fails if the schema changes but generated client files are not updated.
### 20.6 Initial Feature Flags

| Flag | Default | Meaning |
| --- | --- | --- |
| ENABLE_AI_FEATURES | false | Enables AI-generated classifications, explanations, and embeddings. |
| ENABLE_PGVECTOR | false | Enables vector search tables/queries if PostgreSQL extension is installed. |
| ENABLE_EXTERNAL_METADATA | true | Allows configured metadata provider jobs. |
| ENABLE_RABBITMQ | false | Switches Celery broker to RabbitMQ when explicitly configured. |
| ENABLE_PUBLIC_API_DOCS | false production | Allows unauthenticated API docs only in safe environments. |

### 20.7 Final Build Checklist

- Monorepo structure exists and root scripts work.
- Frontend can authenticate, fetch current user, and call protected API endpoints.
- Swagger and Scalar show the same current OpenAPI schema.
- PostgreSQL migrations create all MVP tables.
- Redis-backed Celery worker can process a test job and update JobRecord.
- Library, aftertaste, candidate evaluator, and tonight mode are functional.
- Recommendation explanations are clear enough that the user can disagree productively.
- Exports and backups exist before the system becomes heavily used.
- RabbitMQ is not added until there is a demonstrated need.
## End of Document

This SDS is intended to be the baseline technical design for CanonOS implementation. Future changes should be captured as Architecture Decision Records in docs/adr/ and reflected in this document when they materially affect the system design.
