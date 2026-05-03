from __future__ import annotations

from rest_framework import serializers

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem

from .models import CanonSeason, CanonSeasonItem
from .services import reflection_prompts_for_theme


class CanonSeasonItemSerializer(serializers.ModelSerializer):
    mediaItemId = serializers.UUIDField(
        source="media_item_id",
        required=False,
        allow_null=True,
    )
    candidateId = serializers.UUIDField(
        source="candidate_id",
        required=False,
        allow_null=True,
    )
    titleSnapshot = serializers.CharField(
        source="title_snapshot",
        required=False,
        allow_blank=True,
    )
    mediaType = serializers.ChoiceField(
        source="media_type",
        choices=MediaItem.MediaType.choices,
        required=False,
    )
    reasonIncluded = serializers.CharField(
        source="reason_included",
        required=False,
        allow_blank=True,
    )
    whatToPayAttentionTo = serializers.CharField(
        source="what_to_pay_attention_to",
        required=False,
        allow_blank=True,
    )
    completionStatus = serializers.ChoiceField(
        source="completion_status",
        choices=CanonSeasonItem.CompletionStatus.choices,
        required=False,
    )
    canonStatus = serializers.ChoiceField(
        source="canon_status",
        choices=CanonSeasonItem.CanonStatus.choices,
        required=False,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CanonSeasonItem
        fields = [
            "id",
            "mediaItemId",
            "candidateId",
            "titleSnapshot",
            "mediaType",
            "order",
            "reasonIncluded",
            "whatToPayAttentionTo",
            "completionStatus",
            "canonStatus",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]

    def validate(self, attrs):  # noqa: ANN001, ANN201
        season: CanonSeason = self.context["season"]
        media_item_id = attrs.get("media_item_id")
        candidate_id = attrs.get("candidate_id")
        media_item = None
        candidate = None

        if media_item_id:
            media_item = MediaItem.objects.filter(owner=season.owner, id=media_item_id).first()
            if media_item is None:
                raise serializers.ValidationError({"mediaItemId": "Media item not found."})
        if candidate_id:
            candidate = Candidate.objects.filter(owner=season.owner, id=candidate_id).first()
            if candidate is None:
                raise serializers.ValidationError({"candidateId": "Candidate not found."})

        title_snapshot = attrs.get("title_snapshot") or getattr(self.instance, "title_snapshot", "")
        media_type = attrs.get("media_type") or getattr(self.instance, "media_type", "")
        if media_item:
            title_snapshot = title_snapshot or media_item.title
            media_type = media_type or media_item.media_type
        if candidate:
            title_snapshot = title_snapshot or candidate.title
            media_type = media_type or candidate.media_type

        if not title_snapshot:
            raise serializers.ValidationError(
                {"titleSnapshot": "Provide a title or linked media/candidate."}
            )
        if not media_type:
            raise serializers.ValidationError(
                {"mediaType": "Provide a media type or linked media/candidate."}
            )

        attrs["title_snapshot"] = title_snapshot
        attrs["media_type"] = media_type
        return attrs


class CanonSeasonSerializer(serializers.ModelSerializer):
    startDate = serializers.DateField(source="start_date", required=False, allow_null=True)
    endDate = serializers.DateField(source="end_date", required=False, allow_null=True)
    reflectionNotes = serializers.CharField(
        source="reflection_notes",
        required=False,
        allow_blank=True,
    )
    reflectionPrompts = serializers.SerializerMethodField()
    itemCount = serializers.SerializerMethodField()
    completedItemCount = serializers.SerializerMethodField()
    progressPercent = serializers.SerializerMethodField()
    items = CanonSeasonItemSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CanonSeason
        fields = [
            "id",
            "title",
            "theme",
            "description",
            "status",
            "startDate",
            "endDate",
            "reflectionNotes",
            "reflectionPrompts",
            "itemCount",
            "completedItemCount",
            "progressPercent",
            "items",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = [
            "id",
            "reflectionPrompts",
            "itemCount",
            "completedItemCount",
            "progressPercent",
            "items",
            "createdAt",
            "updatedAt",
        ]

    def get_reflectionPrompts(self, season: CanonSeason) -> list[str]:  # noqa: N802
        return reflection_prompts_for_theme(season.theme)

    def get_itemCount(self, season: CanonSeason) -> int:  # noqa: N802
        return season.items.count()

    def get_completedItemCount(self, season: CanonSeason) -> int:  # noqa: N802
        return season.items.filter(
            completion_status=CanonSeasonItem.CompletionStatus.COMPLETED
        ).count()

    def get_progressPercent(self, season: CanonSeason) -> int:  # noqa: N802
        item_count = self.get_itemCount(season)
        if item_count == 0:
            return 0
        return round((self.get_completedItemCount(season) / item_count) * 100)


class CanonSeasonListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = CanonSeasonSerializer(many=True)


class CanonSeasonItemReorderSerializer(serializers.Serializer):
    itemIds = serializers.ListField(child=serializers.UUIDField(), allow_empty=False)


class CanonSeasonItemReorderResponseSerializer(serializers.Serializer):
    results = CanonSeasonItemSerializer(many=True)
    season = CanonSeasonSerializer()
