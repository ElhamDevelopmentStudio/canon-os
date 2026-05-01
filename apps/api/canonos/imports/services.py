from __future__ import annotations

import csv
import io
import json
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime
from datetime import timezone as datetime_timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Protocol

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from canonos.accounts.models import UserProfile, UserSettings
from canonos.aftertaste.models import AftertasteEntry
from canonos.candidates.models import Candidate, CandidateEvaluation
from canonos.media.models import MediaItem
from canonos.queueing.models import QueueItem, TonightModeSession
from canonos.taste.models import MediaScore, TasteDimension
from canonos.taste.services import seed_default_taste_dimensions

from .models import ExportJob, ImportBatch, ImportItem


class UploadedImportFile(Protocol):
    name: str

    def read(self) -> bytes | str: ...


CANONOS_EXPORT_VERSION = "canonos.export.v1"
SUPPORTED_CSV_COLUMNS = [
    "title",
    "media_type",
    "mediaType",
    "status",
    "personal_rating",
    "personalRating",
    "release_year",
    "releaseYear",
    "creator",
    "notes",
    "original_title",
    "originalTitle",
    "country_language",
    "countryLanguage",
    "runtime_minutes",
    "runtimeMinutes",
    "episode_count",
    "episodeCount",
    "page_count",
    "pageCount",
    "audiobook_length_minutes",
    "audiobookLengthMinutes",
    "started_date",
    "startedDate",
    "completed_date",
    "completedDate",
    "score_<taste_dimension_slug>",
    "score_note_<taste_dimension_slug>",
]

MEDIA_TYPE_ALIASES = {
    "movie": MediaItem.MediaType.MOVIE,
    "film": MediaItem.MediaType.MOVIE,
    "tv": MediaItem.MediaType.TV_SHOW,
    "tv show": MediaItem.MediaType.TV_SHOW,
    "tv_show": MediaItem.MediaType.TV_SHOW,
    "series": MediaItem.MediaType.TV_SHOW,
    "anime": MediaItem.MediaType.ANIME,
    "novel": MediaItem.MediaType.NOVEL,
    "book": MediaItem.MediaType.NOVEL,
    "audiobook": MediaItem.MediaType.AUDIOBOOK,
    "audio book": MediaItem.MediaType.AUDIOBOOK,
}

STATUS_ALIASES = {
    "planned": MediaItem.ConsumptionStatus.PLANNED,
    "plan": MediaItem.ConsumptionStatus.PLANNED,
    "watchlist": MediaItem.ConsumptionStatus.PLANNED,
    "to watch": MediaItem.ConsumptionStatus.PLANNED,
    "consuming": MediaItem.ConsumptionStatus.CONSUMING,
    "watching": MediaItem.ConsumptionStatus.CONSUMING,
    "reading": MediaItem.ConsumptionStatus.CONSUMING,
    "completed": MediaItem.ConsumptionStatus.COMPLETED,
    "complete": MediaItem.ConsumptionStatus.COMPLETED,
    "finished": MediaItem.ConsumptionStatus.COMPLETED,
    "paused": MediaItem.ConsumptionStatus.PAUSED,
    "on hold": MediaItem.ConsumptionStatus.PAUSED,
    "dropped": MediaItem.ConsumptionStatus.DROPPED,
}

MEDIA_FIELD_ALIASES = {
    "title": "title",
    "original_title": "original_title",
    "originalTitle": "original_title",
    "release_year": "release_year",
    "releaseYear": "release_year",
    "country_language": "country_language",
    "countryLanguage": "country_language",
    "creator": "creator",
    "status": "status",
    "personal_rating": "personal_rating",
    "personalRating": "personal_rating",
    "started_date": "started_date",
    "startedDate": "started_date",
    "completed_date": "completed_date",
    "completedDate": "completed_date",
    "runtime_minutes": "runtime_minutes",
    "runtimeMinutes": "runtime_minutes",
    "episode_count": "episode_count",
    "episodeCount": "episode_count",
    "page_count": "page_count",
    "pageCount": "page_count",
    "audiobook_length_minutes": "audiobook_length_minutes",
    "audiobookLengthMinutes": "audiobook_length_minutes",
    "notes": "notes",
}

INTEGER_FIELDS = {
    "release_year",
    "runtime_minutes",
    "episode_count",
    "page_count",
    "audiobook_length_minutes",
}
DATE_FIELDS = {"started_date", "completed_date"}


@dataclass(slots=True)
class ParsedItem:
    row_number: int
    kind: str
    title: str
    payload: dict[str, Any]
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    action: str = "create"

    @property
    def status(self) -> str:
        if self.errors:
            return ImportItem.ItemStatus.INVALID
        if self.action == "skip_duplicate":
            return ImportItem.ItemStatus.DUPLICATE
        return ImportItem.ItemStatus.VALID


def _read_text(uploaded_file: UploadedImportFile | None = None, content: str | None = None) -> str:
    if content is not None:
        return content
    if uploaded_file is None:
        raise ValueError("Upload a file or provide content.")
    raw = uploaded_file.read()
    return raw.decode("utf-8-sig") if isinstance(raw, bytes) else str(raw)


def _clean(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _first(row: dict[str, Any], *names: str) -> str:
    for name in names:
        value = _clean(row.get(name))
        if value:
            return value
    return ""


def _normalize_media_type(value: str) -> str | None:
    normalized = value.strip().lower().replace("-", "_")
    return MEDIA_TYPE_ALIASES.get(normalized) or MEDIA_TYPE_ALIASES.get(
        normalized.replace("_", " ")
    )


def _normalize_status(value: str) -> str | None:
    if not value:
        return MediaItem.ConsumptionStatus.PLANNED
    normalized = value.strip().lower().replace("-", "_")
    return STATUS_ALIASES.get(normalized) or STATUS_ALIASES.get(normalized.replace("_", " "))


def _decimal(value: str, *, errors: list[str], field_name: str) -> str | None:
    if not value:
        return None
    try:
        parsed = Decimal(value)
    except InvalidOperation:
        errors.append(f"{field_name} must be a number.")
        return None
    if parsed < 0 or parsed > 10:
        errors.append(f"{field_name} must be between 0 and 10.")
        return None
    return str(parsed.quantize(Decimal("0.1")))


def _integer(value: str, *, errors: list[str], field_name: str) -> int | None:
    if not value:
        return None
    try:
        parsed = int(value)
    except ValueError:
        errors.append(f"{field_name} must be a whole number.")
        return None
    if parsed < 0:
        errors.append(f"{field_name} must be 0 or greater.")
        return None
    return parsed


def _available_dimensions(user: User) -> dict[str, TasteDimension]:
    seed_default_taste_dimensions(user)
    return {dimension.slug: dimension for dimension in TasteDimension.objects.filter(owner=user)}


def _build_media_payload(row: dict[str, Any], user: User, row_number: int) -> ParsedItem:
    errors: list[str] = []
    warnings: list[str] = []
    title = _first(row, "title", "Title")
    if not title:
        errors.append("title is required.")

    media_type_raw = _first(row, "media_type", "mediaType", "type", "medium")
    media_type = _normalize_media_type(media_type_raw) if media_type_raw else None
    if media_type is None:
        errors.append("media_type must be one of movie, tv_show, anime, novel, or audiobook.")

    status_raw = _first(row, "status")
    status = _normalize_status(status_raw)
    if status is None:
        errors.append("status must be planned, consuming, completed, paused, or dropped.")

    payload: dict[str, Any] = {
        "title": title,
        "media_type": media_type or MediaItem.MediaType.MOVIE,
        "status": status or MediaItem.ConsumptionStatus.PLANNED,
        "scores": [],
    }

    for external, internal in MEDIA_FIELD_ALIASES.items():
        value = _clean(row.get(external))
        if not value or internal in {"title", "status"}:
            continue
        if internal == "personal_rating":
            payload[internal] = _decimal(value, errors=errors, field_name=external)
        elif internal in INTEGER_FIELDS:
            payload[internal] = _integer(value, errors=errors, field_name=external)
        elif internal in DATE_FIELDS:
            payload[internal] = value
        else:
            payload[internal] = value

    dimensions = _available_dimensions(user)
    for column, value in row.items():
        cleaned_value = _clean(value)
        if not cleaned_value or not column.startswith("score_") or column.startswith("score_note_"):
            continue
        slug = column.removeprefix("score_")
        dimension = dimensions.get(slug)
        if dimension is None:
            warnings.append(f"Unknown score dimension '{slug}' was ignored.")
            continue
        score = _decimal(cleaned_value, errors=errors, field_name=column)
        if score is not None:
            payload["scores"].append(
                {
                    "dimension_slug": slug,
                    "score": score,
                    "note": _clean(row.get(f"score_note_{slug}")),
                }
            )

    action = "create"
    if (
        title
        and media_type
        and MediaItem.objects.filter(
            owner=user, title__iexact=title, media_type=media_type
        ).exists()
    ):
        action = "skip_duplicate"
        warnings.append("Duplicate library item already exists; confirm will skip this row.")

    return ParsedItem(
        row_number=row_number,
        kind=ImportItem.ItemKind.MEDIA,
        title=title,
        payload=payload,
        errors=errors,
        warnings=warnings,
        action=action,
    )


def parse_csv_import(text: str, user: User) -> list[ParsedItem]:
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return [
            ParsedItem(
                row_number=1,
                kind=ImportItem.ItemKind.MEDIA,
                title="",
                payload={},
                errors=["CSV file must include a header row."],
            )
        ]
    return [_build_media_payload(row, user, index) for index, row in enumerate(reader, start=2)]


def _media_export_to_payload(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": item.get("title", ""),
        "original_title": item.get("originalTitle", item.get("original_title", "")),
        "media_type": item.get("mediaType", item.get("media_type", "movie")),
        "release_year": item.get("releaseYear", item.get("release_year")),
        "country_language": item.get("countryLanguage", item.get("country_language", "")),
        "creator": item.get("creator", ""),
        "status": item.get("status", MediaItem.ConsumptionStatus.PLANNED),
        "personal_rating": item.get("personalRating", item.get("personal_rating")),
        "started_date": item.get("startedDate", item.get("started_date")),
        "completed_date": item.get("completedDate", item.get("completed_date")),
        "runtime_minutes": item.get("runtimeMinutes", item.get("runtime_minutes")),
        "episode_count": item.get("episodeCount", item.get("episode_count")),
        "page_count": item.get("pageCount", item.get("page_count")),
        "audiobook_length_minutes": item.get(
            "audiobookLengthMinutes", item.get("audiobook_length_minutes")
        ),
        "notes": item.get("notes", ""),
        "scores": item.get("scores", []),
        "aftertaste_entries": item.get("aftertasteEntries", item.get("aftertaste_entries", [])),
    }


def _candidate_export_to_payload(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": item.get("title", ""),
        "media_type": item.get("mediaType", item.get("media_type", "movie")),
        "release_year": item.get("releaseYear", item.get("release_year")),
        "known_creator": item.get("knownCreator", item.get("known_creator", "")),
        "premise": item.get("premise", ""),
        "source_of_interest": item.get("sourceOfInterest", item.get("source_of_interest", "")),
        "hype_level": item.get("hypeLevel", item.get("hype_level")),
        "expected_genericness": item.get("expectedGenericness", item.get("expected_genericness")),
        "expected_time_cost_minutes": item.get(
            "expectedTimeCostMinutes", item.get("expected_time_cost_minutes")
        ),
        "status": item.get("status", Candidate.Status.UNEVALUATED),
        "evaluations": item.get("evaluations", []),
    }


def _queue_export_to_payload(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": item.get("title", ""),
        "media_type": item.get("mediaType", item.get("media_type", "movie")),
        "priority": item.get("priority", QueueItem.Priority.START_SOON),
        "reason": item.get("reason", ""),
        "estimated_time_minutes": item.get(
            "estimatedTimeMinutes", item.get("estimated_time_minutes")
        ),
        "best_mood": item.get("bestMood", item.get("best_mood", "")),
        "queue_position": item.get("queuePosition", item.get("queue_position", 0)),
    }


def _validate_json_media(item: dict[str, Any], user: User, row_number: int) -> ParsedItem:
    raw_payload = _media_export_to_payload(item)
    errors: list[str] = []
    warnings: list[str] = []
    title = _clean(raw_payload.get("title"))
    if not title:
        errors.append("title is required.")

    media_type = _normalize_media_type(_clean(raw_payload.get("media_type")))
    if media_type is None:
        errors.append("media_type must be one of movie, tv_show, anime, novel, or audiobook.")

    status = _normalize_status(_clean(raw_payload.get("status")))
    if status is None:
        errors.append("status must be planned, consuming, completed, paused, or dropped.")

    payload: dict[str, Any] = {
        "title": title,
        "original_title": _clean(raw_payload.get("original_title")),
        "media_type": media_type or MediaItem.MediaType.MOVIE,
        "country_language": _clean(raw_payload.get("country_language")),
        "creator": _clean(raw_payload.get("creator")),
        "status": status or MediaItem.ConsumptionStatus.PLANNED,
        "notes": _clean(raw_payload.get("notes")),
        "scores": [],
        "aftertaste_entries": raw_payload.get("aftertaste_entries", []),
    }
    for field_name in INTEGER_FIELDS:
        payload[field_name] = _integer(
            _clean(raw_payload.get(field_name)), errors=errors, field_name=field_name
        )
    for field_name in DATE_FIELDS:
        payload[field_name] = _clean(raw_payload.get(field_name)) or None
    payload["personal_rating"] = _decimal(
        _clean(raw_payload.get("personal_rating")), errors=errors, field_name="personal_rating"
    )

    dimensions = _available_dimensions(user)
    for score_payload in raw_payload.get("scores", []):
        slug = score_payload.get("dimensionSlug") or score_payload.get("dimension_slug")
        dimension = dimensions.get(slug)
        if dimension is None:
            warnings.append(f"Unknown score dimension '{slug}' was ignored.")
            continue
        score = _decimal(
            _clean(score_payload.get("score")), errors=errors, field_name=f"score_{slug}"
        )
        if score is not None:
            payload["scores"].append(
                {
                    "dimension_slug": slug,
                    "score": score,
                    "note": _clean(score_payload.get("note")),
                }
            )

    action = "create"
    if (
        title
        and media_type
        and MediaItem.objects.filter(
            owner=user, title__iexact=title, media_type=media_type
        ).exists()
    ):
        action = "skip_duplicate"
        warnings.append("Duplicate library item already exists; confirm will skip this row.")

    return ParsedItem(
        row_number=row_number,
        kind=ImportItem.ItemKind.MEDIA,
        title=title,
        payload=payload,
        errors=errors,
        warnings=warnings,
        action=action,
    )


def _validate_simple_item(
    item: dict[str, Any],
    row_number: int,
    kind: str,
    payload: dict[str, Any],
) -> ParsedItem:
    errors: list[str] = []
    title = _clean(payload.get("title"))
    if not title:
        errors.append("title is required.")
    if _normalize_media_type(_clean(payload.get("media_type"))) is None:
        errors.append("media_type must be one of movie, tv_show, anime, novel, or audiobook.")
    return ParsedItem(row_number=row_number, kind=kind, title=title, payload=payload, errors=errors)


def parse_json_import(text: str, user: User) -> tuple[list[ParsedItem], dict[str, Any]]:
    try:
        document = json.loads(text)
    except json.JSONDecodeError as exc:
        return (
            [
                ParsedItem(
                    row_number=1,
                    kind=ImportItem.ItemKind.MEDIA,
                    title="",
                    payload={},
                    errors=[f"JSON is not valid: {exc.msg}."],
                )
            ],
            {},
        )

    data = document.get("data", document) if isinstance(document, dict) else {}
    if not isinstance(data, dict):
        return (
            [
                ParsedItem(
                    row_number=1,
                    kind=ImportItem.ItemKind.MEDIA,
                    title="",
                    payload={},
                    errors=["JSON import must be an object with a data section."],
                )
            ],
            {},
        )

    parsed: list[ParsedItem] = []
    row_number = 1
    for media_item in data.get("mediaItems", data.get("media_items", [])):
        row_number += 1
        parsed.append(_validate_json_media(media_item, user, row_number))
    for candidate in data.get("candidates", []):
        row_number += 1
        payload = _candidate_export_to_payload(candidate)
        parsed.append(
            _validate_simple_item(candidate, row_number, ImportItem.ItemKind.CANDIDATE, payload)
        )
    for queue_item in data.get("queueItems", data.get("queue_items", [])):
        row_number += 1
        payload = _queue_export_to_payload(queue_item)
        parsed.append(
            _validate_simple_item(queue_item, row_number, ImportItem.ItemKind.QUEUE, payload)
        )

    if not parsed:
        parsed.append(
            ParsedItem(
                row_number=1,
                kind=ImportItem.ItemKind.MEDIA,
                title="",
                payload={},
                errors=["JSON import did not contain mediaItems, candidates, or queueItems."],
            )
        )
    return parsed, document if isinstance(document, dict) else {}


def create_import_preview(
    *,
    user: User,
    source_type: str,
    uploaded_file: UploadedImportFile | None = None,
    content: str | None = None,
    original_filename: str = "",
) -> ImportBatch:
    source_type = source_type.lower()
    text = _read_text(uploaded_file, content)
    if uploaded_file is not None and not original_filename:
        original_filename = getattr(uploaded_file, "name", "")

    if source_type == ImportBatch.SourceType.CSV:
        parsed_items = parse_csv_import(text, user)
        raw_preview: dict[str, Any] = {"supportedColumns": SUPPORTED_CSV_COLUMNS}
    elif source_type == ImportBatch.SourceType.JSON:
        parsed_items, document = parse_json_import(text, user)
        data = document.get("data", {}) if isinstance(document, dict) else {}
        raw_preview = {
            "version": document.get("version") if isinstance(document, dict) else None,
            "profile": data.get("profile", {}) if isinstance(data, dict) else {},
            "settings": data.get("settings", {}) if isinstance(data, dict) else {},
        }
    else:
        raise ValueError("sourceType must be csv or json.")

    valid_count = sum(1 for item in parsed_items if item.status == ImportItem.ItemStatus.VALID)
    invalid_count = sum(1 for item in parsed_items if item.status == ImportItem.ItemStatus.INVALID)
    duplicate_count = sum(
        1 for item in parsed_items if item.status == ImportItem.ItemStatus.DUPLICATE
    )
    warnings_count = sum(len(item.warnings) for item in parsed_items)

    batch = ImportBatch.objects.create(
        owner=user,
        source_type=source_type,
        original_filename=original_filename,
        valid_count=valid_count,
        invalid_count=invalid_count,
        duplicate_count=duplicate_count,
        warnings_count=warnings_count,
        raw_preview=raw_preview,
    )
    ImportItem.objects.bulk_create(
        [
            ImportItem(
                batch=batch,
                row_number=item.row_number,
                kind=item.kind,
                status=item.status,
                action=item.action,
                title=item.title,
                payload=item.payload,
                errors=item.errors,
                warnings=item.warnings,
            )
            for item in parsed_items
        ]
    )
    return batch


def _create_media_from_payload(user: User, payload: dict[str, Any]) -> MediaItem:
    media_item = MediaItem.objects.create(
        owner=user,
        title=payload["title"],
        original_title=payload.get("original_title", "") or "",
        media_type=payload.get("media_type") or MediaItem.MediaType.MOVIE,
        release_year=payload.get("release_year"),
        country_language=payload.get("country_language", "") or "",
        creator=payload.get("creator", "") or "",
        status=payload.get("status") or MediaItem.ConsumptionStatus.PLANNED,
        personal_rating=payload.get("personal_rating"),
        started_date=payload.get("started_date"),
        completed_date=payload.get("completed_date"),
        runtime_minutes=payload.get("runtime_minutes"),
        episode_count=payload.get("episode_count"),
        page_count=payload.get("page_count"),
        audiobook_length_minutes=payload.get("audiobook_length_minutes"),
        notes=payload.get("notes", "") or "",
    )
    dimensions = _available_dimensions(user)
    for score_payload in payload.get("scores", []):
        slug = score_payload.get("dimension_slug") or score_payload.get("dimensionSlug")
        dimension = dimensions.get(slug)
        if dimension is None:
            continue
        score = score_payload.get("score")
        if score in {None, ""}:
            continue
        MediaScore.objects.create(
            media_item=media_item,
            taste_dimension=dimension,
            score=score,
            note=score_payload.get("note", "") or "",
        )
    for entry in payload.get("aftertaste_entries", []):
        AftertasteEntry.objects.create(
            owner=user,
            media_item=media_item,
            worth_time=bool(entry.get("worthTime", entry.get("worth_time", True))),
            stayed_with_me_score=int(
                entry.get("stayedWithMeScore", entry.get("stayed_with_me_score", 0))
            ),
            felt_alive=bool(entry.get("feltAlive", entry.get("felt_alive", False))),
            felt_generic=bool(entry.get("feltGeneric", entry.get("felt_generic", False))),
            completion_reason=entry.get("completionReason", entry.get("completion_reason", ""))
            or "",
            what_worked=entry.get("whatWorked", entry.get("what_worked", "")) or "",
            what_failed=entry.get("whatFailed", entry.get("what_failed", "")) or "",
            final_thoughts=entry.get("finalThoughts", entry.get("final_thoughts", "")) or "",
            appetite_effect=entry.get(
                "appetiteEffect",
                entry.get("appetite_effect", AftertasteEntry.AppetiteEffect.NO_CHANGE),
            ),
        )
    return media_item


def _create_candidate_from_payload(user: User, payload: dict[str, Any]) -> Candidate:
    candidate = Candidate.objects.create(
        owner=user,
        title=payload["title"],
        media_type=payload.get("media_type") or MediaItem.MediaType.MOVIE,
        release_year=payload.get("release_year"),
        known_creator=payload.get("known_creator", "") or "",
        premise=payload.get("premise", "") or "",
        source_of_interest=payload.get("source_of_interest", "") or "",
        hype_level=payload.get("hype_level"),
        expected_genericness=payload.get("expected_genericness"),
        expected_time_cost_minutes=payload.get("expected_time_cost_minutes"),
        status=payload.get("status") or Candidate.Status.UNEVALUATED,
    )
    for evaluation in payload.get("evaluations", []):
        CandidateEvaluation.objects.create(
            candidate=candidate,
            decision=evaluation.get("decision", CandidateEvaluation.Decision.SAMPLE),
            confidence_score=evaluation.get(
                "confidenceScore", evaluation.get("confidence_score", 50)
            ),
            likely_fit_score=evaluation.get(
                "likelyFitScore", evaluation.get("likely_fit_score", 50)
            ),
            risk_score=evaluation.get("riskScore", evaluation.get("risk_score", 50)),
            reasons_for=evaluation.get("reasonsFor", evaluation.get("reasons_for", [])),
            reasons_against=evaluation.get("reasonsAgainst", evaluation.get("reasons_against", [])),
            best_mood=evaluation.get("bestMood", evaluation.get("best_mood", "")) or "",
            recommended_action=evaluation.get(
                "recommendedAction", evaluation.get("recommended_action", "")
            )
            or "",
        )
    return candidate


def _create_queue_item_from_payload(user: User, payload: dict[str, Any]) -> QueueItem:
    return QueueItem.objects.create(
        owner=user,
        title=payload["title"],
        media_type=payload.get("media_type") or MediaItem.MediaType.MOVIE,
        priority=payload.get("priority") or QueueItem.Priority.START_SOON,
        reason=payload.get("reason", "") or "",
        estimated_time_minutes=payload.get("estimated_time_minutes"),
        best_mood=payload.get("best_mood", "") or "",
        queue_position=payload.get("queue_position") or 0,
    )


@transaction.atomic
def confirm_import_batch(*, user: User, batch: ImportBatch) -> ImportBatch:
    if batch.owner_id != user.id:
        raise ValueError("Import batch not found.")
    if batch.status == ImportBatch.Status.CONFIRMED:
        return batch
    if batch.invalid_count:
        raise ValueError("Fix invalid rows before confirming this import.")

    if batch.source_type == ImportBatch.SourceType.JSON:
        apply_profile_and_settings_from_export(user, {"data": batch.raw_preview})

    created_count = 0
    for item in batch.items.select_for_update().order_by("row_number"):
        if item.status == ImportItem.ItemStatus.DUPLICATE:
            item.status = ImportItem.ItemStatus.SKIPPED
            item.save(update_fields=["status"])
            continue
        if item.status != ImportItem.ItemStatus.VALID:
            continue
        if item.kind == ImportItem.ItemKind.MEDIA:
            created = _create_media_from_payload(user, item.payload)
            item.created_media_item = created
        elif item.kind == ImportItem.ItemKind.CANDIDATE:
            _create_candidate_from_payload(user, item.payload)
        elif item.kind == ImportItem.ItemKind.QUEUE:
            _create_queue_item_from_payload(user, item.payload)
        item.status = ImportItem.ItemStatus.IMPORTED
        item.save(update_fields=["status", "created_media_item"])
        created_count += 1

    batch.status = ImportBatch.Status.CONFIRMED
    batch.created_count = created_count
    batch.confirmed_at = timezone.now()
    batch.save(update_fields=["status", "created_count", "confirmed_at"])
    return batch


def _serialize_score(score: MediaScore) -> dict[str, Any]:
    return {
        "dimensionSlug": score.taste_dimension.slug,
        "dimensionName": score.taste_dimension.name,
        "score": float(score.score),
        "note": score.note,
    }


def _serialize_aftertaste(entry: AftertasteEntry) -> dict[str, Any]:
    return {
        "worthTime": entry.worth_time,
        "stayedWithMeScore": entry.stayed_with_me_score,
        "feltAlive": entry.felt_alive,
        "feltGeneric": entry.felt_generic,
        "completionReason": entry.completion_reason,
        "whatWorked": entry.what_worked,
        "whatFailed": entry.what_failed,
        "finalThoughts": entry.final_thoughts,
        "appetiteEffect": entry.appetite_effect,
    }


def _serialize_media_item(media_item: MediaItem) -> dict[str, Any]:
    return {
        "id": str(media_item.id),
        "title": media_item.title,
        "originalTitle": media_item.original_title,
        "mediaType": media_item.media_type,
        "releaseYear": media_item.release_year,
        "countryLanguage": media_item.country_language,
        "creator": media_item.creator,
        "status": media_item.status,
        "personalRating": float(media_item.personal_rating)
        if media_item.personal_rating is not None
        else None,
        "startedDate": media_item.started_date.isoformat() if media_item.started_date else None,
        "completedDate": media_item.completed_date.isoformat()
        if media_item.completed_date
        else None,
        "runtimeMinutes": media_item.runtime_minutes,
        "episodeCount": media_item.episode_count,
        "pageCount": media_item.page_count,
        "audiobookLengthMinutes": media_item.audiobook_length_minutes,
        "notes": media_item.notes,
        "scores": [
            _serialize_score(score) for score in media_item.scores.select_related("taste_dimension")
        ],
        "aftertasteEntries": [
            _serialize_aftertaste(entry) for entry in media_item.aftertaste_entries.all()
        ],
    }


def _serialize_candidate(candidate: Candidate) -> dict[str, Any]:
    return {
        "id": str(candidate.id),
        "title": candidate.title,
        "mediaType": candidate.media_type,
        "releaseYear": candidate.release_year,
        "knownCreator": candidate.known_creator,
        "premise": candidate.premise,
        "sourceOfInterest": candidate.source_of_interest,
        "hypeLevel": candidate.hype_level,
        "expectedGenericness": candidate.expected_genericness,
        "expectedTimeCostMinutes": candidate.expected_time_cost_minutes,
        "status": candidate.status,
        "evaluations": [
            {
                "decision": evaluation.decision,
                "confidenceScore": evaluation.confidence_score,
                "likelyFitScore": evaluation.likely_fit_score,
                "riskScore": evaluation.risk_score,
                "reasonsFor": evaluation.reasons_for,
                "reasonsAgainst": evaluation.reasons_against,
                "bestMood": evaluation.best_mood,
                "recommendedAction": evaluation.recommended_action,
            }
            for evaluation in candidate.evaluations.all()
        ],
    }


def _serialize_queue_item(item: QueueItem) -> dict[str, Any]:
    return {
        "id": str(item.id),
        "title": item.title,
        "mediaType": item.media_type,
        "priority": item.priority,
        "reason": item.reason,
        "estimatedTimeMinutes": item.estimated_time_minutes,
        "bestMood": item.best_mood,
        "queuePosition": item.queue_position,
    }


def _serialize_tonight_session(session: TonightModeSession) -> dict[str, Any]:
    return {
        "id": str(session.id),
        "availableMinutes": session.available_minutes,
        "energyLevel": session.energy_level,
        "focusLevel": session.focus_level,
        "desiredEffect": session.desired_effect,
        "preferredMediaTypes": session.preferred_media_types,
        "riskTolerance": session.risk_tolerance,
        "recommendations": session.generated_recommendations,
        "createdAt": session.created_at.isoformat().replace("+00:00", "Z"),
    }


def build_full_json_export(user: User) -> dict[str, Any]:
    seed_default_taste_dimensions(user)
    profile = getattr(user, "profile", None)
    settings = getattr(user, "settings", None)
    return {
        "version": CANONOS_EXPORT_VERSION,
        "exportedAt": datetime.now(datetime_timezone.utc).isoformat().replace("+00:00", "Z"),
        "user": {"email": user.email},
        "data": {
            "profile": {
                "displayName": profile.display_name if profile else "",
                "timezone": profile.timezone if profile else "UTC",
                "preferredLanguage": profile.preferred_language if profile else "en",
            },
            "settings": {
                "defaultMediaTypes": settings.default_media_types if settings else [],
                "defaultRiskTolerance": settings.default_risk_tolerance if settings else "medium",
                "modernMediaSkepticismLevel": settings.modern_media_skepticism_level
                if settings
                else 5,
                "genericnessSensitivity": settings.genericness_sensitivity if settings else 6,
                "preferredScoringStrictness": settings.preferred_scoring_strictness
                if settings
                else 5,
                "themePreference": settings.theme_preference if settings else "system",
            },
            "tasteDimensions": [
                {
                    "slug": dimension.slug,
                    "name": dimension.name,
                    "description": dimension.description,
                    "direction": dimension.direction,
                    "isDefault": dimension.is_default,
                }
                for dimension in TasteDimension.objects.filter(owner=user).order_by("name")
            ],
            "mediaItems": [
                _serialize_media_item(media_item)
                for media_item in MediaItem.objects.filter(owner=user)
                .prefetch_related("scores__taste_dimension", "aftertaste_entries")
                .order_by("title")
            ],
            "candidates": [
                _serialize_candidate(candidate)
                for candidate in Candidate.objects.filter(owner=user)
                .prefetch_related("evaluations")
                .order_by("title")
            ],
            "queueItems": [
                _serialize_queue_item(item)
                for item in QueueItem.objects.filter(owner=user).order_by("queue_position", "title")
            ],
            "tonightModeSessions": [
                _serialize_tonight_session(session)
                for session in TonightModeSession.objects.filter(owner=user).order_by("-created_at")
            ],
        },
    }


def _score_column_slugs(user: User) -> list[str]:
    return list(
        TasteDimension.objects.filter(owner=user).order_by("slug").values_list("slug", flat=True)
    )


def build_media_csv_export(user: User) -> str:
    seed_default_taste_dimensions(user)
    score_slugs = _score_column_slugs(user)
    columns = [
        "title",
        "media_type",
        "status",
        "personal_rating",
        "release_year",
        "creator",
        "notes",
        *[f"score_{slug}" for slug in score_slugs],
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()
    for media_item in (
        MediaItem.objects.filter(owner=user)
        .prefetch_related("scores__taste_dimension")
        .order_by("title")
    ):
        row = {
            "title": media_item.title,
            "media_type": media_item.media_type,
            "status": media_item.status,
            "personal_rating": media_item.personal_rating or "",
            "release_year": media_item.release_year or "",
            "creator": media_item.creator,
            "notes": media_item.notes,
        }
        scores = {score.taste_dimension.slug: score.score for score in media_item.scores.all()}
        for slug in score_slugs:
            row[f"score_{slug}"] = scores.get(slug, "")
        writer.writerow(row)
    return output.getvalue()


def count_export_records(payload: dict[str, Any]) -> int:
    data = payload.get("data", {})
    return sum(
        len(data.get(key, []))
        for key in ["mediaItems", "candidates", "queueItems", "tonightModeSessions"]
    )


def create_export_job(*, user: User, export_format: str) -> ExportJob:
    export_format = export_format.lower()
    timestamp = timezone.now().strftime("%Y%m%d-%H%M%S")
    if export_format == ExportJob.Format.JSON:
        payload = build_full_json_export(user)
        return ExportJob.objects.create(
            owner=user,
            format=export_format,
            filename=f"canonos-export-{timestamp}.json",
            content_type="application/json",
            payload_text=json.dumps(payload, indent=2, sort_keys=True),
            record_count=count_export_records(payload),
        )
    if export_format == ExportJob.Format.CSV:
        payload_text = build_media_csv_export(user)
        return ExportJob.objects.create(
            owner=user,
            format=export_format,
            filename=f"canonos-media-export-{timestamp}.csv",
            content_type="text/csv",
            payload_text=payload_text,
            record_count=max(0, len(payload_text.splitlines()) - 1),
        )
    raise ValueError("format must be json or csv.")


def apply_profile_and_settings_from_export(user: User, document: dict[str, Any]) -> None:
    data = document.get("data", {})
    profile_data = data.get("profile", {})
    settings_data = data.get("settings", {})
    if profile_data:
        profile, _ = UserProfile.objects.get_or_create(
            user=user, defaults={"display_name": user.email}
        )
        profile.display_name = profile_data.get("displayName", profile.display_name)
        profile.timezone = profile_data.get("timezone", profile.timezone)
        profile.preferred_language = profile_data.get(
            "preferredLanguage", profile.preferred_language
        )
        profile.save()
    if settings_data:
        settings, _ = UserSettings.objects.get_or_create(user=user)
        settings.default_media_types = settings_data.get(
            "defaultMediaTypes", settings.default_media_types
        )
        settings.default_risk_tolerance = settings_data.get(
            "defaultRiskTolerance", settings.default_risk_tolerance
        )
        settings.modern_media_skepticism_level = settings_data.get(
            "modernMediaSkepticismLevel", settings.modern_media_skepticism_level
        )
        settings.genericness_sensitivity = settings_data.get(
            "genericnessSensitivity", settings.genericness_sensitivity
        )
        settings.preferred_scoring_strictness = settings_data.get(
            "preferredScoringStrictness", settings.preferred_scoring_strictness
        )
        settings.theme_preference = settings_data.get("themePreference", settings.theme_preference)
        settings.save()


def export_json_for_user(user: User) -> str:
    return json.dumps(build_full_json_export(user), indent=2, sort_keys=True)


def iter_supported_csv_columns() -> Iterable[str]:
    return SUPPORTED_CSV_COLUMNS
