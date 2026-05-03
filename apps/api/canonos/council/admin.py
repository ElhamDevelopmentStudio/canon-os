from __future__ import annotations

from django.contrib import admin

from .models import CouncilSession, CriticPersona


@admin.register(CriticPersona)
class CriticPersonaAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "role", "weight", "is_enabled", "sort_order", "updated_at"]
    list_filter = ["role", "is_enabled"]
    search_fields = ["name", "description", "owner__username", "owner__email"]


@admin.register(CouncilSession)
class CouncilSessionAdmin(admin.ModelAdmin):
    list_display = [
        "owner",
        "candidate",
        "media_item",
        "final_decision",
        "confidence_score",
        "disagreement_score",
        "applied_to_candidate",
        "created_at",
    ]
    list_filter = ["final_decision", "applied_to_candidate", "created_at"]
    search_fields = ["candidate__title", "media_item__title", "prompt", "final_explanation"]
    readonly_fields = ["critic_opinions", "context"]
