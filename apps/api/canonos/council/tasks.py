from __future__ import annotations

from celery import shared_task

from .models import CouncilSession
from .services import run_council_session


@shared_task(name="canonos.council.build_critic_explanation")
def build_critic_explanation(session_id: str) -> dict[str, str]:
    seed = CouncilSession.objects.select_related("owner", "candidate", "media_item").get(
        id=session_id
    )
    session = run_council_session(
        owner=seed.owner,
        prompt=seed.prompt,
        candidate=seed.candidate,
        media_item=seed.media_item,
    )
    return {"id": str(session.id), "finalDecision": session.final_decision}
