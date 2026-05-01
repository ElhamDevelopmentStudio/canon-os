# 25 - Personal Canon Seasons

## Route

`/app/canon/seasons`

## Purpose

Organizes consumption into meaningful thematic seasons.

## Required Layout

Use `AppShell`. Active sidebar item: Personal Canon.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Personal Canon    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                          |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Personal Canon Seasons                                                                                  [Create Season]  |
|                            | Build curated explorations instead of random consumption.                                                                |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [Search seasons...] [Status v] [Theme v] [Sort: Updated v]                                                               |
|   Tonight Mode             | +--------------------------+ +--------------------------+ +------------------------+                                     |
|   Candidate Evaluator      | | Moral Collapse           | | Modern Exceptions       | | Atmosphere             |                                      |
|   Library                  | | 8 items | In progress    | | 12 items | Draft         | | 6 items                |                                     |
|   Adaptive Queue           | | Film + Series + Novel    | | Modern works worth it   | | Mood over plot         |                                      |
|                            | | Progress: 3/8            | | Progress: 0/12          | | Progress: 4/6          |                                      |
| INTELLIGENCE               | | [Open] [Edit] [Queue]    | | [Open] [Edit] [Queue]   | | [Open]                 |                                      |
|   Taste Profile            | +--------------------------+ +--------------------------+ +------------------------+                                     |
|   TasteGraph               | +--------------------------------------------------------------------------------+                                       |
|   Anti-Generic Filter      | | Suggested Season Ideas                                                         |                                       |
|   Media Archaeologist      | | - Anti-Heroes Done Right                         [Create]                      |                                       |
|   Critic Council           | | - Forgotten Masterpieces                          [Create]                      |                                      |
| > Personal Canon           | | - Adaptations Better Than Expected                [Create]                      |                                      |
|   Adaptation Intel         | +--------------------------------------------------------------------------------+                                       |
|                            |                                                                                                                          |
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
| Create Season | Open create season modal. |
| Search/filter/sort | Filter season cards. |
| Open | Route to season detail. |
| Edit | Open edit season modal. |
| Queue | Add next season item to queue. |
| Suggested Create | Create draft season from template. |

## Data Needed

- seasons
- seasonStatus
- themes
- progress
- suggestedTemplates

## Loading, Empty, and Error States

- **Loading:** Skeleton season cards.
- **Empty:** Show create and suggested templates.
- **No filters:** Show clear filters.
- **Error:** Retry.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `FilterBar`
- `SeasonCard`
- `SuggestedSeasonList`
- `CreateSeasonModal`

## Implementation Notes

Season cards emphasize theme and progress over poster art.
