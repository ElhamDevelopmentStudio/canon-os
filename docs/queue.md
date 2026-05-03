# Adaptive Queue API and Product Rules

The Adaptive Queue is a practical watch/read/listen queue used by Candidate Evaluator and Tonight Mode. Queue items are owner-scoped and can point at either a library `MediaItem`, a saved `Candidate`, or a manual title snapshot.

## Priority Lanes

Queue priority is intentionally simple in the MVP:

- `start_soon`: strong fit or ready to consume soon.
- `sample_first`: promising but needs a first episode/chapter/session before commitment.
- `later`: delay/archive because timing, mood, confidence, or risk is wrong.

## Queue v2 Fields

CP-M05 upgrades queue items with dynamic decision fields:

- `moodCompatibility`: `0` to `100`; how well this item fits the user's likely current moods.
- `intensityLevel`: `0` to `10`; emotional/cognitive intensity.
- `complexityLevel`: `0` to `10`; density, lore load, or attention requirement.
- `commitmentLevel`: `0` to `10`; time/series/reading commitment cost.
- `freshnessScore`: `0` to `100`; decays as items age or repeat in recommendations.
- `lastRecommendedAt` and `timesRecommended`: feedback signals from Tonight Mode.
- `isArchived`: low-priority archive flag. Archived items remain visible in Queue but are excluded from Tonight Mode until restored.

New queue items infer these fields from existing title, medium, priority, estimated time, mood, and reason fields. Future UIs may expose direct editing; the current UI displays the fields and lets recalculation adjust priority/archive state.

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
- Queue v2 scores and archive state.

Snapshots let the queue remain useful even if linked media or candidate records are later changed or removed.

## Reordering

`POST /api/queue-items/reorder/` accepts `{ "itemIds": ["..."] }` and rewrites queue positions in that order for the current user only. Items not included keep their existing relative positions after the reordered items.

## Recalculation

`POST /api/queue-items/recalculate/` rescales the current user's queue with deterministic scoring:

- boosts high mood compatibility, freshness, and short/flexible commitments;
- penalizes stale, repeatedly recommended, high-commitment, high-complexity items;
- promotes strong items to `start_soon`;
- moves promising-but-not-urgent items to `sample_first`;
- delays weak items to `later`;
- archives very low-fit or fatigued items with `isArchived=true`.

The response returns updated queue items, per-item score reasons, and a summary with active count, archived count, average score, top insight, and fatigue warnings.

## Candidate Integration

The Candidate Evaluator maps decisions into queue lanes:

- `watch_now` -> `start_soon`
- `sample` -> `sample_first`
- `delay` and `skip` -> `later`

The queue item stores the evaluator recommended action as its reason and evaluator best mood as its best mood.

## Tonight Mode MVP Recommendation Rules

`POST /api/queue/tonight/` accepts the user's current available time, energy, focus, desired effect, media preferences, and risk tolerance. The service stores each request as a `TonightModeSession` and returns up to five deterministic recommendations.

Candidate sources in the MVP:

1. Existing non-archived adaptive queue items for the current user.
2. Planned library media that are not already linked to a queue item.

Ranking is intentionally inspectable and non-AI for MVP-M09:

- Hard filter out known durations that do not fit the available time window.
- Favor shorter/audiobook choices when energy or focus is low.
- Favor deeper movies/novels when focus is deep.
- Favor selected media types and desired-effect keyword matches from title, reason, notes, or best mood.
- Favor `start_soon` for safe choices, `sample_first` for challenging choices, and planned/unqueued media as wildcard choices.
- Apply Queue v2 mood compatibility, intensity, complexity, commitment, freshness, and repeat-recommendation signals.
- Return labeled safe, challenging, and wildcard cards when matching candidates exist.

The frontend can act on recommendations:

- **Start This** marks linked media as `consuming` when a media item exists.
- **Not Tonight** lowers linked queue items to `later` with a fatigue/context note.
- **Add To Queue** creates a queue item for planned media or candidate recommendations that are not already queued.
