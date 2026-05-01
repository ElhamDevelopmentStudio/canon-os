# CanonOS Deployment Notes

CanonOS starts as a local-first private web app and keeps a path open for private cloud deployment.

## Branch Protection Expectations

Protected branches should require:

- Passing CI checks for lint, typecheck, tests, build, and E2E.
- At least one review approval before merge.
- Branches to be up to date before merge.
- Direct pushes and force-pushes to protected branches to be blocked.
- Completion of `docs/PR_CHECKLIST.md` before merge.

## Runtime Direction

The expected service split is web, API, worker, beat, PostgreSQL, and Redis. RabbitMQ remains optional until Redis is insufficient for queue reliability or routing needs.
