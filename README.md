# CanonOS

CanonOS is a local-first personal media intelligence system for movies, series, anime, novels, and audiobooks. It helps a high-volume media consumer decide what is actually worth their time by combining a private media library, taste tracking, candidate evaluation, queue management, aftertaste logging, and explainable recommendations.

CanonOS is intentionally not a generic recommendation app. It is designed to protect attention, explain tradeoffs, identify genericness risk, and still surface genuinely worthwhile modern or obscure works when they fit the user's standards and current state.

## Stack Overview

CanonOS is organized as a monorepo with these planned areas:

- `apps/web`: React + Vite + TypeScript frontend using Tailwind CSS, shadcn/ui patterns, React Router, SWR, Axios, and Zustand.
- `apps/api`: Django REST Framework backend with PostgreSQL, Redis, Celery, OpenAPI/Swagger, and Scalar API documentation.
- `packages/contracts`: shared TypeScript contracts and validation schemas.
- `packages/api-client`: generated or handwritten frontend API client helpers.
- `packages/config`: shared tooling and configuration presets.
- `infra`: local and deployment infrastructure files.
- `docs`: product, architecture, testing, deployment, and manual test documentation.

The backend owns business rules, database writes, recommendation scoring, and provider orchestration. The frontend presents server-produced data and keeps UI state only.

## Local Development

The repository is being built module by module from `docs/CHECKLIST.md`. The root workspace scripts are available now; app-specific commands become active as each app is initialized.

### Prerequisites

- Node.js 20+
- Corepack enabled for pnpm (`corepack enable`)
- Python 3.10+
- PostgreSQL 15+ for backend development
- Redis 7+ for cache and Celery broker in the MVP

### Environment Setup

1. Copy the root environment template:

   ```bash
   cp .env.example .env
   ```

2. Adjust database, Redis, Django, and frontend URLs for your local machine.

### Root Commands

Run commands from the repository root:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

These commands discover app/package scripts as modules are added. If no child workspace has a matching script yet, the command exits successfully and reports that nothing was configured for that check.

### Service Commands

```bash
corepack pnpm dev:web      # start the Vite frontend
corepack pnpm dev:api      # start the Django API
corepack pnpm dev:worker   # start the Celery worker
corepack pnpm dev:all      # start available local services in one terminal
corepack pnpm stop:all     # stop services recorded by dev:all
```

Useful app-specific commands:

```bash
corepack pnpm --filter @canonos/api run bootstrap
corepack pnpm --filter @canonos/api run test
corepack pnpm --filter @canonos/web run dev
corepack pnpm --filter @canonos/web run test
```

### Foundation Smoke Checks

After starting local dependencies, these checks should pass:

```bash
pg_isready -h 127.0.0.1 -p 5432
apps/api/.venv/bin/python - <<'PY'
from redis import Redis
assert Redis.from_url("redis://localhost:6379/0").ping() is True
PY
curl http://127.0.0.1:8000/api/health/
```

The frontend should be configured with `VITE_API_BASE_URL=http://localhost:8000/api` so the temporary home page can show backend health.

## Source Documents

- Product requirements: `docs/CanonOS_SRS_v1_0.md`
- Software design: `docs/CanonOS_Software_Design_Document_SDS.md`
- Delivery checklist: `docs/CHECKLIST.md`
- PR checklist: `docs/PR_CHECKLIST.md`
- Manual test template: `docs/manual-tests/TEMPLATE.md`

## Development Rules

- Build frontend and backend in parallel within each milestone.
- Keep recommendation logic deterministic and explainable first; AI assistance comes after inspectable rules.
- Add or update automated tests and manual test docs for every user-facing feature change.
- Run lint, typecheck, tests, build, and E2E before marking implementation tasks complete.
