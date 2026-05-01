from __future__ import annotations

from django.urls import path

from .views import ExportDownloadView, ExportRequestView, ImportConfirmView, ImportPreviewView

urlpatterns = [
    path("imports/preview/", ImportPreviewView.as_view(), name="import-preview"),
    path("imports/<uuid:batch_id>/confirm/", ImportConfirmView.as_view(), name="import-confirm"),
    path("exports/", ExportRequestView.as_view(), name="export-request"),
    path(
        "exports/<uuid:export_id>/download/", ExportDownloadView.as_view(), name="export-download"
    ),
]
