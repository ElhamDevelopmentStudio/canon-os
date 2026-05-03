# CanonOS Testing Notes

CanonOS uses root verification gates for every implementation slice:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

User-facing features must also update the matching manual test document under `docs/manual-tests/`.

## MVP Test Coverage Summary

| Area | Automated coverage | Manual docs |
| --- | --- | --- |
| Auth/session | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/auth.md` |
| Dashboard | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/dashboard.md` |
| Media Library and detail | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/media-library.md` |
| Taste scoring/profile | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/taste-profile.md` |
| Candidate Evaluator | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/candidate-evaluator.md` |
| Anti-Generic Filter | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/anti-generic-filter.md` |
| Media Archaeologist | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/media-archaeologist.md` |
| Narrative DNA Analyzer | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/narrative-dna.md` |
| Queue and Tonight Mode | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/queue-tonight.md` |
| Aftertaste Log | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/aftertaste-log.md` |
| Settings and portability | Backend tests, frontend tests, Playwright browser e2e. | `docs/manual-tests/settings-portability.md` |
| API docs/health | Backend/schema checks and Playwright request smoke. | Covered by developer setup docs. |

## Browser-to-Backend E2E Contract

`corepack pnpm e2e` is the required end-to-end gate. It is not a jsdom smoke test: it must prove that the browser, Vite app, Axios client, CORS, CSRF, cookies, Django sessions, Django endpoints, PostgreSQL, and Redis work together.

Current browser e2e tests live in `apps/web/e2e/` and run with Playwright. The Playwright config starts:

- Django API on `http://localhost:8000`
- Vite web app on `http://localhost:5173`

The root `.env` file is the frontend environment source of truth. Do not reintroduce `apps/web/.env`. Keep `VITE_API_BASE_URL=http://localhost:8000/api` in root `.env` for browser e2e so the app calls the API cross-origin and exercises CORS/CSRF/cookies. The Vite config uses the repository root as `envDir`.

### Coverage rule for future work

Every new API endpoint must have one of these before the feature is considered done:

1. A browser e2e user flow that reaches the endpoint through the real UI; or
2. A documented API-only e2e exception in this file explaining why no complete UI exists yet.

Every new frontend page that calls the API must have browser e2e coverage for:

- happy path;
- at least one practical loading, empty, or error edge; and
- relevant unsafe methods proving browser CSRF-protected calls succeed.

Mocked Vitest/jsdom tests remain useful for fast component and state coverage, but they do not replace browser-to-backend e2e.

### E2E patterns

Use the helper layer in `apps/web/e2e/helpers/`:

- `auth.ts` for register/login/logout and cookie/session assertions.
- `network.ts` for response assertions, browser-origin fetches, expected API failure allow-listing, and global guards.
- `data.ts` for unique users and unique titles.

Tests must:

- use unique test data per run;
- avoid frontend API module mocks;
- avoid seeded Zustand auth state;
- prefer accessible roles and labels over brittle selectors;
- assert relevant network responses, not only visible text;
- fail on browser console errors, page errors, and unexpected failed `/api/` responses;
- explicitly allow any intentionally simulated backend failure with `allowApiFailure`.

### MVP acceptance e2e

`apps/web/e2e/mvp-acceptance.spec.ts` is the MVP sign-off browser test. It verifies that every MVP route renders from the sidebar on desktop and mobile, then completes a persisted user journey: register, add movie/anime/novel, score media, log aftertaste, confirm Taste Profile evidence, evaluate a candidate, add to queue, generate Tonight Mode, start a recommendation, verify Dashboard, update Settings, import CSV, export JSON/CSV, logout, login, and confirm data persisted.

### Current browser e2e coverage

- Auth: CSRF bootstrap, register, login, logout, current user/session bootstrap, protected-route redirect, public-route redirect while authenticated, `csrftoken` and `sessionid` cookies, session persistence after refresh.
- Dashboard: authenticated dashboard load, dashboard summary success, expected dashboard API error state.
- Media library: create, list, edit, detail load, delete, ownership isolation through a second authenticated user.
- Taste/profile scoring: taste dimension load and media score upsert from the media detail UI.
- Candidate evaluator: create candidate, evaluate candidate, update candidate, add candidate to library, add evaluated candidate to queue, and assert embedded Anti-Generic evaluation payloads.
- Anti-Generic Filter: high-genericness red flag scoring, modern positive exception scoring, Settings rule disable/save, and re-evaluation output changes.
- Media Archaeologist: generate discovery trail with no filters, regenerate with media type filter, save a discovery trail, list saved trails, and add a discovery result to the queue.
- Narrative DNA Analyzer: request analysis from the Media Detail tab, verify completed trait/evidence output, and confirm Candidate Evaluator receives narrative signals from completed analysis history.
- Queue: create, list, edit, reorder, delete, recalculate priority, archive low-fit items, and restore archived items.
- Tonight Mode: generate recommendations from queue/planned media, empty state, add recommendation to queue, start linked media, defer queue item, show Queue v2 fit fields, and exclude archived queue items.
- Aftertaste Log: create a completed media item, load prompts, create aftertaste, edit aftertaste, verify latest aftertaste on Media Detail, and delete aftertaste.
- Taste Profile: load empty profile, create scored media, add aftertaste evidence, reload profile, verify summary/red flags/influential works, and refresh.
- Settings: update profile/display/recommendation preferences, persist after refresh, apply theme, feed Tonight Mode defaults, and surface Candidate Evaluator settings.
- Import/export: CSV preview/confirm, invalid-row no-write behavior, JSON export download, and media/ratings CSV export download through Settings.
- Health/API smoke: browser-origin health request plus API schema and Scalar docs availability.

### API-only e2e exceptions

- API schema and Scalar docs are covered with Playwright's request client because there is no frontend docs page yet.

## Docker-backed E2E Checks

`corepack pnpm e2e` starts Dockerized PostgreSQL and Redis through `corepack pnpm compose:dev`, then runs package-level e2e scripts. The API e2e script defaults to:

- `DATABASE_URL=postgresql://canonos:canonos@localhost:15432/canonos`
- `REDIS_URL=redis://localhost:16379/0`

The browser e2e web server command runs migrations before starting Django. If ports `8000` or `5173` are already occupied, stop local dev servers first or set `PLAYWRIGHT_REUSE_SERVERS=1` only when you intentionally want to reuse already-running API/web processes.

## API Documentation Checks

Validate OpenAPI generation with:

```bash
cd apps/api
.venv/bin/python manage.py spectacular --file /tmp/canonos-schema.yml --settings=config.settings.test --validate
```

Swagger and Scalar should load locally at:

- `http://localhost:8000/api/docs/swagger/`
- `http://localhost:8000/api/docs/scalar/`

## CI Gate

`.github/workflows/ci.yml` runs the same required gates on pull requests and pushes to `main`/`master`:

1. `corepack pnpm lint`
2. `corepack pnpm typecheck`
3. `corepack pnpm test`
4. `corepack pnpm build`
5. `corepack pnpm e2e`

CI starts PostgreSQL 15 and Redis 7 services before verification.

## MVP-M01 QA Evidence

Foundation QA checks verified during MVP-M01:

- Backend startup: Django runserver responded on `http://127.0.0.1:8010/api/health/` using test settings.
- Frontend startup: Vite served `http://127.0.0.1:5174/`.
- PostgreSQL: `pg_isready -h 127.0.0.1 -p 5432` reported accepting connections.
- Redis: Python Redis client returned `PONG` for `redis://localhost:6379/0`.
- Health endpoint: `GET /api/health/` returned `{"status":"ok","service":"canonos-api","version":"0.1.0"}`.
