from __future__ import annotations

from django.contrib import admin

from .models import BackgroundJob


@admin.register(BackgroundJob)
class BackgroundJobAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "owner",
        "job_type",
        "status",
        "progress_percent",
        "source_label",
        "created_at",
        "completed_at",
    ]
    list_filter = ["job_type", "status", "created_at"]
    search_fields = ["owner__email", "source_label"]
    readonly_fields = ["id", "created_at", "completed_at"]
