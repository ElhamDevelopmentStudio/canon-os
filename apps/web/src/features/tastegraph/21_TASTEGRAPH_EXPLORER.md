# 21 - TasteGraph Explorer

## Route

`/app/tastegraph`

## Purpose

Explores relationships between media, creators, themes, signals, and user reactions.

## Required Layout

Use `AppShell`. Active sidebar item: TasteGraph.

## ASCII Wireframe

```text
+----------------------------+--------------------------------------------------------------------------------------------------------------------------+
| CanonOS                    | TasteGraph    [Cmd+K Search]  [+ Add Media] [Evaluate] [Me]                                                              |
| Private Media Intelligence | ------------------------------------------------------------------------------------------------------------------------ |
| [Search library/pages]     | TasteGraph Explorer                                                                                     [Rebuild Graph]  |
|                            | Explore why works connect inside your personal taste system.                                                             |
| CORE                       | ------------------------------------------------------------------------------------------------------------------------ |
|   Dashboard                | [Search node...] [Node Type v] [Relationship v] [Depth v] [Layout v]                                                     |
|   Tonight Mode             | +-----------------------------------------------------------+ +------------------+                                       |
|   Candidate Evaluator      | | Graph Canvas                                              | | Detail Rail      |                                       |
|   Library                  | |                                                           | | Selected Node    |                                       |
|   Adaptive Queue           | |      [Moral Complexity]                                   | | Title/Signal     |                                       |
|                            | |             /       \                                      | | Type             |                                      |
| INTELLIGENCE               | |       [Film A]     [Anime B]                              | | Weight           |                                       |
|   Taste Profile            | |             \       /                                      | | Evidence         |                                      |
| > TasteGraph               | |            [Strong Ending]                                | | [Open Detail]    |                                       |
|   Anti-Generic Filter      | |                                                           | | [Evaluate]       |                                       |
|   Media Archaeologist      | | [Generic Pacing] ---- [Dropped Series]                    | | [Pin Node]       |                                       |
|   Critic Council           | +-----------------------------------------------------------+ +------------------+                                       |
|   Personal Canon           | +--------------------------------------------------------------------------------+                                       |
|   Adaptation Intel         | | Relationship Table: Source | Relationship | Target | Weight                   |                                        |
|                            | +--------------------------------------------------------------------------------+                                       |
| SYSTEM                     |                                                                                                                          |
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
| Rebuild Graph | Trigger graph rebuild. |
| Search node | Find/select graph nodes. |
| Node Type | Filter media, creator, theme, trope, signal, mood, genre. |
| Relationship | Filter relationship type. |
| Depth | Control hops shown. |
| Layout | Change graph layout. |
| Node click | Populate Detail Rail. |
| Open Detail | Route/open relevant detail. |
| Evaluate | Open evaluator for media node. |
| Pin Node | Fix node in canvas. |

## Data Needed

- graphNodes
- graphEdges
- nodeMetadata
- relationshipWeights
- filters
- selectedNode
- rebuildStatus

## Loading, Empty, and Error States

- **Loading:** Graph skeleton.
- **Empty:** Ask user to add ratings/logs.
- **Rebuilding:** Use previous snapshot and progress badge.
- **Error:** Retry; table fallback if canvas fails.

## Shared Components Used

- `AppShell`
- `PageHeader`
- `GraphCanvas`
- `FilterBar`
- `DetailRail`
- `RelationshipTable`

## Implementation Notes

Graph can be simple initially but must keep canvas + rail + table layout.
Current implementation uses deterministic summary cards and text graph output. Rebuilds include media, creator, dimension, aftertaste, medium, and completed Narrative DNA trait evidence.
