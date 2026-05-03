from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model

from .services import recalculate_queue_for_user


@shared_task(name="canonos.queueing.recalculate_queue")
def recalculate_queue(user_id: str) -> dict[str, int | float]:
    user = get_user_model().objects.get(id=user_id)
    result = recalculate_queue_for_user(user)
    return {
        "activeCount": result.active_count,
        "archivedCount": result.archived_count,
        "averageScore": result.average_score,
    }
