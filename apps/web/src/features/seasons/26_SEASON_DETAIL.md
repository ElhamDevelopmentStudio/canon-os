# 26 - Season Detail

## Route

`/app/canon/seasons/:seasonId`

## Purpose

Shows plan, order, rationale, progress, and notes for one Personal Canon season.

## Required Layout

Use `AppShell`. Active sidebar item: Personal Canon.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Canon / Season Title    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                    |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Season: Moral Collapse                                                                         [Add Item] [Edit Season]  |
|                            | Explore ambition, guilt, corruption, consequence, and irreversible decline.                                              |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Season Overview                          | | Season Progress                          |                                |
|   Candidate Evaluator      | | Theme: Moral Collapse                    | | 3 / 8 completed                          |                                |
|   Library                  | | Status: In progress                      | | Current item: Film A                      |                               |
|   Adaptive Queue           | | Medium mix: Film, Series, Novel, Anime   | | [Queue Next Item]                         |                               |
|                            | | Guiding question: When does ambition rot?| | [Generate Reflection]                     |                               |
| INTELLIGENCE               | +------------------------------------------+ +------------------------------------------+                                |
|   Taste Profile            | +--------------------------------------------------------------------------------+                                       |
|   TasteGraph               | | Season Items                                                                  |                                        |
|   Anti-Generic Filter      | | #  Title       Medium   Why included              Status        Actions        |                                       |
|   Media Archaeologist      | | 1  Film A      Movie    Moral starting point      Completed     Details        |                                       |
|   Critic Council           | | 2  Novel B     Novel    Internal corruption       Current       Start          |                                       |
| > Personal Canon           | | 3  Anime C     Anime    Consequence arc           Planned       Queue          |                                       |
|   Adaptation Intel         | | 4  Series D    Series   Institutional decay       Planned       Evaluate       |                                       |
|                            | +--------------------------------------------------------------------------------+                                       |
| SYSTEM                     | | Season Notes and Reflection [ Rich text notes area                       ]     |                                       |
|   Insights                 | | [Save Notes]                                                                  |                                        |
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
| Add Item | Open media search/add modal. |
| Edit Season | Open season metadata modal. |
| Queue Next Item | Add next planned item to queue. |
| Generate Reflection | Summarize season notes/logs if supported. |
| Details | Route to media detail. |
| Start | Mark item current. |
| Queue | Add item to queue. |
| Evaluate | Open evaluator. |
| Save Notes | Save season notes. |

## Data Needed

- season
- seasonItems
- progress
- currentItem
- notes
- itemRationale
- itemStatus

## Loading, Empty, and Error States

- **Loading:** Skeleton cards/table.
- **Empty season:** Show Add first item and discovery suggestions.
- **Error:** Retry and back to seasons.
- **Unsaved notes:** Warn before leaving.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `SeasonOverviewCard`
- `ProgressCard`
- `SeasonItemTable`
- `RichNotesEditor`

## Implementation Notes

Item order must be explicit.
