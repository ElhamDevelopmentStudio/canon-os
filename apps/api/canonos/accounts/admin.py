from __future__ import annotations

from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name", "timezone", "preferred_language", "updated_at")
    search_fields = ("user__username", "user__email", "display_name")
    list_filter = ("timezone", "preferred_language")
