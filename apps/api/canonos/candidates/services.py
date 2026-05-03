from __future__ import annotations

from statistics import mean

from django.contrib.auth.models import User
from django.db.models import Avg, Count

from canonos.accounts.models import UserSettings
from canonos.anti_generic.services import evaluate_anti_generic_for_candidate
from canonos.media.models import MediaItem
from canonos.narrative.services import narrative_trait_bonus_for_candidate
from canonos.taste.models import MediaScore, TasteDimension

from .models import Candidate, CandidateEvaluation


def clamp(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return round(max(minimum, min(maximum, value)))


def _user_settings(user: User) -> UserSettings:
    settings, _ = UserSettings.objects.get_or_create(user=user)
    return settings


def _media_type_bonus(user: User, candidate: Candidate) -> tuple[int, list[str]]:
    stats = MediaItem.objects.filter(
        owner=user,
        media_type=candidate.media_type,
        status=MediaItem.ConsumptionStatus.COMPLETED,
        personal_rating__isnull=False,
    ).aggregate(avg_rating=Avg("personal_rating"), count=Count("id"))
    count = stats["count"] or 0
    avg_rating = float(stats["avg_rating"] or 0)
    if count >= 2 and avg_rating >= 8:
        return 14, [f"{candidate.get_media_type_display()} is a proven high-fit medium for you."]
    if count >= 1 and avg_rating >= 8:
        return 8, [
            f"You have at least one strong prior {candidate.get_media_type_display()} match."
        ]
    return 0, []


def _score_profile(user: User) -> tuple[float, float, int]:
    positive_scores = list(
        MediaScore.objects.filter(
            media_item__owner=user,
            taste_dimension__direction=TasteDimension.Direction.POSITIVE,
        ).values_list("score", flat=True)
    )
    negative_scores = list(
        MediaScore.objects.filter(
            media_item__owner=user,
            taste_dimension__direction=TasteDimension.Direction.NEGATIVE,
        ).values_list("score", flat=True)
    )
    positive_avg = float(mean(positive_scores)) if positive_scores else 5.0
    negative_avg = float(mean(negative_scores)) if negative_scores else 4.0
    return positive_avg, negative_avg, len(positive_scores) + len(negative_scores)


def evaluate_candidate(user: User, candidate: Candidate) -> CandidateEvaluation:
    positive_avg, negative_avg, score_count = _score_profile(user)
    settings = _user_settings(user)
    type_bonus, type_reasons = _media_type_bonus(user, candidate)
    genericness = (
        candidate.expected_genericness if candidate.expected_genericness is not None else 5
    )
    hype = candidate.hype_level if candidate.hype_level is not None else 5
    time_cost = candidate.expected_time_cost_minutes or 120

    time_penalty = 0
    if time_cost > 600:
        time_penalty = 18
    elif time_cost > 240:
        time_penalty = 10
    elif time_cost <= 100:
        time_penalty = -5

    likely_fit = clamp(50 + ((positive_avg - 5) * 7) - max(negative_avg - 5, 0) * 5 + type_bonus)
    genericness_weight = 4 + (settings.genericness_sensitivity * 0.6)
    modern_skepticism_penalty = (
        max(settings.modern_media_skepticism_level - 5, 0) * 3
        if candidate.release_year and candidate.release_year >= 2018
        else 0
    )
    strictness_penalty = (settings.preferred_scoring_strictness - 5) * 2
    anti_generic = evaluate_anti_generic_for_candidate(user, candidate)
    narrative_bonus, narrative_risk, narrative_signals = narrative_trait_bonus_for_candidate(
        user,
        candidate.media_type,
        candidate.premise,
    )
    likely_fit_with_narrative = clamp(likely_fit + narrative_bonus)
    risk = clamp(
        (genericness * genericness_weight)
        + max(time_penalty, 0)
        + max(hype - 7, 0) * 4
        + modern_skepticism_penalty
        + narrative_risk
        + (anti_generic.genericness_risk_score * 0.35)
        + (anti_generic.time_waste_risk_score * 0.2)
        - (anti_generic.positive_exception_score * 0.25)
    )
    final_score = clamp(
        likely_fit_with_narrative - (risk * 0.45) - time_penalty + min(hype, 8) - strictness_penalty
    )
    confidence = clamp(
        45
        + min(score_count * 4, 30)
        + (10 if type_bonus else 0)
        + (8 if narrative_signals else 0)
        - (10 if not candidate.premise else 0)
    )

    if final_score >= 75 and risk < 55:
        decision = CandidateEvaluation.Decision.WATCH_NOW
    elif final_score >= 58:
        decision = CandidateEvaluation.Decision.SAMPLE
    elif final_score >= 42:
        decision = CandidateEvaluation.Decision.DELAY
    else:
        decision = CandidateEvaluation.Decision.SKIP

    reasons_for = [*type_reasons]
    reasons_against = []
    if candidate.premise:
        reasons_for.append("The premise gives enough signal for a meaningful first-pass judgment.")
    for signal in narrative_signals:
        if signal["impact"] >= 0:
            reasons_for.append(signal["evidence"])
        else:
            reasons_against.append(signal["evidence"])
    if positive_avg >= 7:
        reasons_for.append(
            "Your scored history shows strong positive taste signals to compare against."
        )
    if time_cost <= 120:
        reasons_for.append("The time cost is low enough to make sampling easy.")
    if not reasons_for:
        reasons_for.append("There is enough basic metadata to save and revisit this candidate.")

    if genericness >= 7:
        reasons_against.append("Expected genericness is high, so sample before committing.")
    elif genericness >= 5:
        reasons_against.append("Genericness risk is moderate and should be tested early.")
    if time_cost > 240:
        reasons_against.append("The time cost is high enough to raise commitment risk.")
    if hype >= 8:
        reasons_against.append("High hype can mask mismatch; judge against your own standards.")
    if settings.genericness_sensitivity >= 8 and genericness >= 6:
        reasons_against.append(
            "Your saved genericness sensitivity is high, so this risk is weighted heavily."
        )
    if modern_skepticism_penalty:
        reasons_against.append(
            "Your modern media skepticism setting adds caution for recent releases."
        )
    if anti_generic.detected_signals:
        reasons_against.append(anti_generic.detected_signals[0]["evidence"])
    if anti_generic.positive_exceptions:
        reasons_for.append(anti_generic.positive_exceptions[0]["evidence"])
    if score_count == 0:
        reasons_against.append("Confidence is limited until more taste scores are logged.")
    if not candidate.premise:
        reasons_against.append("Missing premise details reduce evaluation confidence.")
    if not reasons_against:
        reasons_against.append("No major risk signal was found in the MVP heuristic.")

    best_mood = "Focused and curious" if time_cost > 120 else "Any light-to-medium attention window"
    action_by_decision = {
        CandidateEvaluation.Decision.WATCH_NOW: (
            "Start it when you have enough attention to judge the opening honestly."
        ),
        CandidateEvaluation.Decision.SAMPLE: (
            "Sample the first meaningful unit, then continue only if atmosphere and agency land."
        ),
        CandidateEvaluation.Decision.DELAY: (
            "Delay until mood, time, or stronger evidence improves the expected value."
        ),
        CandidateEvaluation.Decision.SKIP: (
            "Skip for now and protect time unless new evidence changes the risk profile."
        ),
    }

    evaluation = CandidateEvaluation.objects.create(
        candidate=candidate,
        decision=decision,
        confidence_score=confidence,
        likely_fit_score=likely_fit_with_narrative,
        risk_score=risk,
        reasons_for=reasons_for[:4],
        reasons_against=reasons_against[:4],
        narrative_signals=narrative_signals,
        best_mood=best_mood,
        recommended_action=action_by_decision[decision],
    )
    candidate.status = decision
    candidate.save(update_fields=["status", "updated_at"])
    return evaluation
