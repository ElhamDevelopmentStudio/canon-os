from __future__ import annotations

from django.contrib import admin

from .models import MediaScore, TasteDimension


@admin.register(TasteDimension)
class TasteDimensionAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "slug", "direction", "is_default", "updated_at")
    list_filter = ("direction", "is_default")
    search_fields = ("name", "slug", "description", "owner__email", "owner__username")
    readonly_fields = ("created_at", "updated_at")


@admin.register(MediaScore)
class MediaScoreAdmin(admin.ModelAdmin):
    list_display = ("media_item", "taste_dimension", "score", "updated_at")
    list_filter = ("taste_dimension__direction",)
    search_fields = ("media_item__title", "taste_dimension__name", "note")
    readonly_fields = ("created_at", "updated_at")
