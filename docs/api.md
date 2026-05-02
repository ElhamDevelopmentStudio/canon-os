# CanonOS API Notes

The backend API is implemented under `apps/api` with Django REST Framework. OpenAPI generation, Swagger UI, and Scalar documentation are part of the foundation.

## Current Base Paths

- `/api/health/` for service readiness.
- `/api/v1/health/` for the versioned service readiness path.
- `/api/schema/` for the generated OpenAPI schema.
- `/api/v1/schema/` for the versioned OpenAPI schema path.
- `/api/docs/swagger/` for Swagger UI.
- `/api/docs/scalar/` for Scalar API documentation.

## Frontend Integration

The frontend shared Axios client lives at `apps/web/src/lib/api.ts` and reads `VITE_API_BASE_URL`, which defaults to `/api`. Local development should use `http://localhost:8000/api` so the web app can call `GET /health/` through the shared client.

The backend CORS configuration allows the default Vite origin `http://localhost:5173` in local settings.

## Product Paths

Product endpoints are available under `/api/v1/`. The legacy `/api/` paths remain available during hardening so existing frontend and e2e flows do not break while clients migrate.

Error responses use a consistent envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request could not be completed.",
    "details": {},
    "requestId": "request-id",
    "status": 400
  }
}
```

Every response includes `X-Request-ID`. Clients may send `X-Request-ID`; otherwise the API generates one.

Schema versioning rule: OpenAPI `info.version` tracks the public API version (`v1`). Breaking response or path changes require a new versioned base path and migration notes.

## Contract Rule

When an API response shape changes, update serializers, shared contracts, frontend API client types, and tests in the same milestone.

## API Root And Documentation

- `GET /api/` lists available and planned MVP API entry points.
- `GET /api/health/` returns service health.
- `GET /api/schema/` returns the OpenAPI schema.
- `GET /api/docs/swagger/` opens Swagger UI.
- `GET /api/docs/scalar/` opens Scalar API Reference.


## Authentication Flow

CanonOS uses Django session authentication for the browser app. The frontend does not store bearer tokens in `localStorage`; Django owns the HTTP-only `sessionid` cookie and Axios sends credentials with each API request.

When the frontend calls the backend directly from `http://localhost:5173` to `http://localhost:8000`, Django must allow the frontend origin and credentialed CORS requests. Local defaults use `DJANGO_CORS_ALLOWED_ORIGINS=http://localhost:5173`, `DJANGO_CORS_ALLOW_CREDENTIALS=true`, and `DJANGO_CSRF_TRUSTED_ORIGINS=http://localhost:5173`.

Auth endpoints:

- `GET /api/auth/csrf/` sets/returns a CSRF token for unsafe requests.
- `POST /api/auth/register/` creates a user, creates a `UserProfile`, logs the user in, and returns the auth session.
- `POST /api/auth/login/` validates email/password credentials, logs the user in, and returns the auth session.
- `POST /api/auth/logout/` clears the current session.
- `GET /api/auth/me/` returns the current auth session for app bootstrap. Anonymous users receive `authenticated: false` instead of an error; authenticated users receive their user and profile.
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


## Candidate Evaluator API Contract

Candidate records are user-owned and require an authenticated session. The API supports the MVP evaluator workflow:

- `GET /api/candidates/` lists the current user's candidates with pagination.
- `POST /api/candidates/` creates a candidate.
- `GET /api/candidates/{id}/` returns one owned candidate.
- `PATCH /api/candidates/{id}/` updates candidate metadata or status.
- `DELETE /api/candidates/{id}/` deletes one owned candidate.
- `POST /api/candidates/{id}/evaluate/` runs the deterministic evaluator and stores a `CandidateEvaluation`.
- `POST /api/candidates/{id}/add-to-library/` creates a planned `MediaItem` from the candidate.

Candidate statuses are `unevaluated`, `watch_now`, `sample`, `delay`, and `skip`. Evaluation decisions are `watch_now`, `sample`, `delay`, and `skip`. Scoring details are documented in `docs/candidate-evaluator.md`.


## Queue API Contract

Queue items are user-owned and require an authenticated session. Endpoints:

- `GET /api/queue-items/` lists the current user's queue items with pagination.
- `POST /api/queue-items/` creates a queue item from a manual title, `mediaItemId`, or `candidateId`.
- `GET /api/queue-items/{id}/` returns one owned queue item.
- `PATCH /api/queue-items/{id}/` updates priority, reason, mood, estimated time, or snapshot fields.
- `DELETE /api/queue-items/{id}/` removes the item from the queue only.
- `POST /api/queue-items/reorder/` rewrites queue order for the current user.

List filters: `mediaType`, `priority`, and `search`. Queue priorities are `start_soon`, `sample_first`, and `later`. Product rules are documented in `docs/queue.md`.

## Settings API Contract

`GET /api/auth/settings/` returns the authenticated user's profile, display preferences, and recommendation defaults. `PATCH /api/auth/settings/` updates the same shape with partial nested objects. The settings record is created at registration and lazily created for older users.

The response includes:

- `profile`: display name, timezone, and preferred language.
- `display.themePreference`: `system`, `light`, or `dark`; the browser app applies it to the app shell.
- `recommendation.defaultMediaTypes`: default media type filters for recommendation surfaces.
- `recommendation.defaultRiskTolerance`: `low`, `medium`, or `high`; Tonight Mode uses it when the request omits risk tolerance and the UI uses it as the default selection.
- `recommendation.modernMediaSkepticismLevel`: `0` to `10`; Candidate Evaluator adds caution for recent releases when high.
- `recommendation.genericnessSensitivity`: `0` to `10`; Candidate Evaluator weights expected genericness risk with this value.
- `recommendation.preferredScoringStrictness`: `0` to `10`; Candidate Evaluator makes final decisions stricter when high.

Shared TypeScript contracts live in `packages/contracts/src/settings.ts`; the frontend SWR hook lives in `apps/web/src/features/settings/settingsApi.ts`.

## E2E Coverage Rule

Every new API endpoint must be covered through a real browser e2e user flow when a UI exists. If the endpoint is intentionally API-only or the UI has not shipped yet, add an API-only e2e exception to `docs/testing.md` and cover it with Playwright's request client or backend e2e tests. Serializer/API contract changes still require unit/API tests; mocked frontend tests do not replace browser-to-backend e2e coverage.

## Tonight Mode

- `POST /api/queue/tonight/` generates and persists a Tonight Mode session for the authenticated user. The request includes available minutes, energy level, focus level, desired effect, preferred media types, and risk tolerance. The response includes up to five recommendations plus safe, challenging, and wildcard slots when available.

## Aftertaste API Contract

Aftertaste entries are user-owned reflections tied to one media item. Every endpoint requires an authenticated session and only returns entries owned by the current user.

Endpoints:

- `GET /api/aftertaste/` lists the current user's aftertaste entries with pagination.
- `POST /api/aftertaste/` creates an aftertaste entry for an owned media item.
- `GET /api/aftertaste/{id}/` returns one owned aftertaste entry.
- `PATCH /api/aftertaste/{id}/` updates one owned aftertaste entry.
- `DELETE /api/aftertaste/{id}/` deletes one owned aftertaste entry.
- `GET /api/aftertaste/prompts/` returns the default reflection prompts used by the browser UI.

List filter:

- `mediaItemId`: limit results to one owned media item.

The create/update payload uses `mediaItemId`, `worthTime`, `stayedWithMeScore` (`0` to `10`), `feltAlive`, `feltGeneric`, `completionReason`, `whatWorked`, `whatFailed`, `finalThoughts`, and `appetiteEffect`. Appetite effects are `more_like_this`, `less_like_this`, `only_in_mood`, and `no_change`.

Media detail responses include `latestAftertaste` so the detail page can show the newest reflection without making a second request. Shared TypeScript contracts live in `packages/contracts/src/aftertaste.ts`; the frontend client and SWR hooks live in `apps/web/src/features/aftertaste/aftertasteApi.ts`.

## Taste Profile API Contract

`GET /api/taste-profile/` returns the authenticated user's current Taste Profile summary. The endpoint is deterministic and recalculates from owned library items, media scores, and aftertaste entries on each request.

The response includes:

- `generatedSummary`: a cautious natural-language profile summary.
- `isEmpty`: true when no scores or aftertaste evidence exists yet.
- `confidence`: `low`, `medium`, or `high` based on score and aftertaste evidence volume.
- `evidenceCounts`: media, scored media, score, and aftertaste counts.
- `strongestDimensions`: highest average positive taste dimensions.
- `weakestDimensions`: lowest positive dimensions plus high-scoring negative dimensions.
- `negativeSignals`: genericness and regret warning counts, including both scorecard and aftertaste signals.
- `mediumPreferences`: average rating, completed count, and score count by media type.
- `strongestMediumPreference` and `weakestMediumPreference`: rated medium tendencies when enough rating data exists.
- `recentlyInfluentialWorks`: recent aftertaste entries and high-rated works that support the current profile.

The endpoint is user-scoped and must not include another user's media, scores, or aftertaste entries. Shared TypeScript contracts live in `packages/contracts/src/taste.ts`; the frontend SWR hook lives in `apps/web/src/features/taste-profile/tasteProfileApi.ts`.

## Import / Export API Contract

CanonOS supports local data portability through authenticated, CSRF-protected endpoints. Browser flows must preview imports before writing data and must offer export before future destructive account actions.

### Supported CSV import columns

CSV import is media-first for the MVP. The header row may include:

- Required: `title`, `media_type` or `mediaType`.
- Optional core fields: `status`, `personal_rating`/`personalRating`, `release_year`/`releaseYear`, `creator`, `notes`, `original_title`/`originalTitle`, `country_language`/`countryLanguage`.
- Optional progress fields: `started_date`/`startedDate`, `completed_date`/`completedDate`.
- Optional shape fields: `runtime_minutes`/`runtimeMinutes`, `episode_count`/`episodeCount`, `page_count`/`pageCount`, `audiobook_length_minutes`/`audiobookLengthMinutes`.
- Optional score fields: `score_<taste_dimension_slug>` and `score_note_<taste_dimension_slug>`.

`media_type` accepts `movie`, `tv_show`, `anime`, `novel`, and `audiobook`, plus common labels like `film`, `tv show`, `series`, `book`, and `audio book`. `status` defaults to `planned` and accepts `planned`, `consuming`, `completed`, `paused`, and `dropped`, plus common aliases like `finished`, `watching`, and `on hold`.

### Full-fidelity JSON export/import format

`POST /api/exports/` with `{ "format": "json" }` creates a JSON document shaped as:

```json
{
  "version": "canonos.export.v1",
  "exportedAt": "2026-05-02T00:00:00Z",
  "user": { "email": "reader@example.com" },
  "data": {
    "profile": { "displayName": "Reader", "timezone": "UTC", "preferredLanguage": "en" },
    "settings": { "defaultMediaTypes": ["movie"], "defaultRiskTolerance": "medium" },
    "tasteDimensions": [],
    "mediaItems": [],
    "candidates": [],
    "queueItems": [],
    "tonightModeSessions": []
  }
}
```

JSON import accepts this export shape and recreates implemented user-owned MVP records into the importing account. Existing database IDs are treated as historical export metadata; new local IDs are generated.

### Import validation and no-partial-write rule

1. `POST /api/imports/preview/` accepts multipart or JSON input with `sourceType` (`csv` or `json`) and a file/content payload.
2. The response returns an `ImportBatch` with per-row `ImportItemPreview` statuses: `valid`, `invalid`, or `duplicate`.
3. Invalid rows never modify library data during preview.
4. `POST /api/imports/{id}/confirm/` is rejected if the batch has any invalid rows.
5. Confirm runs in a database transaction. Valid rows are committed together, duplicate rows are skipped with warnings, and failed confirmation rolls back the batch.
6. All import/export records are scoped to the authenticated owner.

### Endpoints

- `POST /api/imports/preview/` — create an import validation preview.
- `POST /api/imports/{id}/confirm/` — commit a valid import preview.
- `POST /api/exports/` — create a `json` or `csv` export job.
- `GET /api/exports/{id}/download/` — download a completed export owned by the current user.
