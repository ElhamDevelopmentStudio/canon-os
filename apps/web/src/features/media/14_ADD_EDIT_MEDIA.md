# 14 - Add/Edit Media

## Route

`/app/library/new and /app/library/:mediaId/edit`

## Purpose

Creates or edits a media item across all supported media types.

## Required Layout

Use `AppShell` for the add page. Add media must be a dedicated provider-first page; edit can keep a focused one-item edit modal/detail action.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Library / Add Media    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                     |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Add Media                                                                                                 [Save Titles] |
|                            | Choose one category, search providers, inspect details, and add several titles at once.                                  |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +----------------------------------------------------+ +------------------------+                                        |
|   Tonight Mode             | | Category: [Movie] [TV] [Anime] [Novel] [Audio]      | | Selected titles        |                                       |
|   Candidate Evaluator      | | Search [Dune                         ] [Provider v] | | Dune Part Two      ... |                                       |
| > Library                  | | Results: poster title year creator confidence       | | Configure status/rate  |                                       |
|   Adaptive Queue           | | Click result -> details modal                       | | Save 3 titles          |                                       |
|                            | | Advanced Options: manual entry fallback             | +------------------------+                                       |
| INTELLIGENCE               | +----------------------------------------------------+                                                                   |
|   Taste Profile            |                                                                                                                          |
|   TasteGraph               |                                                                                                                          |
|   Anti-Generic Filter      |                                                                                                                          |
|   Media Archaeologist      |                                                                                                                          |
|   Critic Council           |                                                                                                                          |
|   Personal Canon           |                                                                                                                          |
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
| Save Titles | Save every selected item and route back to Library. |
| Category selector | Locks one media type per batch and clears selected items when changed. |
| Provider search | Searches the routed metadata provider for the chosen category. |
| Result card | Opens a details modal when clicked. |
| Add result | Adds the result to the selected titles panel. |
| Three-dot menu | Opens actions for details, configure, and remove. |
| Configure | Opens status, rating, notes, and score controls for the selected title. |
| Advanced Options | Allows manual entry when providers cannot find the title. |
| Status select | Sets planned/watching/reading/listening/completed/dropped/paused. |
| Cancel | Return previous page; confirm if dirty. |

## Data Needed

- title
- originalTitle
- medium
- status
- year
- runtimeOrLength
- country
- language
- creators
- externalIds
- notes
- provider match snapshot
- personal rating
- taste scores

## Loading, Empty, and Error States

- **Searching:** Disable search and show provider lookup status.
- **Saving:** Disable submit buttons.
- **Validation:** Title and medium are required.
- **No matches:** Show manual fallback.
- **Metadata detail:** Show source, confidence, rating/popularity, and provider detail fields.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `MediaForm`
- `FormSection`
- `Select`
- `Checkbox`
- `Textarea`
- `Button`
- `ConfirmDialog`

## Implementation Notes

Create flow is provider-first and batch-oriented. Edit flow can stay focused on one saved item.
