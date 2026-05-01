# 22 - Anti-Generic Filter

## Route

`/app/anti-generic`

## Purpose

Analyzes candidates for genericness and red flags while still detecting worthwhile modern exceptions.

## Required Layout

Use `AppShell`. Active sidebar item: Anti-Generic Filter.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Anti-Generic Filter    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                     |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Anti-Generic Filter                                                                                 [Analyze Candidate]  |
|                            | Protect your attention without becoming blindly anti-modern.                                                             |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +------------------------------------------+ +------------------------------------------+                                |
|   Tonight Mode             | | Candidate / Item                         | | Verdict                                  |                                |
|   Candidate Evaluator      | | [Search/select media or title/url     ]  | | Verdict: Not analyzed                    |                                |
|   Library                  | | Medium [Any v] Year [    ]               | | Generic risk: --                         |                                |
|   Adaptive Queue           | | [x] Check for worthwhile modern signals  | | Exception chance: --                     |                                |
|                            | | [Analyze Candidate]                      | | Time-waste risk: --                      |                                |
| INTELLIGENCE               | +------------------------------------------+ | [Analyze Candidate]                      |                                |
|   Taste Profile            |                                              +------------------------------------------+                                |
|   TasteGraph               | +--------------------------------------------------------------------------------+                                       |
| > Anti-Generic Filter      | | Red Flag Breakdown                                                            |                                        |
|   Media Archaeologist      | | [ ] Generic streaming pacing     [ ] Fake complexity / mystery-box dependency |                                        |
|   Critic Council           | | [ ] Shallow darkness             [ ] Weak ending reputation                    |                                       |
|   Personal Canon           | | [ ] Filler disguised as development [ ] Overhype mismatch                      |                                       |
|   Adaptation Intel         | | Positive exceptions: [ ] Authorial voice [ ] Divisive but aligned [ ] Original |                                       |
|                            | | [Save Verdict] [Add to Queue] [Skip Candidate]                                 |                                       |
| SYSTEM                     | +--------------------------------------------------------------------------------+                                       |
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
| Analyze Candidate | Run analysis; disabled until candidate exists. |
| Candidate selector | Select existing media or enter title/URL. |
| Medium/year | Optional context. |
| Modern exception checkbox | Check for positive modern counter-signals. |
| Red flag checklist | Read-only result indicators after analysis. |
| Positive exceptions | Show counter-signals. |
| Save Verdict | Store analysis result. |
| Add to Queue | Queue with risk metadata. |
| Skip Candidate | Mark skipped with reason. |

## Data Needed

- candidate
- metadata
- redFlagWeights
- analysisResult
- detectedRisks
- positiveExceptions
- verdict

## Loading, Empty, and Error States

- **Initial:** Verdict says Not analyzed.
- **Loading:** Skeleton verdict/breakdown.
- **Error:** Retry preserving input.
- **Insufficient signal:** Recommend sample mode rather than skip.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `CandidateSelect`
- `VerdictPanel`
- `RiskChecklist`
- `ExceptionSignals`

## Implementation Notes

Must preserve the distinction: much modern media may be generic, but not all modern media is bad.
