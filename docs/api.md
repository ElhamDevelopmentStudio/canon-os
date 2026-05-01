# CanonOS API Notes

The backend API is implemented under `apps/api` with Django REST Framework. OpenAPI generation, Swagger UI, and Scalar documentation are part of the foundation.

## Current Base Paths

- `/api/health/` for service readiness.
- `/api/schema/` for the generated OpenAPI schema.
- `/api/docs/swagger/` for Swagger UI.
- `/api/docs/scalar/` for Scalar API documentation.

## Frontend Integration

The frontend shared Axios client lives at `apps/web/src/lib/api.ts` and reads `VITE_API_BASE_URL`, which defaults to `/api`. Local development should use `http://localhost:8000/api` so the web app can call `GET /health/` through the shared client.

The backend CORS configuration allows the default Vite origin `http://localhost:5173` in local settings.

## Planned Product Paths

Product endpoints will be introduced under `/api/v1/` as feature modules are implemented.

## Contract Rule

When an API response shape changes, update serializers, shared contracts, frontend API client types, and tests in the same milestone.

## API Root And Documentation

- `GET /api/` lists available and planned MVP API entry points.
- `GET /api/health/` returns service health.
- `GET /api/schema/` returns the OpenAPI schema.
- `GET /api/docs/swagger/` opens Swagger UI.
- `GET /api/docs/scalar/` opens Scalar API Reference.

