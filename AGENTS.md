# CanonOS Agent Contract

## Mission

Build CanonOS end-to-end with clean, reusable code, excellent UX, and complete feature coverage. "Done" means implemented, verified, and documented.

## Scope and Source of Truth

- Product behavior: `docs/CanonOS_SRS_v1_0.md`
- Technical architecture: `docs/CanonOS_Software_Design_Document_SDS.md`
- Delivery checklist: `docs/CHECKLIST.md`
- If conflicts exist, stop and ask the user before implementing.

## Non-Negotiable Quality Rules

1. No placeholder logic, fake completion, or TODO-based shipping.
2. No duplicate logic when shared utilities/components/services can be used.
3. No dead code or unused files left behind.
4. No lint/type/test/build regressions.
5. All user-facing features must include loading, empty, error, and success states.
6. Accessibility is required: keyboard navigation, visible focus, labels, semantic structure.

## Required Workflow For Every Task

1. Read relevant sections from SRS/SDS/CHECKLIST.
2. Implement backend + frontend integration for the requested slice.
3. Add/update automated tests.
4. Add/update manual test doc for the affected feature.
5. Run verification commands.
6. If all checks pass, commit automatically using commit rules below.
7. Report what changed, what was tested, and any known risk.

## Commit Rules (Mandatory)

After a task is complete and verified, create a commit automatically.

- Commit message must be a **single line**, specific, and prefixed.
- Allowed prefixes:
  - `feat:`
  - `fix:`
  - `refactor:`
  - `perf:`
  - `test:`
  - `docs:`
  - `chore:`
- Do **not** add co-author trailers.
- Do **not** add attribution lines (no AI/tool/vendor signatures).
- Keep message focused on outcome, not generic wording.

Examples:
- `feat: implement adaptive queue ranking with risk-aware scoring`
- `fix: resolve aftertaste log save failure for partial reflections`
- `refactor: extract shared evaluation score normalization utilities`

## Verification Gates (Strict CI Standard)

All work must pass these gates before considering completion:

1. Lint
2. Typecheck
3. Tests
4. Build
5. E2E

Default commands (adjust to actual scripts if changed):

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm e2e`

If any gate fails, do not mark complete and do not skip silently.

## Branch and PR Protection Expectations

- Use branch protection so protected branches require passing CI.
- Require review approval before merge.
- Require up-to-date branch before merge.
- Block force-push and direct push to protected branches.
- Require PR checklist completion for merge.

Reference checklist file: `docs/PR_CHECKLIST.md`

## Manual Test Documentation (Required Per Feature)

For every feature added/changed, create or update:

- `docs/manual-tests/<feature-name>.md`

Rules for manual test docs:

1. Keep language simple and user-friendly.
2. Use short, numbered, step-by-step instructions.
3. Include expected result after each meaningful step.
4. Include at least:
   - Happy path
   - One error path
   - One edge case (if relevant)
5. Avoid deep technical jargon.

Reference template: `docs/manual-tests/TEMPLATE.md`

## Completion Output Format

When reporting completion, include:

1. What was implemented.
2. Files changed.
3. Verification commands + outcomes.
4. Manual test doc path(s) added/updated.
5. Commit hash + one-line commit message.
