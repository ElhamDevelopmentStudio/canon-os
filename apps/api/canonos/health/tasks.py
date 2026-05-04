from __future__ import annotations

from celery import shared_task


@shared_task(name="canonos.health.celery_ping")
def celery_ping() -> dict[str, str]:
    return {"status": "ok", "service": "celery"}
