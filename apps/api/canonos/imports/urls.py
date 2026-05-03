from __future__ import annotations

from django.urls import path

from .views import (
    ExportDownloadView,
    ExportListCreateView,
    ExportRestoreDryRunView,
    ImportBatchListView,
    ImportConfirmView,
    ImportPreviewView,
    ImportRollbackView,
)

urlpatterns = [
    path("imports/", ImportBatchListView.as_view(), name="import-batch-list"),
    path("imports/preview/", ImportPreviewView.as_view(), name="import-preview"),
    path("imports/<uuid:batch_id>/confirm/", ImportConfirmView.as_view(), name="import-confirm"),
    path("imports/<uuid:batch_id>/rollback/", ImportRollbackView.as_view(), name="import-rollback"),
    path("exports/", ExportListCreateView.as_view(), name="export-request"),
    path(
        "exports/restore-dry-run/",
        ExportRestoreDryRunView.as_view(),
        name="export-restore-dry-run",
    ),
    path(
        "exports/<uuid:export_id>/download/", ExportDownloadView.as_view(), name="export-download"
    ),
]
