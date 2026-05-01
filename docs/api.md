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


## Authentication Flow

CanonOS uses Django session authentication for the browser app. The frontend does not store bearer tokens in `localStorage`; Django owns the HTTP-only session cookie and Axios sends credentials with each API request.

Auth endpoints:

- `GET /api/auth/csrf/` sets/returns a CSRF token for unsafe requests.
- `POST /api/auth/register/` creates a user, creates a `UserProfile`, logs the user in, and returns the auth session.
- `POST /api/auth/login/` validates email/password credentials, logs the user in, and returns the auth session.
- `POST /api/auth/logout/` clears the current session.
- `GET /api/auth/me/` returns the authenticated user and profile for app bootstrap.
- `GET /api/auth/profile/` returns the current profile.
- `PATCH /api/auth/profile/` updates `displayName`, `timezone`, and/or `preferredLanguage`.

Request/response contracts live in `packages/contracts/src/auth.ts`. Frontend auth calls live in `apps/web/src/features/auth/authApi.ts`, and session state lives in `apps/web/src/stores/authStore.ts`.

The MVP uses Django's built-in user model with email as username. This keeps the early app simple while the schema still uses profile/user-owned records so future multi-user support can evolve without rewriting feature data models.

## Media Library API Contract

Media library records are user-owned. Every media endpoint requires an authenticated session and only returns items owned by the current user.

Endpoints:

- `GET /api/media-items/` lists the current user's media items with pagination.
- `POST /api/media-items/` creates a media item owned by the current user.
- `GET /api/media-items/{id}/` returns one owned media item.
- `PATCH /api/media-items/{id}/` updates one owned media item.
- `DELETE /api/media-items/{id}/` deletes one owned media item.

List filters:

- `mediaType`: one of `movie`, `tv_show`, `anime`, `novel`, `audiobook`.
- `status`: one of `planned`, `consuming`, `completed`, `paused`, `dropped`.
- `search`: case-insensitive search over title, original title, creator, and notes.

Shared TypeScript contracts live in `packages/contracts/src/media.ts`. The frontend client and SWR hooks live in `apps/web/src/features/media/mediaApi.ts`.

## Taste Scoring API Contract

Taste dimensions are user-owned defaults seeded at registration and available from `GET /api/taste-dimensions/`.
Each dimension has `id`, `name`, `slug`, `description`, `direction`, and `isDefault`.
Scores use the documented `0` to `10` range from `docs/product-scoring.md`.

Media item scores are available at `GET /api/media-items/{mediaId}/scores/` and can be bulk saved with `PUT /api/media-items/{mediaId}/scores/`.
The bulk payload is `{ "scores": [{ "dimensionId": "uuid", "score": 8.5, "note": "Optional reason" }] }`.
Use `score: null` to clear an existing score for that dimension.
Media detail responses also include a `scores` array so the detail page can render the scorecard from one item fetch.

## Dashboard API Contract

`GET /api/dashboard/summary/` returns the authenticated user's dashboard overview.
The response includes:

- `counts`: total, completed, planned, and dropped media counts.
- `mediaTypeBreakdown`: count by media type.
- `recentActivity`: five most recently updated media items.
- `highestRated`: five highest-rated recent items with `personalRating`.
- `topTasteSignals`: highest average taste dimension scores with dimension metadata and score counts.
- `generatedAt`: server timestamp for the summary.
