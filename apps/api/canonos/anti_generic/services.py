from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from django.contrib.auth.models import User
from django.db import transaction

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem

from .models import AntiGenericEvaluation, AntiGenericRule


@dataclass(frozen=True)
class DefaultRule:
    key: str
    name: str
    description: str
    weight: int
    is_positive_exception: bool


DEFAULT_RULES: tuple[DefaultRule, ...] = (
    DefaultRule(
        key="fake_complexity",
        name="Fake complexity",
        description="Flags mystery-box, puzzle, or prestige language that may hide weak payoff.",
        weight=18,
        is_positive_exception=False,
    ),
    DefaultRule(
        key="weak_ending_risk",
        name="Weak ending risk",
        description="Flags unknown or suspected payoff problems, especially when hype is high.",
        weight=16,
        is_positive_exception=False,
    ),
    DefaultRule(
        key="shallow_darkness",
        name="Shallow darkness",
        description=(
            "Flags grim, edgy, or violent packaging when it may be style without substance."
        ),
        weight=14,
        is_positive_exception=False,
    ),
    DefaultRule(
        key="filler_heavy_long_series",
        name="Filler-heavy long series",
        description="Flags long series or episode commitments with low-density or filler risk.",
        weight=20,
        is_positive_exception=False,
    ),
    DefaultRule(
        key="overhype_mismatch",
        name="Overhype mismatch",
        description="Flags high-hype candidates that may not match personal standards.",
        weight=17,
        is_positive_exception=False,
    ),
    DefaultRule(
        key="auteur_driven_modern_work",
        name="Auteur-driven modern work",
        description=(
            "Protects recent works with creator voice, originality, or distinctive craft signals."
        ),
        weight=22,
        is_positive_exception=True,
    ),
    DefaultRule(
        key="low_popularity_strong_fit",
        name="Low popularity but strong fit",
        description=(
            "Protects niche, low-hype, or personally sourced works with strong fit signals."
        ),
        weight=18,
        is_positive_exception=True,
    ),
)


@dataclass(frozen=True)
class RuleHit:
    rule: AntiGenericRule
    score: int
    evidence: str


Matcher = Callable[[Candidate], RuleHit | None]


def clamp(value: float, minimum: int = 0, maximum: int = 100) -> int:
    return round(max(minimum, min(maximum, value)))


def ensure_default_rules(user: User, *, reset: bool = False) -> list[AntiGenericRule]:
    if reset:
        AntiGenericRule.objects.filter(owner=user).delete()
    rules = []
    for rule in DEFAULT_RULES:
        obj, _ = AntiGenericRule.objects.update_or_create(
            owner=user,
            key=rule.key,
            defaults={
                "name": rule.name,
                "description": rule.description,
                "weight": rule.weight,
                "is_positive_exception": rule.is_positive_exception,
                "is_enabled": True,
            },
        )
        rules.append(obj)
    return rules


def get_rules_for_user(user: User) -> list[AntiGenericRule]:
    if not AntiGenericRule.objects.filter(owner=user).exists():
        ensure_default_rules(user)
    return list(AntiGenericRule.objects.filter(owner=user))


def evaluate_anti_generic_for_candidate(
    user: User,
    candidate: Candidate,
    *,
    media_item: MediaItem | None = None,
) -> AntiGenericEvaluation:
    rules = {rule.key: rule for rule in get_rules_for_user(user) if rule.is_enabled}
    red_flags = _detect_red_flags(candidate, rules)
    positives = _detect_positive_exceptions(candidate, rules)

    genericness_base = (
        candidate.expected_genericness if candidate.expected_genericness is not None else 5
    )
    hype = candidate.hype_level if candidate.hype_level is not None else 5
    red_flag_score = sum(hit.score for hit in red_flags)
    positive_score = clamp(sum(hit.score for hit in positives))
    genericness_risk = clamp((genericness_base * 7) + red_flag_score - (positive_score * 0.35))
    time_waste_risk = clamp(
        (genericness_base * 4)
        + _time_commitment_risk(candidate)
        + max(hype - 7, 0) * 5
        + red_flag_score * 0.35
        - positive_score * 0.2,
    )

    if positive_score >= 35 and genericness_risk < 65:
        final_verdict = AntiGenericEvaluation.FinalVerdict.MODERN_EXCEPTION
    elif genericness_risk >= 75 or time_waste_risk >= 75:
        final_verdict = AntiGenericEvaluation.FinalVerdict.LIKELY_GENERIC_SKIP
    elif genericness_risk >= 45 or time_waste_risk >= 45:
        final_verdict = AntiGenericEvaluation.FinalVerdict.SAMPLE_WITH_GUARDRAIL
    else:
        final_verdict = AntiGenericEvaluation.FinalVerdict.LOW_RISK

    return AntiGenericEvaluation.objects.create(
        candidate=candidate,
        media_item=media_item,
        genericness_risk_score=genericness_risk,
        time_waste_risk_score=time_waste_risk,
        positive_exception_score=positive_score,
        detected_signals=[_hit_payload(hit) for hit in red_flags],
        positive_exceptions=[_hit_payload(hit) for hit in positives],
        final_verdict=final_verdict,
    )


def reset_rules_for_user(user: User) -> list[AntiGenericRule]:
    with transaction.atomic():
        return ensure_default_rules(user, reset=True)


def _detect_red_flags(
    candidate: Candidate,
    rules: dict[str, AntiGenericRule],
) -> list[RuleHit]:
    matchers: dict[str, Matcher] = {
        "fake_complexity": _fake_complexity,
        "weak_ending_risk": _weak_ending_risk,
        "shallow_darkness": _shallow_darkness,
        "filler_heavy_long_series": _filler_heavy_long_series,
        "overhype_mismatch": _overhype_mismatch,
    }
    return [
        hit
        for key, matcher in matchers.items()
        if (rule := rules.get(key)) and (hit := matcher_for(rule, matcher, candidate))
    ]


def _detect_positive_exceptions(
    candidate: Candidate,
    rules: dict[str, AntiGenericRule],
) -> list[RuleHit]:
    matchers: dict[str, Matcher] = {
        "auteur_driven_modern_work": _auteur_driven_modern_work,
        "low_popularity_strong_fit": _low_popularity_strong_fit,
    }
    return [
        hit
        for key, matcher in matchers.items()
        if (rule := rules.get(key)) and (hit := matcher_for(rule, matcher, candidate))
    ]


def matcher_for(rule: AntiGenericRule, matcher: Matcher, candidate: Candidate) -> RuleHit | None:
    hit = matcher(candidate)
    if hit is None:
        return None
    return RuleHit(rule=rule, score=clamp(hit.score * (rule.weight / 20)), evidence=hit.evidence)


def _fake_complexity(candidate: Candidate) -> RuleHit | None:
    text = _candidate_text(candidate)
    keywords = ["mystery box", "puzzle", "complex", "twist", "cryptic", "prestige"]
    if any(keyword in text for keyword in keywords) and _genericness(candidate) >= 5:
        return RuleHit(
            _placeholder_rule(),
            16,
            "Premise language suggests complexity that needs payoff verification.",
        )
    return None


def _weak_ending_risk(candidate: Candidate) -> RuleHit | None:
    text = _candidate_text(candidate)
    keywords = ["weak ending", "ending unknown", "mystery box", "payoff", "finale"]
    if any(keyword in text for keyword in keywords) or (
        _genericness(candidate) >= 7 and _hype(candidate) >= 8
    ):
        return RuleHit(
            _placeholder_rule(),
            15,
            "Payoff or ending quality is uncertain enough to require a sample rule.",
        )
    return None


def _shallow_darkness(candidate: Candidate) -> RuleHit | None:
    text = _candidate_text(candidate)
    keywords = ["dark", "gritty", "edgy", "violent", "bleak", "grim"]
    if any(keyword in text for keyword in keywords) and _genericness(candidate) >= 6:
        return RuleHit(
            _placeholder_rule(),
            14,
            "Darkness may be presentation rather than meaningful substance.",
        )
    return None


def _filler_heavy_long_series(candidate: Candidate) -> RuleHit | None:
    text = _candidate_text(candidate)
    long_series = candidate.media_type in {
        MediaItem.MediaType.TV_SHOW,
        MediaItem.MediaType.ANIME,
    } and (_time_cost(candidate) > 480)
    if long_series or "filler" in text or "low density" in text:
        return RuleHit(
            _placeholder_rule(), 20, "Runtime or series shape creates filler and low-density risk."
        )
    return None


def _overhype_mismatch(candidate: Candidate) -> RuleHit | None:
    if _hype(candidate) >= 8 and _genericness(candidate) >= 5:
        return RuleHit(
            _placeholder_rule(),
            17,
            "High hype combined with genericness can hide personal mismatch.",
        )
    return None


def _auteur_driven_modern_work(candidate: Candidate) -> RuleHit | None:
    text = _candidate_text(candidate)
    keywords = [
        "auteur",
        "authorial",
        "director",
        "creator",
        "distinctive",
        "original",
        "voice",
        "craft",
    ]
    is_recent = bool(candidate.release_year and candidate.release_year >= 2018)
    if (
        is_recent
        and (candidate.known_creator.strip() or any(keyword in text for keyword in keywords))
        and _genericness(candidate) <= 5
    ):
        return RuleHit(
            _placeholder_rule(),
            22,
            "Recent work has creator voice or distinctive craft signals; recency is not penalized.",
        )
    return None


def _low_popularity_strong_fit(candidate: Candidate) -> RuleHit | None:
    text = _candidate_text(candidate)
    source = candidate.source_of_interest.lower()
    keywords = ["niche", "friend", "personal", "backlog", "underseen", "low popularity", "festival"]
    if (
        (_hype(candidate) <= 4 or any(keyword in source for keyword in keywords))
        and candidate.premise.strip()
        and _genericness(candidate) <= 4
    ):
        return RuleHit(
            _placeholder_rule(),
            18,
            "Low-hype or personal-source signal with low genericness supports a fair exception.",
        )
    if any(
        keyword in text
        for keyword in ["moral ambiguity", "atmosphere", "character agency", "memorable ending"]
    ):
        return RuleHit(
            _placeholder_rule(), 12, "Premise contains user-aligned positive craft signals."
        )
    return None


def _hit_payload(hit: RuleHit) -> dict[str, object]:
    return {
        "ruleId": str(hit.rule.id),
        "ruleKey": hit.rule.key,
        "name": hit.rule.name,
        "description": hit.rule.description,
        "weight": hit.rule.weight,
        "score": hit.score,
        "evidence": hit.evidence,
    }


def _time_commitment_risk(candidate: Candidate) -> int:
    time_cost = _time_cost(candidate)
    if time_cost > 900:
        return 36
    if time_cost > 600:
        return 28
    if time_cost > 240:
        return 16
    if time_cost <= 90:
        return -8
    return 0


def _candidate_text(candidate: Candidate) -> str:
    return " ".join(
        [
            candidate.title,
            candidate.known_creator,
            candidate.premise,
            candidate.source_of_interest,
        ]
    ).lower()


def _genericness(candidate: Candidate) -> int:
    return candidate.expected_genericness if candidate.expected_genericness is not None else 5


def _hype(candidate: Candidate) -> int:
    return candidate.hype_level if candidate.hype_level is not None else 5


def _time_cost(candidate: Candidate) -> int:
    return candidate.expected_time_cost_minutes or 120


def _placeholder_rule() -> AntiGenericRule:
    return AntiGenericRule(key="placeholder", name="placeholder", description="", weight=20)
