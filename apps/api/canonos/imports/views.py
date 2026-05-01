from __future__ import annotations

from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ExportJob, ImportBatch
from .serializers import (
    ExportRequestSerializer,
    ExportResultSerializer,
    ImportBatchSerializer,
    ImportPreviewRequestSerializer,
)
from .services import confirm_import_batch, create_export_job, create_import_preview


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


class ExportRequestView(APIView):
    permission_classes = [IsAuthenticated]

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
            job = create_export_job(
                user=request.user, export_format=serializer.validated_data["format"]
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ExportResultSerializer(job).data, status=status.HTTP_201_CREATED)


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
        response = HttpResponse(job.payload_text, content_type=job.content_type)
        response["Content-Disposition"] = f'attachment; filename="{job.filename}"'
        return response
