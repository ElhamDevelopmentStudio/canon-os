from __future__ import annotations

from django.contrib import admin

from .models import Candidate, CandidateEvaluation


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "media_type", "status", "release_year", "updated_at")
    list_filter = ("media_type", "status", "created_at")
    search_fields = ("title", "known_creator", "premise", "source_of_interest", "owner__username")
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(CandidateEvaluation)
class CandidateEvaluationAdmin(admin.ModelAdmin):
    list_display = (
        "candidate",
        "decision",
        "confidence_score",
        "likely_fit_score",
        "risk_score",
        "created_at",
    )
    list_filter = ("decision", "created_at")
    search_fields = ("candidate__title", "recommended_action")
    readonly_fields = ("id", "created_at")
