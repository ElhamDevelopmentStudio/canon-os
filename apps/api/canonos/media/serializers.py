from __future__ import annotations

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import MediaItem


class MediaItemSerializer(serializers.ModelSerializer):
    mediaType = serializers.ChoiceField(source="media_type", choices=MediaItem.MediaType.choices)
    originalTitle = serializers.CharField(source="original_title", required=False, allow_blank=True)
    releaseYear = serializers.IntegerField(source="release_year", required=False, allow_null=True)
    countryLanguage = serializers.CharField(
        source="country_language",
        required=False,
        allow_blank=True,
    )
    personalRating = serializers.DecimalField(
        source="personal_rating",
        max_digits=3,
        decimal_places=1,
        required=False,
        allow_null=True,
        min_value=0,
        max_value=10,
    )
    startedDate = serializers.DateField(source="started_date", required=False, allow_null=True)
    completedDate = serializers.DateField(source="completed_date", required=False, allow_null=True)
    runtimeMinutes = serializers.IntegerField(
        source="runtime_minutes",
        required=False,
        allow_null=True,
        min_value=0,
    )
    episodeCount = serializers.IntegerField(
        source="episode_count",
        required=False,
        allow_null=True,
        min_value=0,
    )
    pageCount = serializers.IntegerField(
        source="page_count",
        required=False,
        allow_null=True,
        min_value=0,
    )
    audiobookLengthMinutes = serializers.IntegerField(
        source="audiobook_length_minutes",
        required=False,
        allow_null=True,
        min_value=0,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    scores = serializers.SerializerMethodField()
    latestAftertaste = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = [
            "id",
            "title",
            "originalTitle",
            "mediaType",
            "releaseYear",
            "countryLanguage",
            "creator",
            "status",
            "personalRating",
            "startedDate",
            "completedDate",
            "runtimeMinutes",
            "episodeCount",
            "pageCount",
            "audiobookLengthMinutes",
            "notes",
            "createdAt",
            "updatedAt",
            "scores",
            "latestAftertaste",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_scores(self, obj: MediaItem):  # noqa: ANN201
        from canonos.taste.serializers import MediaScoreSerializer

        scores = obj.scores.select_related("taste_dimension").all()
        return MediaScoreSerializer(scores, many=True).data

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_latestAftertaste(self, obj: MediaItem):  # noqa: ANN201, N802
        from canonos.aftertaste.serializers import AftertasteEntrySerializer

        latest = obj.aftertaste_entries.select_related("media_item").order_by("-created_at").first()
        if latest is None:
            return None
        return AftertasteEntrySerializer(latest, context=self.context).data
