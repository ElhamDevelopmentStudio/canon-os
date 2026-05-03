from __future__ import annotations

from dataclasses import asdict
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from canonos.jobs.models import BackgroundJob
from canonos.jobs.services import upsert_background_job
from canonos.media.models import MediaItem

from .models import NarrativeAnalysis
from .providers import get_narrative_provider

SCORE_FIELDS = [
    "character_complexity_score",
    "plot_complexity_score",
    "pacing_density_score",
    "thematic_weight_score",
    "moral_ambiguity_score",
    "atmosphere_score",
    "ending_dependency_score",
    "trope_freshness_score",
]


def request_narrative_analysis(
    *,
    owner: User,
    media_item: MediaItem,
    manual_notes: str = "",
    provider_key: str | None = None,
    force_refresh: bool = False,
) -> NarrativeAnalysis:
    """Create or refresh an owner-scoped Narrative DNA analysis for a media item."""
    if media_item.owner_id != owner.id:
        raise MediaItem.DoesNotExist

    analysis, created = NarrativeAnalysis.objects.get_or_create(
        owner=owner,
        media_item=media_item,
        defaults={"status": NarrativeAnalysis.Status.QUEUED, "status_events": []},
    )
    if not created and analysis.status == NarrativeAnalysis.Status.COMPLETED and not force_refresh:
        _update_narrative_background_job(
            analysis,
            BackgroundJob.Status.COMPLETE,
            "Narrative DNA analysis already complete.",
        )
        return analysis

    _update_narrative_background_job(
        analysis,
        BackgroundJob.Status.QUEUED,
        "Narrative DNA analysis queued.",
    )
    return run_narrative_analysis(
        analysis=analysis,
        manual_notes=manual_notes,
        provider_key=provider_key,
    )


def run_narrative_analysis(
    *,
    analysis: NarrativeAnalysis,
    manual_notes: str = "",
    provider_key: str | None = None,
) -> NarrativeAnalysis:
    provider = get_narrative_provider(provider_key)
    analysis.status_events = []
    _transition(analysis, NarrativeAnalysis.Status.QUEUED)
    _update_narrative_background_job(
        analysis,
        BackgroundJob.Status.QUEUED,
        "Narrative DNA analysis queued.",
    )
    _transition(analysis, NarrativeAnalysis.Status.RUNNING)
    _update_narrative_background_job(
        analysis,
        BackgroundJob.Status.PROCESSING,
        "Analyzing Narrative DNA from notes and metadata.",
    )
    try:
        result = provider.analyze(media_item=analysis.media_item, notes=manual_notes)
    except Exception as exc:  # noqa: BLE001
        analysis.status = NarrativeAnalysis.Status.FAILED
        analysis.error_message = str(exc)
        analysis.provider = getattr(provider, "key", provider_key or "unknown")
        analysis.status_events = [*_events(analysis), _event(NarrativeAnalysis.Status.FAILED)]
        analysis.save(
            update_fields=[
                "status",
                "error_message",
                "provider",
                "status_events",
                "updated_at",
            ]
        )
        _update_narrative_background_job(
            analysis,
            BackgroundJob.Status.FAILED,
            f"Narrative DNA analysis failed: {exc}",
            result={
                "analysisId": str(analysis.id),
                "mediaItemId": str(analysis.media_item_id),
                "error": str(exc),
            },
        )
        return analysis

    payload = asdict(result)
    with transaction.atomic():
        for field in SCORE_FIELDS:
            setattr(analysis, field, payload[field])
        analysis.confidence_score = payload["confidence_score"]
        analysis.analysis_summary = payload["analysis_summary"]
        analysis.extracted_traits = payload["extracted_traits"]
        analysis.evidence_notes = payload["evidence_notes"]
        analysis.source_basis = payload["source_basis"]
        analysis.provider = getattr(provider, "key", provider_key or "local_heuristic")
        analysis.algorithm_version = "narrative-dna-v1"
        analysis.error_message = ""
        analysis.completed_at = timezone.now()
        analysis.status = NarrativeAnalysis.Status.COMPLETED
        analysis.status_events = [*_events(analysis), _event(NarrativeAnalysis.Status.COMPLETED)]
        analysis.save()
        _update_narrative_background_job(
            analysis,
            BackgroundJob.Status.COMPLETE,
            "Narrative DNA analysis complete.",
            result={
                "analysisId": str(analysis.id),
                "mediaItemId": str(analysis.media_item_id),
                "confidenceScore": analysis.confidence_score,
            },
        )
    return analysis


def _update_narrative_background_job(
    analysis: NarrativeAnalysis,
    status: str,
    message: str,
    *,
    result: dict[str, Any] | None = None,
) -> None:
    terminal_statuses = {BackgroundJob.Status.COMPLETE, BackgroundJob.Status.FAILED}
    progress_processed = 1 if status in terminal_statuses else 0
    progress_percent = 100 if status in terminal_statuses else 0
    if status == BackgroundJob.Status.PROCESSING:
        progress_percent = 50
    upsert_background_job(
        owner=analysis.owner,
        job_type=BackgroundJob.JobType.NARRATIVE_ANALYSIS,
        source_id=analysis.id,
        source_label=f"Narrative DNA: {analysis.media_item.title}",
        status=status,
        progress_total=1,
        progress_processed=progress_processed,
        progress_percent=progress_percent,
        message=message,
        result=result
        or {
            "analysisId": str(analysis.id),
            "mediaItemId": str(analysis.media_item_id),
        },
    )


def latest_analysis_for_media(*, owner: User, media_item_id: str) -> NarrativeAnalysis | None:
    return (
        NarrativeAnalysis.objects.select_related("media_item")
        .filter(owner=owner, media_item_id=media_item_id)
        .order_by("-updated_at")
        .first()
    )


def narrative_trait_bonus_for_candidate(
    user: User,
    media_type: str,
    premise: str,
) -> tuple[int, int, list[dict[str, Any]]]:
    """Return likely-fit bonus, risk adjustment, and explainable signals for candidates."""
    analyses = list(
        NarrativeAnalysis.objects.filter(
            owner=user,
            status=NarrativeAnalysis.Status.COMPLETED,
            media_item__media_type=media_type,
        ).select_related("media_item")[:12]
    )
    if not analyses:
        analyses = list(
            NarrativeAnalysis.objects.filter(
                owner=user,
                status=NarrativeAnalysis.Status.COMPLETED,
            ).select_related("media_item")[:12]
        )
    if not analyses:
        return 0, 0, []

    premise_text = premise.lower()
    signals: list[dict[str, Any]] = []
    likely_bonus = 0
    risk_adjustment = 0
    trait_averages = _average_traits(analyses)

    if _contains_any(premise_text, ["atmosphere", "atmospheric", "mood", "haunting"]):
        bonus = _bonus_from_average(trait_averages["atmosphere_score"], multiplier=0.12)
        if bonus:
            likely_bonus += bonus
            signals.append(
                _candidate_signal(
                    "atmosphere",
                    "Atmosphere match",
                    bonus,
                    trait_averages["atmosphere_score"],
                    "Your completed Narrative DNA history leans toward atmosphere-heavy works.",
                )
            )
    if _contains_any(premise_text, ["character", "identity", "agency", "psychological"]):
        bonus = _bonus_from_average(trait_averages["character_complexity_score"], multiplier=0.1)
        if bonus:
            likely_bonus += bonus
            signals.append(
                _candidate_signal(
                    "character_complexity",
                    "Character complexity match",
                    bonus,
                    trait_averages["character_complexity_score"],
                    "The candidate premise overlaps with your character-complexity signals.",
                )
            )
    if _contains_any(premise_text, ["theme", "memory", "grief", "political", "spiritual"]):
        bonus = _bonus_from_average(trait_averages["thematic_weight_score"], multiplier=0.1)
        if bonus:
            likely_bonus += bonus
            signals.append(
                _candidate_signal(
                    "thematic_weight",
                    "Thematic weight match",
                    bonus,
                    trait_averages["thematic_weight_score"],
                    "Narrative DNA history suggests heavier themes are useful evidence.",
                )
            )
    if _contains_any(premise_text, ["generic", "formula", "cliche", "trope", "trend"]):
        if trait_averages["trope_freshness_score"] >= 65:
            risk_adjustment += 8
            signals.append(
                _candidate_signal(
                    "trope_freshness",
                    "Trope freshness warning",
                    -8,
                    trait_averages["trope_freshness_score"],
                    "Your Narrative DNA history values freshness, so formula signals raise risk.",
                )
            )
    if _contains_any(premise_text, ["twist", "finale", "ending", "reveal"]):
        if trait_averages["ending_dependency_score"] < 45:
            risk_adjustment += 5
            signals.append(
                _candidate_signal(
                    "ending_dependency",
                    "Ending dependency caution",
                    -5,
                    trait_averages["ending_dependency_score"],
                    (
                        "Your analyzed history is not strongly ending-dependent; "
                        "twist reliance is cautious."
                    ),
                )
            )

    return min(likely_bonus, 15), min(risk_adjustment, 15), signals[:4]


def _transition(analysis: NarrativeAnalysis, status: str) -> None:
    analysis.status = status
    analysis.status_events = [*_events(analysis), _event(status)]
    analysis.save(update_fields=["status", "status_events", "updated_at"])


def _events(analysis: NarrativeAnalysis) -> list[dict[str, str]]:
    return [event for event in analysis.status_events if event.get("status") != analysis.status]


def _event(status: str) -> dict[str, str]:
    return {"status": status, "at": timezone.now().isoformat().replace("+00:00", "Z")}


def _average_traits(analyses: list[NarrativeAnalysis]) -> dict[str, float]:
    return {
        field: sum(getattr(analysis, field) for analysis in analyses) / len(analyses)
        for field in SCORE_FIELDS
    }


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def _bonus_from_average(average: float, *, multiplier: float) -> int:
    if average < 60:
        return 0
    return round((average - 55) * multiplier)


def _candidate_signal(
    key: str,
    label: str,
    impact: int,
    average_score: float,
    evidence: str,
) -> dict[str, Any]:
    return {
        "traitKey": key,
        "label": label,
        "impact": impact,
        "averageScore": round(average_score, 1),
        "evidence": evidence,
    }
