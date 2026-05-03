from __future__ import annotations

from django.contrib import admin

from .models import DiscoveryTrail


@admin.register(DiscoveryTrail)
class DiscoveryTrailAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "theme", "source_media_item", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "theme", "description", "owner__username", "owner__email")
    readonly_fields = ("created_at",)
