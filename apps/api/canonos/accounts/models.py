from __future__ import annotations

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


def default_settings_media_types() -> list[str]:
    return ["movie", "anime", "novel", "audiobook"]


def default_recommendation_formula_weights() -> dict[str, int]:
    return {
        "personalFit": 30,
        "moodFit": 20,
        "qualitySignal": 20,
        "genericnessPenalty": 15,
        "regretRiskPenalty": 10,
        "commitmentCostPenalty": 5,
    }


def default_notification_preferences() -> dict[str, bool]:
    return {
        "browserNotifications": False,
        "emailDigest": False,
        "recommendationReminders": True,
        "completionDetoxReminders": True,
    }


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=120)
    timezone = models.CharField(max_length=64, default="UTC")
    preferred_language = models.CharField(max_length=16, default="en")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email"]

    def __str__(self) -> str:
        return self.display_name or self.user.get_username()


class UserSettings(models.Model):
    class RiskTolerance(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class ThemePreference(models.TextChoices):
        SYSTEM = "system", "System"
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"

    class EnergyLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class FocusLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        DEEP = "deep", "Deep"

    class DesiredEffect(models.TextChoices):
        COMFORT = "comfort", "Comfort"
        QUALITY = "quality", "Quality"
        SURPRISE = "surprise", "Surprise"
        LIGHT = "light", "Light"
        DEEP = "deep", "Deep"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="settings"
    )
    default_media_types = models.JSONField(default=default_settings_media_types, blank=True)
    default_risk_tolerance = models.CharField(
        max_length=16,
        choices=RiskTolerance.choices,
        default=RiskTolerance.MEDIUM,
    )
    modern_media_skepticism_level = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    genericness_sensitivity = models.PositiveSmallIntegerField(
        default=6,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    preferred_scoring_strictness = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    recommendation_formula_weights = models.JSONField(
        default=default_recommendation_formula_weights,
        blank=True,
    )
    default_tonight_available_minutes = models.PositiveIntegerField(
        default=90,
        validators=[MinValueValidator(1), MaxValueValidator(1440)],
    )
    default_tonight_energy_level = models.CharField(
        max_length=16,
        choices=EnergyLevel.choices,
        default=EnergyLevel.MEDIUM,
    )
    default_tonight_focus_level = models.CharField(
        max_length=16,
        choices=FocusLevel.choices,
        default=FocusLevel.MEDIUM,
    )
    default_tonight_desired_effect = models.CharField(
        max_length=24,
        choices=DesiredEffect.choices,
        default=DesiredEffect.QUALITY,
    )
    preferred_recommendation_strictness = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    allow_modern_exceptions = models.BooleanField(default=True)
    burnout_sensitivity = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    completion_detox_strictness = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(10)],
    )
    notification_preferences = models.JSONField(
        default=default_notification_preferences,
        blank=True,
    )
    theme_preference = models.CharField(
        max_length=16,
        choices=ThemePreference.choices,
        default=ThemePreference.SYSTEM,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["user__email"]
        verbose_name = "user settings"
        verbose_name_plural = "user settings"

    def __str__(self) -> str:
        return f"Settings for {self.user.get_username()}"


class AuditEvent(models.Model):
    class EventType(models.TextChoices):
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        DATA_EXPORT_REQUESTED = "data_export_requested", "Data export requested"
        DATA_DELETION_REQUESTED = "data_deletion_requested", "Data deletion requested"
        ACCOUNT_DELETION_REQUESTED = "account_deletion_requested", "Account deletion requested"
        SETTINGS_UPDATED = "settings_updated", "Settings updated"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_events",
    )
    actor_hash = models.CharField(max_length=64, blank=True)
    event_type = models.CharField(max_length=48, choices=EventType.choices)
    request_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "-created_at"], name="audit_actor_created_idx"),
            models.Index(fields=["event_type", "-created_at"], name="audit_event_type_created_idx"),
            models.Index(fields=["request_id"], name="audit_request_id_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} at {self.created_at:%Y-%m-%d %H:%M:%S}"
