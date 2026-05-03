# 23 - Media Archaeologist

## Route

`/discover`

## Purpose

Finds deep cuts, overlooked works, foreign works, older works, and cross-medium discoveries.

## Required Layout

Use `AppShell`. Active sidebar item: Media Archaeologist.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | Media Archaeologist    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                     |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | Media Archaeologist                                                                                         [Start Dig]  |
|                            | Search sideways and downward after the obvious masterpieces are exhausted.                                               |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | +--------------------------------------------------------------------------------+                                       |
|   Tonight Mode             | | Dig Parameters                                                                 |                                       |
|   Candidate Evaluator      | | Starting point: [Favorite work, theme, creator, or mood                    ]   |                                       |
|   Library                  | | Medium: [Any] [Movie] [Series] [Anime] [Novel] [Audiobook]                     |                                       |
|   Adaptive Queue           | | Era: [Any] [Pre-1970] [1970s-90s] [2000s] [Modern exceptions]                  |                                       |
|                            | | Region [Any v]  Obscurity [Known] [Underwatched] [Deep cut]                    |                                       |
| INTELLIGENCE               | | Goal: [Hidden masterpiece] [Adjacent genre] [Foreign] [Forgotten]              |                                       |
|   Taste Profile            | | [Start Dig]                                                                    |                                       |
|   TasteGraph               | +--------------------------------------------------------------------------------+                                       |
|   Anti-Generic Filter      | +--------------------------+ +--------------------------+ +------------------------+                                     |
| > Media Archaeologist      | | Discovery Result A       | | Discovery Result B       | | Discovery Result C     |                                     |
|   Critic Council           | | Why it is not obvious    | | Why it may fit           | | Risk note              |                                     |
|   Personal Canon           | | Fit 91 | Obscure High    | | Fit 88 | Foreign        | | Fit 84                 |                                      |
|   Adaptation Intel         | | [Details] [Evaluate]     | | [Details] [Queue]        | | [Evaluate]             |                                     |
|                            | +--------------------------+ +--------------------------+ +------------------------+                                     |
| SYSTEM                     | Expansion Map: Favorite X -> movement -> country/era -> author influence -> ...                                          |
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
| Generate Discovery Trail | Run discovery search from parameters and saved taste/library signals. |
| Starting point | Accept media/theme/creator/mood/free text. |
| Medium/Era/Region | Filter discovery. |
| Obscurity | Control mainstream vs deep-cut level. |
| Goal | Set discovery intent. |
| Details | Open result detail. |
| Evaluate | Open Candidate Evaluator. |
| Add To Queue | Add result to Adaptive Queue. |
| Save Trail | Persist generated trail for later review. |
| Expansion Map | Show reasoning path from known taste to new territory. |

## Data Needed

- digParameters
- tasteGraph
- libraryHistory
- discoveryResults
- expansionPaths
- fitObscurityRiskScores

## Loading, Empty, and Error States

- **Initial:** Empty result cards with prompt.
- **Loading:** Skeleton cards and map.
- **No results:** Suggest widening constraints.
- **Error:** Retry preserving parameters.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `DiscoveryParameterPanel`
- `DiscoveryResultCard`
- `ExpansionMap`
- `ButtonGroup`

## Implementation Notes

Should help escape generic mainstream recommendation loops.
