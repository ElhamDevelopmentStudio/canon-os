from __future__ import annotations

import uuid
from dataclasses import asdict
from decimal import Decimal

from django.utils import timezone

from canonos.jobs.models import BackgroundJob
from canonos.jobs.services import upsert_background_job
from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata
from canonos.metadata.providers import ExternalMediaMatch, get_provider, providers_for_media_type


def search_metadata_matches(
    *,
    query: str,
    media_type: str | None = None,
    provider_name: str | None = None,
) -> list[ExternalMediaMatch]:
    clean_query = " ".join(query.split()).strip()
    if not clean_query:
        return []

    providers = (
        [get_provider(provider_name)] if provider_name else providers_for_media_type(media_type)
    )
    matches: list[ExternalMediaMatch] = []
    for provider in providers:
        matches.extend(provider.search(clean_query, media_type))
    return sorted(matches, key=lambda match: match.confidence, reverse=True)


def attach_metadata_to_media(
    *,
    media_item: MediaItem,
    match: ExternalMediaMatch,
) -> ExternalMetadata:
    metadata, _ = ExternalMetadata.objects.update_or_create(
        media_item=media_item,
        provider=match.provider,
        provider_item_id=match.provider_item_id,
        defaults={
            "raw_payload": match.raw_payload,
            "normalized_title": match.title,
            "normalized_description": match.description,
            "image_url": match.image_url,
            "source_url": match.source_url,
            "external_rating": _decimal_or_none(match.external_rating),
            "external_popularity": _decimal_or_none(match.external_popularity),
            "last_refreshed_at": timezone.now(),
        },
    )
    return metadata


def refresh_metadata(metadata: ExternalMetadata) -> ExternalMetadata:
    provider = get_provider(metadata.provider)
    refreshed_match = provider.fetch_details(metadata.provider_item_id)
    metadata.raw_payload = {
        **refreshed_match.raw_payload,
        "refreshed": True,
        "refreshedAt": timezone.now().isoformat(),
    }
    metadata.normalized_title = refreshed_match.title
    metadata.normalized_description = refreshed_match.description
    metadata.image_url = refreshed_match.image_url
    metadata.source_url = refreshed_match.source_url
    metadata.external_rating = _decimal_or_none(refreshed_match.external_rating)
    metadata.external_popularity = _decimal_or_none(refreshed_match.external_popularity)
    metadata.last_refreshed_at = timezone.now()
    metadata.save(
        update_fields=[
            "raw_payload",
            "normalized_title",
            "normalized_description",
            "image_url",
            "source_url",
            "external_rating",
            "external_popularity",
            "last_refreshed_at",
            "updated_at",
        ],
    )
    return metadata


def refresh_job_payload(
    metadata: ExternalMetadata,
    *,
    status: str = "succeeded",
    message: str = "Metadata refreshed.",
    job_id: uuid.UUID | None = None,
    queued_at=None,  # noqa: ANN001
) -> dict[str, object]:
    now = timezone.now()
    return {
        "id": job_id or uuid.uuid4(),
        "status": status,
        "metadata": metadata,
        "queuedAt": queued_at or now,
        "completedAt": now if status in {"succeeded", "failed"} else None,
        "message": message,
    }


def refresh_metadata_with_job(metadata: ExternalMetadata) -> tuple[ExternalMetadata, BackgroundJob]:
    media_item = metadata.media_item
    source_label = f"Metadata refresh: {media_item.title}"
    upsert_background_job(
        owner=media_item.owner,
        job_type=BackgroundJob.JobType.METADATA_REFRESH,
        source_id=metadata.id,
        source_label=source_label,
        status=BackgroundJob.Status.PROCESSING,
        progress_total=1,
        progress_processed=0,
        progress_percent=0,
        message="Refreshing attached external metadata.",
        result={"metadataId": str(metadata.id), "mediaItemId": str(media_item.id)},
    )
    try:
        refreshed = refresh_metadata(metadata)
    except Exception as exc:
        job = upsert_background_job(
            owner=media_item.owner,
            job_type=BackgroundJob.JobType.METADATA_REFRESH,
            source_id=metadata.id,
            source_label=source_label,
            status=BackgroundJob.Status.FAILED,
            progress_total=1,
            progress_processed=0,
            progress_percent=100,
            message=f"Metadata refresh failed: {exc}",
            result={
                "metadataId": str(metadata.id),
                "mediaItemId": str(media_item.id),
                "error": str(exc),
            },
        )
        return metadata, job

    job = upsert_background_job(
        owner=media_item.owner,
        job_type=BackgroundJob.JobType.METADATA_REFRESH,
        source_id=metadata.id,
        source_label=source_label,
        status=BackgroundJob.Status.COMPLETE,
        progress_total=1,
        progress_processed=1,
        progress_percent=100,
        message="Metadata refreshed.",
        result={
            "metadataId": str(refreshed.id),
            "mediaItemId": str(media_item.id),
            "provider": refreshed.provider,
        },
    )
    return refreshed, job


def match_from_dict(data: dict[str, object]) -> ExternalMediaMatch:
    return ExternalMediaMatch(
        provider=str(data["provider"]),
        provider_item_id=str(data["providerItemId"]),
        media_type=str(data["mediaType"]),
        title=str(data["title"]),
        original_title=str(data.get("originalTitle") or ""),
        description=str(data.get("description") or ""),
        release_year=data.get("releaseYear") if isinstance(data.get("releaseYear"), int) else None,
        creator=str(data.get("creator") or ""),
        image_url=str(data.get("imageUrl") or ""),
        external_rating=_float_or_none(data.get("externalRating")),
        external_popularity=_float_or_none(data.get("externalPopularity")),
        confidence=_float_or_none(data.get("confidence")) or 0.7,
        source_url=str(data.get("sourceUrl") or ""),
        raw_payload=data.get("rawPayload") if isinstance(data.get("rawPayload"), dict) else {},
    )


def match_to_dict(match: ExternalMediaMatch) -> dict[str, object]:
    data = asdict(match)
    return {
        "provider": data["provider"],
        "providerItemId": data["provider_item_id"],
        "mediaType": data["media_type"],
        "title": data["title"],
        "originalTitle": data["original_title"],
        "description": data["description"],
        "releaseYear": data["release_year"],
        "creator": data["creator"],
        "imageUrl": data["image_url"],
        "externalRating": data["external_rating"],
        "externalPopularity": data["external_popularity"],
        "confidence": data["confidence"],
        "sourceUrl": data["source_url"],
        "rawPayload": data["raw_payload"],
    }


def _decimal_or_none(value: float | int | str | None) -> Decimal | None:
    if value is None or value == "":
        return None
    return Decimal(str(value))


def _float_or_none(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
