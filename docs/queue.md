# Queue API and Product Rules

The MVP Queue is a practical watch/read/listen queue used by Candidate Evaluator and future Tonight Mode flows. Queue items are owner-scoped and can point at either a library `MediaItem`, a saved `Candidate`, or a manual title snapshot.

## Priority Lanes

Queue priority is intentionally simple in the MVP:

- `start_soon`: strong fit or ready to consume soon.
- `sample_first`: promising but needs a first episode/chapter/session before commitment.
- `later`: delay/archive because timing, mood, confidence, or risk is wrong.

## Queue Item Fields

Each queue item stores:

- Optional `mediaItemId`.
- Optional `candidateId`.
- `title` snapshot.
- `mediaType` snapshot.
- `priority` lane.
- `reason` for inclusion.
- `estimatedTimeMinutes`.
- `bestMood`.
- `queuePosition`.
- Timestamps.

Snapshots let the queue remain useful even if linked media or candidate records are later changed or removed.

## Reordering

`POST /api/queue-items/reorder/` accepts `{ "itemIds": ["..."] }` and rewrites queue positions in that order for the current user only. Items not included keep their existing relative positions after the reordered items.

## Candidate Integration

The Candidate Evaluator maps decisions into queue lanes:

- `watch_now` -> `start_soon`
- `sample` -> `sample_first`
- `delay` and `skip` -> `later`

The queue item stores the evaluator recommended action as its reason and evaluator best mood as its best mood.
