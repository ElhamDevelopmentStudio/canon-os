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
- `creator`: case-insensitive creator/director/author match.
- `ratingMin` / `ratingMax`: personal rating range.
- `genericnessMin` / `genericnessMax`: Genericness taste-score range.
- `regretMin` / `regretMax`: Regret score taste-score range.
- `completedFrom` / `completedTo`: completed date range in `YYYY-MM-DD` format.

Shared TypeScript contracts live in `packages/contracts/src/media.ts`. The frontend client and SWR hooks live in `apps/web/src/features/media/mediaApi.ts`.

## Unified Search API Contract

Global search is user-owned and requires an authenticated session. It powers the command palette and returns navigation targets for currently searchable product surfaces.

Endpoint:

- `GET /api/search/?q=<query>&limit=<n>` searches the current user's media, candidates, queue items, and personal canon seasons. `limit` defaults to 5 per type and is capped at 10.

Each result includes `id`, `type`, `title`, `subtitle`, `description`, `targetUrl`, and metadata. Supported result types are `media`, `candidate`, `queue_item`, and `canon_season`. Empty or missing queries return an empty result list without error.

Frontend contracts live in `packages/contracts/src/search.ts`; the SWR client lives in `apps/web/src/features/search/searchApi.ts`; the UI entry point is the command palette opened from the header or with Ctrl+K / ⌘K.

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
- `latestTasteEvolutionInsight`: newest taste-change insight from the latest Taste Evolution snapshot, or `null`.
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

## Personal Canon API Contract

Personal Canon seasons and items are user-owned and require an authenticated session. They power the `/seasons` and `/seasons/:seasonId` browser flows.

Endpoints:

- `GET /api/seasons/` lists the current user's canon seasons with progress and ordered items.
- `POST /api/seasons/` creates a season with title, theme, description, status, optional dates, and reflection notes.
- `GET /api/seasons/{id}/` returns one owned season with reflection prompts and ordered items.
- `PATCH /api/seasons/{id}/` updates season metadata, status, dates, or reflection notes.
- `DELETE /api/seasons/{id}/` deletes one owned season and its items.
- `POST /api/seasons/{id}/items/` adds a custom, media-linked, or candidate-linked item.
- `PATCH /api/seasons/{seasonId}/items/{itemId}/` updates item notes, completion status, canon status, source, or order.
- `DELETE /api/seasons/{seasonId}/items/{itemId}/` removes one season item and compacts order.
- `POST /api/seasons/{id}/items/reorder/` persists a new item order.

Themes are `moral_collapse`, `anti_heroes_done_right`, `forgotten_masterpieces`, `modern_works_worth_it`, `atmosphere_over_plot`, and `custom`. Item completion statuses are `planned`, `in_progress`, `completed`, and `skipped`. Canon statuses are `unmarked`, `personal_canon`, `near_canon`, `rejected`, and `historically_important`.

Shared TypeScript contracts live in `packages/contracts/src/canon.ts`; frontend calls live in `apps/web/src/features/canon/canonApi.ts`; product behavior is documented in `docs/personal-canon.md`.

## Anti-Generic Filter API Contract

Anti-Generic rules and evaluations are user-owned and require an authenticated session. Candidate evaluation automatically creates and embeds an Anti-Generic result.

Endpoints:

- `GET /api/anti-generic/rules/` lists the current user's red-flag and positive-exception rules, seeding defaults when missing.
- `PATCH /api/anti-generic/rules/{id}/` updates `isEnabled` and `weight` for one owned rule.
- `POST /api/anti-generic/rules/reset/` restores the current user's default rules.
- `POST /api/anti-generic/evaluate/` evaluates an owned candidate, with optional `mediaItemId`, and stores an `AntiGenericEvaluation`.

Evaluation payloads include genericness risk, time-waste risk, positive exception score, detected red flags, detected positive exceptions, final verdict, and timestamps. Modernness is not a genericness signal by itself; recent works need actual red flags to raise risk and may be protected by positive exception rules.

Shared TypeScript contracts live in `packages/contracts/src/antiGeneric.ts`; frontend rule calls live in `apps/web/src/features/anti-generic-filter/antiGenericApi.ts`.


## Completion Detox API Contract

Completion Detox rules and decisions are user-owned and require an authenticated session. Evaluations are neutral checkpoints: they record a recommendation and time-saved estimate, while media status changes remain explicit user actions through the media endpoint.

Endpoints:

- `GET /api/detox/rules/` lists the current user's sample rules, seeding defaults when missing.
- `PATCH /api/detox/rules/{id}/` updates `isEnabled`, `sampleLimit`, or `condition` for one owned rule.
- `POST /api/detox/rules/reset/` restores the default movie, TV, anime, and novel sample rules.
- `POST /api/detox/evaluate/` evaluates an owned media item from `mediaItemId`, `progressValue`, and `motivationScore`, then stores a `DetoxDecision`.
- `GET /api/detox/decisions/` lists recent owner-scoped decisions.
- `GET /api/detox/time-saved/` summarizes total/current-month time saved plus recent entries.

Decision payloads include the media item, matched rule, decision (`drop`, `pause`, `delay`, `archive`, or `continue`), neutral reason, progress, motivation, and estimated time saved. Shared TypeScript contracts live in `packages/contracts/src/detox.ts`; frontend calls live in `apps/web/src/features/detox/detoxApi.ts`; product rules live in `docs/completion-detox.md`.

## Media Archaeologist API Contract

Discovery endpoints are user-owned and require an authenticated browser session. They power the `/discover` Media Archaeologist page.

Endpoints:

- `POST /api/discovery/generate/` creates an unsaved discovery trail from mode, theme, mood, era, country/language, medium, creator, narrative pattern, favorite work, or source media item.
- `GET /api/discovery/trails/` lists saved trails for the current user.
- `POST /api/discovery/trails/` saves a generated trail for the current user.
- `GET /api/discovery/trails/{id}/` returns one owner-scoped saved trail.
- `DELETE /api/discovery/trails/{id}/` deletes one owner-scoped saved trail.

Generate responses include the normalized search frame, underexplored media/era/country-language analysis, an unsaved `draft`, ranked `results`, and `generatedAt`. Each result includes discovery, obscurity, and confidence scores plus expansion reasons, risk rationale, and a suggested action. Shared TypeScript contracts live in `packages/contracts/src/discovery.ts`; frontend calls live in `apps/web/src/features/discovery/discoveryApi.ts`. Product behavior is documented in `docs/discovery.md`.

## Narrative DNA API Contract

Narrative DNA endpoints are user-owned and require an authenticated session. They analyze story properties from allowed user notes and metadata, not full copyrighted source text.

Endpoints:

- `GET /api/narrative-analyses/` lists current user's analyses, optionally filtered by `mediaItemId`.
- `GET /api/narrative-analyses/{id}/` returns one owner-scoped analysis.
- `PATCH /api/narrative-analyses/{id}/` lets the user correct scores, summary, or evidence notes.
- `GET /api/media-items/{id}/narrative-analysis/` returns the current analysis for one owned media item.
- `POST /api/media-items/{id}/narrative-analysis/` requests or refreshes analysis from `manualNotes`, `forceRefresh`, and `provider`.

Analysis payloads include status, eight trait scores, confidence, summary, extracted traits, evidence notes, source basis, provider, algorithm version, status events, and timestamps. Candidate evaluations embed `narrativeSignals` when completed analyses influence fit/risk scoring, and TasteGraph rebuilds add narrative trait nodes/edges. Shared contracts live in `packages/contracts/src/narrative.ts`; product rules live in `docs/narrative-dna.md`.




## Adaptation Intelligence API Contract

Adaptation relations are user-owned and require an authenticated session. They power the **Adaptations** tab on Media Detail.

Endpoints:

- `GET /api/adaptations/relations/` lists the current user's relations. Optional filters: `mediaItemId`, `sourceMediaItemId`, `adaptationMediaItemId`, and `relationType`.
- `POST /api/adaptations/relations/` creates a source/adaptation relation between two owned media items.
- `GET /api/adaptations/relations/{id}/` returns one owner-scoped relation.
- `PATCH /api/adaptations/relations/{id}/` updates relation metadata, completeness, scores, recommended order, or notes.
- `DELETE /api/adaptations/relations/{id}/` deletes one owner-scoped relation.
- `GET /api/media-items/{id}/adaptation-map/` returns relations involving one owned media item plus the current experience path recommendation.
- `POST /api/media-items/{id}/adaptation-path/` recalculates the best experience path from current relation evidence.

Relation types include `source_to_adaptation`, `adaptation_to_source`, `remake`, `alternate_version`, `inspired_by`, `audiobook_version`, `manga_to_anime`, `novel_to_film`, and `novel_to_show`. Completeness values are `complete`, `partial`, `incomplete`, `loose`, and `unknown`. Recommended orders are `read_first`, `watch_first`, `listen_first`, `adaptation_sufficient`, `source_preferred`, and `skip_adaptation`.

Path recommendations include rationale, confidence, and risk signals for incomplete adaptations, weak endings, compression, changed tone, poor narration, low faithfulness, pacing loss, and soul loss. Shared contracts live in `packages/contracts/src/adaptations.ts`; frontend calls live in `apps/web/src/features/adaptations/adaptationsApi.ts`; behavior is documented in `docs/adaptation-intelligence.md`.

## Critic Council API Contract

Critic Council endpoints are user-owned and require an authenticated session. They generate deterministic multi-persona explanations for candidates, media items, or freeform decision prompts.

Endpoints:

- `GET /api/critic-personas/` lists the current user's seeded critic personas.
- `PATCH /api/critic-personas/{id}/` updates `isEnabled` and `weight` for one owned persona.
- `POST /api/critic-personas/reset/` restores default personas.
- `GET /api/council-sessions/` lists saved council sessions, optionally filtered by `candidateId` or `mediaItemId`.
- `POST /api/council-sessions/` runs the council for `prompt`, `candidateId`, and/or `mediaItemId`.
- `GET /api/council-sessions/{id}/` returns one owner-scoped session.
- `POST /api/council-sessions/{id}/apply-to-candidate/` applies the final decision to the linked candidate status.

Default personas are Ruthless Critic, Historian, Modern Defender, Anime Specialist, Literary Editor, Mood Doctor, Completion Strategist, and Wildcard. Council output includes ordered critic opinions plus a final decision that explicitly synthesizes disagreement rather than averaging votes. Shared contracts live in `packages/contracts/src/council.ts`; frontend calls live in `apps/web/src/features/critic-council/councilApi.ts`; product rules live in `docs/critic-council.md`.

## Queue API Contract

Queue items are user-owned and require an authenticated session. Endpoints:

- `GET /api/queue-items/` lists the current user's queue items with pagination.
- `POST /api/queue-items/` creates a queue item from a manual title, `mediaItemId`, or `candidateId`.
- `GET /api/queue-items/{id}/` returns one owned queue item.
- `PATCH /api/queue-items/{id}/` updates priority, reason, mood, estimated time, or snapshot fields.
- `DELETE /api/queue-items/{id}/` removes the item from the queue only.
- `POST /api/queue-items/reorder/` rewrites queue order for the current user.
- `POST /api/queue-items/recalculate/` rescales queue priority, freshness, and low-priority archive state.

List filters: `mediaType`, `priority`, `isArchived`, and `search`. Queue priorities are `start_soon`, `sample_first`, and `later`. Queue v2 fields include `moodCompatibility`, `intensityLevel`, `complexityLevel`, `commitmentLevel`, `freshnessScore`, `lastRecommendedAt`, `timesRecommended`, and `isArchived`. Product rules are documented in `docs/queue.md`.

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

- `POST /api/queue/tonight/` generates and persists a Tonight Mode session for the authenticated user. The request includes available minutes, energy level, focus level, desired effect, preferred media types, and risk tolerance. The response includes up to five non-archived queue/planned-media recommendations plus safe, challenging, and wildcard slots when available. Queue recommendations include v2 fit fields so the browser can show mood fit, commitment, and freshness.

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

CanonOS supports local data portability through authenticated, CSRF-protected endpoints. Browser flows must preview imports before writing data, surface job progress, support rollback for confirmed imports, and validate restores before applying backup content.

### Supported CSV import columns

CSV import is media-first for the MVP. The header row may include:

- Required: `title`, `media_type` or `mediaType`.
- Optional core fields: `status`, `personal_rating`/`personalRating`, `release_year`/`releaseYear`, `creator`, `notes`, `original_title`/`originalTitle`, `country_language`/`countryLanguage`.
- Optional progress fields: `started_date`/`startedDate`, `completed_date`/`completedDate`.
- Optional shape fields: `runtime_minutes`/`runtimeMinutes`, `episode_count`/`episodeCount`, `page_count`/`pageCount`, `audiobook_length_minutes`/`audiobookLengthMinutes`.
- Optional score fields: `score_<taste_dimension_slug>` and `score_note_<taste_dimension_slug>`.

`media_type` accepts `movie`, `tv_show`, `anime`, `novel`, and `audiobook`, plus common labels like `film`, `tv show`, `series`, `book`, and `audio book`. `status` defaults to `planned` and accepts `planned`, `consuming`, `completed`, `paused`, and `dropped`, plus common aliases like `finished`, `watching`, and `on hold`.

### Limits, validation, and duplicate handling

- CSV files must use `.csv`; JSON files must use `.json`.
- Import files and inline import/restore payloads are limited to 2 MB.
- Import preview detects duplicates already in the user's library and duplicate rows inside the same import. Duplicate rows are reported with warnings and skipped on confirm.
- The import job payload includes `progressTotal`, `progressProcessed`, `progressPercent`, `uploadedFileReference`, `fileSizeBytes`, `errorMessage`, and rollback metadata.
- The export job payload includes `progressTotal`, `progressProcessed`, `progressPercent`, `fileSizeBytes`, `retentionExpiresAt`, `processedAt`, and `errorMessage`.
- Import and export processing also upserts owner-scoped `BackgroundJob` records with job type, status, progress, message, result JSON, and source IDs.

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

JSON import accepts this export shape and recreates implemented user-owned records into the importing account. Existing database IDs are treated as historical export metadata; new local IDs are generated.

### Import validation, rollback, and restore dry run

1. `POST /api/imports/preview/` accepts multipart or JSON input with `sourceType` (`csv` or `json`) and a file/content payload.
2. The response returns an `ImportBatch` with per-row `ImportItemPreview` statuses: `valid`, `invalid`, `duplicate`, `imported`, `skipped`, or `rolled_back`.
3. Invalid rows never modify library data during preview.
4. `POST /api/imports/{id}/confirm/` is rejected if the batch has invalid rows. Confirm tracks progress, commits valid rows, skips duplicates, and marks the job `confirmed` at 100%.
5. `POST /api/imports/{id}/rollback/` deletes records created by that confirmed import, marks imported rows `rolled_back`, and refreshes rollback metadata. A rolled-back import cannot be rolled back again.
6. `POST /api/exports/restore-dry-run/` accepts a JSON backup file/content and returns validity, record counts by kind, duplicate counts, warnings, and errors without writing data.
7. All import/export records are scoped to the authenticated owner.

### Endpoints

- `GET /api/imports/` — list recent import jobs for the current user.
- `POST /api/imports/preview/` — create an import validation preview.
- `POST /api/imports/{id}/confirm/` — commit a valid import preview.
- `POST /api/imports/{id}/rollback/` — roll back records created by a confirmed import.
- `GET /api/exports/` — list recent export jobs for the current user.
- `POST /api/exports/` — create a `json` or `csv` export job.
- `POST /api/exports/restore-dry-run/` — validate a JSON backup before restore/import.
- `GET /api/exports/{id}/download/` — download a completed export owned by the current user.
- `GET /api/jobs/` — list the 50 most recent owner-scoped background jobs.
- `GET /api/jobs/{id}/` — fetch one owner-scoped background job status.

Background job payloads include `jobType`, `status`, `progressTotal`, `progressProcessed`, `progressPercent`, `message`, `result`, `sourceId`, `sourceLabel`, `createdAt`, and `completedAt`. Current job types are import, export, metadata refresh, graph rebuild, and narrative analysis. Import/export, metadata refresh, graph rebuild, and Narrative DNA requests all upsert `BackgroundJob` records so the UI can show recent async work without reading Celery internals directly.

## External metadata endpoints

CanonOS supports optional provider enrichment without making provider data canonical user truth.

- `GET /api/metadata/matches/?query=<title>&mediaType=<type>&provider=<provider>` searches configured adapters and returns normalized `ExternalMediaMatch` records.
- `POST /api/media-items/{id}/metadata/attach/` stores one provider match as an `ExternalMetadata` snapshot for the authenticated user's media item.
- `GET /api/media-items/{id}/metadata/` lists attached snapshots.
- `POST /api/media-items/{id}/metadata/refresh/` refreshes the latest attached snapshot and returns a metadata refresh job payload.

Provider calls must not send private notes, ratings, aftertaste, queue state, or taste scores. User edits and personal fields remain authoritative over provider payloads.


## Taste Evolution API Contract

Taste Evolution snapshots are user-owned and require an authenticated session. They preserve month-by-month aggregate evidence so the user can see how taste changes over time without recomputing historical explanations.

Endpoints:

- `GET /api/taste-evolution/` lists the current user's snapshots, newest first.
- `POST /api/taste-evolution/generate/` creates a snapshot. The optional payload accepts `snapshotPeriod` (`monthly`, `quarterly`, or `yearly`) and `snapshotDate` (`YYYY-MM-DD`); the current implementation generates monthly evidence windows.

Snapshot payloads include `snapshotPeriod`, `snapshotDate`, `aggregateData`, `insights`, and timestamps. `aggregateData` contains rating, medium, genericness tolerance, regret, completion fatigue, and favorite-dimension trends. The Dashboard summary includes `latestTasteEvolutionInsight` from the newest snapshot when one exists. Shared TypeScript contracts live in `packages/contracts/src/evolution.ts`; frontend calls live in `apps/web/src/features/evolution/evolutionApi.ts`; product rules live in `docs/taste-evolution.md`.

### TasteGraph

- `GET /api/taste-graph/summary/` returns the current owner-scoped TasteGraph summary.
- `GET /api/taste-graph/nodes/` lists graph nodes, optionally filtered by `nodeType`.
- `GET /api/taste-graph/edges/` lists graph edges, optionally filtered by `edgeType`.
- `POST /api/taste-graph/rebuild/` rebuilds the authenticated user's graph and returns a rebuild job payload.
