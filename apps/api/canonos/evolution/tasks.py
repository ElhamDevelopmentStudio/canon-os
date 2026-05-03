from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model

from .services import generate_evolution_snapshot


@shared_task(name="canonos.evolution.generate_monthly_snapshot")
def generate_monthly_snapshot(user_id: str | None = None) -> dict[str, int]:
    users = get_user_model().objects.all()
    if user_id is not None:
        users = users.filter(id=user_id)
    generated = 0
    for user in users.iterator():
        generate_evolution_snapshot(user)
        generated += 1
    return {"generated": generated}
