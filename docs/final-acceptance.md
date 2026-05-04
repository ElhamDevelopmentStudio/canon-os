# CanonOS Final Acceptance Baseline

CP-M22 is the complete-product regression and sign-off baseline. It does not add a new user feature; it proves the delivered CanonOS product remains usable end to end across backend, frontend, browser-to-backend flows, documentation, and deployment smoke checks.

## Acceptance Commands

Latest CP-M22 regression commands:

| Area | Command | Expected result |
| --- | --- | --- |
| Backend tests | `corepack pnpm --filter @canonos/api run test` or root `corepack pnpm test` | Django/pytest backend suite passes. |
| Empty database migration | Temporary PostgreSQL database + `apps/api/.venv/bin/python apps/api/manage.py migrate --noinput` | Every migration applies from zero. |
| Demo seed | `apps/api/.venv/bin/python apps/api/manage.py seed_demo_data --email <unique-email>` against the temporary DB | Demo user, profile, settings, taste dimensions, and one media item are created. |
| API docs | `apps/api/.venv/bin/python manage.py spectacular --file /tmp/canonos-schema.yml --settings=config.settings.test --validate` plus Django client checks for `/api/schema/`, `/api/v1/schema/`, `/api/docs/swagger/`, and `/api/docs/scalar/` | Schema validates with zero errors and docs endpoints return HTTP 200. |
| Frontend typecheck/build | `corepack pnpm typecheck` and `corepack pnpm build` | TypeScript and production build pass. |
| Browser e2e | `corepack pnpm e2e` | API health/infrastructure checks pass and all Playwright browser-to-backend specs pass. |
| Full gate | `corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test && corepack pnpm build && corepack pnpm e2e` | The required module gates all pass. |
| Deployment smoke | `corepack pnpm compose:app` then `corepack pnpm compose:app:smoke` | Full app Compose stack starts and API/DB/Redis/Celery health endpoints pass through the frontend proxy. |

Known non-blocking output: drf-spectacular emits enum naming warnings and a duplicate API-root operationId warning; schema generation reports zero errors. Test settings may warn if `apps/api/staticfiles/` has not been collected locally; Docker app mode runs `collectstatic`.

## Product Coverage Map

| Product area | Automated acceptance evidence |
| --- | --- |
| Auth/session | `auth.spec.ts`, backend auth tests, CSRF/session cookie assertions. |
| Dashboard | `dashboard.spec.ts`, `mvp-acceptance.spec.ts`, dashboard backend tests. |
| Media Library and detail | `media-library.spec.ts`, `mvp-acceptance.spec.ts`, metadata attach/refresh browser flows. |
| Taste scoring/profile | `taste-profile.spec.ts`, `mvp-acceptance.spec.ts`, taste backend tests. |
| Candidate Evaluator and Anti-Generic Filter | `candidate-evaluator.spec.ts`, `anti-generic-filter.spec.ts`, backend candidate/anti-generic tests. |
| Adaptive Queue and Tonight Mode | `queue.spec.ts`, `tonight-mode.spec.ts`, `mvp-acceptance.spec.ts`, backend queue tests. |
| Aftertaste Log | `aftertaste-log.spec.ts`, `mvp-acceptance.spec.ts`, backend aftertaste tests. |
| TasteGraph | `tastegraph.spec.ts`, `background-jobs.spec.ts`, graph backend tests. |
| Media Archaeologist | `media-archaeologist.spec.ts`, discovery backend tests. |
| Narrative DNA Analyzer | `narrative-dna.spec.ts`, `background-jobs.spec.ts`, narrative backend tests. |
| Critic Council | `critic-council.spec.ts`, council backend tests. |
| Taste Evolution Journal | `taste-evolution.spec.ts`, evolution backend tests. |
| Completion Detox | `completion-detox.spec.ts`, detox backend tests. |
| Personal Canon Builder | `personal-canon.spec.ts`, canon backend tests. |
| Cross-Medium Adaptation Intelligence | `adaptation-intelligence.spec.ts`, adaptations backend tests. |
| Import/export and privacy | `portability.spec.ts`, `settings.spec.ts`, backend import/export/privacy tests. |
| Search, filters, and command palette | `search-filters.spec.ts`, `accessibility-responsive.spec.ts`, search backend tests. |
| Background jobs | `background-jobs.spec.ts`, jobs backend tests. |
| Insights analytics | `insights.spec.ts`, analytics backend tests. |
| Accessibility/responsive UI | `accessibility-responsive.spec.ts`, frontend unit coverage, manual UI docs. |
| API docs and health | `health-api-smoke.spec.ts`, backend schema/root tests, CP-M21 health tests. |
| Deployment path | `compose:app`, `compose:app:smoke`, `docs/deployment.md`, `infra/README.md`. |

## Manual QA Baseline

Manual test documents under `docs/manual-tests/` exist for all user-facing feature areas plus deployment, accessibility, security/privacy, performance, and final acceptance. `docs/manual-tests/final-acceptance.md` is the high-level release candidate walkthrough; feature-specific docs remain the source for detailed happy/error/edge cases.

## Remaining Risks

- HTTPS termination and managed-cloud deployment are documented but not exercised against a live external host in local CI.
- drf-spectacular enum warning cleanup can improve generated client readability later, but current schema generation has zero errors and docs load.
- Browser e2e uses deterministic local providers and fixtures; real external metadata/AI provider behavior should be validated separately when production credentials are introduced.
