from __future__ import annotations

from rest_framework import serializers

from canonos.media.models import MediaItem

from .models import AftertasteEntry


class AftertastePromptSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    helperText = serializers.CharField()


class AftertasteEntrySerializer(serializers.ModelSerializer):
    mediaItemId = serializers.UUIDField(source="media_item_id")
    mediaTitle = serializers.CharField(source="media_item.title", read_only=True)
    worthTime = serializers.BooleanField(source="worth_time")
    stayedWithMeScore = serializers.IntegerField(
        source="stayed_with_me_score",
        min_value=0,
        max_value=10,
    )
    feltAlive = serializers.BooleanField(source="felt_alive")
    feltGeneric = serializers.BooleanField(source="felt_generic")
    completionReason = serializers.CharField(
        source="completion_reason",
        required=False,
        allow_blank=True,
    )
    whatWorked = serializers.CharField(source="what_worked", required=False, allow_blank=True)
    whatFailed = serializers.CharField(source="what_failed", required=False, allow_blank=True)
    finalThoughts = serializers.CharField(source="final_thoughts", required=False, allow_blank=True)
    appetiteEffect = serializers.ChoiceField(
        source="appetite_effect",
        choices=AftertasteEntry.AppetiteEffect.choices,
    )
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AftertasteEntry
        fields = [
            "id",
            "mediaItemId",
            "mediaTitle",
            "worthTime",
            "stayedWithMeScore",
            "feltAlive",
            "feltGeneric",
            "completionReason",
            "whatWorked",
            "whatFailed",
            "finalThoughts",
            "appetiteEffect",
            "createdAt",
            "updatedAt",
        ]
        read_only_fields = ["id", "mediaTitle", "createdAt", "updatedAt"]

    def validate(self, attrs):  # noqa: ANN001, ANN201
        request = self.context["request"]
        media_item_id = attrs.get("media_item_id")
        if (
            media_item_id
            and not MediaItem.objects.filter(owner=request.user, id=media_item_id).exists()
        ):
            raise serializers.ValidationError({"mediaItemId": "Media item not found."})
        return attrs
