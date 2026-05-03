from __future__ import annotations

from django.contrib import admin

from .models import AuditEvent, UserProfile, UserSettings


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name", "timezone", "preferred_language", "updated_at")
    search_fields = ("user__username", "user__email", "display_name")
    list_filter = ("timezone", "preferred_language")


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "default_risk_tolerance",
        "genericness_sensitivity",
        "preferred_scoring_strictness",
        "theme_preference",
        "updated_at",
    )
    search_fields = ("user__username", "user__email")
    list_filter = ("default_risk_tolerance", "theme_preference")


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "actor", "request_id", "created_at")
    search_fields = ("actor__username", "actor__email", "actor_hash", "request_id")
    list_filter = ("event_type",)
    readonly_fields = ("actor_hash", "event_type", "request_id", "metadata", "created_at")
