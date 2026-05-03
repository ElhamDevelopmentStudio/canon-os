# Personal Canon Builder

Personal Canon Builder turns random queue movement into a themed exploration season with a clear question, ordered works, completion progress, canon verdicts, and reflection.

## Behavior

- Canon seasons are user-owned and can be planned, active, paused, or completed.
- Starter themes include moral collapse, anti-heroes done right, forgotten masterpieces, modern works worth it, atmosphere over plot, and custom.
- A season can mix media library items, candidate evaluator records, and custom works in one ordered path.
- Each item stores a title snapshot, medium, inclusion reason, attention note, completion status, and canon status.
- Canon statuses are **personal canon**, **near-canon**, **rejected**, **historically important but not loved**, or unmarked.
- Progress is calculated from completed items over total season items.
- Reflection prompts are generated from the season theme, and the user can save season summary notes.

## API

- `GET /api/seasons/`
- `POST /api/seasons/`
- `GET /api/seasons/{id}/`
- `PATCH /api/seasons/{id}/`
- `DELETE /api/seasons/{id}/`
- `POST /api/seasons/{id}/items/`
- `PATCH /api/seasons/{seasonId}/items/{itemId}/`
- `DELETE /api/seasons/{seasonId}/items/{itemId}/`
- `POST /api/seasons/{id}/items/reorder/`

## UX rules

- The list page must show loading, empty, error, and success states.
- The detail page must show progress, ordered item cards, reason/attention notes, reorder controls, completion actions, canon status controls, and reflection prompts.
- Item source validation stays owner-scoped: users can only add their own media items or candidates.
- Unsafe writes must use the shared Axios client so browser CSRF and session cookies are exercised by e2e tests.
