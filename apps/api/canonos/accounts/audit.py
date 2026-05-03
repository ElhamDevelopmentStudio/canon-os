from __future__ import annotations

import hashlib

from django.contrib.auth.models import AnonymousUser, User

from canonos.common.middleware import get_request_id

from .models import AuditEvent


def actor_fingerprint(user: User | AnonymousUser | None) -> str:
    if user is None or not getattr(user, "is_authenticated", False):
        return ""
    identifier = f"{user.pk}:{getattr(user, 'email', '')}:{getattr(user, 'username', '')}"
    return hashlib.sha256(identifier.encode("utf-8")).hexdigest()


def log_audit_event(
    *,
    event_type: str,
    user: User | AnonymousUser | None = None,
    request: object | None = None,
    metadata: dict[str, object] | None = None,
) -> AuditEvent:
    actor = user if user is not None and getattr(user, "is_authenticated", False) else None
    request_id = get_request_id(request) if request is not None else ""
    return AuditEvent.objects.create(
        actor=actor,
        actor_hash=actor_fingerprint(actor),
        event_type=event_type,
        request_id=request_id or "",
        metadata=metadata or {},
    )
