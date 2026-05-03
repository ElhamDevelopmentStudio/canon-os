from __future__ import annotations

import uuid
from typing import Any

from django.contrib.auth.models import User
from django.utils import timezone

from .models import BackgroundJob


def upsert_background_job(
    *,
    owner: User,
    job_type: str,
    source_id: uuid.UUID,
    source_label: str,
    status: str,
    progress_total: int = 0,
    progress_processed: int = 0,
    progress_percent: int = 0,
    message: str = "",
    result: dict[str, Any] | None = None,
) -> BackgroundJob:
    terminal_statuses = {
        BackgroundJob.Status.COMPLETE,
        BackgroundJob.Status.FAILED,
        BackgroundJob.Status.ROLLED_BACK,
        BackgroundJob.Status.CANCELLED,
    }
    completed_at = timezone.now() if status in terminal_statuses else None
    job, _ = BackgroundJob.objects.update_or_create(
        owner=owner,
        job_type=job_type,
        source_id=source_id,
        defaults={
            "source_label": source_label,
            "status": status,
            "progress_total": progress_total,
            "progress_processed": progress_processed,
            "progress_percent": progress_percent,
            "message": message,
            "result": result or {},
            "completed_at": completed_at,
        },
    )
    return job
