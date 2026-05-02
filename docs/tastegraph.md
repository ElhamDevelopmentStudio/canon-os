# TasteGraph Core

TasteGraph is CanonOS' private graph of media evidence. It connects works, creators, mediums, dimensional scores, and aftertaste reactions so recommendation modules can inspect why a title fits or fails.

## Concepts

- **GraphNode**: an owner-scoped graph vertex. Current node types are `media`, `creator`, `dimension`, `aftertaste_signal`, `medium`, with `theme` and `tag` reserved for later taxonomy modules.
- **GraphEdge**: a weighted owner-scoped connection between two nodes. Positive weights show affinity or supporting evidence; negative weights show risk, regret, genericness, or weak-fit evidence.
- **TasteGraphSummary**: a read model for the UI. It reports counts, strongest connected themes/dimensions, strongest creators, strongest media, weak/negative signals, and a simple text graph.

## Rebuild contract

The MVP rebuild is deterministic and synchronous through `POST /api/taste-graph/rebuild/`. A Celery task calls the same service for future background execution. Rebuilds delete and recreate only the authenticated user's graph nodes and edges.

Current evidence sources:

1. Media items become `media` nodes.
2. Creator/author/director fields become `creator` nodes and `created_by` edges.
3. Media type becomes a `medium` node and `medium_signal` edge.
4. Score dimensions become `dimension` nodes and `dimension_signal` edges.
5. Aftertaste entries become `aftertaste_signal` nodes and `aftertaste_signal` edges.

## Privacy and ownership rules

- Graph rows are always scoped by owner.
- Rebuilds never read another user's media, scores, or aftertaste entries.
- Public metadata can enrich media, but private notes and taste data stay in CanonOS unless a future explicit AI/provider flow documents otherwise.
