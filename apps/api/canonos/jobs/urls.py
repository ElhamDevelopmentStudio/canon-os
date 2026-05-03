from __future__ import annotations

from django.urls import path

from .views import BackgroundJobDetailView, BackgroundJobListView

urlpatterns = [
    path("jobs/", BackgroundJobListView.as_view(), name="background-job-list"),
    path("jobs/<uuid:job_id>/", BackgroundJobDetailView.as_view(), name="background-job-detail"),
]
