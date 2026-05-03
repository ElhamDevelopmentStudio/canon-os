from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.utils import timezone

from canonos.media.models import MediaItem

from .models import AdaptationRelation


@dataclass(frozen=True)
class AdaptationRisk:
    kind: str
    label: str
    severity: str
    reason: str


EXPERIENCE_ORDER_LABELS = {
    AdaptationRelation.ExperienceOrder.READ_FIRST: "Read first",
    AdaptationRelation.ExperienceOrder.WATCH_FIRST: "Watch first",
    AdaptationRelation.ExperienceOrder.LISTEN_FIRST: "Listen first",
    AdaptationRelation.ExperienceOrder.ADAPTATION_SUFFICIENT: "Adaptation sufficient",
    AdaptationRelation.ExperienceOrder.SOURCE_PREFERRED: "Source preferred",
    AdaptationRelation.ExperienceOrder.SKIP_ADAPTATION: "Skip adaptation",
}


def build_adaptation_path(
    media_item: MediaItem,
    relations: list[AdaptationRelation],
) -> dict[str, Any]:
    """Return a deterministic best-path recommendation for one media item."""
    primary_relation = _select_primary_relation(media_item, relations)
    risks = _build_risks(primary_relation) if primary_relation else []
    recommendation = _choose_recommendation(media_item, primary_relation, risks)
    confidence_score = _confidence_score(primary_relation, risks)
    rationale = _rationale(media_item, primary_relation, recommendation, risks)

    return {
        "mediaItemId": str(media_item.id),
        "mediaTitle": media_item.title,
        "relations": relations,
        "recommendation": {
            "recommendation": recommendation,
            "label": EXPERIENCE_ORDER_LABELS[recommendation],
            "rationale": rationale,
            "confidenceScore": confidence_score,
            "risks": [risk.__dict__ for risk in risks],
        },
        "createdAt": timezone.now().isoformat(),
    }


def _select_primary_relation(
    media_item: MediaItem,
    relations: list[AdaptationRelation],
) -> AdaptationRelation | None:
    if not relations:
        return None

    def sort_key(relation: AdaptationRelation) -> tuple[int, int, str]:
        source_match = relation.source_media_item_id == media_item.id
        scores = [
            relation.faithfulness_score,
            relation.pacing_preservation_score,
            relation.soul_preservation_score,
        ]
        known_scores = [score for score in scores if score is not None]
        score_average = round(sum(known_scores) / len(known_scores)) if known_scores else 0
        return (1 if source_match else 0, score_average, relation.updated_at.isoformat())

    return sorted(relations, key=sort_key, reverse=True)[0]


def _choose_recommendation(
    media_item: MediaItem,
    relation: AdaptationRelation | None,
    risks: list[AdaptationRisk],
) -> str:
    if relation is None:
        return AdaptationRelation.ExperienceOrder.SOURCE_PREFERRED

    high_risk_count = sum(1 for risk in risks if risk.severity == "high")
    average_score = _average_relation_score(relation)
    adaptation_type = relation.adaptation_media_item.media_type
    source_type = relation.source_media_item.media_type

    if high_risk_count >= 2 or average_score < 45:
        return AdaptationRelation.ExperienceOrder.SKIP_ADAPTATION
    if (
        high_risk_count
        or average_score < 65
        or relation.completeness
        in {
            AdaptationRelation.Completeness.INCOMPLETE,
            AdaptationRelation.Completeness.PARTIAL,
        }
    ):
        return AdaptationRelation.ExperienceOrder.SOURCE_PREFERRED
    if (
        adaptation_type == MediaItem.MediaType.AUDIOBOOK
        or source_type == MediaItem.MediaType.AUDIOBOOK
    ):
        return AdaptationRelation.ExperienceOrder.LISTEN_FIRST
    if source_type == MediaItem.MediaType.NOVEL:
        return AdaptationRelation.ExperienceOrder.READ_FIRST
    if media_item.id == relation.adaptation_media_item_id and adaptation_type in {
        MediaItem.MediaType.MOVIE,
        MediaItem.MediaType.TV_SHOW,
        MediaItem.MediaType.ANIME,
    }:
        return AdaptationRelation.ExperienceOrder.WATCH_FIRST
    if average_score >= 82 and relation.completeness == AdaptationRelation.Completeness.COMPLETE:
        return AdaptationRelation.ExperienceOrder.ADAPTATION_SUFFICIENT
    return relation.recommended_experience_order


def _build_risks(relation: AdaptationRelation) -> list[AdaptationRisk]:
    risks: list[AdaptationRisk] = []
    if relation.completeness in {
        AdaptationRelation.Completeness.INCOMPLETE,
        AdaptationRelation.Completeness.PARTIAL,
    }:
        risks.append(
            AdaptationRisk(
                kind="incomplete_adaptation",
                label="Incomplete adaptation",
                severity=(
                    "high"
                    if relation.completeness == AdaptationRelation.Completeness.INCOMPLETE
                    else "medium"
                ),
                reason="The adaptation is marked as not covering the full source path.",
            )
        )
    if relation.completeness == AdaptationRelation.Completeness.LOOSE:
        risks.append(
            AdaptationRisk(
                kind="changed_tone",
                label="Changed tone",
                severity="medium",
                reason=(
                    "The relation is marked loose, so the adaptation may diverge "
                    "from source intent."
                ),
            )
        )
    if relation.faithfulness_score is not None and relation.faithfulness_score < 60:
        risks.append(
            AdaptationRisk(
                kind="low_faithfulness",
                label="Low faithfulness",
                severity="high" if relation.faithfulness_score < 40 else "medium",
                reason="Faithfulness score is below the safe threshold.",
            )
        )
    if relation.pacing_preservation_score is not None and relation.pacing_preservation_score < 60:
        risks.append(
            AdaptationRisk(
                kind="compression",
                label="Compression / pacing loss",
                severity="high" if relation.pacing_preservation_score < 40 else "medium",
                reason="Pacing preservation score suggests compression or stretched rhythm.",
            )
        )
    if relation.soul_preservation_score is not None and relation.soul_preservation_score < 60:
        risks.append(
            AdaptationRisk(
                kind="soul_loss",
                label="Soul loss",
                severity="high" if relation.soul_preservation_score < 40 else "medium",
                reason="Soul preservation score suggests the adaptation misses what matters most.",
            )
        )

    lowered_notes = relation.notes.casefold()
    if "ending" in lowered_notes and "weak" in lowered_notes:
        risks.append(
            AdaptationRisk(
                kind="weak_ending",
                label="Weak ending",
                severity="medium",
                reason="Comparison notes mention a weak ending.",
            )
        )
    if "narration" in lowered_notes and (
        "poor" in lowered_notes or "weak" in lowered_notes or "flat" in lowered_notes
    ):
        risks.append(
            AdaptationRisk(
                kind="poor_narration",
                label="Poor narration",
                severity="medium",
                reason="Comparison notes flag narration quality.",
            )
        )
    return risks


def _average_relation_score(relation: AdaptationRelation) -> int:
    scores = [
        relation.faithfulness_score,
        relation.pacing_preservation_score,
        relation.soul_preservation_score,
    ]
    known_scores = [score for score in scores if score is not None]
    if not known_scores:
        return 50
    return round(sum(known_scores) / len(known_scores))


def _confidence_score(
    relation: AdaptationRelation | None,
    risks: list[AdaptationRisk],
) -> int:
    if relation is None:
        return 35
    known_scores = [
        score
        for score in [
            relation.faithfulness_score,
            relation.pacing_preservation_score,
            relation.soul_preservation_score,
        ]
        if score is not None
    ]
    score_bonus = min(30, len(known_scores) * 10)
    average_bonus = round(_average_relation_score(relation) / 5)
    risk_penalty = len(risks) * 5 + sum(5 for risk in risks if risk.severity == "high")
    return max(20, min(95, 40 + score_bonus + average_bonus - risk_penalty))


def _rationale(
    media_item: MediaItem,
    relation: AdaptationRelation | None,
    recommendation: str,
    risks: list[AdaptationRisk],
) -> str:
    if relation is None:
        return (
            f"{media_item.title} has no linked source/adaptation relation yet, so CanonOS "
            "defaults to source-first until comparison evidence is added."
        )

    source_title = relation.source_media_item.title
    adaptation_title = relation.adaptation_media_item.title
    average_score = _average_relation_score(relation)
    risk_summary = (
        f" {len(risks)} risk signal(s) need attention."
        if risks
        else " No major adaptation risks are currently flagged."
    )
    return (
        f"{source_title} and {adaptation_title} average {average_score}/100 across "
        "faithfulness, pacing, and soul preservation. "
        f"Recommendation: {EXPERIENCE_ORDER_LABELS[recommendation].lower()}."
        f"{risk_summary}"
    )
