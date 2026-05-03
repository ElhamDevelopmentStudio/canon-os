from __future__ import annotations

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.accounts.audit import log_audit_event
from canonos.accounts.models import AuditEvent

from .models import ExportJob, ImportBatch
from .serializers import (
    ExportRequestSerializer,
    ExportRestoreDryRunRequestSerializer,
    ExportRestoreDryRunResultSerializer,
    ExportResultSerializer,
    ImportBatchSerializer,
    ImportPreviewRequestSerializer,
    ImportRollbackResultSerializer,
)
from .services import (
    confirm_import_batch,
    create_export_job,
    create_import_preview,
    rollback_import_batch,
    validate_export_restore,
)


class ImportBatchListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ImportBatchSerializer(many=True)},
        summary="List import batches for the current user",
        description="Return owner-scoped import job history with progress and rollback metadata.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        batches = ImportBatch.objects.filter(owner=request.user).prefetch_related("items")[:25]
        return Response(ImportBatchSerializer(batches, many=True).data)


class ImportPreviewView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        request=ImportPreviewRequestSerializer,
        responses={201: ImportBatchSerializer},
        summary="Preview CSV or JSON import before committing it",
        description="Validate an import preview without changing library data.",
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = ImportPreviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            batch = create_import_preview(
                user=request.user,
                source_type=data["source_type"],
                uploaded_file=data.get("file"),
                content=data.get("content"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ImportBatchSerializer(batch).data, status=status.HTTP_201_CREATED)


class ImportConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: ImportBatchSerializer},
        summary="Commit a previously validated import preview",
        description="Confirm a valid import preview inside a database transaction.",
    )
    def post(self, request, batch_id):  # noqa: ANN001, ANN201
        batch = (
            ImportBatch.objects.filter(owner=request.user, id=batch_id)
            .prefetch_related("items")
            .first()
        )
        if batch is None:
            return Response({"detail": "Import batch not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            batch = confirm_import_batch(user=request.user, batch=batch)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ImportBatchSerializer(batch).data)


class ImportRollbackView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: ImportRollbackResultSerializer},
        summary="Roll back a confirmed import batch",
        description=(
            "Delete records created by a confirmed import and mark the batch as rolled back."
        ),
    )
    def post(self, request, batch_id):  # noqa: ANN001, ANN201
        batch = (
            ImportBatch.objects.filter(owner=request.user, id=batch_id)
            .prefetch_related("items")
            .first()
        )
        if batch is None:
            return Response({"detail": "Import batch not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            result = rollback_import_batch(user=request.user, batch=batch)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ImportRollbackResultSerializer(result).data)


class ExportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ExportResultSerializer(many=True)},
        summary="List export jobs for the current user",
        description="Return owner-scoped export job history with progress and retention metadata.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        jobs = ExportJob.objects.filter(owner=request.user)[:25]
        return Response(ExportResultSerializer(jobs, many=True).data)

    @extend_schema(
        request=ExportRequestSerializer,
        responses={201: ExportResultSerializer},
        summary="Create a JSON or CSV export for current user's data",
        description="Create a downloadable JSON backup or media/rating CSV export.",
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = ExportRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            log_audit_event(
                event_type=AuditEvent.EventType.DATA_EXPORT_REQUESTED,
                user=request.user,
                request=request,
                metadata={"format": serializer.validated_data["format"]},
            )
            job = create_export_job(
                user=request.user, export_format=serializer.validated_data["format"]
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ExportResultSerializer(job).data, status=status.HTTP_201_CREATED)


class ExportRestoreDryRunView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        request=ExportRestoreDryRunRequestSerializer,
        responses={200: ExportRestoreDryRunResultSerializer},
        summary="Validate a JSON export before restore",
        description=(
            "Dry-run a CanonOS JSON export and return counts, warnings, and validation errors."
        ),
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = ExportRestoreDryRunRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            result = validate_export_restore(
                user=request.user,
                uploaded_file=data.get("file"),
                content=data.get("content"),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ExportRestoreDryRunResultSerializer(result).data)


class ExportDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: bytes},
        summary="Download a completed export",
        description="Download an owner-scoped completed export as JSON or CSV.",
    )
    def get(self, request, export_id):  # noqa: ANN001, ANN201
        job = ExportJob.objects.filter(owner=request.user, id=export_id).first()
        if job is None:
            return Response({"detail": "Export not found."}, status=status.HTTP_404_NOT_FOUND)
        if job.status != ExportJob.Status.COMPLETE:
            return Response({"detail": "Export is not ready yet."}, status=status.HTTP_409_CONFLICT)
        response = HttpResponse(job.payload_text, content_type=job.content_type)
        response["Content-Disposition"] = f'attachment; filename="{job.filename}"'
        return response
