# 20 - Taste Profile

## Route

`/app/taste-profile`

## Purpose

Shows and edits the learned model of user taste, dislikes, fatigue, and medium tendencies.

## Required Layout

Use `AppShell`. Active sidebar item: Taste Profile.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Taste Profile    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                           |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Taste Profile                                                                                     [Recalculate Profile]  |
|                            | The current model of what actually works for you.                                                                        |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------+ +------------------+ +------------------+ +------------------+                                      |
|   Tonight Mode             | | Strongest Signal | | Biggest Red Flag | | Current Fatigue  | | Confidence       |                                      |
|   Candidate Evaluator      | | Atmosphere       | | Weak endings     | | Long series      | | Medium           |                                      |
|   Library                  | +------------------+ +------------------+ +------------------+ +------------------+                                      |
|   Adaptive Queue           | Tabs: Overview | Likes | Dislikes | Mediums | Fatigue | Blind Spots                                                      |
|                            | --------------------------------------------------------------------------------                                         |
| INTELLIGENCE               | Likes:    [Moral complexity] [Atmosphere] [Authorial voice] [Strong endings]                                             |
| > Taste Profile            | Dislikes: [Generic pacing] [Fake depth] [Filler] [Shallow darkness]                                                      |
|   TasteGraph               |                                                                                                                          |
|   Anti-Generic Filter      | Learned statements:                                                                                                      |
|   Media Archaeologist      | - You tolerate slow pacing when payoff is strong.                                                                        |
|   Critic Council           | - You are increasingly sensitive to weak endings.                                                                        |
|   Personal Canon           | - Recent audiobook satisfaction is higher than long series satisfaction.                                                 |
|   Adaptation Intel         |                                                                                                                          |
|                            | [Edit Signals] [Add Custom Signal] [View Evidence]                                                                       |
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
| Recalculate Profile | Trigger backend recalculation. |
| Tabs | Switch taste sections. |
| Edit Signals | Open signal/weight editor. |
| Add Custom Signal | Open create signal modal. |
| View Evidence | Show media/logs supporting statement. |
| Metric cards | Jump to relevant tab. |

## Data Needed

- tasteProfileSummary
- positiveSignals
- negativeSignals
- weights
- fatiguePatterns
- mediumTendencies
- evidence
- confidence

## Loading, Empty, and Error States

- **Loading:** Skeleton metrics and tabs.
- **Low data:** Encourage ratings/logs.
- **Recalculating:** Show non-blocking status with previous profile.
- **Error:** Retry and show last successful profile if available.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `MetricCard`
- `Tabs`
- `TasteBadge`
- `LearnedStatementList`
- `EditSignalsModal`

## Implementation Notes

Use evidence and confidence. Do not present taste statements as absolute.
