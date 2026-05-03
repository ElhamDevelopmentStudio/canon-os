from __future__ import annotations

from django.contrib import admin

from .models import NarrativeAnalysis


@admin.register(NarrativeAnalysis)
class NarrativeAnalysisAdmin(admin.ModelAdmin):
    list_display = ("media_item", "owner", "status", "confidence_score", "updated_at")
    list_filter = ("status", "source_basis", "provider")
    search_fields = ("media_item__title", "owner__username", "owner__email", "analysis_summary")
    readonly_fields = ("created_at", "updated_at", "completed_at")
