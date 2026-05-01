# CanonOS Backend Notes

The API app lives in `apps/api` and uses Django REST Framework, PostgreSQL-ready settings, Redis, Celery, drf-spectacular, Swagger UI, and Scalar documentation.

## Current Foundation

- Django entrypoint: `apps/api/manage.py`
- Settings modules: `config.settings.local`, `config.settings.test`, and `config.settings.production`
- Health endpoint: `GET /api/health/`
- OpenAPI schema: `GET /api/schema/`
- Swagger docs: `GET /api/docs/swagger/`
- Scalar docs: `GET /api/docs/scalar/`
- Backend package scripts are exposed through `apps/api/package.json` and discovered by the root pnpm gates.

## Backend Rules

- Keep DRF views thin and move product logic into services/selectors.
- Tasks should call services and be retry-safe where practical.
- User-owned data must remain scoped to the authenticated owner once auth is implemented.
- Redis is the MVP cache and Celery broker. RabbitMQ remains optional until Redis is insufficient.

## Local Commands

```bash
corepack pnpm --filter @canonos/api run bootstrap
corepack pnpm --filter @canonos/api run dev
corepack pnpm --filter @canonos/api run worker
corepack pnpm --filter @canonos/api run test
```
