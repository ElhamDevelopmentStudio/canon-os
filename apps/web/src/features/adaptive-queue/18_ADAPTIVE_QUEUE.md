# 18 - Adaptive Queue

## Route

`/app/queue`

## Purpose

Prioritizes planned, active, sample-first, delayed, and archived media.

## Required Layout

Use `AppShell`. Active sidebar item: Adaptive Queue.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Adaptive Queue    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                          |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Adaptive Queue                                                                                         [Add Queue Item]  |
|                            | Prioritize what deserves your time now.                                                                                  |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [Search queue...] [Medium v] [Mood fit v] [Risk v] [Sort: Priority v]                                                    |
|   Tonight Mode             | +------------------------+ +------------------------+ +------------------------+                                         |
|   Candidate Evaluator      | | Start Soon             | | Sample First           | | Delay / Archive        |                                         |
|   Library                  | | Title A                | | Title D                | | Title G                |                                         |
| > Adaptive Queue           | | 94 fit | Low risk      | | 81 fit | Unknown       | | Good but not now       |                                         |
|                            | | [Start] [Details]      | | [Sample] [Evaluate]    | | [Restore] [Details]    |                                         |
| INTELLIGENCE               | |------------------------| |------------------------| |------------------------|                                         |
|   Taste Profile            | | Title B                | | Title E                | | Title H                |                                         |
|   TasteGraph               | | 87 fit | 2h            | | Watch 1 episode        | | Too long tonight       |                                         |
|   Anti-Generic Filter      | | [Start] [Move]         | | [Sample] [Move]        | | [Restore] [Delete]     |                                         |
|   Media Archaeologist      | +------------------------+ +------------------------+ +------------------------+                                         |
|   Critic Council           | +--------------------------------------------------------------------------------+                                       |
|   Personal Canon           | | Queue Rules: do not keep low-confidence items forever; sample uncertain series; |                                      |
|   Adaptation Intel         | | delay good items if current mood is wrong.                         [Edit Rules]|                                       |
|                            | +--------------------------------------------------------------------------------+                                       |
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
| Add Queue Item | Search/add existing or new media to queue. |
| Filters | Filter queue cards by medium, mood fit, risk. |
| Sort | Sort by priority, fit, date added, time cost. |
| Start | Mark item active/current. |
| Sample | Create sample checkpoint. |
| Evaluate | Open Candidate Evaluator. |
| Move | Move to another queue column. |
| Restore | Move delayed/archived item back. |
| Delete | Remove from queue only after confirmation. |
| Edit Rules | Open queue rules drawer. |

## Data Needed

- queueItems
- queueStatus
- priorityScore
- fitRiskTime
- queueRules
- filters

## Loading, Empty, and Error States

- **Loading:** Skeleton cards per column.
- **Empty:** Show Add Queue Item plus Import/Discovery shortcuts.
- **No filter results:** Show clear filters.
- **Error:** Show retry.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `FilterBar`
- `QueueColumn`
- `QueueCard`
- `DropdownMenu`
- `QueueRulesPanel`

## Implementation Notes

Buttons/menus must work even if drag-and-drop is not implemented initially.
