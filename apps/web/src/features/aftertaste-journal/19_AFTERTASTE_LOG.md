# 19 - Aftertaste Log

## Route

`/app/aftertaste/new`

## Purpose

Captures reflection after completing or dropping something so CanonOS learns what truly stayed.

## Required Layout

Use `AppShell`. Highlight Library if launched from media context.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Aftertaste Log    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                          |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Aftertaste Log                                                                                               [Save Log]  |
|                            | Record what stayed with you after finishing or dropping something.                                                       |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Select Media                             | | Quick Scores                             |                                |
|   Candidate Evaluator      | | [Search/select media item             v] | | Worth the time? [0---10]                 |                                |
| > Library                  | | Status after this log [Completed v]      | | Memorability  [0---10]                   |                                |
|   Adaptive Queue           | | Completion date [        ]               | | Emotional hit [0---10]                   |                                |
|                            | +------------------------------------------+ | Intellectual [0---10]                    |                                |
| INTELLIGENCE               |                                              | Genericness  [0---10]                    |                                |
|   Taste Profile            |                                              | Regret       [0---10]                    |                                |
|   TasteGraph               |                                              +------------------------------------------+                                |
|   Anti-Generic Filter      | +--------------------------------------------------------------------------------+                                       |
|   Media Archaeologist      | | Reflection                                                                     |                                       |
|   Critic Council           | | What worked?                 [                                             ]   |                                       |
|   Personal Canon           | | What failed/felt generic?    [                                             ]   |                                       |
|   Adaptation Intel         | | Did it stay with you?        [                                             ]   |                                       |
|                            | | Recommend to someone like you? [Yes] [Maybe] [No]                              |                                       |
| SYSTEM                     | | [Cancel]                                                          [Save Log]   |                                       |
|   Insights                 | +--------------------------------------------------------------------------------+                                       |
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
| Save Log | Save aftertaste entry and update taste signals. |
| Media selector | Required unless mediaId query param exists. |
| Status | Update media status. |
| Completion date | Set completed/dropped date. |
| Score sliders | Capture post-consumption dimensions. |
| Reflection fields | Save qualitative signals. |
| Recommend buttons | Record recommendation inclination. |
| Cancel | Return previous page; confirm if dirty. |

## Data Needed

- selectedMedia
- status
- completionDate
- scores
- reflectionText
- recommendationAnswer

## Loading, Empty, and Error States

- **Loading:** Load prefilled media if present.
- **Validation:** Media required; other fields can be partial.
- **Error:** Save error without clearing text.
- **Success:** Toast and route to origin/media detail.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `MediaSelect`
- `Slider`
- `Textarea`
- `ButtonGroup`

## Implementation Notes

Aftertaste is critical for taste evolution; keep it quick.
