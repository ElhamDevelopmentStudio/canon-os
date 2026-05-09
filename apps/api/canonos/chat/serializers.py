from __future__ import annotations

from rest_framework import serializers

from .models import ChatMessage, ChatSession


class ChatMessageSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "role", "content", "metadata", "createdAt"]
        read_only_fields = fields


class ChatSessionSerializer(serializers.ModelSerializer):
    latestResult = serializers.JSONField(source="latest_result", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = ChatSession
        fields = ["id", "module", "title", "state", "latestResult", "createdAt", "updatedAt"]
        read_only_fields = ["id", "state", "latestResult", "createdAt", "updatedAt"]


class ChatSessionDetailSerializer(ChatSessionSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta(ChatSessionSerializer.Meta):
        fields = [*ChatSessionSerializer.Meta.fields, "messages"]


class ChatSessionCreateSerializer(serializers.Serializer):
    module = serializers.ChoiceField(choices=ChatSession.Module.choices)
    title = serializers.CharField(required=False, allow_blank=True, max_length=160)


class ChatMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=True)


class ChatTurnResponseSerializer(serializers.Serializer):
    session = ChatSessionDetailSerializer()
    assistantMessage = ChatMessageSerializer()
    result = serializers.JSONField()
