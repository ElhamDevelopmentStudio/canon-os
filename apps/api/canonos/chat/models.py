from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class ChatSession(models.Model):
    class Module(models.TextChoices):
        TONIGHT = "tonight", "Tonight Mode"
        CANDIDATE = "candidate", "Candidate Evaluator"
        DISCOVERY = "discovery", "Media Archaeologist"
        DETOX = "detox", "Completion Detox"
        AFTERTASTE = "aftertaste", "Aftertaste Log"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_sessions",
    )
    module = models.CharField(max_length=32, choices=Module.choices)
    title = models.CharField(max_length=160, blank=True)
    state = models.JSONField(default=dict, blank=True)
    latest_result = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "module", "-updated_at"], name="chat_owner_module_idx"),
            models.Index(fields=["owner", "-updated_at"], name="chat_owner_updated_idx"),
        ]

    def __str__(self) -> str:
        return self.title or f"{self.get_module_display()} chat"


class ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"
        SYSTEM = "system", "System"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=16, choices=Role.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["session", "created_at"], name="chat_msg_session_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.role}: {self.content[:80]}"
