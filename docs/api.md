# CanonOS API Notes

The backend API will be implemented under `apps/api` with Django REST Framework. OpenAPI generation, Swagger UI, and Scalar documentation are required for the MVP foundation.

## Planned Base Paths

- `/api/health/` for service readiness.
- `/api/v1/` for versioned product endpoints.
- `/api/schema/`, `/api/docs/swagger/`, and `/api/docs/scalar/` once API documentation tooling is installed.

## Contract Rule

When an API response shape changes, update serializers, shared contracts, frontend API client types, and tests in the same milestone.
