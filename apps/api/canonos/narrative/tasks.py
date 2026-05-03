from __future__ import annotations

from celery import shared_task

from .models import NarrativeAnalysis
from .services import run_narrative_analysis


@shared_task(name="canonos.narrative.generate_narrative_analysis")
def generate_narrative_analysis(
    analysis_id: str,
    manual_notes: str = "",
    provider_key: str | None = None,
) -> dict[str, str]:
    analysis = NarrativeAnalysis.objects.select_related("media_item", "owner").get(id=analysis_id)
    result = run_narrative_analysis(
        analysis=analysis,
        manual_notes=manual_notes,
        provider_key=provider_key,
    )
    return {"id": str(result.id), "status": result.status}
