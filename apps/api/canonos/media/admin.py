from __future__ import annotations

from django.contrib import admin

from .models import MediaItem


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "media_type", "status", "personal_rating", "updated_at")
    list_filter = ("media_type", "status")
    search_fields = ("title", "original_title", "creator", "owner__email", "owner__username")
    readonly_fields = ("created_at", "updated_at")
