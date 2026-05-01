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

## Tonight Mode MVP Recommendation Rules

`POST /api/queue/tonight/` accepts the user's current available time, energy, focus, desired effect, media preferences, and risk tolerance. The service stores each request as a `TonightModeSession` and returns up to five deterministic recommendations.

Candidate sources in the MVP:

1. Existing adaptive queue items for the current user.
2. Planned library media that are not already linked to a queue item.

Ranking is intentionally inspectable and non-AI for MVP-M09:

- Hard filter out known durations that do not fit the available time window.
- Favor shorter/audiobook choices when energy or focus is low.
- Favor deeper movies/novels when focus is deep.
- Favor selected media types and desired-effect keyword matches from title, reason, notes, or best mood.
- Favor `start_soon` for safe choices, `sample_first` for challenging choices, and planned/unqueued media as wildcard choices.
- Return labeled safe, challenging, and wildcard cards when matching candidates exist.

The frontend can act on recommendations:

- **Start This** marks linked media as `consuming` when a media item exists.
- **Not Tonight** lowers linked queue items to `later` with a fatigue/context note.
- **Add To Queue** creates a queue item for planned media or candidate recommendations that are not already queued.
