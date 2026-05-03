from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model

from .services import graph_rebuild_job_payload


@shared_task(name="canonos.graph.rebuild_taste_graph")
def rebuild_taste_graph(user_id: str) -> dict[str, int]:
    user = get_user_model().objects.get(id=user_id)
    payload = graph_rebuild_job_payload(user)
    return {"nodeCount": payload["nodeCount"], "edgeCount": payload["edgeCount"]}
