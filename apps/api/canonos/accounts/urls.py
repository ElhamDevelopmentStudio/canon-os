from __future__ import annotations

from django.urls import path

from .views import (
    CsrfTokenView,
    CurrentUserProfileView,
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterView,
)

urlpatterns = [
    path("csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
    path("profile/", CurrentUserProfileView.as_view(), name="auth-profile"),
]
