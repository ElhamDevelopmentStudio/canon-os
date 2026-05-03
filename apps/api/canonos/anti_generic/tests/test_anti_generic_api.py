from __future__ import annotations

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from canonos.anti_generic.models import AntiGenericEvaluation, AntiGenericRule
from canonos.anti_generic.services import evaluate_anti_generic_for_candidate, get_rules_for_user
from canonos.candidates.models import Candidate
from canonos.candidates.services import evaluate_candidate

pytestmark = pytest.mark.django_db


def create_user(email: str = "anti-generic@example.com") -> User:
    return User.objects.create_user(username=email, email=email, password="strong-password")


def authenticated_client(user: User | None = None) -> tuple[APIClient, User]:
    user = user or create_user()
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def high_generic_candidate(user: User) -> Candidate:
    return Candidate.objects.create(
        owner=user,
        title="Trend Prestige Mystery",
        media_type="tv_show",
        release_year=2024,
        known_creator="",
        premise=(
            "A dark gritty mystery box with complex twists, filler episodes, "
            "and weak ending rumors."
        ),
        source_of_interest="Very high hype",
        hype_level=9,
        expected_genericness=9,
        expected_time_cost_minutes=920,
    )


def modern_exception_candidate(user: User) -> Candidate:
    return Candidate.objects.create(
        owner=user,
        title="Distinctive Modern Film",
        media_type="movie",
        release_year=2024,
        known_creator="Strong Auteur",
        premise=(
            "Original authorial voice with atmosphere, character agency, " "and distinctive craft."
        ),
        source_of_interest="Niche festival friend signal",
        hype_level=3,
        expected_genericness=2,
        expected_time_cost_minutes=95,
    )


def test_default_rules_are_seeded_and_owner_scoped() -> None:
    user = create_user()
    other = create_user("anti-generic-other@example.com")

    rules = get_rules_for_user(user)
    get_rules_for_user(other)

    assert len(rules) == 7
    assert {rule.key for rule in rules} >= {"fake_complexity", "auteur_driven_modern_work"}
    assert AntiGenericRule.objects.filter(owner=user).count() == 7
    assert AntiGenericRule.objects.filter(owner=other).count() == 7
    assert set(AntiGenericRule.objects.filter(owner=user).values_list("id", flat=True)).isdisjoint(
        set(AntiGenericRule.objects.filter(owner=other).values_list("id", flat=True))
    )


def test_genericness_risk_scoring_detects_red_flags() -> None:
    user = create_user()
    candidate = high_generic_candidate(user)

    evaluation = evaluate_anti_generic_for_candidate(user, candidate)

    assert evaluation.genericness_risk_score >= 80
    assert evaluation.time_waste_risk_score >= 75
    assert evaluation.final_verdict == AntiGenericEvaluation.FinalVerdict.LIKELY_GENERIC_SKIP
    signal_keys = {signal["ruleKey"] for signal in evaluation.detected_signals}
    assert {"fake_complexity", "filler_heavy_long_series", "overhype_mismatch"}.issubset(
        signal_keys
    )


def test_positive_exception_scoring_offsets_modern_work_bias() -> None:
    user = create_user("modern-exception@example.com")
    candidate = modern_exception_candidate(user)

    evaluation = evaluate_anti_generic_for_candidate(user, candidate)

    assert evaluation.positive_exception_score >= 35
    assert evaluation.genericness_risk_score < 45
    assert evaluation.final_verdict == AntiGenericEvaluation.FinalVerdict.MODERN_EXCEPTION
    assert evaluation.positive_exceptions
    assert not any(
        "release year" in signal["evidence"].lower() for signal in evaluation.detected_signals
    )


def test_disabled_rule_is_ignored_by_evaluation() -> None:
    user = create_user("disabled-rule@example.com")
    candidate = high_generic_candidate(user)
    get_rules_for_user(user)
    AntiGenericRule.objects.filter(owner=user, key="filler_heavy_long_series").update(
        is_enabled=False
    )

    evaluation = evaluate_anti_generic_for_candidate(user, candidate)

    assert "filler_heavy_long_series" not in {
        signal["ruleKey"] for signal in evaluation.detected_signals
    }


def test_candidate_evaluator_creates_anti_generic_result() -> None:
    user = create_user("candidate-ag@example.com")
    candidate = high_generic_candidate(user)

    candidate_evaluation = evaluate_candidate(user, candidate)

    anti_generic = candidate.anti_generic_evaluations.first()
    assert anti_generic is not None
    assert anti_generic.genericness_risk_score >= 80
    assert candidate_evaluation.risk_score >= 80


def test_rules_and_evaluate_endpoints_support_updates_and_reset() -> None:
    client, user = authenticated_client()
    candidate = high_generic_candidate(user)

    list_response = client.get(reverse("anti-generic-rule-list"))
    assert list_response.status_code == status.HTTP_200_OK
    rules = list_response.json()["results"]
    fake_complexity = next(rule for rule in rules if rule["key"] == "fake_complexity")

    update_response = client.patch(
        reverse("anti-generic-rule-detail", args=[fake_complexity["id"]]),
        {"isEnabled": False, "weight": 3},
        format="json",
    )
    assert update_response.status_code == status.HTTP_200_OK
    assert update_response.json()["isEnabled"] is False
    assert update_response.json()["weight"] == 3

    evaluate_response = client.post(
        reverse("anti-generic-evaluate"),
        {"candidateId": str(candidate.id)},
        format="json",
    )
    assert evaluate_response.status_code == status.HTTP_201_CREATED
    assert all(
        signal["ruleKey"] != "fake_complexity"
        for signal in evaluate_response.json()["evaluation"]["detectedSignals"]
    )

    reset_response = client.post(reverse("anti-generic-rule-reset"), format="json")
    assert reset_response.status_code == status.HTTP_200_OK
    assert AntiGenericRule.objects.get(owner=user, key="fake_complexity").is_enabled is True
