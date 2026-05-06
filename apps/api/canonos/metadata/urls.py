from __future__ import annotations

from django.urls import path

from . import views

urlpatterns = [
    path("metadata/providers/", views.metadata_provider_capabilities, name="metadata-providers"),
    path("metadata/matches/", views.metadata_matches, name="metadata-matches"),
    path(
        "media-items/<uuid:media_item_id>/metadata/",
        views.list_media_metadata,
        name="media-metadata-list",
    ),
    path(
        "media-items/<uuid:media_item_id>/metadata/attach/",
        views.attach_media_metadata,
        name="media-metadata-attach",
    ),
    path(
        "media-items/<uuid:media_item_id>/metadata/refresh/",
        views.refresh_media_metadata,
        name="media-metadata-refresh",
    ),
]
