from __future__ import annotations

import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

REQUEST_ID_META_KEY = "HTTP_X_REQUEST_ID"
REQUEST_ID_HEADER = "X-Request-ID"
REQUEST_ID_MAX_LENGTH = 128


def _is_safe_request_id(value: str) -> bool:
    return bool(value) and len(value) <= REQUEST_ID_MAX_LENGTH and value.isprintable()


class RequestIdMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        incoming_request_id = request.META.get(REQUEST_ID_META_KEY, "")
        request_id = (
            incoming_request_id if _is_safe_request_id(incoming_request_id) else str(uuid.uuid4())
        )
        request.request_id = request_id

        response = self.get_response(request)
        response[REQUEST_ID_HEADER] = request_id
        return response


def get_request_id(request: object) -> str | None:
    return getattr(request, "request_id", None)
