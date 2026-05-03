# Adaptation Intelligence

Adaptation Intelligence tracks how one owned media item relates to another source, adaptation, remake, audiobook version, or loose alternate version. The first implementation lives on the Media Detail page under the **Adaptations** tab so the relation is visible from both sides of the pair.

## Data model

Each `AdaptationRelation` is owner-scoped and links two owned `MediaItem` records:

- `sourceMediaItemId`: the source work or earlier/original version.
- `adaptationMediaItemId`: the adaptation, remake, audiobook, or alternate version.
- `relationType`: source/adaptation relationship such as `novel_to_film`, `novel_to_show`, `manga_to_anime`, `audiobook_version`, `remake`, or `alternate_version`.
- `completeness`: `complete`, `partial`, `incomplete`, `loose`, or `unknown`.
- `faithfulnessScore`, `pacingPreservationScore`, and `soulPreservationScore`: optional `0` to `100` comparison scores.
- `recommendedExperienceOrder`: `read_first`, `watch_first`, `listen_first`, `adaptation_sufficient`, `source_preferred`, or `skip_adaptation`.
- `notes`: private comparison notes, including changed tone, compression, weak endings, or narration quality.

A relation cannot use the same media item as both source and adaptation. Users cannot link media owned by another account.

## Experience path recommendation

The backend produces a deterministic `AdaptationPath` from the current owner-scoped relations for a media item. The current rules are intentionally transparent:

1. Prefer source-first when relations are missing, incomplete, partial, low-scoring, or high-risk.
2. Recommend skipping the adaptation when multiple high-risk signals or very low average preservation scores are present.
3. Prefer `listen_first` for strong audiobook relations.
4. Prefer `read_first` for strong novel-source relations.
5. Prefer `watch_first` when the current item is a strong visual adaptation.
6. Mark strong complete adaptations as sufficient when scores support that decision.

Risk signals are generated from completeness, low faithfulness, pacing compression, soul loss, changed tone, weak endings, and poor narration notes. The recommendation includes rationale and a confidence score so the UI can show why CanonOS chose the path.

## UI behavior

On `/library/:mediaId`, the **Adaptations** tab:

- lists all relations where the current item is either source or adaptation;
- shows source/adaptation labels, relation type, completeness, score badges, recommended order, and notes;
- opens an accessible **Add adaptation relation** modal with source/adaptation selectors, relation type, completeness, score fields, recommended order, and comparison notes;
- calls **Get Experience Path** to recalculate the backend recommendation; and
- allows removing an owned relation.

The relation appears on both linked media detail pages after creation.

## Testing contract

- Backend API tests cover creation, owner scoping, validation, update/delete, OpenAPI paths, and path recommendation risk output.
- Frontend component tests cover the Adaptations tab, relation creation, deletion, and path generation.
- Browser e2e covers creating a novel-to-show/anime relation through the UI, generating a path from the browser, confirming the relation appears on both detail pages, and deleting it.

Future adaptation endpoints must follow the repository e2e rule in `docs/testing.md`: browser-to-backend coverage through the user-facing flow unless an API-only exception is documented.
