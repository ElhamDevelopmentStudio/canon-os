from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class BackgroundJob(models.Model):
    class JobType(models.TextChoices):
        IMPORT = "import", "Import"
        EXPORT = "export", "Export"
        METADATA_REFRESH = "metadata_refresh", "Metadata refresh"
        GRAPH_REBUILD = "graph_rebuild", "Graph rebuild"
        NARRATIVE_ANALYSIS = "narrative_analysis", "Narrative analysis"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        PROCESSING = "processing", "Processing"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"
        ROLLED_BACK = "rolled_back", "Rolled back"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="background_jobs",
    )
    job_type = models.CharField(max_length=32, choices=JobType.choices)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.QUEUED)
    progress_total = models.PositiveIntegerField(default=0)
    progress_processed = models.PositiveIntegerField(default=0)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    message = models.TextField(blank=True)
    result = models.JSONField(default=dict, blank=True)
    source_id = models.UUIDField(null=True, blank=True)
    source_label = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "-created_at"], name="job_owner_created_idx"),
            models.Index(fields=["owner", "status"], name="job_owner_status_idx"),
            models.Index(fields=["job_type", "source_id"], name="job_type_source_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.job_type} job for {self.owner} ({self.status})"
