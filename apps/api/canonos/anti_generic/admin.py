from __future__ import annotations

from django.contrib import admin

from .models import AntiGenericEvaluation, AntiGenericRule


@admin.register(AntiGenericRule)
class AntiGenericRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "weight", "is_positive_exception", "is_enabled", "updated_at"]
    list_filter = ["is_positive_exception", "is_enabled"]
    search_fields = ["name", "description", "key", "owner__username", "owner__email"]


@admin.register(AntiGenericEvaluation)
class AntiGenericEvaluationAdmin(admin.ModelAdmin):
    list_display = [
        "candidate",
        "final_verdict",
        "genericness_risk_score",
        "time_waste_risk_score",
        "positive_exception_score",
        "created_at",
    ]
    list_filter = ["final_verdict", "created_at"]
    search_fields = ["candidate__title"]
    readonly_fields = ["detected_signals", "positive_exceptions"]
