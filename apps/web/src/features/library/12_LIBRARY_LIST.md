# 12 - Library List

## Route

`/app/library`

## Purpose

Searchable database of movies, series, anime, novels, audiobooks, and future media types.

## Required Layout

Use `AppShell`. Active sidebar item: Library.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Library    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                                 |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Library                                                                                                     [Add Media]  |
|                            | Everything consumed, paused, dropped, or planned.                                                                        |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [Search title, creator, notes...] [Medium v] [Status v] [Score v] [More]                                                 |
|   Tonight Mode             | [View: Table] [Grid] [Sort: Last updated v]                         [Export CSV]                                         |
|   Candidate Evaluator      | --------------------------------------------------------------------------------                                         |
| > Library                  | Title                 Medium      Status       Score   Generic Risk   Actions                                            |
|   Adaptive Queue           | --------------------------------------------------------------------------------                                         |
|                            | Dark City             Movie       Completed    94      Low            Details ...                                        |
| INTELLIGENCE               | Monster               Anime       Completed    96      Low            Details ...                                        |
|   Taste Profile            | Example Novel         Novel       Reading      88      Med            Details ...                                        |
|   TasteGraph               | Long Series           Series      Dropped      42      High           Details ...                                        |
|   Anti-Generic Filter      | Audiobook Title       Audiobook   Listening    83      Low            Details ...                                        |
|   Media Archaeologist      | --------------------------------------------------------------------------------                                         |
|   Critic Council           | Selected: 0 items        Bulk: [Tag] [Queue] [Evaluate] [Delete]                                                         |
|   Personal Canon           | Page 1 of 42                                      [Previous] [1] [2] [3] [Next]                                          |
|   Adaptation Intel         |                                                                                                                          |
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
| Add Media | Open shared Add Media drawer or route to `/app/library/new`. |
| Search | Debounced filter by title, creator, notes, tags. |
| Medium filter | Movie, series, anime, novel, audiobook. |
| Status filter | Planned, watching, reading, listening, completed, dropped, paused. |
| More | Advanced filters: year, country, language, creator, tags, regret, rewatch value. |
| View Table/Grid | Toggle view and persist user preference. |
| Export CSV | Export current filtered result set. |
| Details | Route to media detail page. |
| Row actions | Edit, Evaluate, Add to Queue, Log Aftertaste, Delete. |
| Bulk actions | Apply action to selected rows. |
| Pagination | Change page without losing filters. |

## Data Needed

- mediaItems
- pagination
- filters
- sort
- selectedRows
- viewPreference

## Loading, Empty, and Error States

- **Loading:** Skeleton table rows.
- **Empty library:** Show Add Media and Import actions.
- **No results:** Show clear filters action.
- **Error:** Table-level retry state.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `FilterBar`
- `MediaTable`
- `MediaCardGrid`
- `BulkActionBar`
- `Pagination`
- `DropdownMenu`

## Implementation Notes

Table mode is important because the user may have thousands of items.
