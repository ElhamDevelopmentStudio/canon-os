# Commit Message Conventions

CanonOS uses short, outcome-focused commit subjects for project history.

## Required Format

Use one line when committing local work:

```text
<prefix>: <specific outcome>
```

Allowed prefixes:

- `feat:`
- `fix:`
- `refactor:`
- `perf:`
- `test:`
- `docs:`
- `chore:`

Examples:

- `feat: add metadata provider adapter base`
- `fix: normalize api validation errors`
- `test: cover queue reorder ownership`

## Local Hook Note

The OMX runtime may enforce an expanded Lore-format commit body for agent-created commits. Human-facing CanonOS history should still keep the subject line prefixed, specific, and focused on the outcome.

Do not add vendor attribution or broad generic subjects.
