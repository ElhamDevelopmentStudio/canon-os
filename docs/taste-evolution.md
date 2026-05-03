# Taste Evolution Journal

The Taste Evolution Journal tracks how the user's taste changes over time using only owned CanonOS evidence. It is deterministic: no AI inference is used, and every snapshot preserves the aggregate values and generated insights that existed when the snapshot was created.

## Evidence Sources

Snapshots read only the authenticated user's data:

- completed/rated `MediaItem` records;
- media type and status history from `MediaItem`;
- `MediaScore` rows for positive dimensions, `genericness`, and `regret_score`;
- `AftertasteEntry` rows for `worthTime` and `feltGeneric` signals.

Dates are grouped by month. A media item's `completedDate` is preferred; otherwise the latest update date is used. Aftertaste and score evidence inherits the linked media completion month so a reflection belongs to the work it describes.

## Trend Rules

- **Rating trend**: average personal rating per active month.
- **Medium trend**: dominant completed media type per active month.
- **Genericness tolerance**: `100 - genericness pressure`, where pressure comes from `genericness` scores and `feltGeneric` aftertaste flags. Lower values mean genericness is becoming harder to tolerate.
- **Regret trend**: pressure from `regret_score` and `worthTime = false`. Higher values mean more time-waste evidence.
- **Completion fatigue**: paused/dropped media share plus not-worth-time aftertaste pressure. Higher values mean the user may need lower-commitment choices.
- **Favorite dimension**: highest average positive taste dimension per active month.

Snapshots currently keep the last 12 active months plus the requested snapshot month.

## Insights

Each generated snapshot stores up to four `TasteChangeInsight` items. Insights are threshold based:

- rating movement of at least `0.5` points creates a positive or warning rating shift;
- genericness tolerance below `60/100` creates a warning;
- regret pressure above `35/100` creates a warning;
- completion fatigue above `35/100` creates a warning;
- a current favorite dimension creates a positive anchor insight;
- empty data creates a neutral evidence-needed insight.

The Dashboard shows the newest insight from the latest snapshot.

## API and UI

- `GET /api/taste-evolution/` lists the user's snapshot timeline.
- `POST /api/taste-evolution/generate/` creates a monthly snapshot and returns it.
- `/taste-evolution` renders the browser journal, trend cards, insights, and snapshot history.

Future changes must update `packages/contracts/src/evolution.ts`, backend serializers/services, the frontend API client, browser e2e coverage, and this document together.
