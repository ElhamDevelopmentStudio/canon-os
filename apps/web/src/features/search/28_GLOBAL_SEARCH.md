# 28 - Global Search Results

## Route

`/app/search`

## Purpose

Full search results for media, notes, taste signals, seasons, actions, and pages.

## Required Layout

Use `AppShell`. Active sidebar can remain from previous context or none.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Search    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                                  |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Search Results                                                                                        [Advanced Search]  |
|                            | Results for: "moral collapse"                                                                                            |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [Search CanonOS...] [All v] [Media v] [Sort: Relevance v]                                                                |
|   Tonight Mode             | +-----------------------------+ +------------------------------------------------------+                                 |
|   Candidate Evaluator      | | Result Types                | | Results                                              |                                 |
|   Library                  | | [x] Media        42         | | Media Title                                          |                                 |
|   Adaptive Queue           | | [x] Notes        18         | | Movie - Completed - 94 fit                           |                                 |
|                            | | [x] Taste signals 7         | | Matching note excerpt...                             |                                 |
| INTELLIGENCE               | | [x] Seasons       3         | | [Open] [Evaluate] [+Queue]                           |                                 |
|   Taste Profile            | | [x] Actions       5         | |------------------------------------------------------|                                 |
|   TasteGraph               | | [Clear Filters]             | | Season: Moral Collapse                               |                                 |
|   Anti-Generic Filter      | +-----------------------------+ | Matching theme and notes...                          |                                 |
|   Media Archaeologist      |                                 | [Open Season]                                        |                                 |
|   Critic Council           |                                 |------------------------------------------------------|                                 |
|   Personal Canon           |                                 | Taste Signal: Moral complexity                        |                                |
|   Adaptation Intel         |                                 | Evidence: 23 high-rated works                         |                                |
|                            |                                 | [Open Taste Profile]                                  |                                |
| SYSTEM                     |                                 +------------------------------------------------------+                                 |
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
| Advanced Search | Open advanced filter drawer. |
| Search input | Run full search; sync query param. |
| Scope filters | Control result scope. |
| Sort | Sort by relevance, updated date, score, type. |
| Result type checkboxes | Filter categories. |
| Clear Filters | Clear category filters. |
| Open | Route to result target. |
| Evaluate / +Queue | Candidate actions for media result. |

## Data Needed

- query
- resultCategories
- results
- filters
- sort
- pagination

## Loading, Empty, and Error States

- **Loading:** Skeleton result rows.
- **No query:** Show suggested commands/searches.
- **No results:** Show broader query suggestion.
- **Error:** Retry preserving query.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `SearchInput`
- `SearchFacetPanel`
- `SearchResultList`
- `AdvancedSearchDrawer`

## Implementation Notes

Search includes pages/actions, not only media.
