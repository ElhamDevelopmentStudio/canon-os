from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from canonos.media.models import MediaItem


class ImportBatch(models.Model):
    class SourceType(models.TextChoices):
        CSV = "csv", "CSV"
        JSON = "json", "JSON"

    class Status(models.TextChoices):
        PREVIEWED = "previewed", "Previewed"
        CONFIRMED = "confirmed", "Confirmed"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="import_batches",
    )
    source_type = models.CharField(max_length=16, choices=SourceType.choices)
    original_filename = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PREVIEWED,
    )
    valid_count = models.PositiveIntegerField(default=0)
    invalid_count = models.PositiveIntegerField(default=0)
    duplicate_count = models.PositiveIntegerField(default=0)
    warnings_count = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    raw_preview = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="import_owner_created_idx"),
            models.Index(fields=["owner", "status"], name="import_owner_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.source_type} import for {self.owner} ({self.status})"


class ImportItem(models.Model):
    class ItemStatus(models.TextChoices):
        VALID = "valid", "Valid"
        INVALID = "invalid", "Invalid"
        DUPLICATE = "duplicate", "Duplicate"
        IMPORTED = "imported", "Imported"
        SKIPPED = "skipped", "Skipped"

    class ItemKind(models.TextChoices):
        MEDIA = "media", "Media"
        CANDIDATE = "candidate", "Candidate"
        QUEUE = "queue", "Queue"
        AFTERTASTE = "aftertaste", "Aftertaste"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch = models.ForeignKey(ImportBatch, on_delete=models.CASCADE, related_name="items")
    row_number = models.PositiveIntegerField()
    kind = models.CharField(max_length=24, choices=ItemKind.choices, default=ItemKind.MEDIA)
    status = models.CharField(max_length=16, choices=ItemStatus.choices)
    action = models.CharField(max_length=32, default="create")
    title = models.CharField(max_length=255, blank=True)
    payload = models.JSONField(default=dict, blank=True)
    errors = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    created_media_item = models.ForeignKey(
        MediaItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["row_number", "created_at"]
        indexes = [
            models.Index(fields=["batch", "status"], name="import_item_batch_status_idx"),
            models.Index(fields=["kind"], name="import_item_kind_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.batch_id} row {self.row_number}: {self.status}"


class ExportJob(models.Model):
    class Format(models.TextChoices):
        JSON = "json", "JSON"
        CSV = "csv", "CSV"

    class Status(models.TextChoices):
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="export_jobs",
    )
    format = models.CharField(max_length=16, choices=Format.choices)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.COMPLETE)
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=120)
    payload_text = models.TextField()
    record_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="export_owner_created_idx"),
            models.Index(fields=["owner", "format"], name="export_owner_format_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.format} export for {self.owner} ({self.status})"
