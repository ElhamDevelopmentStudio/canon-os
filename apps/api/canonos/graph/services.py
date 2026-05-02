from __future__ import annotations

import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from canonos.aftertaste.models import AftertasteEntry
from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore, TasteDimension

from .models import GraphEdge, GraphNode


@dataclass(frozen=True)
class GraphRebuildResult:
    node_count: int
    edge_count: int


def rebuild_taste_graph_for_user(user: User) -> GraphRebuildResult:
    """Rebuild the deterministic owner-scoped TasteGraph from current CanonOS evidence."""
    with transaction.atomic():
        GraphEdge.objects.filter(owner=user).delete()
        GraphNode.objects.filter(owner=user).delete()

        media_items = list(MediaItem.objects.filter(owner=user).order_by("title"))
        for media_item in media_items:
            media_node = ensure_media_node(user, media_item)
            ensure_medium_edge(user, media_node, media_item)
            if media_item.creator.strip():
                creator_node = ensure_creator_node(user, media_item.creator)
                ensure_edge(
                    owner=user,
                    source_node=media_node,
                    target_node=creator_node,
                    edge_type=GraphEdge.EdgeType.CREATED_BY,
                    weight=Decimal("1.00"),
                    evidence=f"{media_item.title} lists {media_item.creator.strip()} as creator.",
                )

        scores = MediaScore.objects.filter(media_item__owner=user).select_related(
            "media_item",
            "taste_dimension",
        )
        for score in scores:
            dimension_node = ensure_dimension_node(user, score.taste_dimension)
            media_node = ensure_media_node(user, score.media_item)
            ensure_edge(
                owner=user,
                source_node=dimension_node,
                target_node=media_node,
                edge_type=GraphEdge.EdgeType.DIMENSION_SIGNAL,
                weight=_score_weight(score),
                evidence=_score_evidence(score),
            )

        aftertaste_entries = AftertasteEntry.objects.filter(owner=user).select_related("media_item")
        for entry in aftertaste_entries:
            signal_node = ensure_aftertaste_node(user, entry)
            media_node = ensure_media_node(user, entry.media_item)
            ensure_edge(
                owner=user,
                source_node=signal_node,
                target_node=media_node,
                edge_type=GraphEdge.EdgeType.AFTERTASTE_SIGNAL,
                weight=_aftertaste_weight(entry),
                evidence=_aftertaste_evidence(entry),
            )

    return GraphRebuildResult(
        node_count=GraphNode.objects.filter(owner=user).count(),
        edge_count=GraphEdge.objects.filter(owner=user).count(),
    )


def ensure_media_node(user: User, media_item: MediaItem) -> GraphNode:
    return ensure_node(
        owner=user,
        node_type=GraphNode.NodeType.MEDIA,
        slug=f"media-{media_item.id}",
        label=media_item.title,
        metadata={
            "mediaId": str(media_item.id),
            "mediaType": media_item.media_type,
            "status": media_item.status,
            "personalRating": None
            if media_item.personal_rating is None
            else float(media_item.personal_rating),
        },
    )


def ensure_creator_node(user: User, creator: str) -> GraphNode:
    clean_creator = creator.strip()
    return ensure_node(
        owner=user,
        node_type=GraphNode.NodeType.CREATOR,
        slug=f"creator-{_stable_slug(clean_creator)}",
        label=clean_creator,
        metadata={},
    )


def ensure_dimension_node(user: User, dimension: TasteDimension) -> GraphNode:
    return ensure_node(
        owner=user,
        node_type=GraphNode.NodeType.DIMENSION,
        slug=f"dimension-{dimension.slug}",
        label=dimension.name,
        metadata={
            "dimensionId": str(dimension.id),
            "dimensionSlug": dimension.slug,
            "direction": dimension.direction,
        },
    )


def ensure_aftertaste_node(user: User, entry: AftertasteEntry) -> GraphNode:
    label = "Generic aftertaste warning" if entry.felt_generic else "Memorable aftertaste"
    if not entry.worth_time:
        label = "Regret aftertaste warning"
    return ensure_node(
        owner=user,
        node_type=GraphNode.NodeType.AFTERTASTE_SIGNAL,
        slug=f"aftertaste-{entry.id}",
        label=label,
        metadata={
            "aftertasteId": str(entry.id),
            "mediaId": str(entry.media_item_id),
            "worthTime": entry.worth_time,
            "feltGeneric": entry.felt_generic,
            "stayedWithMeScore": entry.stayed_with_me_score,
            "appetiteEffect": entry.appetite_effect,
        },
    )


def ensure_medium_edge(user: User, media_node: GraphNode, media_item: MediaItem) -> GraphEdge:
    medium_node = ensure_node(
        owner=user,
        node_type=GraphNode.NodeType.MEDIUM,
        slug=f"medium-{media_item.media_type}",
        label=media_item.get_media_type_display(),
        metadata={"mediaType": media_item.media_type},
    )
    return ensure_edge(
        owner=user,
        source_node=media_node,
        target_node=medium_node,
        edge_type=GraphEdge.EdgeType.MEDIUM_SIGNAL,
        weight=Decimal("1.00"),
        evidence=f"{media_item.title} is a {media_item.get_media_type_display()}.",
    )


def ensure_node(
    *,
    owner: User,
    node_type: str,
    slug: str,
    label: str,
    metadata: dict[str, Any],
) -> GraphNode:
    node, _ = GraphNode.objects.update_or_create(
        owner=owner,
        node_type=node_type,
        slug=slug[:160],
        defaults={"label": label.strip()[:255], "metadata": metadata},
    )
    return node


def ensure_edge(
    *,
    owner: User,
    source_node: GraphNode,
    target_node: GraphNode,
    edge_type: str,
    weight: Decimal,
    evidence: str,
) -> GraphEdge:
    edge, _ = GraphEdge.objects.update_or_create(
        owner=owner,
        source_node=source_node,
        target_node=target_node,
        edge_type=edge_type,
        defaults={"weight": weight, "evidence": evidence},
    )
    return edge


def build_taste_graph_summary(user: User) -> dict[str, Any]:
    nodes = GraphNode.objects.filter(owner=user)
    edges = GraphEdge.objects.filter(owner=user).select_related("source_node", "target_node")
    node_count = nodes.count()
    edge_count = edges.count()
    return {
        "generatedAt": timezone.now().isoformat().replace("+00:00", "Z"),
        "isEmpty": node_count == 0,
        "nodeCount": node_count,
        "edgeCount": edge_count,
        "evidenceCounts": {
            "mediaNodeCount": nodes.filter(node_type=GraphNode.NodeType.MEDIA).count(),
            "creatorNodeCount": nodes.filter(node_type=GraphNode.NodeType.CREATOR).count(),
            "dimensionNodeCount": nodes.filter(node_type=GraphNode.NodeType.DIMENSION).count(),
            "aftertasteSignalNodeCount": nodes.filter(
                node_type=GraphNode.NodeType.AFTERTASTE_SIGNAL
            ).count(),
            "edgeCount": edge_count,
        },
        "strongestThemes": _rank_nodes(
            edges.filter(edge_type=GraphEdge.EdgeType.DIMENSION_SIGNAL, weight__gt=0),
            node_side="source",
        )[:5],
        "strongestCreators": _rank_nodes(
            edges.filter(edge_type=GraphEdge.EdgeType.CREATED_BY),
            node_side="target",
        )[:5],
        "strongestMedia": _rank_nodes(
            edges.filter(
                Q(edge_type=GraphEdge.EdgeType.DIMENSION_SIGNAL)
                | Q(edge_type=GraphEdge.EdgeType.AFTERTASTE_SIGNAL)
            ),
            node_side="target",
        )[:5],
        "weakNegativeSignals": _rank_nodes(
            edges.filter(weight__lt=0),
            node_side="source",
            ascending=True,
        )[:5],
        "textGraph": _text_graph_lines(edges),
    }


def graph_rebuild_job_payload(user: User) -> dict[str, Any]:
    started_at = timezone.now()
    result = rebuild_taste_graph_for_user(user)
    finished_at = timezone.now()
    return {
        "id": uuid.uuid4(),
        "status": "completed",
        "message": "TasteGraph rebuilt from media, creator, score, and aftertaste evidence.",
        "nodeCount": result.node_count,
        "edgeCount": result.edge_count,
        "startedAt": started_at.isoformat().replace("+00:00", "Z"),
        "finishedAt": finished_at.isoformat().replace("+00:00", "Z"),
    }


def _rank_nodes(edges, *, node_side: str, ascending: bool = False) -> list[dict[str, Any]]:  # noqa: ANN001
    buckets: dict[uuid.UUID, dict[str, Any]] = {}
    for edge in edges:
        node = edge.source_node if node_side == "source" else edge.target_node
        bucket = buckets.setdefault(
            node.id,
            {
                "id": node.id,
                "label": node.label,
                "nodeType": node.node_type,
                "mediaType": node.metadata.get("mediaType"),
                "weight": 0.0,
                "evidenceCount": 0,
                "evidenceLabel": "",
            },
        )
        bucket["weight"] += float(edge.weight)
        bucket["evidenceCount"] += 1
    ranked = list(buckets.values())
    for item in ranked:
        item["weight"] = round(item["weight"], 2)
        item["evidenceLabel"] = _evidence_count_label(item["evidenceCount"])
        if item.get("mediaType") is None:
            item.pop("mediaType", None)
    return sorted(
        ranked,
        key=lambda item: (
            item["weight"] if ascending else -item["weight"],
            -item["evidenceCount"],
            item["label"],
        ),
    )


def _text_graph_lines(edges) -> list[str]:  # noqa: ANN001
    lines = []
    for edge in sorted(
        edges,
        key=lambda item: (-abs(float(item.weight)), item.source_node.label, item.target_node.label),
    )[:12]:
        label = edge.get_edge_type_display()
        weight = float(edge.weight)
        lines.append(
            f"{edge.source_node.label} -- {label} ({weight:.2f}) -> " f"{edge.target_node.label}"
        )
    return lines


def _score_weight(score: MediaScore) -> Decimal:
    numeric = Decimal(score.score) / Decimal("10")
    if score.taste_dimension.direction == TasteDimension.Direction.NEGATIVE:
        return -numeric.quantize(Decimal("0.01"))
    return numeric.quantize(Decimal("0.01"))


def _score_evidence(score: MediaScore) -> str:
    direction = (
        "negative"
        if score.taste_dimension.direction == TasteDimension.Direction.NEGATIVE
        else "positive"
    )
    note = f" Note: {score.note}" if score.note else ""
    return (
        f"{score.media_item.title} has {score.score}/10 on {score.taste_dimension.name} "
        f"as a {direction} taste signal.{note}"
    )


def _aftertaste_weight(entry: AftertasteEntry) -> Decimal:
    base = Decimal(entry.stayed_with_me_score) / Decimal("10")
    if entry.felt_generic or not entry.worth_time:
        return -base.quantize(Decimal("0.01"))
    return base.quantize(Decimal("0.01"))


def _aftertaste_evidence(entry: AftertasteEntry) -> str:
    details = []
    details.append(f"stayed with me {entry.stayed_with_me_score}/10")
    details.append("worth time" if entry.worth_time else "not worth time")
    if entry.felt_generic:
        details.append("felt generic")
    if entry.appetite_effect:
        details.append(f"appetite: {entry.get_appetite_effect_display()}")
    return f"Aftertaste for {entry.media_item.title}: {', '.join(details)}."


def _evidence_count_label(count: int) -> str:
    return f"{count} connection" if count == 1 else f"{count} connections"


def _stable_slug(value: str) -> str:
    return slugify(value)[:120] or "unknown"
