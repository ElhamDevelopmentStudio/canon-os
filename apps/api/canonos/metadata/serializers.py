from __future__ import annotations

from rest_framework import serializers

from canonos.media.models import MediaItem
from canonos.metadata.models import ExternalMetadata


class ExternalMetadataSerializer(serializers.ModelSerializer):
    mediaItemId = serializers.UUIDField(source="media_item_id", read_only=True)
    providerItemId = serializers.CharField(source="provider_item_id")
    rawPayload = serializers.JSONField(source="raw_payload")
    normalizedTitle = serializers.CharField(source="normalized_title")
    normalizedDescription = serializers.CharField(source="normalized_description", allow_blank=True)
    imageUrl = serializers.URLField(source="image_url", allow_blank=True)
    sourceUrl = serializers.URLField(source="source_url", allow_blank=True)
    externalRating = serializers.DecimalField(
        source="external_rating",
        max_digits=4,
        decimal_places=2,
        allow_null=True,
    )
    externalPopularity = serializers.DecimalField(
        source="external_popularity",
        max_digits=6,
        decimal_places=2,
        allow_null=True,
    )
    lastRefreshedAt = serializers.DateTimeField(source="last_refreshed_at")
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ExternalMetadata
        fields = [
            "id",
            "mediaItemId",
            "provider",
            "providerItemId",
            "normalizedTitle",
            "normalizedDescription",
            "imageUrl",
            "sourceUrl",
            "externalRating",
            "externalPopularity",
            "rawPayload",
            "lastRefreshedAt",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = fields


class ExternalMediaMatchSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=ExternalMetadata.ExternalProvider.choices)
    providerItemId = serializers.CharField()
    mediaType = serializers.ChoiceField(choices=MediaItem.MediaType.choices)
    title = serializers.CharField()
    originalTitle = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    releaseYear = serializers.IntegerField(required=False, allow_null=True)
    creator = serializers.CharField(required=False, allow_blank=True)
    imageUrl = serializers.URLField(required=False, allow_blank=True)
    externalRating = serializers.FloatField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=10,
    )
    externalPopularity = serializers.FloatField(
        required=False,
        allow_null=True,
        min_value=0,
        max_value=100,
    )
    confidence = serializers.FloatField(required=False, min_value=0, max_value=1)
    sourceUrl = serializers.URLField(required=False, allow_blank=True)
    rawPayload = serializers.JSONField(required=False)


class MetadataSearchQuerySerializer(serializers.Serializer):
    query = serializers.CharField(min_length=1, max_length=255)
    mediaType = serializers.ChoiceField(
        choices=MediaItem.MediaType.choices,
        required=False,
        allow_blank=True,
    )
    provider = serializers.ChoiceField(
        choices=ExternalMetadata.ExternalProvider.choices,
        required=False,
        allow_blank=True,
    )


class MetadataMatchListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = ExternalMediaMatchSerializer(many=True)


class ProviderCapabilitySerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=ExternalMetadata.ExternalProvider.choices)
    label = serializers.CharField()
    lookupSupported = serializers.BooleanField()
    lookupConfigured = serializers.BooleanField()
    accountImportSupported = serializers.BooleanField()
    exportUploadSupported = serializers.BooleanField()
    sourceProviders = serializers.ListField(child=serializers.CharField())
    notes = serializers.CharField(allow_blank=True)


class ProviderCapabilityListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = ProviderCapabilitySerializer(many=True)


class MetadataRefreshJobSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=["queued", "running", "succeeded", "failed"])
    metadata = ExternalMetadataSerializer()
    queuedAt = serializers.DateTimeField()
    completedAt = serializers.DateTimeField(allow_null=True)
    message = serializers.CharField()
