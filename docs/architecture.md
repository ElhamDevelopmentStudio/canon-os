# CanonOS Architecture

This document summarizes architecture decisions while implementation progresses. The authoritative design baseline is `docs/CanonOS_Software_Design_Document_SDS.md`.

## Current Shape

- Monorepo with `apps/web`, `apps/api`, `packages/*`, `infra`, and `docs`.
- React/Vite frontend consumes server-owned product data through HTTP APIs.
- Django REST Framework backend owns business rules, persistence, scoring, and background job orchestration.
- PostgreSQL is the canonical database. Redis is the MVP cache and Celery broker.

## MVP Module Diagram

```text
Browser (React/Vite)
  |
  |  Axios + SWR + credentials + CSRF
  v
Django REST API (/api)
  |
  +-- accounts     -> session auth, CSRF, profile, settings
  +-- media        -> user-owned library CRUD
  +-- taste        -> dimensions, media scores, taste profile summary
  +-- candidates   -> candidate CRUD, evaluation, add-to-library/queue
  +-- queueing     -> adaptive queue, reorder, Tonight Mode
  +-- dashboard    -> authenticated summary and recent signals
  +-- aftertaste   -> prompts and reflections
  +-- imports      -> import preview/confirm and export/download
  +-- health/docs  -> health, OpenAPI schema, Swagger, Scalar
  |
  +--> PostgreSQL  -> canonical user-owned data
  +--> Redis       -> cache, Celery broker/result backend
  +--> Celery      -> background work surface for future async jobs
```

## Frontend Responsibilities

- Render accessible, responsive pages and shared layout.
- Call the backend through `apps/web/src/lib/api.ts` and route constants.
- Hold only UI/session metadata in Zustand; server-owned data is loaded with SWR.
- Display backend-produced scores, recommendations, and explanations without duplicating product truth.

## Backend Responsibilities

- Enforce authentication, CSRF, validation, ownership, and persistence.
- Compute deterministic candidate, queue, taste, dashboard, and Tonight Mode signals.
- Produce import/export artifacts for user-owned backup and portability.
- Publish schema/docs for every MVP endpoint.

## Library Acquisition Strategy

CanonOS should reduce manual entry without making external platforms the source of truth.

- Default entry uses provider search: TMDb first for movies and TV, OMDb as an IMDb ID/title fallback, AniList for anime/manga, and Open Library or Google Books for books and audiobooks.
- Optional account connections import user-owned library signals only when the provider exposes them through an allowed API. Candidate providers include TMDb, Trakt, and AniList. OMDb is lookup-only and is not an account-import provider.
- If a platform does not expose account library, rating, like, or dislike data through an allowed API, CanonOS shows an export tutorial for that platform and accepts the resulting file through the import preview flow.
- Provider export support is implemented through explicit parser adapters for known formats such as IMDb CSV exports, Letterboxd exports, AniList exports where available, Trakt exports where available, and future provider-specific JSON/CSV shapes.
- If provider search cannot find a title, the media form keeps an Advanced Options fallback for manual title, type, year, creator, status, rating, and notes entry.
- Imported and selected provider records are normalized into CanonOS media, metadata, and preference models. Provider payloads remain snapshots; ratings, likes, dislikes, status, notes, aftertaste, queue state, and taste scores remain CanonOS-owned data.

## Core Rule

CanonOS remains deterministic and inspectable first. AI providers may enrich or explain data only after the core scoring and user-owned data flow can be understood without a black box.
