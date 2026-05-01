# 30 - Activity and Notifications

## Route

`/app/activity`

## Purpose

Shows system events, import statuses, evaluation completions, saved actions, and recent activity.

## Required Layout

Use `AppShell`. Active sidebar item: Activity.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Activity    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                                |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Notifications and Activity                                                                              [Mark All Read]  |
|                            | See what CanonOS has done and what still needs attention.                                                                |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [All] [Unread] [Imports] [Evaluations] [Queue] [System]                                                                  |
|   Tonight Mode             | +--------------------------------------------------------------------------------+                                       |
|   Candidate Evaluator      | | Today                                                                          |                                       |
|   Library                  | | [Unread] Import completed: 218 items imported.             [View] [Mark Read]  |                                       |
|   Adaptive Queue           | | [Unread] Evaluation finished for Title A.                  [Open] [Queue]      |                                       |
|                            | | [Read]   Aftertaste log saved for Film B.                  [Open]              |                                       |
| INTELLIGENCE               | |                                                                                |                                       |
|   Taste Profile            | | Yesterday                                                                      |                                       |
|   TasteGraph               | | [Read]   Taste profile recalculated.                       [View Profile]      |                                       |
|   Anti-Generic Filter      | | [Read]   Queue item delayed due to mood mismatch.          [Open Queue]        |                                       |
|   Media Archaeologist      | +--------------------------------------------------------------------------------+                                       |
|   Critic Council           |                                                                                                                          |
|   Personal Canon           |                                                                                                                          |
|   Adaptation Intel         |                                                                                                                          |
|                            |                                                                                                                          |
| SYSTEM                     |                                                                                                                          |
|   Insights                 |                                                                                                                          |
|   Import                   |                                                                                                                          |
| > Activity                 |                                                                                                                          |
|   Settings                 |                                                                                                                          |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Mark All Read | Mark all visible notifications as read. |
| Filter chips | Filter activity by category. |
| View/Open | Route to related entity/page. |
| Queue | Add related media to queue. |
| Mark Read | Mark single notification read. |
| View Profile/Open Queue | Route to related page. |

## Data Needed

- activityEvents
- readStatus
- eventCategory
- linkedEntity
- actions

## Loading, Empty, and Error States

- **Loading:** Skeleton activity rows.
- **Empty:** Show No activity yet.
- **No filter results:** Show clear filter.
- **Error:** Retry.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `FilterChips`
- `ActivityTimeline`
- `NotificationRow`

## Implementation Notes

Group chronologically by date.
