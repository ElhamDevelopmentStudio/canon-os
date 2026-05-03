from __future__ import annotations

from django.contrib import admin

from .models import CanonSeason, CanonSeasonItem


class CanonSeasonItemInline(admin.TabularInline):
    model = CanonSeasonItem
    extra = 0
    fields = (
        "title_snapshot",
        "media_type",
        "order",
        "completion_status",
        "canon_status",
        "media_item",
        "candidate",
    )


@admin.register(CanonSeason)
class CanonSeasonAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "theme", "status", "updated_at")
    list_filter = ("theme", "status", "created_at")
    search_fields = ("title", "description", "owner__username", "owner__email")
    inlines = [CanonSeasonItemInline]


@admin.register(CanonSeasonItem)
class CanonSeasonItemAdmin(admin.ModelAdmin):
    list_display = (
        "title_snapshot",
        "season",
        "media_type",
        "order",
        "completion_status",
        "canon_status",
    )
    list_filter = ("media_type", "completion_status", "canon_status", "created_at")
    search_fields = ("title_snapshot", "reason_included", "what_to_pay_attention_to")
