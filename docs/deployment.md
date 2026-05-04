# CanonOS Deployment Notes

CanonOS starts as a local-first private web app and keeps a path open for private cloud deployment.

## Branch Protection Expectations

Protected branches should require:

- Passing CI checks for lint, typecheck, tests, build, and E2E.
- At least one review approval before merge.
- Branches to be up to date before merge.
- Direct pushes and force-pushes to protected branches to be blocked.
- Completion of `docs/PR_CHECKLIST.md` before merge.

## Runtime Services

The expected service split is:

- `frontend` — nginx serving the Vite build and proxying same-origin `/api`, `/admin`, and `/static` requests.
- `api` — Django REST API served by Gunicorn.
- `worker` — Celery worker using Redis as broker/result backend.
- `beat` — Celery beat scheduler for future periodic maintenance jobs.
- `postgres` — canonical PostgreSQL database.
- `redis` — cache plus Celery broker/result backend.

RabbitMQ remains optional until Redis is insufficient for queue reliability or routing needs.

## Local Dependency Services

Development uses Docker for stateful dependencies while app processes run locally. Start PostgreSQL and Redis with:

```bash
corepack pnpm compose:dev
```

The local compose file is `infra/docker-compose.dev.yml` and exposes PostgreSQL on `15432` and Redis on `16379` to avoid conflicts with host-installed services.

Run migrations against Docker PostgreSQL before API e2e checks:

```bash
DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos \
REDIS_URL=redis://localhost:16379/0 \
CELERY_BROKER_URL=redis://localhost:16379/0 \
CELERY_RESULT_BACKEND=redis://localhost:16379/1 \
DJANGO_SETTINGS_MODULE=config.settings.local \
apps/api/.venv/bin/python apps/api/manage.py migrate --noinput
```

## Full Docker Compose App

For a local deployment smoke test:

```bash
cp .env.example .env
corepack pnpm compose:app
corepack pnpm compose:app:smoke
```

`compose:app` builds `canonos-api:local` and `canonos-web:local`, waits for PostgreSQL/Redis, runs Django migrations and `collectstatic`, starts API/worker/beat/frontend services, and exposes:

- `http://localhost:5173` — frontend
- `http://localhost:5173/api/health/` — API through frontend same-origin proxy
- `http://localhost:8000/api/health/` — API direct port

Use `corepack pnpm compose:app:logs` for app logs and `corepack pnpm compose:app:down` to stop the stack.

## Required Environment Variables

Set these in the root `.env` or the target platform's secret manager:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DJANGO_SETTINGS_MODULE` | Selects Django settings. Use `config.settings.production` outside local smoke tests. | `config.settings.local` |
| `DJANGO_SECRET_KEY` | Django signing secret. Must be unique and secret outside local development. | development placeholder |
| `DJANGO_ALLOWED_HOSTS` | Comma-separated API host allowlist. | `localhost,127.0.0.1,api,frontend` |
| `DJANGO_CORS_ALLOWED_ORIGINS` | Browser origins allowed to call API directly. Prefer same-origin proxy in production. | `http://localhost:5173,http://127.0.0.1:5173` |
| `DJANGO_CSRF_TRUSTED_ORIGINS` | Origins trusted for CSRF-protected browser writes. | `http://localhost:5173,http://127.0.0.1:5173` |
| `DATABASE_URL` | PostgreSQL connection string for host-run Django. Compose app overrides this to the internal `postgres` service. | `postgresql://canonos:canonos@localhost:15432/canonos` |
| `REDIS_URL` | Redis cache URL for host-run Django. Compose app overrides this to the internal `redis` service. | `redis://localhost:16379/0` |
| `CELERY_BROKER_URL` | Celery broker URL. | `redis://localhost:16379/0` |
| `CELERY_RESULT_BACKEND` | Celery result backend URL. | `redis://localhost:16379/1` |
| `VITE_API_BASE_URL` | Frontend API URL for host-run Vite builds. | `http://localhost:8000/api` |
| `VITE_DOCKER_API_BASE_URL` | Frontend API URL baked into Docker web image. Keep `/api` for nginx same-origin proxy. | `/api` |
| `BACKUP_STORAGE_PATH` | Host path for private backup/export artifacts. | `./tmp/backups` |

Production settings enable secure cookies, HSTS, SSL redirect, referrer policy, content-type nosniffing, and `X-Frame-Options: DENY`. Do not expose production over plain HTTP; terminate TLS at a reverse proxy/load balancer and pass `X-Forwarded-Proto: https` to Django.

## Production Deployment Checklist

Before a non-local deployment:

1. Set `DJANGO_SETTINGS_MODULE=config.settings.production`.
2. Generate a unique `DJANGO_SECRET_KEY` and store it in a secret manager.
3. Set exact `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS`, and `DJANGO_CSRF_TRUSTED_ORIGINS`; do not use wildcard credentialed CORS.
4. Provision PostgreSQL and Redis with persistent storage and backups.
5. Build images:
   ```bash
   docker build -f infra/docker/api.Dockerfile -t canonos-api:prod .
   docker build -f infra/docker/web.Dockerfile --build-arg VITE_API_BASE_URL=/api -t canonos-web:prod .
   ```
6. Run migrations before serving traffic:
   ```bash
   python manage.py migrate --noinput
   ```
7. Collect static files for Django admin/API docs assets:
   ```bash
   python manage.py collectstatic --noinput
   ```
8. Start API, worker, beat, PostgreSQL, Redis, and frontend/reverse proxy services.
9. Verify health endpoints:
   ```bash
   curl -fsS https://<host>/api/health/
   curl -fsS https://<host>/api/health/db/
   curl -fsS https://<host>/api/health/redis/
   curl -fsS https://<host>/api/health/celery/
   ```
10. Verify `/api/schema/`, `/api/docs/swagger/`, and `/api/docs/scalar/` are reachable according to the environment's auth policy.
11. Run a browser login/register smoke test and a backup/export smoke test.
12. Confirm logs are collected from API, worker, beat, frontend, PostgreSQL, and Redis.

## Static And Media Files

- The frontend Docker image serves built Vite assets with nginx.
- Django uses `STATIC_ROOT=apps/api/staticfiles`; `collectstatic` fills this directory.
- Production settings use WhiteNoise compressed manifest storage so Django admin/API documentation static assets can be served safely by the API process or a reverse proxy.
- User media uploads are not currently a core CanonOS flow. If uploads are added later, configure a persistent media volume or object storage and document retention/backups before enabling them.

## Database Backup And Restore

The database is the CanonOS source of truth. Backups are mandatory before upgrades, migrations, and destructive account/data operations.

Create a PostgreSQL backup from Compose dependency mode:

```bash
mkdir -p tmp/backups
docker compose -f infra/docker-compose.dev.yml exec -T postgres \
  pg_dump -U canonos -d canonos --format=custom \
  > tmp/backups/canonos-$(date +%Y%m%d-%H%M%S).dump
```

Restore into a fresh local database:

```bash
docker compose -f infra/docker-compose.dev.yml exec -T postgres \
  pg_restore -U canonos -d canonos --clean --if-exists \
  < tmp/backups/<backup-file>.dump
```

For production:

- Automate PostgreSQL dumps or managed snapshots on a schedule.
- Encrypt backups when stored outside the machine.
- Keep at least one recent off-host backup.
- Test restore into a disposable database before trusting the backup plan.
- Pair database backups with JSON export downloads when validating user-visible portability.
