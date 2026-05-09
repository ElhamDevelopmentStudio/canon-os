from __future__ import annotations

import json

from django.http import StreamingHttpResponse
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from canonos.common.renderers import ServerSentEventRenderer
from canonos.common.throttles import ExpensiveEndpointThrottle

from .models import ChatSession
from .serializers import (
    ChatMessageCreateSerializer,
    ChatSessionCreateSerializer,
    ChatSessionDetailSerializer,
    ChatSessionSerializer,
    ChatTurnResponseSerializer,
)
from .services import create_welcome_message, process_chat_turn, process_chat_turn_stream


@extend_schema_view(
    list=extend_schema(
        summary="List chat sessions",
        description="List current user's persisted CanonOS module chat sessions.",
    ),
    retrieve=extend_schema(
        summary="Get chat session",
        description="Fetch one owner-scoped chat session with messages.",
    ),
    create=extend_schema(
        request=ChatSessionCreateSerializer,
        responses={201: ChatSessionDetailSerializer},
        summary="Create chat session",
        description="Start a module-specific recommendation chat.",
    ),
    destroy=extend_schema(
        summary="Delete chat session",
        description="Delete one owner-scoped chat session and its messages.",
    ),
)
class ChatSessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.none()
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_serializer_class(self):  # noqa: ANN201
        if self.action == "create":
            return ChatSessionCreateSerializer
        if self.action == "retrieve":
            return ChatSessionDetailSerializer
        return ChatSessionSerializer

    def get_queryset(self):  # noqa: ANN201
        module = self.request.query_params.get("module")
        queryset = ChatSession.objects.filter(owner=self.request.user).prefetch_related("messages")
        if module:
            queryset = queryset.filter(module=module)
        return queryset.order_by("-updated_at", "-created_at")

    def create(self, request, *args, **kwargs):  # noqa: ANN001, ANN002, ANN003, ANN201
        serializer = ChatSessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session = ChatSession.objects.create(
            owner=request.user,
            module=serializer.validated_data["module"],
            title=serializer.validated_data.get("title", ""),
            state={"slots": {}, "turnCount": 0},
        )
        create_welcome_message(session)
        return Response(ChatSessionDetailSerializer(session).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=ChatMessageCreateSerializer,
        responses={201: ChatTurnResponseSerializer},
        summary="Send chat message",
        description=(
            "Send one user message. The assistant either asks one focused follow-up or runs "
            "the target CanonOS module service once enough context is available."
        ),
    )
    @action(detail=True, methods=["post"], throttle_classes=[ExpensiveEndpointThrottle])
    def messages(self, request, pk=None):  # noqa: ANN001, ANN201
        session = self.get_object()
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        process_chat_turn(session, serializer.validated_data["content"])
        session = ChatSession.objects.prefetch_related("messages").get(
            owner=request.user,
            pk=session.pk,
        )
        return Response(
            {
                "session": ChatSessionDetailSerializer(session).data,
                "assistantMessage": ChatSessionDetailSerializer(session).data["messages"][-1],
                "result": session.latest_result,
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        request=ChatMessageCreateSerializer,
        responses={200: ChatTurnResponseSerializer},
        summary="Stream chat message",
        description=(
            "Send one user message and stream the assistant content as Server-Sent Events. "
            "The final event contains the same payload as the non-streaming endpoint."
        ),
    )
    @action(
        detail=True,
        methods=["post"],
        renderer_classes=[ServerSentEventRenderer, JSONRenderer],
        throttle_classes=[ExpensiveEndpointThrottle],
        url_path="messages/stream",
    )
    def messages_stream(self, request, pk=None):  # noqa: ANN001, ANN201
        session = self.get_object()
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        def event_stream():  # noqa: ANN202
            for event in process_chat_turn_stream(session, serializer.validated_data["content"]):
                if event.event == "final":
                    updated_session = ChatSession.objects.prefetch_related("messages").get(
                        owner=request.user,
                        pk=session.pk,
                    )
                    session_data = ChatSessionDetailSerializer(updated_session).data
                    yield _sse(
                        "final",
                        {
                            "session": session_data,
                            "assistantMessage": session_data["messages"][-1],
                            "result": updated_session.latest_result,
                        },
                    )
                else:
                    yield _sse(event.event, event.data)

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


def _sse(event: str, data: dict[str, object]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"
