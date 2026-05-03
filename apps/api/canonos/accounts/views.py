from __future__ import annotations

from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from canonos.common.throttles import AuthEndpointThrottle

from .audit import log_audit_event
from .models import AuditEvent, UserProfile, UserSettings
from .permissions import IsAuthenticatedUser
from .privacy import delete_personal_canonos_data, personal_data_counts
from .serializers import (
    AccountDeletionResponseSerializer,
    AuthSessionSerializer,
    DataDeletionResponseSerializer,
    LoginSerializer,
    PersonalDataSummarySerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    UserSettingsSerializer,
)


def auth_session_payload(request, *, csrf_token: str | None = None):  # noqa: ANN001, ANN201
    user = request.user if request.user.is_authenticated else None
    payload = {
        "authenticated": user is not None,
        "user": user,
    }
    if csrf_token is not None:
        payload["csrfToken"] = csrf_token
    return AuthSessionSerializer(payload, context={"request": request}).data


class CsrfTokenView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        responses=AuthSessionSerializer,
        summary="Get CSRF token",
        description="Set the csrftoken cookie and return current session state.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class RegisterView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthEndpointThrottle]

    @extend_schema(
        auth=[],
        request=RegisterSerializer,
        responses=AuthSessionSerializer,
        summary="Register user",
        description="Create account defaults and start an authenticated session.",
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(
            auth_session_payload(request, csrf_token=get_token(request)),
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]
    throttle_classes = [AuthEndpointThrottle]

    @extend_schema(
        auth=[],
        request=LoginSerializer,
        responses=AuthSessionSerializer,
        summary="Login user",
        description="Authenticate by email/password and set the session cookie.",
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login(request, serializer.validated_data["user"])
        log_audit_event(
            event_type=AuditEvent.EventType.LOGIN,
            user=serializer.validated_data["user"],
            request=request,
        )
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class LogoutView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        request=None,
        responses=AuthSessionSerializer,
        summary="Logout current user",
        description="Clear the session and return anonymous state with a fresh CSRF token.",
    )
    def post(self, request):  # noqa: ANN001, ANN201
        log_audit_event(event_type=AuditEvent.EventType.LOGOUT, user=request.user, request=request)
        logout(request)
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class CurrentUserView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        responses=AuthSessionSerializer,
        summary="Get current auth session",
        description="Return auth state and current user/profile when logged in.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class CurrentUserProfileView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get_profile(self, request) -> UserProfile:  # noqa: ANN001
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user,
            defaults={
                "display_name": request.user.get_full_name()
                or request.user.email
                or request.user.username
            },
        )
        return profile

    @extend_schema(
        responses=UserProfileSerializer,
        summary="Get current user profile",
        description="Return the authenticated user's editable display profile and locale defaults.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(UserProfileSerializer(self.get_profile(request)).data)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses=UserProfileSerializer,
        summary="Update current user profile",
        description="Patch display name, timezone, and preferred language.",
    )
    def patch(self, request):  # noqa: ANN001, ANN201
        profile = self.get_profile(request)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(profile).data)


class CurrentUserSettingsView(APIView):
    permission_classes = [IsAuthenticatedUser]

    def get_settings(self, request) -> UserSettings:  # noqa: ANN001
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        UserProfile.objects.get_or_create(
            user=request.user,
            defaults={
                "display_name": request.user.get_full_name()
                or request.user.email
                or request.user.username
            },
        )
        return settings

    @extend_schema(
        responses=UserSettingsSerializer,
        summary="Get current user settings",
        description="Return profile, display preference, and recommendation defaults.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(UserSettingsSerializer(self.get_settings(request)).data)

    @extend_schema(
        request=UserSettingsSerializer,
        responses=UserSettingsSerializer,
        summary="Update current user settings",
        description="Patch profile, theme, and recommendation defaults.",
    )
    def patch(self, request):  # noqa: ANN001, ANN201
        settings = self.get_settings(request)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(
            event_type=AuditEvent.EventType.SETTINGS_UPDATED,
            user=request.user,
            request=request,
            metadata={
                "sections": sorted(request.data.keys()) if hasattr(request.data, "keys") else []
            },
        )
        return Response(UserSettingsSerializer(settings).data)


class PersonalDataSummaryView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        responses=PersonalDataSummarySerializer,
        summary="Summarize current user's private CanonOS data",
        description="Return owner-scoped record counts before export or deletion.",
    )
    def get(self, request):  # noqa: ANN001, ANN201
        counts = personal_data_counts(request.user)
        return Response({"counts": counts, "totalRecords": sum(counts.values())})


class DeletePersonalDataView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        request=None,
        responses=DataDeletionResponseSerializer,
        summary="Delete current user's CanonOS product data",
        description=(
            "Remove private media history, notes, scores, graph, queue, jobs, imports, "
            "exports, and analysis records while keeping the login account and settings."
        ),
    )
    def delete(self, request):  # noqa: ANN001, ANN201
        log_audit_event(
            event_type=AuditEvent.EventType.DATA_DELETION_REQUESTED,
            user=request.user,
            request=request,
            metadata={"counts": personal_data_counts(request.user)},
        )
        result = delete_personal_canonos_data(request.user)
        return Response(
            {
                "deletedCounts": result.deleted_counts,
                "totalDeleted": result.total_deleted,
                "message": "Your CanonOS product data was deleted.",
            }
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(
        request=None,
        responses=AccountDeletionResponseSerializer,
        summary="Delete current user account",
        description="Delete the authenticated account and clear the browser session.",
    )
    def delete(self, request):  # noqa: ANN001, ANN201
        user: User = request.user
        log_audit_event(
            event_type=AuditEvent.EventType.ACCOUNT_DELETION_REQUESTED,
            user=user,
            request=request,
            metadata={"counts": personal_data_counts(user), "email": user.email},
        )
        logout(request)
        user.delete()
        return Response({"deleted": True, "message": "Your CanonOS account was deleted."})
