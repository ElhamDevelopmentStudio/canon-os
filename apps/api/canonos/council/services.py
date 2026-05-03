from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import QuerySet

from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.candidates.services import evaluate_candidate
from canonos.media.models import MediaItem
from canonos.narrative.models import NarrativeAnalysis

from .models import CouncilSession, CriticPersona

DECISION_LABELS = {
    CandidateEvaluation.Decision.WATCH_NOW: "Watch now",
    CandidateEvaluation.Decision.SAMPLE: "Sample first",
    CandidateEvaluation.Decision.DELAY: "Delay",
    CandidateEvaluation.Decision.SKIP: "Skip",
}

DECISION_RANK = {
    CandidateEvaluation.Decision.SKIP: 0,
    CandidateEvaluation.Decision.DELAY: 1,
    CandidateEvaluation.Decision.SAMPLE: 2,
    CandidateEvaluation.Decision.WATCH_NOW: 3,
}


@dataclass(frozen=True)
class DefaultPersona:
    key: str
    name: str
    role: str
    description: str
    weight: int
    sort_order: int


@dataclass(frozen=True)
class CouncilContext:
    title: str
    media_type: str
    release_year: int | None
    creator: str
    prompt: str
    premise: str
    expected_genericness: int | None
    hype_level: int | None
    time_cost_minutes: int | None
    evaluation_decision: str | None
    likely_fit_score: int | None
    risk_score: int | None
    confidence_score: int | None
    reasons_for: list[str]
    reasons_against: list[str]
    narrative_signals: list[dict[str, Any]]
    anti_generic: dict[str, Any] | None
    media_rating: float | None
    media_notes: str
    narrative_analysis: dict[str, Any] | None


DEFAULT_PERSONAS: tuple[DefaultPersona, ...] = (
    DefaultPersona(
        key="ruthless_critic",
        name="Ruthless Critic",
        role=CriticPersona.Role.RUTHLESS_CRITIC,
        description="Protects time from generic, hollow, overhyped, or low-density media.",
        weight=18,
        sort_order=10,
    ),
    DefaultPersona(
        key="historian",
        name="Historian",
        role=CriticPersona.Role.HISTORIAN,
        description="Adds older, foreign, obscure, and influence-aware context.",
        weight=14,
        sort_order=20,
    ),
    DefaultPersona(
        key="modern_defender",
        name="Modern Defender",
        role=CriticPersona.Role.MODERN_DEFENDER,
        description="Prevents unfair anti-modern bias and highlights recent exceptions.",
        weight=16,
        sort_order=30,
    ),
    DefaultPersona(
        key="anime_specialist",
        name="Anime Specialist",
        role=CriticPersona.Role.ANIME_SPECIALIST,
        description="Checks anime pacing, trope, adaptation, filler, and source-material risks.",
        weight=12,
        sort_order=40,
    ),
    DefaultPersona(
        key="literary_editor",
        name="Literary Editor",
        role=CriticPersona.Role.LITERARY_EDITOR,
        description="Judges prose, narration, density, and read/listen path fit.",
        weight=12,
        sort_order=50,
    ),
    DefaultPersona(
        key="mood_doctor",
        name="Mood Doctor",
        role=CriticPersona.Role.MOOD_DOCTOR,
        description="Checks whether the decision fits energy, attention, and tonight suitability.",
        weight=14,
        sort_order=60,
    ),
    DefaultPersona(
        key="completion_strategist",
        name="Completion Strategist",
        role=CriticPersona.Role.COMPLETION_STRATEGIST,
        description="Prevents sunk-cost completion pressure and suggests bounded sampling plans.",
        weight=13,
        sort_order=70,
    ),
    DefaultPersona(
        key="wildcard",
        name="Wildcard",
        role=CriticPersona.Role.WILDCARD,
        description="Surfaces risky but potentially rewarding upside that strict filters may miss.",
        weight=10,
        sort_order=80,
    ),
)


def clamp(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return round(max(minimum, min(maximum, value)))


def ensure_default_personas(user: User, *, reset: bool = False) -> list[CriticPersona]:
    if reset:
        CriticPersona.objects.filter(owner=user).delete()
    personas: list[CriticPersona] = []
    for persona in DEFAULT_PERSONAS:
        obj, _ = CriticPersona.objects.update_or_create(
            owner=user,
            key=persona.key,
            defaults={
                "name": persona.name,
                "role": persona.role,
                "description": persona.description,
                "weight": persona.weight,
                "is_enabled": True,
                "sort_order": persona.sort_order,
            },
        )
        personas.append(obj)
    return personas


def reset_personas_for_user(user: User) -> list[CriticPersona]:
    with transaction.atomic():
        return ensure_default_personas(user, reset=True)


def get_personas_for_user(user: User) -> QuerySet[CriticPersona]:
    if not CriticPersona.objects.filter(owner=user).exists():
        ensure_default_personas(user)
    return CriticPersona.objects.filter(owner=user).order_by("sort_order", "name")


def run_council_session(
    *,
    owner: User,
    prompt: str = "",
    candidate: Candidate | None = None,
    media_item: MediaItem | None = None,
) -> CouncilSession:
    if candidate is None and media_item is None and not prompt.strip():
        raise ValueError("Add a prompt, candidate, or media item before running Critic Council.")

    personas = [persona for persona in get_personas_for_user(owner) if persona.is_enabled]
    if not personas:
        raise ValueError("Enable at least one critic persona before running Critic Council.")

    context = _build_context(owner, prompt=prompt, candidate=candidate, media_item=media_item)
    opinions = [_build_opinion(persona, context) for persona in personas]
    final_decision, final_explanation, confidence, disagreement = _synthesize_final_decision(
        context,
        opinions,
    )

    return CouncilSession.objects.create(
        owner=owner,
        candidate=candidate,
        media_item=media_item,
        prompt=prompt.strip(),
        context=_context_payload(context),
        critic_opinions=opinions,
        final_decision=final_decision,
        final_explanation=final_explanation,
        confidence_score=confidence,
        disagreement_score=disagreement,
    )


def apply_council_decision(session: CouncilSession) -> Candidate | None:
    if session.candidate is None:
        return None
    candidate = session.candidate
    candidate.status = session.final_decision
    candidate.save(update_fields=["status", "updated_at"])
    if not session.applied_to_candidate:
        session.applied_to_candidate = True
        session.save(update_fields=["applied_to_candidate", "updated_at"])
    return candidate


def _build_context(
    owner: User,
    *,
    prompt: str,
    candidate: Candidate | None,
    media_item: MediaItem | None,
) -> CouncilContext:
    evaluation = None
    anti_generic = None
    if candidate is not None:
        evaluation = candidate.evaluations.order_by("-created_at").first()
        if evaluation is None:
            evaluation = evaluate_candidate(owner, candidate)
        anti_generic_obj = candidate.anti_generic_evaluations.order_by("-created_at").first()
        if anti_generic_obj:
            anti_generic = {
                "finalVerdict": anti_generic_obj.final_verdict,
                "genericnessRiskScore": anti_generic_obj.genericness_risk_score,
                "timeWasteRiskScore": anti_generic_obj.time_waste_risk_score,
                "positiveExceptionScore": anti_generic_obj.positive_exception_score,
                "detectedSignals": anti_generic_obj.detected_signals,
                "positiveExceptions": anti_generic_obj.positive_exceptions,
            }

    narrative = None
    if media_item is not None:
        narrative_obj = media_item.narrative_analyses.filter(
            owner=owner,
            status=NarrativeAnalysis.Status.COMPLETED,
        ).first()
        if narrative_obj:
            narrative = {
                "status": narrative_obj.status,
                "confidenceScore": narrative_obj.confidence_score,
                "sourceBasis": narrative_obj.source_basis,
                "summary": narrative_obj.analysis_summary,
                "traits": narrative_obj.extracted_traits,
            }

    if candidate:
        title = candidate.title
        media_type = candidate.media_type
        release_year = candidate.release_year
        creator = candidate.known_creator
        premise = candidate.premise
    elif media_item:
        title = media_item.title
        media_type = media_item.media_type
        release_year = media_item.release_year
        creator = media_item.creator
        premise = media_item.notes
    else:
        title = "Freeform council prompt"
        media_type = "unknown"
        release_year = None
        creator = ""
        premise = prompt
    time_cost = (
        candidate.expected_time_cost_minutes
        if candidate
        else _media_time_cost(media_item)
        if media_item
        else None
    )

    return CouncilContext(
        title=title,
        media_type=media_type,
        release_year=release_year,
        creator=creator,
        prompt=prompt.strip(),
        premise=premise,
        expected_genericness=candidate.expected_genericness if candidate else None,
        hype_level=candidate.hype_level if candidate else None,
        time_cost_minutes=time_cost,
        evaluation_decision=evaluation.decision if evaluation else None,
        likely_fit_score=evaluation.likely_fit_score if evaluation else None,
        risk_score=evaluation.risk_score if evaluation else None,
        confidence_score=evaluation.confidence_score if evaluation else None,
        reasons_for=list(evaluation.reasons_for if evaluation else []),
        reasons_against=list(evaluation.reasons_against if evaluation else []),
        narrative_signals=list(evaluation.narrative_signals if evaluation else []),
        anti_generic=anti_generic,
        media_rating=(
            float(media_item.personal_rating) if media_item and media_item.personal_rating else None
        ),
        media_notes=media_item.notes if media_item else "",
        narrative_analysis=narrative,
    )


def _media_time_cost(media_item: MediaItem | None) -> int | None:
    if media_item is None:
        return None
    return (
        media_item.runtime_minutes
        or media_item.audiobook_length_minutes
        or (media_item.episode_count * 45 if media_item.episode_count else None)
        or (round(media_item.page_count * 2) if media_item.page_count else None)
    )


def _context_payload(context: CouncilContext) -> dict[str, Any]:
    return {
        "title": context.title,
        "mediaType": context.media_type,
        "releaseYear": context.release_year,
        "creator": context.creator,
        "prompt": context.prompt,
        "premise": context.premise,
        "expectedGenericness": context.expected_genericness,
        "hypeLevel": context.hype_level,
        "timeCostMinutes": context.time_cost_minutes,
        "evaluationDecision": context.evaluation_decision,
        "likelyFitScore": context.likely_fit_score,
        "riskScore": context.risk_score,
        "confidenceScore": context.confidence_score,
        "reasonsFor": context.reasons_for,
        "reasonsAgainst": context.reasons_against,
        "narrativeSignals": context.narrative_signals,
        "antiGeneric": context.anti_generic,
        "mediaRating": context.media_rating,
        "mediaNotes": context.media_notes,
        "narrativeAnalysis": context.narrative_analysis,
    }


def _build_opinion(persona: CriticPersona, context: CouncilContext) -> dict[str, Any]:
    builders = {
        CriticPersona.Role.RUTHLESS_CRITIC: _ruthless_critic,
        CriticPersona.Role.HISTORIAN: _historian,
        CriticPersona.Role.MODERN_DEFENDER: _modern_defender,
        CriticPersona.Role.ANIME_SPECIALIST: _anime_specialist,
        CriticPersona.Role.LITERARY_EDITOR: _literary_editor,
        CriticPersona.Role.MOOD_DOCTOR: _mood_doctor,
        CriticPersona.Role.COMPLETION_STRATEGIST: _completion_strategist,
        CriticPersona.Role.WILDCARD: _wildcard,
    }
    recommendation, confidence, stance, argument, evidence = builders[persona.role](context)
    return {
        "personaId": str(persona.id),
        "role": persona.role,
        "name": persona.name,
        "description": persona.description,
        "weight": persona.weight,
        "recommendation": recommendation,
        "recommendationLabel": DECISION_LABELS[recommendation],
        "confidence": confidence,
        "stance": stance,
        "argument": _limit_words(argument, 150),
        "reason": _limit_words(argument, 150),
        "evidence": evidence,
    }


def _ruthless_critic(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    risk = context.risk_score or (context.expected_genericness or 5) * 10
    genericness = context.expected_genericness if context.expected_genericness is not None else None
    time_cost = context.time_cost_minutes or 0
    evidence = [*context.reasons_against[:2]]
    if genericness is not None:
        evidence.append(f"Expected genericness: {genericness}/10.")
    if time_cost > 240:
        evidence.append(f"High commitment cost: about {time_cost} minutes.")

    if risk >= 75:
        decision = CandidateEvaluation.Decision.SKIP
        stance = "against"
    elif risk >= 55 or time_cost > 240:
        decision = CandidateEvaluation.Decision.DELAY
        stance = "caution"
    else:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "conditional"

    argument = (
        f"Protect the user's time first. {context.title} has risk around {risk}/100, "
        "so the safe move is to demand proof early instead of trusting hype or premise packaging."
    )
    return decision, clamp(55 + risk * 0.35), stance, argument, evidence[:4]


def _historian(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    year = context.release_year
    evidence = []
    if year:
        evidence.append(f"Release year: {year}.")
    if context.creator:
        evidence.append(f"Creator signal: {context.creator}.")

    if year and year < 2000:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "for"
        argument = (
            f"The historical signal is useful. {context.title} may be worth sampling for context, "
            "influence, and texture even if it is not an immediate comfort pick."
        )
    elif context.media_rating and context.media_rating >= 8:
        decision = CandidateEvaluation.Decision.WATCH_NOW
        stance = "for"
        evidence.append(f"Personal rating: {context.media_rating}/10.")
        argument = (
            f"Your own library already gives {context.title} strong historical weight. "
            "Use it as a reference point for adjacent works and later comparisons."
        )
    else:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "context"
        argument = (
            f"Treat {context.title} as a context probe. Ask what lineage, region, era, or older "
            "alternative it connects to before committing fully."
        )
    return decision, 62, stance, argument, evidence[:4]


def _modern_defender(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    year = context.release_year or 0
    positive_exception = 0
    if context.anti_generic:
        positive_exception = int(context.anti_generic.get("positiveExceptionScore") or 0)
    evidence = []
    if year >= 2018:
        evidence.append("Modern fairness rule: recency alone is not a flaw.")
    if positive_exception:
        evidence.append(f"Positive exception score: {positive_exception}/100.")
    evidence.extend(context.reasons_for[:2])

    if year >= 2018 and positive_exception >= 30:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "for"
    elif year >= 2018 and (context.risk_score or 0) < 65:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "fairness"
    else:
        decision = context.evaluation_decision or CandidateEvaluation.Decision.SAMPLE
        stance = "neutral"

    argument = (
        f"Do not reject {context.title} just because it is recent or visible. Judge craft, "
        "specificity, and personal-fit evidence; if those exist, a bounded sample is fair."
    )
    return decision, clamp(58 + positive_exception * 0.3), stance, argument, evidence[:4]


def _anime_specialist(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    is_anime = context.media_type == MediaItem.MediaType.ANIME
    time_cost = context.time_cost_minutes or 0
    evidence = [f"Medium: {context.media_type}."]
    if time_cost:
        evidence.append(f"Estimated commitment: {time_cost} minutes.")
    if is_anime and time_cost > 500:
        decision = CandidateEvaluation.Decision.DELAY
        stance = "caution"
        argument = (
            f"For anime, pacing and filler risk matter. {context.title} should earn a longer "
            "commitment through a focused sample arc before the user enters completion mode."
        )
    elif is_anime:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "conditional"
        argument = (
            f"Anime-specific risk is manageable if {context.title} proves pacing, source handling, "
            "and trope freshness early. Sample before committing."
        )
    else:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "limited"
        argument = (
            "This is not primarily an anime decision, but adaptation logic still applies: "
            "test pacing, "
            "trope freshness, and whether style has substance."
        )
    return decision, 56 if not is_anime else 68, stance, argument, evidence[:4]


def _literary_editor(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    is_literary = context.media_type in {MediaItem.MediaType.NOVEL, MediaItem.MediaType.AUDIOBOOK}
    evidence = [f"Medium: {context.media_type}."]
    if context.narrative_analysis:
        evidence.append("Narrative DNA is available for story-structure evidence.")
    if is_literary:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "for"
        argument = (
            f"For {context.title}, judge density, voice, and whether the prose or narration itself "
            "carries value. A sample protects time while still respecting literary upside."
        )
    else:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "context"
        argument = (
            f"Check whether {context.title} depends on source material or adaptation shortcuts. "
            "If the premise feels thin, consider a source-first path later."
        )
    return decision, 60, stance, argument, evidence[:4]


def _mood_doctor(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    time_cost = context.time_cost_minutes or 0
    risk = context.risk_score or 45
    evidence = []
    if time_cost:
        evidence.append(f"Estimated commitment: {time_cost} minutes.")
    if context.prompt:
        evidence.append(f"User context: {context.prompt[:120]}.")

    if time_cost > 240 or risk >= 70:
        decision = CandidateEvaluation.Decision.DELAY
        stance = "delay"
        argument = (
            f"{context.title} needs the right attention window. Do not use it as "
            "default stimulation; "
            "delay until the user has focus and patience."
        )
    elif time_cost <= 120:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "for"
        argument = (
            f"{context.title} is low enough commitment for a controlled sample. Stop quickly if "
            "the first meaningful unit feels generic."
        )
    else:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "conditional"
        argument = (
            f"Mood fit matters more than abstract quality here. Try {context.title} "
            "only when curiosity "
            "is active, not when tired or seeking noise."
        )
    return decision, 65, stance, argument, evidence[:4]


def _completion_strategist(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    time_cost = context.time_cost_minutes or 0
    evidence = []
    if time_cost:
        evidence.append(f"Completion burden: {time_cost} minutes.")
    if context.reasons_against:
        evidence.extend(context.reasons_against[:2])

    if time_cost > 600:
        decision = CandidateEvaluation.Decision.DELAY
        stance = "against"
    elif (context.risk_score or 0) >= 70:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "guardrail"
    else:
        decision = context.evaluation_decision or CandidateEvaluation.Decision.SAMPLE
        stance = "guardrail"

    argument = (
        f"Set an exit rule before starting {context.title}. The council should create "
        "permission to stop, "
        "not pressure to finish something that stops paying rent."
    )
    return decision, 66, stance, argument, evidence[:4]


def _wildcard(context: CouncilContext) -> tuple[str, int, str, str, list[str]]:
    fit = context.likely_fit_score or (
        80 if context.media_rating and context.media_rating >= 8 else 55
    )
    risk = context.risk_score or 45
    upside = fit - (risk * 0.25)
    evidence = context.reasons_for[:2]
    if context.narrative_signals:
        evidence.append("Narrative DNA signals suggest possible pattern alignment.")
    if context.prompt:
        evidence.append("Prompt adds live-context uncertainty.")

    if upside >= 68 and risk < 75:
        decision = CandidateEvaluation.Decision.WATCH_NOW
        stance = "for"
    elif upside >= 48:
        decision = CandidateEvaluation.Decision.SAMPLE
        stance = "risk_reward"
    else:
        decision = CandidateEvaluation.Decision.DELAY
        stance = "caution"
    argument = (
        f"There is still room for surprise. If {context.title} offers a strange angle, "
        "unusual craft, "
        "or a sharp mood match, sample it with a clear stop condition."
    )
    return decision, clamp(50 + upside * 0.3), stance, argument, evidence[:4]


def _synthesize_final_decision(
    context: CouncilContext,
    opinions: list[dict[str, Any]],
) -> tuple[str, str, int, int]:
    weighted_scores = {decision: 0 for decision in DECISION_RANK}
    total_weight = 0
    ranks = []
    for opinion in opinions:
        recommendation = opinion["recommendation"]
        weight = int(opinion["weight"])
        weighted_scores[recommendation] += weight
        total_weight += weight
        ranks.append(DECISION_RANK[recommendation])

    winner = max(weighted_scores, key=weighted_scores.get)
    base_decision = context.evaluation_decision
    risk = context.risk_score or 0
    disagreement = _disagreement_score(ranks)

    if risk >= 78 and winner == CandidateEvaluation.Decision.WATCH_NOW:
        final_decision = CandidateEvaluation.Decision.SAMPLE
    elif disagreement >= 45 and winner == CandidateEvaluation.Decision.WATCH_NOW:
        final_decision = CandidateEvaluation.Decision.SAMPLE
    elif (
        base_decision == CandidateEvaluation.Decision.SKIP
        and weighted_scores[winner] < total_weight * 0.45
    ):
        final_decision = CandidateEvaluation.Decision.DELAY
    else:
        final_decision = winner

    support = weighted_scores[final_decision]
    confidence = clamp(45 + (support / max(total_weight, 1)) * 40 - disagreement * 0.18)
    explanation = _final_explanation(context, opinions, final_decision, disagreement)
    return final_decision, explanation, confidence, disagreement


def _disagreement_score(ranks: list[int]) -> int:
    if len(ranks) <= 1:
        return 0
    spread = max(ranks) - min(ranks)
    unique = len(set(ranks))
    return clamp((spread / 3) * 70 + max(unique - 2, 0) * 10)


def _final_explanation(
    context: CouncilContext,
    opinions: list[dict[str, Any]],
    decision: str,
    disagreement: int,
) -> str:
    supportive = [opinion["name"] for opinion in opinions if opinion["recommendation"] == decision]
    caution = [
        opinion["name"]
        for opinion in opinions
        if DECISION_RANK[opinion["recommendation"]] < DECISION_RANK[decision]
    ]
    support_text = ", ".join(supportive[:3]) or "the strongest weighted critics"
    caution_text = ", ".join(caution[:2]) or "no major dissenting critic"
    risk_text = (
        f" risk is {context.risk_score}/100"
        if context.risk_score is not None
        else " risk is uncertain"
    )
    return (
        f"Final decision: {DECISION_LABELS[decision]} for {context.title}. "
        f"The synthesis favors {support_text}, while {caution_text} sets the guardrails;"
        f"{risk_text} and disagreement is {disagreement}/100. This is a tradeoff judgment, "
        "not a hidden score average."
    )


def _limit_words(value: str, limit: int) -> str:
    words = value.split()
    if len(words) <= limit:
        return value
    return " ".join(words[:limit]).rstrip(".,;:") + "."
