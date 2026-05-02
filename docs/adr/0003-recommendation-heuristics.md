# ADR 0003: Start With Deterministic Recommendation Heuristics

## Status

Accepted.

## Context

CanonOS needs useful recommendations before external AI/provider integrations are reliable. Users must also understand why a recommendation was made.

## Decision

Use deterministic, explainable heuristics for MVP and complete-product foundations. AI enrichment can be layered later as optional evidence, not as the only decision path.

## Consequences

- Candidate Evaluator and Tonight Mode remain testable without provider keys.
- Explanations can cite stable score components and known user settings.
- Future AI features must degrade to deterministic behavior when providers fail.
