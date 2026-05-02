# ADR 0002: API-First Development

## Status

Accepted.

## Context

CanonOS recommendations, scoring, privacy boundaries, and import/export behavior are backend-owned product decisions. The browser app should not duplicate backend truth.

## Decision

Build backend contracts first for API-backed features, document them in OpenAPI and shared TypeScript contracts, then connect the browser flow.

## Consequences

- Every endpoint needs API tests and browser e2e coverage when a UI exists.
- Response shape changes must update serializers, contracts, frontend clients, and tests together.
- Frontend code presents server decisions and may not bypass API validation.
