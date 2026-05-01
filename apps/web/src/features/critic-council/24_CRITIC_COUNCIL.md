# 24 - Critic Council

## Route

`/app/critics`

## Purpose

Multi-perspective critic debate before final recommendation.

## Required Layout

Use `AppShell`. Active sidebar item: Critic Council.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Critic Council    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                          |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Critic Council                                                                                            [Run Council]  |
|                            | Let multiple internal critics argue before you commit your time.                                                         |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Council Input                            | | Final Recommendation                     |                                |
|   Candidate Evaluator      | | Candidate / Question [                 ] | | Decision: Not run yet                    |                                |
|   Library                  | | Council members                          | | Confidence: --                           |                                |
|   Adaptive Queue           | | [x] Ruthless Critic   [x] Historian      | | Best action: --                          |                                |
|                            | | [x] Modern Defender   [x] Anime Specialist| | [Run Council]                            |                               |
| INTELLIGENCE               | | [x] Literary Editor   [x] Mood Doctor    | +------------------------------------------+                                |
|   Taste Profile            | | [x] Wildcard                             |                                                                             |
|   TasteGraph               | | [Run Council]                            |                                                                             |
|   Anti-Generic Filter      | +------------------------------------------+                                                                             |
|   Media Archaeologist      | +--------------------------------------------------------------------------------+                                       |
| > Critic Council           | | Council Debate                                                                 |                                       |
|   Personal Canon           | | Ruthless Critic: ...                                                           |                                       |
|   Adaptation Intel         | | Historian: ...                                                                 |                                       |
|                            | | Modern Defender: ...                                                           |                                       |
| SYSTEM                     | | Mood Doctor: ...                                                               |                                       |
|   Insights                 | | [Save Verdict] [Add to Queue] [Open Evaluator] [Ask Follow-up]                 |                                       |
|   Import                   | +--------------------------------------------------------------------------------+                                       |
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
| Run Council | Run selected critic personas. |
| Candidate/Question | Accept title, item, or free-form question. |
| Critic checkboxes | Toggle perspectives included. |
| Final Recommendation | Show synthesized decision, confidence, best action. |
| Council Debate | Show each critic response as ordered cards. |
| Save Verdict | Store council result. |
| Add to Queue | Queue candidate with summary. |
| Open Evaluator | Route to evaluator with context. |
| Ask Follow-up | Keep context and add follow-up prompt. |

## Data Needed

- candidateOrQuestion
- selectedCritics
- criticOutputs
- finalRecommendation
- linkedMedia

## Loading, Empty, and Error States

- **Initial:** Final panel says Not run yet.
- **Loading:** Skeleton card per critic.
- **Error:** Retry preserving input.
- **Partial:** Show successful critics and mark failed ones.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `CouncilInputPanel`
- `CriticSelector`
- `CriticMessageCard`
- `FinalRecommendationRail`

## Implementation Notes

Personality-driven but visually restrained.
