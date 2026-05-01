# 08 - Onboarding Taste Calibration

## Route

`/onboarding/taste-calibration`

## Purpose

Collects initial positive and negative taste signals.

## Required Layout

Use `OnboardingShell`. Two-column signal card.

## ASCII Wireframe

```text
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
| CanonOS   Step 2 of 4                                                                                                                               |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| Taste Calibration                                                                                                                                   |
| Tell CanonOS what usually works and what usually fails for you.                                                                                     |
|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| +-------------------------------------+--------------------------------------+                                                                      |
| | Works for me                        | Usually fails for me                 |                                                                      |
| |-------------------------------------|--------------------------------------|                                                                      |
| | [ ] Moral complexity                | [ ] Generic streaming pacing         |                                                                      |
| | [ ] Strong atmosphere               | [ ] Fake depth                       |                                                                      |
| | [ ] Character-driven stories        | [ ] Weak endings                     |                                                                      |
| | [ ] Slow burn with payoff           | [ ] Filler disguised as development  |                                                                      |
| | [ ] Philosophical weight            | [ ] Shallow darkness                 |                                                                      |
| | [ ] Authorial voice                 | [ ] Twist dependency                 |                                                                      |
| | [ ] Audiobook narration quality     | [ ] Adaptations that miss the soul   |                                                                      |
| | Custom positive [             ] [+] | Custom negative [              ] [+] |                                                                      |
| +-------------------------------------+--------------------------------------+                                                                      |
| Calibration strength: [Low ---------- High]                                                                                                         |
| [Back]                                                               [Continue]                                                                     |
+-----------------------------------------------------------------------------------------------------------------------------------------------------+
```

## Element and Button Functions

| Element / Control | Required Function |
|---|---|
| Positive checkboxes | Increase future candidate fit. |
| Negative checkboxes | Increase skip/generic risk. |
| Custom positive + | Add custom positive signal. |
| Custom negative + | Add custom negative signal. |
| Back | Return to welcome preserving state. |
| Continue | Save signals and route to import step. |

## Data Needed

- positiveSignals[]
- negativeSignals[]
- customSignals[]
- calibrationStrength

## Loading, Empty, and Error States

- **Loading:** Disable controls while saving.
- **Low data:** Allow continue but show `More signals improve accuracy`.
- **Error:** Show retry near bottom actions.

## Shared Components Used

- `OnboardingShell`
- `Checkbox`
- `TextInput`
- `Progress`
- `Button`

## Implementation Notes

Signals seed TasteGraph and Anti-Generic Filter.
