from __future__ import annotations

from celery import shared_task
from django.contrib.auth import get_user_model

from .models import ImportBatch
from .services import confirm_import_batch, create_export_job


@shared_task(name="canonos.imports.process_import_batch")
def process_import_batch(batch_id: str) -> dict[str, object]:
    batch = ImportBatch.objects.select_related("owner").prefetch_related("items").get(id=batch_id)
    confirmed = confirm_import_batch(user=batch.owner, batch=batch)
    return {
        "id": str(confirmed.id),
        "status": confirmed.status,
        "createdCount": confirmed.created_count,
        "progressPercent": confirmed.progress_percent,
    }


@shared_task(name="canonos.imports.create_export")
def create_export(owner_id: int, export_format: str) -> dict[str, object]:
    user = get_user_model().objects.get(id=owner_id)
    job = create_export_job(user=user, export_format=export_format)
    return {
        "id": str(job.id),
        "status": job.status,
        "recordCount": job.record_count,
        "progressPercent": job.progress_percent,
    }
