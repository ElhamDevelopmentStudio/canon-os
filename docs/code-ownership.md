# Code Ownership

CanonOS is a monorepo. Changes should stay inside the smallest module that owns the behavior.

| Area | Owner Surface | Responsibility |
| --- | --- | --- |
| `apps/web` | Frontend app | React routes, browser state, shared UI components, API-backed user flows. |
| `apps/api` | Backend API | Django models, serializers, permissions, business services, OpenAPI schema, Celery entrypoints. |
| `packages/contracts` | Shared contracts | TypeScript DTOs/enums that mirror backend response and request shapes. |
| `infra` | Runtime infrastructure | Docker Compose, service wiring, local Postgres/Redis, deployment support. |
| `docs` | Product and engineering docs | SRS/SDS/checklist/manual tests/ADRs/testing rules. |
| `scripts` | Root developer automation | Cross-workspace commands and local service helpers. |

## Change Rules

- Backend endpoints that change response shapes must update serializers, contracts, frontend API usage, and tests in the same change.
- Frontend pages that call the API must keep loading, empty, error, and success states where practical.
- Shared UI components belong in `apps/web/src/components` only after they are useful beyond one feature.
- Product logic belongs in backend services/selectors; the frontend displays backend decisions.
- Infrastructure changes must document how to run and verify them locally.
