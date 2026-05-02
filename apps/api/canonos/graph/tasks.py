from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model

from .services import rebuild_taste_graph_for_user


@shared_task(name="canonos.graph.rebuild_taste_graph")
def rebuild_taste_graph(user_id: str) -> dict[str, int]:
    user = get_user_model().objects.get(id=user_id)
    result = rebuild_taste_graph_for_user(user)
    return {"nodeCount": result.node_count, "edgeCount": result.edge_count}
