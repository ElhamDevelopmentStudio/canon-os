from __future__ import annotations

from django.contrib import admin

from .models import ExportJob, ImportBatch, ImportItem


class ImportItemInline(admin.TabularInline):
    model = ImportItem
    extra = 0
    readonly_fields = ["id", "row_number", "kind", "status", "title", "action"]
    can_delete = False


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "owner",
        "source_type",
        "status",
        "valid_count",
        "invalid_count",
        "duplicate_count",
        "created_count",
        "created_at",
    ]
    list_filter = ["source_type", "status", "created_at"]
    search_fields = ["owner__email", "original_filename"]
    readonly_fields = ["id", "created_at", "confirmed_at"]
    inlines = [ImportItemInline]


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ["id", "owner", "format", "status", "record_count", "filename", "created_at"]
    list_filter = ["format", "status", "created_at"]
    search_fields = ["owner__email", "filename"]
    readonly_fields = ["id", "created_at"]
