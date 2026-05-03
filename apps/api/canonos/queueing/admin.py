from __future__ import annotations

from django.contrib import admin

from .models import QueueItem, TonightModeSession


@admin.register(QueueItem)
class QueueItemAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "media_type",
        "priority",
        "mood_compatibility",
        "freshness_score",
        "is_archived",
        "queue_position",
        "updated_at",
    )
    list_filter = ("media_type", "priority", "is_archived", "created_at")
    search_fields = ("title", "reason", "best_mood", "owner__username")
    readonly_fields = ("id", "last_recommended_at", "created_at", "updated_at")


@admin.register(TonightModeSession)
class TonightModeSessionAdmin(admin.ModelAdmin):
    list_display = (
        "owner",
        "available_minutes",
        "energy_level",
        "focus_level",
        "desired_effect",
        "risk_tolerance",
        "created_at",
    )
    list_filter = ("energy_level", "focus_level", "desired_effect", "risk_tolerance", "created_at")
    search_fields = ("owner__username", "owner__email")
    readonly_fields = ("id", "generated_recommendations", "created_at")
