# Manual Test: Deployment And Infrastructure

## Happy Path: Full Docker Compose App

1. From the repo root, copy `.env.example` to `.env` if `.env` does not already exist.
   - Expected: root environment variables are available to Compose.
2. Run `corepack pnpm compose:app`.
   - Expected: PostgreSQL, Redis, API, worker, beat, and frontend containers start.
3. Run `corepack pnpm compose:app:smoke`.
   - Expected: Django checks pass and API, database, Redis, and Celery health endpoints return `ok`.
4. Open `http://localhost:5173`.
   - Expected: CanonOS loads through the frontend container.
5. Register or log in, then refresh the page.
   - Expected: the session persists and the dashboard reloads.

## Error Path: Missing Worker

1. Stop only the worker container with `docker compose -f infra/docker-compose.dev.yml --profile app stop worker`.
   - Expected: the API and frontend stay up.
2. Run `curl -fsS http://localhost:5173/api/health/celery/`.
   - Expected: the command fails or reports Celery unavailable.
3. Start the worker again with `corepack pnpm compose:app`.
   - Expected: the worker returns and `/api/health/celery/` reports `ok` again.

## Edge Case: Dependency-Only Mode

1. Run `corepack pnpm compose:dev`.
   - Expected: only PostgreSQL and Redis start.
2. Run the host API with `corepack pnpm dev:api` in a separate terminal.
   - Expected: the API uses Docker PostgreSQL/Redis through root `.env` values.
3. Visit `http://localhost:8000/api/health/db/` and `http://localhost:8000/api/health/redis/`.
   - Expected: both endpoints report `ok`.

## Cleanup

1. Run `corepack pnpm compose:app:down`.
   - Expected: app containers stop; named PostgreSQL/Redis volumes remain unless explicitly removed.
