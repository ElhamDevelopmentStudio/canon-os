# CanonOS Infrastructure

CanonOS can run in two Docker modes:

1. **Dependency mode** for day-to-day development: PostgreSQL and Redis run in Docker while Django/Vite run on the host.
2. **Full app mode** for deployment smoke tests: PostgreSQL, Redis, API, Celery worker, Celery beat, and the static frontend run through Compose.

## Files

- `infra/docker-compose.dev.yml` — local dependency services plus optional app services behind the `app` profile.
- `infra/docker/api.Dockerfile` — Django API image used by the API, worker, and beat services.
- `infra/docker/web.Dockerfile` — Vite production build served by nginx.
- `infra/nginx/web.conf` — SPA static hosting plus same-origin `/api`, `/admin`, and `/static` proxying to Django.

## Dependency Services

From the repository root:

```bash
corepack pnpm compose:dev
corepack pnpm compose:dev:logs
corepack pnpm compose:dev:down
```

This starts:

- PostgreSQL 15 on host port `15432`
- Redis 7 on host port `16379`

The non-default host ports avoid conflicts with host-installed PostgreSQL or Redis.

Run Django migrations against the Docker PostgreSQL service:

```bash
DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos \
REDIS_URL=redis://localhost:16379/0 \
CELERY_BROKER_URL=redis://localhost:16379/0 \
CELERY_RESULT_BACKEND=redis://localhost:16379/1 \
DJANGO_SETTINGS_MODULE=config.settings.local \
apps/api/.venv/bin/python apps/api/manage.py migrate --noinput
```

Run e2e tests against Dockerized PostgreSQL and Redis:

```bash
corepack pnpm e2e
```

## Full App Compose Smoke Test

Copy `.env.example` to `.env`, set a non-default `DJANGO_SECRET_KEY` for any non-local deployment, then run:

```bash
corepack pnpm compose:app
corepack pnpm compose:app:ps
corepack pnpm compose:app:smoke
```

Full app mode exposes:

- Frontend/nginx: `http://localhost:5173`
- API directly: `http://localhost:8000/api/health/`
- API through frontend proxy: `http://localhost:5173/api/health/`

`compose:app` runs migrations and `collectstatic` before starting the API container. The worker and beat containers reuse the API image and override only the command.

Stop the full stack with:

```bash
corepack pnpm compose:app:down
```
