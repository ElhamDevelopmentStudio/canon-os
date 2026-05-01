from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers

from canonos.taste.services import seed_default_taste_dimensions

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name")
    preferredLanguage = serializers.CharField(source="preferred_language")

    class Meta:
        model = UserProfile
        fields = ["id", "displayName", "timezone", "preferredLanguage"]


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = get_user_model()
        fields = ["id", "email", "username", "profile"]


class AuthSessionSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    user = UserSerializer(allow_null=True)
    csrfToken = serializers.CharField(required=False)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    displayName = serializers.CharField(max_length=120, trim_whitespace=True)

    def validate_email(self, value: str) -> str:
        normalized = User.objects.normalize_email(value).lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized

    def create(self, validated_data: dict[str, str]) -> User:
        email = validated_data["email"]
        user = User.objects.create_user(
            username=email, email=email, password=validated_data["password"]
        )
        UserProfile.objects.create(user=user, display_name=validated_data["displayName"])
        seed_default_taste_dimensions(user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs: dict[str, str]) -> dict[str, str | User]:
        email = User.objects.normalize_email(attrs["email"]).lower()
        user = authenticate(username=email, password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")
        attrs["user"] = user
        return attrs


class ProfileUpdateSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name", required=False, max_length=120)
    preferredLanguage = serializers.CharField(
        source="preferred_language", required=False, max_length=16
    )

    class Meta:
        model = UserProfile
        fields = ["id", "displayName", "timezone", "preferredLanguage"]
        read_only_fields = ["id"]
