# 27 - Adaptation Intelligence

## Route

`/app/adaptation`

## Purpose

Decides best path across source material and adaptations.

## Required Layout

Use `AppShell`. Active sidebar item: Adaptation Intel.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Adaptation Intel    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                        |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Adaptation Intelligence                                                                            [Analyze Adaptation]  |
|                            | Decide the best path across source material and adaptations.                                                             |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Work / Franchise Input                   | | Best Experience Path                     |                                |
|   Candidate Evaluator      | | Title [                                ] | | Not analyzed yet                         |                                |
|   Library                  | | Known forms                              | | [Analyze Adaptation]                     |                                |
|   Adaptive Queue           | | [x] Novel / Book                         | +------------------------------------------+                                |
|                            | | [x] Audiobook                            |                                                                             |
| INTELLIGENCE               | | [x] Anime                                |                                                                             |
|   Taste Profile            | | [x] Movie                                |                                                                             |
|   TasteGraph               | | [x] TV Series                            |                                                                             |
|   Anti-Generic Filter      | | [Analyze Adaptation]                     |                                                                             |
|   Media Archaeologist      | +------------------------------------------+                                                                             |
|   Critic Council           | +--------------------------------------------------------------------------------+                                       |
|   Personal Canon           | | Comparison Matrix                                                             |                                        |
| > Adaptation Intel         | | Version       Strengths       Weaknesses       Recommendation                  |                                       |
|                            | | Novel         Depth           Time cost        Read if invested                |                                       |
| SYSTEM                     | | Audiobook     Narration       Slower           Best if narrator strong         |                                       |
|   Insights                 | | Anime         Atmosphere      Incomplete       Watch after source              |                                       |
|   Import                   | | Movie         Concise         Compressed       Skip or sample                  |                                       |
|   Activity                 | | [Save Path] [Add Path to Queue] [Open Evaluator]                               |                                       |
|   Settings                 | +--------------------------------------------------------------------------------+                                       |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Analyze Adaptation | Run comparison using title and selected forms. |
| Title | Work/franchise title. |
| Known forms | Select forms to compare. |
| Best Experience Path | Show ordered path. |
| Comparison Matrix | Show strengths, weaknesses, recommendation per version. |
| Save Path | Store recommendation. |
| Add Path to Queue | Queue selected path in order. |
| Open Evaluator | Evaluate selected version. |

## Data Needed

- workTitle
- selectedForms
- knownVersions
- comparisonResult
- bestPath
- versionRisks

## Loading, Empty, and Error States

- **Initial:** Not analyzed.
- **Loading:** Skeleton path/matrix.
- **Insufficient data:** Allow manual notes.
- **Error:** Retry preserving input.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `AdaptationInputPanel`
- `ExperiencePathRail`
- `ComparisonMatrix`

## Implementation Notes

Never assume newest adaptation is best.
