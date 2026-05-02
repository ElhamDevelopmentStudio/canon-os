from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.aftertaste.models import AftertasteEntry
from canonos.graph.models import GraphEdge, GraphNode
from canonos.graph.services import rebuild_taste_graph_for_user
from canonos.graph.tasks import rebuild_taste_graph
from canonos.media.models import MediaItem
from canonos.taste.models import MediaScore
from canonos.taste.services import seed_default_taste_dimensions

pytestmark = pytest.mark.django_db


def create_user(email: str = "graph@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def create_graph_evidence(user: User) -> MediaItem:
    item = MediaItem.objects.create(
        owner=user,
        title="Stalker",
        media_type=MediaItem.MediaType.MOVIE,
        creator="Andrei Tarkovsky",
        status=MediaItem.ConsumptionStatus.COMPLETED,
        personal_rating="9.5",
    )
    dimensions = {dimension.slug: dimension for dimension in seed_default_taste_dimensions(user)}
    MediaScore.objects.create(
        media_item=item,
        taste_dimension=dimensions["atmosphere"],
        score="9.5",
        note="Atmosphere defines why it works.",
    )
    MediaScore.objects.create(
        media_item=item,
        taste_dimension=dimensions["genericness"],
        score="1.0",
    )
    AftertasteEntry.objects.create(
        owner=user,
        media_item=item,
        stayed_with_me_score=9,
        worth_time=True,
        felt_generic=False,
    )
    return item


def test_rebuild_creates_media_and_creator_nodes() -> None:
    user = create_user()
    item = create_graph_evidence(user)

    result = rebuild_taste_graph_for_user(user)

    media_node = GraphNode.objects.get(owner=user, node_type=GraphNode.NodeType.MEDIA)
    creator_node = GraphNode.objects.get(owner=user, node_type=GraphNode.NodeType.CREATOR)
    assert result.node_count >= 5
    assert media_node.label == item.title
    assert media_node.metadata["mediaId"] == str(item.id)
    assert creator_node.label == "Andrei Tarkovsky"
    assert GraphEdge.objects.filter(
        owner=user,
        source_node=media_node,
        target_node=creator_node,
        edge_type=GraphEdge.EdgeType.CREATED_BY,
    ).exists()


def test_rebuild_connects_dimensions_and_aftertaste_to_media() -> None:
    user = create_user("graph-signals@example.com")
    create_graph_evidence(user)

    rebuild_taste_graph_for_user(user)

    dimension_edges = GraphEdge.objects.filter(
        owner=user,
        edge_type=GraphEdge.EdgeType.DIMENSION_SIGNAL,
    )
    aftertaste_edges = GraphEdge.objects.filter(
        owner=user,
        edge_type=GraphEdge.EdgeType.AFTERTASTE_SIGNAL,
    )
    assert dimension_edges.count() == 2
    assert aftertaste_edges.count() == 1
    assert dimension_edges.filter(weight__lt=0, source_node__label="Genericness").exists()


def test_graph_summary_and_rebuild_endpoints_are_owner_scoped() -> None:
    client, user = authenticated_client()
    create_graph_evidence(user)
    other = create_user("other-graph@example.com")
    MediaItem.objects.create(owner=other, title="Private", media_type="movie", status="planned")

    rebuild_response = client.post(reverse("taste-graph-rebuild"), format="json")
    summary_response = client.get(reverse("taste-graph-summary"))
    nodes_response = client.get(reverse("taste-graph-node-list"))
    edges_response = client.get(reverse("taste-graph-edge-list"))

    assert rebuild_response.status_code == status.HTTP_201_CREATED
    assert rebuild_response.json()["status"] == "completed"
    assert summary_response.status_code == status.HTTP_200_OK
    summary = summary_response.json()
    assert summary["isEmpty"] is False
    assert summary["evidenceCounts"]["mediaNodeCount"] == 1
    assert summary["strongestCreators"][0]["label"] == "Andrei Tarkovsky"
    assert nodes_response.status_code == status.HTTP_200_OK
    assert all(node["label"] != "Private" for node in nodes_response.json()["results"])
    assert edges_response.status_code == status.HTTP_200_OK
    assert edges_response.json()["results"]


def test_graph_rebuild_task_uses_same_service() -> None:
    user = create_user("graph-task@example.com")
    create_graph_evidence(user)

    result = rebuild_taste_graph(str(user.id))

    assert result["nodeCount"] == GraphNode.objects.filter(owner=user).count()
    assert result["edgeCount"] == GraphEdge.objects.filter(owner=user).count()
