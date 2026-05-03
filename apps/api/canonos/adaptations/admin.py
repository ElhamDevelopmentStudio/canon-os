from __future__ import annotations

from django.contrib import admin

from .models import AdaptationRelation


@admin.register(AdaptationRelation)
class AdaptationRelationAdmin(admin.ModelAdmin):
    list_display = (
        "source_media_item",
        "adaptation_media_item",
        "relation_type",
        "completeness",
        "recommended_experience_order",
        "owner",
    )
    list_filter = ("relation_type", "completeness", "recommended_experience_order")
    search_fields = ("source_media_item__title", "adaptation_media_item__title", "notes")
