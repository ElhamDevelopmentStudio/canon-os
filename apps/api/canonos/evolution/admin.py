from __future__ import annotations

from django.contrib import admin

from .models import TasteEvolutionSnapshot


@admin.register(TasteEvolutionSnapshot)
class TasteEvolutionSnapshotAdmin(admin.ModelAdmin):
    list_display = ("owner", "snapshot_period", "snapshot_date", "created_at")
    list_filter = ("snapshot_period", "snapshot_date")
    search_fields = ("owner__email", "owner__username")
    readonly_fields = ("id", "created_at", "updated_at")
