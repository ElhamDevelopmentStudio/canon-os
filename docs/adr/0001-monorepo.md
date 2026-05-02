# ADR 0001: Use A Monorepo

## Status

Accepted.

## Context

CanonOS ships a browser app, Django API, shared TypeScript contracts, docs, scripts, and infrastructure that must evolve together.

## Decision

Keep frontend, backend, contracts, docs, scripts, and infrastructure in one repository.

## Consequences

- Root commands can validate cross-package behavior with one CI surface.
- API contract changes can land with frontend usage and tests in the same commit.
- Module ownership docs are required so the monorepo does not become a dumping ground.
