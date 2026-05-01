# CanonOS Architecture

This document summarizes architecture decisions while implementation progresses. The authoritative design baseline is `docs/CanonOS_Software_Design_Document_SDS.md`.

## Current Shape

- Monorepo with `apps/web`, `apps/api`, `packages/*`, `infra`, and `docs`.
- React/Vite frontend consumes server-owned product data through HTTP APIs.
- Django REST Framework backend owns business rules, persistence, scoring, and background job orchestration.
- PostgreSQL is the canonical database. Redis is the MVP cache and Celery broker.

## Core Rule

CanonOS remains deterministic and inspectable first. AI providers may enrich or explain data only after the core scoring and user-owned data flow can be understood without a black box.
