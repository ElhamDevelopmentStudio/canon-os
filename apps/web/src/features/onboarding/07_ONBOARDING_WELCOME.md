# 07 - Onboarding Welcome

## Route

`/onboarding/welcome`

## Purpose

Introduces CanonOS and asks what the system should optimize for first.

## Required Layout

Use `OnboardingShell`. No AppShell sidebar.

## ASCII Wireframe

```text
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
| CanonOS   Step 1 of 4                                                                                                                               |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Build a system that protects your attention.                                                                                                        |
| CanonOS learns what works across movies, series, anime, novels, and audiobooks.                                                                     |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| +----------------------------------------------------------------------------+                                                                      |
| | What do you want CanonOS to optimize for first?                            |                                                                      |
| | ( ) Find hidden masterpieces                                               |                                                                      |
| | ( ) Avoid generic time-wasters                                             |                                                                      |
| | ( ) Choose what fits my mood tonight                                       |                                                                      |
| | ( ) Track and understand my taste                                          |                                                                      |
| |                                                                            |                                                                      |
| | Note: CanonOS is skeptical of generic modern media, but not anti-modern.    |                                                                     |
| |                                                                            |                                                                      |
| | [Skip for now]                                                  [Continue] |                                                                      |
| +----------------------------------------------------------------------------+                                                                      |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Radio group | Select primary first goal. |
| Skip for now | Route to `/app/dashboard` with empty setup guidance. |
| Continue | Save goal and route to taste calibration. |

## Data Needed

- primaryGoal
- onboardingStep

## Loading, Empty, and Error States

- **Validation:** Continue requires a selected goal.
- **Loading:** Show saving state.
- **Error:** Show retry without losing choice.

## Shared Components Used

- `OnboardingShell`
- `StepProgress`
- `RadioGroup`
- `Button`
- `Card`

## Implementation Notes

Keep onboarding short; the user can refine everything later.
