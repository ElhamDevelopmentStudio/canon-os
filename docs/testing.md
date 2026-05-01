# CanonOS Testing Notes

CanonOS uses root verification gates for every implementation slice:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

As modules are initialized, their package-level scripts should be wired into the root commands. User-facing features must also update the matching manual test document under `docs/manual-tests/`.

## MVP-M01 QA Evidence

Foundation QA checks verified during MVP-M01:

- Backend startup: Django runserver responded on `http://127.0.0.1:8010/api/health/` using test settings.
- Frontend startup: Vite served `http://127.0.0.1:5174/`.
- PostgreSQL: `pg_isready -h 127.0.0.1 -p 5432` reported accepting connections.
- Redis: Python Redis client returned `PONG` for `redis://localhost:6379/0`.
- Health endpoint: `GET /api/health/` returned `{"status":"ok","service":"canonos-api","version":"0.1.0"}`.

## Docker-backed E2E Checks

`corepack pnpm e2e` exercises the API against Dockerized PostgreSQL and Redis when the compose stack is running. The API e2e script defaults to:

- `DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos`
- `REDIS_URL=redis://localhost:16379/0`

Start services first with `corepack pnpm compose:dev`, then run migrations and e2e. This keeps fast unit tests local while making the e2e gate prove the configured PostgreSQL and Redis paths.
