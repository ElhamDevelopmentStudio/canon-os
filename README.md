# CanonOS

CanonOS is a local-first personal media intelligence system for movies, series, anime, novels, and audiobooks. It helps a high-volume media consumer decide what is actually worth their time by combining a private media library, taste tracking, candidate evaluation, queue management, aftertaste logging, settings, data portability, and explainable recommendations.

CanonOS is intentionally not a generic recommendation app. It is designed to protect attention, explain tradeoffs, identify genericness risk, and still surface genuinely worthwhile modern or obscure works when they fit the user's standards and current state.

## MVP Features

- Session authentication with browser CSRF, Django sessions, protected routes, and public-route redirects.
- Dashboard summary with library metrics, recent activity, high-rated media, and taste signals.
- Media Library CRUD for user-owned movies, series, anime, novels, and audiobooks.
- Media Detail scoring with reusable taste dimensions and score notes.
- Candidate Evaluator for pre-watch/read/listen decisions, deterministic explanations, and add-to-library/queue actions.
- Adaptive Queue with priority/context metadata, edit/delete, and reorder.
- Tonight Mode recommendations using queue, planned media, user settings, time, mood, and energy context.
- Aftertaste Log for post-completion/drop reflections and prompts.
- Taste Profile summary with red flags, strengths, dimensions, and influential works.
- Settings for profile/display/recommendation preferences plus import/export and backup flows.
- OpenAPI schema, Swagger UI, and Scalar API documentation for the MVP API.
- Real browser-to-backend Playwright e2e coverage for API-backed user flows.

## Stack Overview

CanonOS is organized as a monorepo with these areas:

- `apps/web`: React + Vite + TypeScript frontend using Tailwind CSS, shadcn/ui patterns, React Router, SWR, Axios, and Zustand.
- `apps/api`: Django REST Framework backend with PostgreSQL, Redis, Celery, OpenAPI/Swagger, and Scalar API documentation.
- `packages/contracts`: shared TypeScript contracts and validation schemas.
- `packages/api-client`: generated or handwritten frontend API client helpers.
- `packages/config`: shared tooling and configuration presets.
- `infra`: local and deployment infrastructure files.
- `docs`: product, architecture, testing, deployment, and manual test documentation.

The backend owns business rules, database writes, recommendation scoring, and provider orchestration. The frontend presents server-produced data and keeps UI state only.

## Local Development Setup

The repository is being built module by module from `docs/CHECKLIST.md`. Run all commands from the repository root unless a command explicitly changes directory.

### Prerequisites

- Node.js 20+
- Corepack enabled for pnpm (`corepack enable`)
- Python 3.10+
- Docker for local PostgreSQL and Redis services

### Environment Setup

1. Copy the root environment template:

   ```bash
   cp .env.example .env
   ```

2. Start local dependency services with Docker:

   ```bash
   corepack pnpm compose:dev
   ```

3. Bootstrap backend dependencies and migrations:

   ```bash
   corepack pnpm --filter @canonos/api run bootstrap
   DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos \
   REDIS_URL=redis://localhost:16379/0 \
   CELERY_BROKER_URL=redis://localhost:16379/0 \
   CELERY_RESULT_BACKEND=redis://localhost:16379/1 \
   DJANGO_SETTINGS_MODULE=config.settings.local \
   apps/api/.venv/bin/python apps/api/manage.py migrate --noinput
   ```

4. Start app processes in separate terminals when developing interactively:

   ```bash
   corepack pnpm dev:api
   corepack pnpm dev:web
   corepack pnpm dev:worker
   ```

The root `.env` is the frontend environment source of truth. Do not create `apps/web/.env`. Use `VITE_API_BASE_URL=http://localhost:8000/api` when the browser should call Django directly; otherwise Vite can proxy `/api` to `VITE_API_PROXY_TARGET`.

## Service URLs

| Service | URL |
| --- | --- |
| Web app | `http://localhost:5173` |
| Django API | `http://localhost:8000/api/` |
| Health endpoint | `http://localhost:8000/api/health/` |
| OpenAPI schema | `http://localhost:8000/api/schema/` |
| Swagger UI | `http://localhost:8000/api/docs/swagger/` |
| Scalar docs | `http://localhost:8000/api/docs/scalar/` |
| PostgreSQL via Docker | `localhost:15432` (`canonos` / `canonos`) |
| Redis via Docker | `localhost:16379` |

## Root Verification Commands

Run the required gates before considering a module complete:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

`corepack pnpm e2e` starts Dockerized PostgreSQL/Redis, starts Django on `localhost:8000`, starts Vite on `localhost:5173`, and runs real Playwright browser flows against the API. It verifies browser-origin API calls, CORS, CSRF, cookies, Django sessions, PostgreSQL, and Redis.

Useful app-specific commands:

```bash
corepack pnpm --filter @canonos/api run bootstrap
corepack pnpm --filter @canonos/api run lint
corepack pnpm --filter @canonos/api run test
corepack pnpm --filter @canonos/web run dev
corepack pnpm --filter @canonos/web run test
corepack pnpm --filter @canonos/web run e2e
```

## Foundation Smoke Checks

After starting local dependencies, these checks should pass:

```bash
pg_isready -h 127.0.0.1 -p 15432
apps/api/.venv/bin/python - <<'PY'
from redis import Redis
assert Redis.from_url("redis://localhost:16379/0").ping() is True
PY
DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos \
REDIS_URL=redis://localhost:16379/0 \
DJANGO_SETTINGS_MODULE=config.settings.local \
apps/api/.venv/bin/python apps/api/manage.py migrate --noinput
corepack pnpm e2e
```

## API Documentation

The API is documented from DRF serializers and drf-spectacular annotations. Validate schema generation with:

```bash
cd apps/api
.venv/bin/python manage.py spectacular --file /tmp/canonos-schema.yml --settings=config.settings.test --validate
```

Local docs are served at:

- Swagger UI: `http://localhost:8000/api/docs/swagger/`
- Scalar: `http://localhost:8000/api/docs/scalar/`

Every new endpoint must have serializer-backed schema coverage and either browser e2e coverage through a user-facing flow or a documented API-only e2e exception in `docs/testing.md`.

## Import, Export, And Backup Basics

Settings includes MVP data portability tools:

- CSV import preview validates media rows before writing any records.
- CSV import confirm writes only the previewed valid rows for the authenticated user.
- JSON export downloads user-owned profile/settings/media/scores/candidates/queue/aftertaste data for backup.
- Media/ratings CSV export downloads a spreadsheet-friendly library backup.

Before destructive data-management features are added, users should export a JSON backup from Settings. Import/export implementation details and tests live in the settings/portability docs and e2e coverage.

## Source Documents

- Product requirements: `docs/CanonOS_SRS_v1_0.md`
- Software design: `docs/CanonOS_Software_Design_Document_SDS.md`
- Delivery checklist: `docs/CHECKLIST.md`
- Frontend notes: `docs/frontend.md`
- Backend notes: `docs/backend.md`
- Architecture notes: `docs/architecture.md`
- Testing notes: `docs/testing.md`
- Deployment and branch protection: `docs/deployment.md`
- PR checklist: `docs/PR_CHECKLIST.md`
- Manual test template: `docs/manual-tests/TEMPLATE.md`

## CI, Branch Protection, And PR Checklist

`.github/workflows/ci.yml` runs lint, typecheck, tests, build, and E2E on pull requests and pushes to `main`/`master` with PostgreSQL and Redis services.

Protected branches should require:

- passing CI before merge;
- at least one review approval;
- up-to-date branches before merge;
- blocked direct pushes and force-pushes; and
- completion of `docs/PR_CHECKLIST.md`.

## Development Rules

- Build frontend and backend in parallel within each milestone.
- Keep recommendation logic deterministic and explainable first; AI assistance comes after inspectable rules.
- Add or update automated tests and manual test docs for every user-facing feature change.
- Run lint, typecheck, tests, build, and E2E before marking implementation tasks complete.
