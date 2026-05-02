from __future__ import annotations

from django.utils.encoding import force_str
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from canonos.common.middleware import get_request_id


def _extract_message(detail: object) -> str:
    if isinstance(detail, str):
        return detail
    if isinstance(detail, list) and detail:
        return _extract_message(detail[0])
    if isinstance(detail, dict):
        for key in ("detail", "message", "non_field_errors"):
            if key in detail:
                return _extract_message(detail[key])
        for value in detail.values():
            message = _extract_message(value)
            if message:
                return message
    return "The request could not be completed."


def _extract_code(detail: object, default: str) -> str:
    code = getattr(detail, "code", None)
    if code:
        return force_str(code)
    if isinstance(detail, list) and detail:
        return _extract_code(detail[0], default)
    if isinstance(detail, dict):
        for value in detail.values():
            code = _extract_code(value, default)
            if code != default:
                return code
    return default


def canonos_exception_handler(exc: Exception, context: dict[str, object]) -> Response | None:
    response = exception_handler(exc, context)
    if response is None:
        return None

    details = response.data
    default_code = (
        "validation_error" if response.status_code == status.HTTP_400_BAD_REQUEST else "api_error"
    )
    request = context.get("request")
    response.data = {
        "error": {
            "code": _extract_code(details, default_code),
            "message": _extract_message(details),
            "details": details,
            "requestId": get_request_id(request),
            "status": response.status_code,
        }
    }
    return response
