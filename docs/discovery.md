# Media Archaeologist

Media Archaeologist is CanonOS's deep-cut discovery surface. It preserves explainable scoring and hard filters while allowing AI-assisted discovery when MiniMax is configured.

## Product behavior

The feature helps the user move away from obvious mainstream recommendations by generating small discovery trails from:

- theme or mood;
- preferred medium;
- era;
- country or language;
- creator;
- narrative pattern;
- favorite work or source media item.

Generated trails prioritize:

1. underexplored media types in the user's library;
2. underexplored eras;
3. underexplored country/language regions;
4. creator-adjacent or theme-adjacent matches;
5. high obscurity/deep-cut score without hiding confidence or fit risk.

## Generation model

The backend has two paths:

1. AI-assisted chat discovery uses MiniMax when `MINIMAX_API_KEY` is configured. It adds live web-search context when `CANONOS_WEB_SEARCH_ENABLED=true`, then validates every result against hard filters before returning it.
2. Structured form generation and AI fallback use the curated first-pass catalog with deterministic scoring.

Era and medium selections are hard constraints. For example, `modern_exception` only returns results from 2017 or later; the backend must not fill gaps with older catalog items.

Each result includes:

- `discoveryScore`: overall ranking score;
- `obscurityScore`: how far it sits from obvious recommendation loops;
- `confidenceScore`: how likely the recommendation fits the request;
- `reasons`: weighted reason objects;
- `expansionRationale`: why it expands taste;
- `riskRationale`: why it may fail;
- `suggestedAction`: a concrete next step.

Future provider-backed discovery may add more candidate sources, but must preserve the same explainability fields, hard-filter validation, and owner-scoped persistence.

## Data model

`DiscoveryTrail` stores saved trails for the authenticated user:

- owner;
- name;
- theme;
- description;
- optional source media item;
- JSON result items;
- created timestamp.

Saved trails are user-owned and must never expose another user's discovery history.

## Browser flow

The `/discover` page supports:

1. generating a trail with no filters;
2. generating a filtered trail by medium/era/theme/etc.;
3. saving the generated trail;
4. listing saved trails;
5. deleting saved trails;
6. adding a result to the Adaptive Queue.

All unsafe calls go through the shared Axios client so session cookies and CSRF protection are exercised by the browser.
