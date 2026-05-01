from __future__ import annotations

from django.contrib import admin

from .models import AftertasteEntry


@admin.register(AftertasteEntry)
class AftertasteEntryAdmin(admin.ModelAdmin):
    list_display = (
        "media_item",
        "owner",
        "worth_time",
        "stayed_with_me_score",
        "felt_generic",
        "appetite_effect",
        "created_at",
    )
    list_filter = ("worth_time", "felt_alive", "felt_generic", "appetite_effect", "created_at")
    search_fields = (
        "media_item__title",
        "owner__username",
        "owner__email",
        "completion_reason",
        "final_thoughts",
    )
    readonly_fields = ("id", "created_at", "updated_at")
