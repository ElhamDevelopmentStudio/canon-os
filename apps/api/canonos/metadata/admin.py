from __future__ import annotations

from django.contrib import admin

from .models import ExternalMetadata


@admin.register(ExternalMetadata)
class ExternalMetadataAdmin(admin.ModelAdmin):
    list_display = (
        "normalized_title",
        "provider",
        "provider_item_id",
        "media_item",
        "last_refreshed_at",
    )
    list_filter = ("provider", "last_refreshed_at")
    search_fields = ("normalized_title", "provider_item_id", "media_item__title")
