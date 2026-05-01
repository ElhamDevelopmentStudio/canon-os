# 29 - Insights and Reports

## Route

`/app/insights`

## Purpose

Shows taste evolution, satisfaction, fatigue, time saved, queue and anti-generic performance.

## Required Layout

Use `AppShell`. Active sidebar item: Insights.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Insights    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                                |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Insights and Reports                                                                                  [Generate Report]  |
|                            | Understand how your taste and consumption patterns are changing.                                                         |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [Period: Last 30 days v] [Medium: All v] [Report Type v]                                                                 |
|   Tonight Mode             | +------------------+ +------------------+ +------------------+ +------------------+                                      |
|   Candidate Evaluator      | | Completed        | | Dropped          | | Time Saved       | | Satisfaction     |                                      |
|   Library                  | | 22               | | 9                | | 41 hrs           | | 84%              |                                      |
|   Adaptive Queue           | +------------------+ +------------------+ +------------------+ +------------------+                                      |
|                            | +------------------------------------------+ +------------------------------------------+                                |
| INTELLIGENCE               | | Taste Evolution Timeline                 | | Pattern Warnings                         |                                |
|   Taste Profile            | | Week 1: more films                       | | Long-series fatigue rising               |                                |
|   TasteGraph               | | Week 2: audiobook satisfaction high      | | Weak ending sensitivity up               |                                |
|   Anti-Generic Filter      | | Week 3: dropped generic series           | | Underusing novels                        |                                |
|   Media Archaeologist      | | Week 4: deep-cut discovery worked        | | [Open Taste Profile]                     |                                |
|   Critic Council           | +------------------------------------------+ +------------------------------------------+                                |
|   Personal Canon           | +--------------------------------------------------------------------------------+                                       |
|   Adaptation Intel         | | Generated Report                                                              |                                        |
|                            | | Report appears here after generation.                                          |                                       |
| SYSTEM                     | | [Export Markdown] [Export PDF Later]                                           |                                       |
| > Insights                 | +--------------------------------------------------------------------------------+                                       |
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
| Generate Report | Create report for selected filters. |
| Period | Date range. |
| Medium | Filter by media type. |
| Report Type | Summary, taste evolution, fatigue, anti-generic, queue performance. |
| Metric cards | Jump to relevant section. |
| Open Taste Profile | Route to Taste Profile. |
| Export Markdown | Export generated report. |
| Export PDF Later | Hide until implemented or mark disabled. |

## Data Needed

- period
- metrics
- timelineEvents
- warnings
- generatedReport
- exportStatus

## Loading, Empty, and Error States

- **Loading:** Skeleton metrics/panels.
- **No data:** Encourage aftertaste logs.
- **Generating:** Show progress in report panel.
- **Error:** Retry.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `FilterBar`
- `MetricCard`
- `Timeline`
- `WarningPanel`
- `ReportPanel`

## Implementation Notes

Initial version can use text summaries before charts.
