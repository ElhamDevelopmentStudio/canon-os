from __future__ import annotations

from django.conf import settings
from django.core.checks import Critical, Error, Tags, register

DEFAULT_LOCAL_SECRET_KEY = "canonos-local-development-only"


@register(Tags.security, deploy=True)
def sensitive_settings_check(app_configs, **kwargs: object):  # noqa: ANN001, ANN201, ARG001
    errors = []
    if settings.SECRET_KEY == DEFAULT_LOCAL_SECRET_KEY or len(settings.SECRET_KEY) < 32:
        errors.append(
            Critical(
                "DJANGO_SECRET_KEY must be a unique high-entropy value in deployed environments.",
                id="canonos.security.E001",
            )
        )
    if not settings.SESSION_COOKIE_SECURE:
        errors.append(
            Error(
                "SESSION_COOKIE_SECURE must be enabled in deployed environments.",
                id="canonos.security.E002",
            )
        )
    if not settings.CSRF_COOKIE_SECURE:
        errors.append(
            Error(
                "CSRF_COOKIE_SECURE must be enabled in deployed environments.",
                id="canonos.security.E003",
            )
        )
    allowed_hosts = getattr(settings, "ALLOWED_HOSTS", [])
    if not allowed_hosts or "*" in allowed_hosts:
        errors.append(
            Error(
                "DJANGO_ALLOWED_HOSTS must list explicit deployed hostnames.",
                id="canonos.security.E004",
            )
        )
    if getattr(settings, "CORS_ALLOW_CREDENTIALS", False) and "*" in getattr(
        settings,
        "CORS_ALLOWED_ORIGINS",
        [],
    ):
        errors.append(
            Error(
                "Credentialed CORS cannot allow wildcard origins.",
                id="canonos.security.E005",
            )
        )
    return errors
