# 11 - Dashboard

## Route

`/app/dashboard`

## Purpose

Main home page with current status, next actions, recent activity, and queue preview.

## Required Layout

Use `AppShell`. Active sidebar item: Dashboard.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Dashboard    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                               |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Dashboard                                                                                          [Start Tonight Mode]  |
|                            | Your current media command center.                                                                                       |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
| > Dashboard                | +------------------+ +------------------+ +------------------+ +------------------+                                      |
|   Tonight Mode             | | Library Items    | | Avg Satisfaction | | Time Saved       | | Fit Health       |                                      |
|   Candidate Evaluator      | | 1,248            | | 82%              | | 86 hrs           | | Good             |                                      |
|   Library                  | +------------------+ +------------------+ +------------------+ +------------------+                                      |
|   Adaptive Queue           | +-------------------------------------------+ +--------------------------------------+                                   |
|                            | | What should you do next?                  | | Current Taste Signals                |                                   |
| INTELLIGENCE               | | 1. Evaluate a candidate before starting   | | Likes: Moral complexity              |                                   |
|   Taste Profile            | | 2. Log aftertaste for last completed item | | Likes: Strong atmosphere             |                                   |
|   TasteGraph               | | 3. Try a short high-confidence film       | | Avoids: Generic pacing, weak endings |                                   |
|   Anti-Generic Filter      | | [Open Evaluator] [Log Aftertaste] [Tonight]| | [Edit Taste Profile]                |                                   |
|   Media Archaeologist      | +-------------------------------------------+ +--------------------------------------+                                   |
|   Critic Council           | +-------------------------------------------+ +--------------------------------------+                                   |
|   Personal Canon           | | Recent Activity                           | | Queue Preview                        |                                   |
|   Adaptation Intel         | | - Added: Film title                       | | 1. Candidate A [Evaluate]            |                                   |
|                            | | - Dropped: Series title                   | | 2. Novel B     [Start]               |                                   |
| SYSTEM                     | | - Completed: Anime title                  | | 3. Film C      [Details]             |                                   |
|   Insights                 | | [View Activity]                           | | [Open Queue]                         |                                   |
|   Import                   | +-------------------------------------------+ +--------------------------------------+                                   |
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
| Start Tonight Mode | Route to `/app/tonight`. |
| Open Evaluator | Route to `/app/evaluator`. |
| Log Aftertaste | Route to `/app/aftertaste/new`; preselect latest completed item if available. |
| Edit Taste Profile | Route to `/app/taste-profile`. |
| View Activity | Route to `/app/activity`. |
| Open Queue | Route to `/app/queue`. |
| Queue item actions | Evaluate, Start, or Details for listed item. |

## Data Needed

- dashboardMetrics
- tasteSignalSummary
- recentActivity
- queuePreview
- lastCompletedMedia

## Loading, Empty, and Error States

- **Loading:** Skeleton metrics and panels.
- **Empty:** Show Add First Media and Import actions.
- **Error:** Show retry card while AppShell remains visible.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `MetricCard`
- `ActionRecommendationCard`
- `TasteSignalPanel`
- `ActivityList`
- `QueuePreview`

## Implementation Notes

Dashboard is an action launcher and system overview, not a full analytics page.
