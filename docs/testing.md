# CanonOS Testing Notes

CanonOS uses root verification gates for every implementation slice:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

As modules are initialized, their package-level scripts should be wired into the root commands. User-facing features must also update the matching manual test document under `docs/manual-tests/`.
