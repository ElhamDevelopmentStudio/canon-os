# 10 - Onboarding Review and Finish

## Route

`/onboarding/finish`

## Purpose

Summarizes setup and enters the main application.

## Required Layout

Use `OnboardingShell`.

## ASCII Wireframe

```text
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
| CanonOS   Step 4 of 4                                                                                                                               |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Your CanonOS is ready to start learning.                                                                                                            |
| Review your initial setup.                                                                                                                          |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| +----------------------------------------------------------------------------+                                                                      |
| | Primary goal: Avoid generic time-wasters                                    |                                                                     |
| | Positive signals: [Moral complexity] [Atmosphere] [Authorial voice]         |                                                                     |
| | Negative signals: [Generic pacing] [Weak endings] [Fake depth]              |                                                                     |
| | Import status: 218 detected, 12 duplicates, 4 need review                   |                                                                     |
| | First recommended next step: Use Tonight Mode or add 10 favorite works.     |                                                                     |
| |                                                                            |                                                                      |
| | [Back]                                                   [Enter CanonOS]    |                                                                     |
| +----------------------------------------------------------------------------+                                                                      |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Back | Return to import preserving state. |
| Enter CanonOS | Mark onboarding complete and route to `/app/dashboard`. |
| Signal chips | Read-only summary. |
| Import status | Shows latest import job summary. |

## Data Needed

- primaryGoal
- positiveSignals[]
- negativeSignals[]
- importSummary

## Loading, Empty, and Error States

- **Loading:** Show saving state.
- **Partial import:** Allow entering app while import job continues.
- **Error:** Show completion save error.

## Shared Components Used

- `OnboardingShell`
- `SummaryCard`
- `Badge`
- `Button`

## Implementation Notes

Do not block entry because a background import is still running.
