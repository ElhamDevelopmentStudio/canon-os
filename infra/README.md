# CanonOS Local Infrastructure

CanonOS runs application code locally during development, while stateful services run in Docker.

## Services

`infra/docker-compose.dev.yml` starts only the local dependencies:

- PostgreSQL 15 on host port `15432`
- Redis 7 on host port `16379`

The non-default host ports avoid conflicts with any PostgreSQL or Redis already installed on the machine.

## Commands

From the repository root:

```bash
corepack pnpm compose:dev
corepack pnpm compose:dev:logs
corepack pnpm compose:dev:down
```

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
DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos \
REDIS_URL=redis://localhost:16379/0 \
CELERY_BROKER_URL=redis://localhost:16379/0 \
CELERY_RESULT_BACKEND=redis://localhost:16379/1 \
corepack pnpm e2e
```
