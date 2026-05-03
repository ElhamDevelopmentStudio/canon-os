from __future__ import annotations

from django.contrib import admin

from .models import DetoxDecision, DetoxRule


@admin.register(DetoxRule)
class DetoxRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "media_type", "sample_limit", "is_enabled")
    list_filter = ("media_type", "is_enabled")
    search_fields = ("name", "description", "key")


@admin.register(DetoxDecision)
class DetoxDecisionAdmin(admin.ModelAdmin):
    list_display = ("media_item", "decision", "estimated_time_saved_minutes", "created_at")
    list_filter = ("decision", "created_at")
    search_fields = ("media_item__title", "reason")
