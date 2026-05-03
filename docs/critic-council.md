# Critic Council

Critic Council is an explanation layer for candidate and media decisions. It does not create a hidden replacement score. Each enabled critic reads the same server-side candidate evaluation, Anti-Generic result, Narrative DNA signals, media metadata, and user prompt/context, then returns a short perspective.

## Default personas

CanonOS seeds owner-scoped personas for each user:

1. Ruthless Critic — protects time from genericness, hype, low density, and commitment risk.
2. Historian — adds older, foreign, obscure, and influence-aware context.
3. Modern Defender — guards against unfair anti-modern bias; recency is never a flaw by itself.
4. Anime Specialist — checks anime pacing, filler, trope, and source/adaptation issues.
5. Literary Editor — checks prose, narration, density, and read/listen path fit.
6. Mood Doctor — checks whether the decision fits current attention, energy, and timing.
7. Completion Strategist — prevents sunk-cost completion pressure and sets exit rules.
8. Wildcard — surfaces risky but potentially rewarding upside.

Each persona has an enabled toggle and weight. Disabling a persona hides it from the next generated council session for that user only.

## Decision rules

- Candidate sessions reuse the latest `CandidateEvaluation`; if none exists, the backend creates one before the debate.
- Media sessions use media metadata, notes, and completed Narrative DNA when available.
- Each opinion includes recommendation, confidence, stance, argument, and evidence.
- Final decision synthesizes disagreement and guardrails; it is not a simple average of votes.
- The user may apply the final decision back to the selected candidate status.

## Privacy and AI boundary

The current implementation is deterministic and local. It does not send prompts, notes, or library data to an external AI provider. Future AI-generated critic prose must keep the same visible evidence fields and privacy controls.
