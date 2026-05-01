# CanonOS API Notes

The backend API is implemented under `apps/api` with Django REST Framework. OpenAPI generation, Swagger UI, and Scalar documentation are part of the foundation.

## Current Base Paths

- `/api/health/` for service readiness.
- `/api/schema/` for the generated OpenAPI schema.
- `/api/docs/swagger/` for Swagger UI.
- `/api/docs/scalar/` for Scalar API documentation.

## Planned Product Paths

Product endpoints will be introduced under `/api/v1/` as feature modules are implemented.

## Contract Rule

When an API response shape changes, update serializers, shared contracts, frontend API client types, and tests in the same milestone.
