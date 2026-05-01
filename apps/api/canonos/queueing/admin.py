from __future__ import annotations

from django.contrib import admin

from .models import QueueItem


@admin.register(QueueItem)
class QueueItemAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "media_type",
        "priority",
        "queue_position",
        "updated_at",
    )
    list_filter = ("media_type", "priority", "created_at")
    search_fields = ("title", "reason", "best_mood", "owner__username")
    readonly_fields = ("id", "created_at", "updated_at")
