from __future__ import annotations

from rest_framework import serializers

from canonos.candidates.models import Candidate
from canonos.media.models import MediaItem

from .models import QueueItem


class QueueItemSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False)
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
    mediaType = serializers.ChoiceField(
        source="media_type",
        choices=MediaItem.MediaType.choices,
        required=False,
    )
    estimatedTimeMinutes = serializers.IntegerField(
        source="estimated_time_minutes",
        min_value=0,
        required=False,
        allow_null=True,
    )
    bestMood = serializers.CharField(source="best_mood", required=False, allow_blank=True)
    queuePosition = serializers.IntegerField(
        source="queue_position",
        min_value=0,
        required=False,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = QueueItem
        fields = [
            "id",
            "mediaItemId",
            "candidateId",
            "title",
            "mediaType",
            "priority",
            "reason",
            "estimatedTimeMinutes",
            "bestMood",
            "queuePosition",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "createdAt", "updatedAt"]

    def validate(self, attrs):  # noqa: ANN001, ANN201
        request = self.context["request"]
        media_item_id = attrs.get("media_item_id")
        candidate_id = attrs.get("candidate_id")
        media_item = None
        candidate = None

        if media_item_id:
            media_item = MediaItem.objects.filter(owner=request.user, id=media_item_id).first()
            if media_item is None:
                raise serializers.ValidationError({"mediaItemId": "Media item not found."})
        if candidate_id:
            candidate = Candidate.objects.filter(owner=request.user, id=candidate_id).first()
            if candidate is None:
                raise serializers.ValidationError({"candidateId": "Candidate not found."})

        title = attrs.get("title") or getattr(self.instance, "title", "")
        media_type = attrs.get("media_type") or getattr(self.instance, "media_type", "")
        if media_item:
            title = title or media_item.title
            media_type = media_type or media_item.media_type
        if candidate:
            title = title or candidate.title
            media_type = media_type or candidate.media_type

        if not title:
            raise serializers.ValidationError(
                {"title": "Provide a title or linked media/candidate."}
            )
        if not media_type:
            raise serializers.ValidationError(
                {"mediaType": "Provide a media type or linked media/candidate."}
            )

        attrs["title"] = title
        attrs["media_type"] = media_type
        return attrs


class QueueReorderSerializer(serializers.Serializer):
    itemIds = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
    )


class QueueReorderResponseSerializer(serializers.Serializer):
    results = QueueItemSerializer(many=True)
