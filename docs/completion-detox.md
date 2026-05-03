# Completion Detox

Completion Detox helps the user stop, pause, or consciously continue media without moralizing or sunk-cost pressure.

## Behavior

- Rules are owner-scoped and seed automatically when the user opens the detox rules endpoint.
- Default sample rules cover movies, TV shows, anime, and novels.
- A rule has a medium, sample limit, enabled flag, and JSON condition such as `maxMotivation` and eligible statuses.
- Evaluation records a `DetoxDecision` with the media item, matched rule, decision, neutral reason, progress, motivation, and estimated time saved.
- Time saved is estimated from remaining runtime, episodes, pages, or audiobook minutes. Continue decisions do not add saved time.
- Media status changes are explicit user actions. A detox recommendation does not automatically drop or pause the work.

## Default rules

| Rule | Medium | Sample limit | Default condition |
| --- | --- | --- | --- |
| Movie 30 minute sample | Movie | 30 minutes | Motivation <= 4, planned/consuming status |
| TV two episode sample | TV show | 2 episodes | Motivation <= 4, planned/consuming status |
| Anime three episode sample | Anime | 3 episodes | Motivation <= 4, planned/consuming status |
| Novel 50 page sample | Novel | 50 pages | Motivation <= 4, planned/consuming status |

## API

- `GET /api/detox/rules/`
- `PATCH /api/detox/rules/{id}/`
- `POST /api/detox/rules/reset/`
- `POST /api/detox/evaluate/`
- `GET /api/detox/decisions/`
- `GET /api/detox/time-saved/`

## UX rules

- Copy must stay practical and non-judgmental.
- The user can mark the item dropped, mark it paused, or continue anyway.
- The Media Detail page can show a detox checkpoint warning for planned/consuming media with an enabled matching rule.
