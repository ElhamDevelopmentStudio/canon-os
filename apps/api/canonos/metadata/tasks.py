from __future__ import annotations

from celery import shared_task

from canonos.metadata.models import ExternalMetadata
from canonos.metadata.services import refresh_metadata_with_job


@shared_task(name="canonos.metadata.refresh_external_metadata")
def refresh_external_metadata(metadata_id: str) -> str:
    metadata = ExternalMetadata.objects.select_related("media_item", "media_item__owner").get(
        id=metadata_id
    )
    refreshed, _job = refresh_metadata_with_job(metadata)
    return str(refreshed.id)
