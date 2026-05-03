from __future__ import annotations

from django.contrib import admin

from .models import ExportJob, ImportBatch, ImportItem


class ImportItemInline(admin.TabularInline):
    model = ImportItem
    extra = 0
    readonly_fields = [
        "id",
        "row_number",
        "kind",
        "status",
        "title",
        "action",
        "created_media_item",
        "duplicate_of_media_item",
        "created_object_id",
    ]
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
        "progress_percent",
        "rollback_item_count",
        "created_at",
    ]
    list_filter = ["source_type", "status", "created_at"]
    search_fields = ["owner__email", "original_filename", "uploaded_file_reference"]
    readonly_fields = [
        "id",
        "created_at",
        "confirmed_at",
        "processed_at",
        "rolled_back_at",
    ]
    inlines = [ImportItemInline]


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "owner",
        "format",
        "status",
        "record_count",
        "progress_percent",
        "file_size_bytes",
        "filename",
        "retention_expires_at",
        "created_at",
    ]
    list_filter = ["format", "status", "created_at"]
    search_fields = ["owner__email", "filename"]
    readonly_fields = ["id", "created_at", "processed_at", "retention_expires_at"]
