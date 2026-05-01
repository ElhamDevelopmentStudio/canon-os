# 13 - Media Detail

## Route

`/app/library/:mediaId`

## Purpose

Complete record for one media item: metadata, scores, notes, evaluations, aftertaste, relationships.

## Required Layout

Use `AppShell`. Active sidebar item: Library. Use right decision rail.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Library / Media Title    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                   |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Media Title                                                                                 [Edit] [Evaluate] [+ Queue]  |
|                            | Movie - 1998 - 100 min - Completed - Personal score 94                                                                   |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +--------------------+ +-------------------------------------+ +--------------------+                                    |
|   Tonight Mode             | | Poster / Cover     | | Main Notes and Metadata             | | Decision Rail      |                                    |
|   Candidate Evaluator      | |                    | | Status: Completed                   | | Fit: 94            |                                    |
| > Library                  | |                    | | Generic risk: Low                   | | Risk: Low          |                                    |
|   Adaptive Queue           | | [Change Cover]     | | Rewatch value: High                 | | Decision: Keep     |                                    |
|                            | +--------------------+ | Tags: Noir, Atmospheric             | | [Re-evaluate]      |                                    |
| INTELLIGENCE               |                        | Creators: ...                       | | [Log Aftertaste]   |                                    |
|   Taste Profile            |                        +-------------------------------------+ | [Add to Season]    |                                    |
|   TasteGraph               |                                                              +--------------------+                                      |
|   Anti-Generic Filter      | Tabs: Overview | Ratings | Aftertaste | Taste Signals | Related | History                                                |
|   Media Archaeologist      | --------------------------------------------------------------------------------                                         |
|   Critic Council           | Personal review / notes                                                                                                  |
|   Personal Canon           | [ Rich text notes area                                                        ]                                          |
|   Adaptation Intel         | Scores: Story 90 | Character 96 | Atmosphere 98 | Ending 88                                                              |
|                            | [Save Notes]                                                                                                             |
| SYSTEM                     |                                                                                                                          |
|   Insights                 |                                                                                                                          |
|   Import                   |                                                                                                                          |
|   Activity                 |                                                                                                                          |
|   Settings                 |                                                                                                                          |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Edit | Route to edit page or open edit drawer. |
| Evaluate | Route to `/app/evaluator?mediaId=:mediaId`. |
| + Queue | Add item to Adaptive Queue. |
| Change Cover | Open cover upload/select modal. |
| Re-evaluate | Run evaluator again on current data. |
| Log Aftertaste | Route to `/app/aftertaste/new?mediaId=:mediaId`. |
| Add to Season | Open Add to Season modal. |
| Tabs | Switch detail sections in place. |
| Save Notes | Save personal notes; disabled until changed. |

## Data Needed

- mediaDetail
- ratings
- tags
- notes
- evaluationSummary
- aftertasteLogs
- relatedWorks
- historyEvents

## Loading, Empty, and Error States

- **Loading:** Skeleton poster, metadata, tabs.
- **Not found:** Show not-found card with back to Library.
- **Error:** Show retry.
- **Unsaved notes:** Warn before navigation.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `MediaHero`
- `DecisionRail`
- `Tabs`
- `ScoreGrid`
- `RichNotesEditor`

## Implementation Notes

Media Detail is the canonical source of truth for one item.
