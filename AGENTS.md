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

## Sub-Agent Orchestration Rules

Use sub-agents for parallel work, but keep one owner agent responsible for final quality.

### When to Use Sub-Agents

- Use sub-agents when work can be split into independent parts (for example: backend API, frontend UI, tests, docs).
- Do not use sub-agents for tiny single-file edits unless it improves speed clearly.
- Do not split tightly coupled refactors that need constant shared context.

### Recommended Sub-Agent Roles

1. Planner sub-agent
   - Break work into vertical slices with acceptance criteria.
   - Identify dependencies and safe parallel groups.
2. Implementer sub-agent(s)
   - Build one slice end-to-end (code + tests).
3. Reviewer sub-agent
   - Check correctness, duplication, architecture fit, and code simplicity.
4. QA sub-agent
   - Validate verification commands, UX states, and manual test docs.

### Parallelization Rules

- Parallelize only independent tasks.
- Each sub-agent must own a clearly scoped area (specific folder/module/feature).
- Avoid overlapping edits in the same files when running in parallel.
- If overlap is unavoidable, serialize work and re-run verification after integration.

### Required Handoff Format (Sub-Agent -> Owner Agent)

Each sub-agent must return:

1. Scope completed.
2. Files changed.
3. Tests added/updated.
4. Risks/open questions.
5. Exact verification run and results.

### Owner Agent Responsibilities

The owner agent must:

1. Integrate all sub-agent work.
2. Remove duplication and dead code after merge.
3. Resolve conflicts and re-run full verification gates.
4. Ensure manual test docs were added/updated for each changed feature.
5. Create the final commit following commit rules.

No sub-agent result is considered complete until the owner agent validates it against all gates in this file.

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
