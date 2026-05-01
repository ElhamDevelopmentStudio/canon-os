from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers

from canonos.media.models import MediaItem
from canonos.queueing.models import TonightModeSession
from canonos.taste.services import seed_default_taste_dimensions

from .models import UserProfile, UserSettings


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
        UserSettings.objects.create(user=user)
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


class DisplaySettingsSerializer(serializers.Serializer):
    themePreference = serializers.ChoiceField(
        source="theme_preference",
        choices=UserSettings.ThemePreference.choices,
        required=False,
    )


class RecommendationSettingsSerializer(serializers.Serializer):
    defaultMediaTypes = serializers.ListField(
        source="default_media_types",
        child=serializers.ChoiceField(choices=MediaItem.MediaType.choices),
        required=False,
        allow_empty=True,
    )
    defaultRiskTolerance = serializers.ChoiceField(
        source="default_risk_tolerance",
        choices=TonightModeSession.RiskTolerance.choices,
        required=False,
    )
    modernMediaSkepticismLevel = serializers.IntegerField(
        source="modern_media_skepticism_level",
        min_value=0,
        max_value=10,
        required=False,
    )
    genericnessSensitivity = serializers.IntegerField(
        source="genericness_sensitivity",
        min_value=0,
        max_value=10,
        required=False,
    )
    preferredScoringStrictness = serializers.IntegerField(
        source="preferred_scoring_strictness",
        min_value=0,
        max_value=10,
        required=False,
    )


class UserSettingsSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    profile = ProfileUpdateSerializer(required=False)
    display = DisplaySettingsSerializer(required=False)
    recommendation = RecommendationSettingsSerializer(required=False)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    def to_representation(self, instance: UserSettings) -> dict[str, object]:
        profile = getattr(instance.user, "profile", None)
        return {
            "id": instance.id,
            "profile": UserProfileSerializer(profile).data if profile else None,
            "display": {
                "themePreference": instance.theme_preference,
            },
            "recommendation": {
                "defaultMediaTypes": instance.default_media_types,
                "defaultRiskTolerance": instance.default_risk_tolerance,
                "modernMediaSkepticismLevel": instance.modern_media_skepticism_level,
                "genericnessSensitivity": instance.genericness_sensitivity,
                "preferredScoringStrictness": instance.preferred_scoring_strictness,
            },
            "updatedAt": instance.updated_at.isoformat().replace("+00:00", "Z"),
        }

    def update(self, instance: UserSettings, validated_data: dict[str, object]) -> UserSettings:
        profile_data = validated_data.pop("profile", None)
        display_data = validated_data.pop("display", None)
        recommendation_data = validated_data.pop("recommendation", None)

        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(
                user=instance.user,
                defaults={
                    "display_name": instance.user.get_full_name()
                    or instance.user.email
                    or instance.user.username,
                },
            )
            for field, value in profile_data.items():
                setattr(profile, field, value)
            profile.save()

        if display_data:
            for field, value in display_data.items():
                setattr(instance, field, value)

        if recommendation_data:
            for field, value in recommendation_data.items():
                setattr(instance, field, value)

        instance.save()
        return instance
