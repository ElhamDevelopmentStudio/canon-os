# Narrative DNA Analyzer

Narrative DNA represents a work by story structure and emotional/story properties rather than genre or popularity alone.

## Trait definitions

Scores are `0-100` and are generated from allowed user-owned evidence: media notes, manual analysis notes, title, creator, release year, media type, and attached metadata. CanonOS must not claim full-text analysis unless a future explicitly authorized ingestion flow exists.

| Trait | Meaning |
| --- | --- |
| Character complexity | Interior life, agency, contradictions, relationship depth, and arc complexity. |
| Plot complexity | Structural intricacy, mystery, nonlinear movement, causality, and twist density. |
| Pacing density | How much scene, narrative, or idea movement is packed into the work. |
| Thematic weight | Persistence and intensity of themes beyond surface genre. |
| Moral ambiguity | Ethical grayness, unresolved choices, and refusal of easy answers. |
| Atmosphere | Mood, sensory identity, place-feel, and emotional weather. |
| Ending dependency | How much the work relies on final payoff, twist, reveal, closure, or last act. |
| Trope freshness | Originality and resistance to formula, cliché, obvious genre defaults, or trend clones. |

## Current implementation

- Shared TypeScript contracts live in `packages/contracts/src/narrative.ts`.
- Backend app: `apps/api/canonos/narrative/`.
- Frontend API client and labels: `apps/web/src/features/narrative/`.
- Media Detail has a `Narrative DNA` tab that can request or refresh analysis.
- Candidate Evaluator reads completed Narrative DNA history and exposes `narrativeSignals` in evaluation output.
- TasteGraph rebuild creates narrative trait nodes and narrative signal edges for completed analyses.

## Provider boundary

The current provider is `local_heuristic`, a deterministic local analysis service. `external_ai` exists only as a disabled abstraction until credentials, privacy rules, and source-rights handling are explicitly added.

## Evidence and privacy rules

- Store `sourceBasis`, `confidenceScore`, `provider`, `algorithmVersion`, and `evidenceNotes` with every analysis.
- Evidence notes must state that CanonOS did not ingest or store full copyrighted source text.
- User corrections use `sourceBasis=manual_correction` and should override generated labels until refreshed intentionally.
