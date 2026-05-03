# Candidate Evaluator Scoring Rules

The MVP Candidate Evaluator is deterministic and inspectable. It does not call an AI provider. It combines saved candidate metadata with the current user's owned library and taste scores.

## Inputs

- Candidate title, media type, optional release year, known creator, premise, source of interest.
- `hypeLevel` from 0 to 10.
- `expectedGenericness` from 0 to 10.
- `expectedTimeCostMinutes` as a rough commitment estimate.
- Owner-scoped completed media with personal ratings.
- Owner-scoped taste scores split into positive and negative dimensions.
- Owner-scoped completed Narrative DNA analyses when available.

## Score Components

- **Likely fit score (0-100):** starts from a neutral baseline, increases with positive taste history, decreases when negative taste dimensions are high, and receives a bonus when the candidate media type has high-rated completed history.
- **Risk score (0-100):** rises with expected genericness, high time cost, and hype that may obscure fit.
- **Confidence score (0-100):** rises with prior taste score volume and high-fit media type history, and falls when premise detail is missing.
- **Time cost penalty:** long candidates are penalized before the final decision; short candidates are easier to sample.
- **Genericness penalty:** high expected genericness directly raises risk and adds an explanation warning.
- **Anti-Generic Filter:** every evaluation runs the owner-scoped Anti-Generic service, embeds the latest `antiGenericEvaluation`, increases risk from detected red flags, and reduces risk from positive exceptions.
- **Narrative DNA signals:** completed analyses can add fit bonuses for matching atmosphere, character complexity, or thematic weight, and can add risk when a candidate premise conflicts with the user's freshness or ending-dependency history.

## Decision Mapping

The backend computes a final score from likely fit, risk, time cost, and capped hype:

- `watch_now`: high final score and risk below the danger band.
- `sample`: promising but should be tested before full commitment.
- `delay`: not a clear no, but mood, time, or evidence should improve first.
- `skip`: protect time unless new evidence changes the risk profile.

The response always includes the decision, confidence score, likely fit score, risk score, reasons for, reasons against, `narrativeSignals`, best mood, recommended action, and Anti-Generic result. The frontend displays the server response as-is and does not duplicate scoring logic.

## Critic Council Integration

Critic Council sessions can attach to a candidate through `candidateId`. Running the council reuses the latest deterministic candidate evaluation or creates one if needed, then stores critic opinions and a synthesized final decision. Applying the decision updates the candidate status, and Candidate Evaluator displays attached Critic Council sessions for the selected candidate.
