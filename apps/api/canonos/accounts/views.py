from __future__ import annotations

from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .permissions import IsAuthenticatedUser
from .serializers import (
    AuthSessionSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserProfileSerializer,
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

    @extend_schema(auth=[], responses=AuthSessionSerializer, summary="Get CSRF token")
    @ensure_csrf_cookie
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class RegisterView(APIView):
    authentication_classes: list[type] = []
    permission_classes = [AllowAny]

    @extend_schema(
        auth=[],
        request=RegisterSerializer,
        responses=AuthSessionSerializer,
        summary="Register user",
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

    @extend_schema(
        auth=[], request=LoginSerializer, responses=AuthSessionSerializer, summary="Login user"
    )
    def post(self, request):  # noqa: ANN001, ANN201
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login(request, serializer.validated_data["user"])
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class LogoutView(APIView):
    permission_classes = [IsAuthenticatedUser]

    @extend_schema(responses=AuthSessionSerializer, summary="Logout current user")
    def post(self, request):  # noqa: ANN001, ANN201
        logout(request)
        return Response(auth_session_payload(request, csrf_token=get_token(request)))


class CurrentUserView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(auth=[], responses=AuthSessionSerializer, summary="Get current auth session")
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

    @extend_schema(responses=UserProfileSerializer, summary="Get current user profile")
    def get(self, request):  # noqa: ANN001, ANN201
        return Response(UserProfileSerializer(self.get_profile(request)).data)

    @extend_schema(
        request=ProfileUpdateSerializer,
        responses=UserProfileSerializer,
        summary="Update current user profile",
    )
    def patch(self, request):  # noqa: ANN001, ANN201
        profile = self.get_profile(request)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserProfileSerializer(profile).data)
