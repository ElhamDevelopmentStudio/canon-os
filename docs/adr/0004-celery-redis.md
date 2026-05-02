# ADR 0004: Use Redis For Celery And Cache In MVP

## Status

Accepted.

## Context

CanonOS needs background jobs for imports, metadata refresh, TasteGraph rebuilds, and later AI/provider work. The MVP already needs Redis for cache-like local infrastructure.

## Decision

Use Redis as the default cache, Celery broker, and Celery result backend for local and MVP deployments. RabbitMQ remains optional if routing, durability, or throughput needs exceed Redis.

## Consequences

- Local Docker Compose starts Postgres and Redis as separate services.
- Celery settings default to Redis environment variables.
- Background job code must stay retry-safe so the broker can be changed later if needed.
