from __future__ import annotations

from celery import shared_task

from canonos.metadata.models import ExternalMetadata
from canonos.metadata.services import refresh_metadata


@shared_task(name="canonos.metadata.refresh_external_metadata")
def refresh_external_metadata(metadata_id: str) -> str:
    metadata = ExternalMetadata.objects.get(id=metadata_id)
    refresh_metadata(metadata)
    return str(metadata.id)
