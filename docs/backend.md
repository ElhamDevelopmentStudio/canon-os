# CanonOS Backend Notes

The API app will live in `apps/api` and use Django REST Framework, PostgreSQL, Redis, Celery, drf-spectacular, Swagger UI, and Scalar documentation.

## Backend Rules

- Keep DRF views thin and move product logic into services/selectors.
- Tasks should call services and be retry-safe where practical.
- User-owned data must remain scoped to the authenticated owner once auth is implemented.
