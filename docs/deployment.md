# CanonOS Deployment Notes

CanonOS starts as a local-first private web app and keeps a path open for private cloud deployment.

## Branch Protection Expectations

Protected branches should require:

- Passing CI checks for lint, typecheck, tests, build, and E2E.
- At least one review approval before merge.
- Branches to be up to date before merge.
- Direct pushes and force-pushes to protected branches to be blocked.
- Completion of `docs/PR_CHECKLIST.md` before merge.

## Runtime Direction

The expected service split is web, API, worker, beat, PostgreSQL, and Redis. RabbitMQ remains optional until Redis is insufficient for queue reliability or routing needs.

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
