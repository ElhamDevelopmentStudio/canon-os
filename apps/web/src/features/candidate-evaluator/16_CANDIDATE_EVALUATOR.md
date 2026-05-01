# 16 - Candidate Evaluator

## Route

`/app/evaluator`

## Purpose

Evaluates whether a candidate is worth the user's time based on taste, mood, fatigue, and risk.

## Required Layout

Use `AppShell`. Active sidebar item: Candidate Evaluator. Two-column workbench plus explanation.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Candidate Evaluator    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                     |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Candidate Evaluator                                                                                    [Run Evaluation]  |
|                            | Decide whether something is worth starting.                                                                              |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Candidate Input                          | | Evaluation Result                        |                                |
| > Candidate Evaluator      | | Title or URL [                         ] | | Decision: Not run yet                    |                                |
|   Library                  | | Medium [Movie v] Year [     ]            | | Confidence: --                           |                                |
|   Adaptive Queue           | | Source / Platform [ optional           ] | | Fit score: --                            |                                |
|                            | | What attracted you? [                  ] | | Generic risk: --                         |                                |
| INTELLIGENCE               | | Current mood [Mood v] [Energy v] [Risk v]| | Time cost: --                            |                                |
|   Taste Profile            | | [Save Candidate] [Run Evaluation]        | | [Run Evaluation]                         |                                |
|   TasteGraph               | +------------------------------------------+ +------------------------------------------+                                |
|   Anti-Generic Filter      | +--------------------------------------------------------------------------------+                                       |
|   Media Archaeologist      | | Result Explanation                                                             |                                       |
|   Critic Council           | | - Why it may work                                                              |                                       |
|   Personal Canon           | | - Why it may fail                                                              |                                       |
|   Adaptation Intel         | | - Anti-generic warnings                                                        |                                       |
|                            | | - Best condition to consume it                                                 |                                       |
| SYSTEM                     | | [Add to Queue] [Open Critic Council] [Mark as Skip] [Save Evaluation]          |                                       |
|   Insights                 | +--------------------------------------------------------------------------------+                                       |
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
| Run Evaluation | Run evaluator; disabled until title/mediaId exists. |
| Title or URL | Accept title, URL, or existing library lookup. |
| Medium/year/source | Basic candidate metadata. |
| What attracted you | Free-text reason user is considering it. |
| Mood/Energy/Risk | Current-state selectors. |
| Save Candidate | Create planned item without evaluation. |
| Add to Queue | Add candidate with evaluation metadata. |
| Open Critic Council | Route to `/app/critics` with context. |
| Mark as Skip | Save skipped candidate and reason. |
| Save Evaluation | Store result on candidate/media record. |

## Data Needed

- candidate
- metadata
- moodState
- riskTolerance
- tasteProfile
- evaluationResult
- decision
- explanations

## Loading, Empty, and Error States

- **Initial:** Result rail shows Not run yet.
- **Loading:** Skeleton/progress in result rail.
- **Error:** Retry without clearing input.
- **Success:** Show decision, scores, explanation, actions.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `CandidateForm`
- `MoodSelector`
- `EvaluationResultRail`
- `ExplanationPanel`

## Implementation Notes

Keep this page fast and focused; do not turn it into a full metadata editor.
