# Anti-Generic Filter

The Anti-Generic Filter protects user time by scoring candidate media for genericness, weak-fit, and time-waste risk while preserving room for modern exceptions. It is deterministic, owner-scoped, and user-tunable.

## Core rules

The backend seeds seven rules per user the first time rules are requested:

| Rule key | Type | Purpose |
| --- | --- | --- |
| `fake_complexity` | Red flag | Flags mystery-box, puzzle, twist, cryptic, or prestige framing that may hide weak payoff. |
| `weak_ending_risk` | Red flag | Flags known or suspected payoff/ending uncertainty, especially for highly hyped generic works. |
| `shallow_darkness` | Red flag | Flags grim, edgy, violent, bleak, or gritty packaging when genericness is already elevated. |
| `filler_heavy_long_series` | Red flag | Flags long series commitments, filler language, or low-density warnings. |
| `overhype_mismatch` | Red flag | Flags high hype combined with moderate/high expected genericness. |
| `auteur_driven_modern_work` | Positive exception | Protects recent works with creator voice, originality, authorial intent, or distinctive craft. |
| `low_popularity_strong_fit` | Positive exception | Protects low-hype, niche, personal-source, festival, or underseen works with strong fit signals. |

## Scoring contract

`AntiGenericEvaluation` stores:

- `genericnessRiskScore` from `0` to `100`.
- `timeWasteRiskScore` from `0` to `100`.
- `positiveExceptionScore` from `0` to `100`.
- `detectedSignals` with rule key, weight, score, and human-readable evidence.
- `positiveExceptions` with the same evidence shape.
- `finalVerdict`: `low_risk`, `sample_with_guardrail`, `likely_generic_skip`, or `modern_exception`.

The current MVP service combines the candidate's expected genericness, hype, time cost, red flag hits, and positive exception hits. Rule weights are owner-editable and enabled rules only affect future evaluations.

## Modernness rule

Release year alone must not raise genericness risk. A recent release can be risky only when actual red flags fire. A recent release can also become a `modern_exception` when originality, creator reputation, execution/craft, user-aligned themes, or unusual reception signals offset genericness risk.

## API and UI surfaces

- `GET /api/anti-generic/rules/` lists owner-scoped rules and lazily seeds defaults.
- `PATCH /api/anti-generic/rules/{id}/` updates `isEnabled` and/or `weight`.
- `POST /api/anti-generic/rules/reset/` restores default rules for the current user.
- `POST /api/anti-generic/evaluate/` evaluates a saved owned candidate and optional owned media item.
- `POST /api/candidates/{id}/evaluate/` creates an Anti-Generic evaluation automatically and embeds it in the candidate evaluation response.

The Candidate Evaluator page displays Anti-Generic verdicts, risk meters, red flags, and positive exceptions. The Settings page exposes rule toggles, weight editing, and reset.
