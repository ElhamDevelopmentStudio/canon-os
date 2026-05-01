# 17 - Tonight Mode

## Route

`/app/tonight`

## Purpose

Chooses what the user should consume next based on current state.

## Required Layout

Use `AppShell`. Active sidebar item: Tonight Mode.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Tonight Mode    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                            |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Tonight Mode                                                                                         [Generate Options]  |
|                            | Pick the right thing for your current state.                                                                             |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +--------------------------------------------------------------------------------+                                       |
| > Tonight Mode             | | Current State                                                                  |                                       |
|   Candidate Evaluator      | | Time: [30m] [60m] [90m] [2h+] [Any]                                            |                                       |
|   Library                  | | Energy: [Low] [Medium] [High]                                                  |                                       |
|   Adaptive Queue           | | Focus: [Light] [Normal] [Deep]                                                 |                                       |
|                            | | Desired effect: [Comfort] [Intensity] [Beauty] [Complexity] [Surprise]         |                                       |
| INTELLIGENCE               | | Medium: [Any] [Movie] [Series] [Anime] [Novel] [Audiobook]                     |                                       |
|   Taste Profile            | | Risk: [Safe] [Balanced] [Risky]                                                |                                       |
|   TasteGraph               | | [Generate Options]                                                             |                                       |
|   Anti-Generic Filter      | +--------------------------------------------------------------------------------+                                       |
|   Media Archaeologist      | +--------------------------+ +--------------------------+ +------------------------+                                     |
|   Critic Council           | | Best Choice              | | Challenging Choice       | | Wildcard               |                                     |
|   Personal Canon           | | Title A                  | | Title B                  | | Title C                |                                     |
|   Adaptation Intel         | | Movie - 94 fit - 100 min | | Novel - 88 fit - deep    | | Anime - risky          |                                     |
|                            | | [Start] [Details] [Swap] | | [Start] [Details] [Swap] | | [Start] [Swap]         |                                     |
| SYSTEM                     | +--------------------------+ +--------------------------+ +------------------------+                                     |
|   Insights                 | +--------------------------------------------------------------------------------+                                       |
|   Import                   | | Do not start tonight: long low-density series, mystery-box shows, completion   |                                       |
|   Activity                 | | pressure media.                                                               |                                        |
|   Settings                 | +--------------------------------------------------------------------------------+                                       |
|                            |                                                                                                                          |
| User: You                  |                                                                                                                          |
| [Mood: Unknown] [Logout]   |                                                                                                                          |
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Generate Options | Run recommendation with selected current state. |
| Time/Energy/Focus | Set current constraints. |
| Desired effect | Multi-select desired experience. |
| Medium | Filter output medium. |
| Risk | Set safe/balanced/risky recommendation style. |
| Start | Mark item current/active and open detail. |
| Details | Open detail page/drawer. |
| Swap | Replace recommendation slot while preserving constraints. |

## Data Needed

- currentState
- queueCandidates
- libraryCandidates
- tasteProfile
- fatigueSignals
- recommendations
- avoidList

## Loading, Empty, and Error States

- **Initial:** Show prompt to generate.
- **Loading:** Skeleton recommendation cards.
- **No candidates:** Suggest adding/importing/discovery.
- **Error:** Retry while preserving selections.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `StateSelectorPanel`
- `RecommendationCard`
- `AvoidListPanel`
- `ButtonGroup`

## Implementation Notes

Daily-use page: simple, fast, emotionally accurate.
