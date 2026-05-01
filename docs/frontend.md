# CanonOS Frontend Notes

The web app lives in `apps/web` and uses React, Vite, TypeScript, Tailwind CSS, shadcn/ui-compatible component patterns, Axios, SWR, Zustand, and React Router.

## Current Foundation

- App entrypoint: `apps/web/src/main.tsx`
- Router: `apps/web/src/app/router.tsx`
- App providers: `apps/web/src/app/providers.tsx`
- Layout shell: `apps/web/src/app/layouts/AppLayout.tsx`
- Temporary home page: `apps/web/src/pages/HomePage.tsx`
- API client: `apps/web/src/lib/api.ts`
- Health API function and SWR hook: `apps/web/src/lib/health.ts`
- Tailwind globals: `apps/web/src/styles/globals.css`
- shadcn/ui config: `apps/web/components.json`

## UI Requirements

- Every user-facing screen needs loading, empty, error, and success states where relevant.
- Keyboard navigation, visible focus, labels, and semantic structure are required.
- The frontend displays server-produced scores and explanations; it does not own recommendation truth.

## Local Commands

```bash
corepack pnpm --filter @canonos/web run dev
corepack pnpm --filter @canonos/web run lint
corepack pnpm --filter @canonos/web run typecheck
corepack pnpm --filter @canonos/web run test
corepack pnpm --filter @canonos/web run build
```

## Health Integration

Set `VITE_API_BASE_URL=http://localhost:8000/api` in `apps/web/.env` or the root `.env`. The temporary home page calls `GET /health/` through the shared Axios client and displays loading, success, and error states.
