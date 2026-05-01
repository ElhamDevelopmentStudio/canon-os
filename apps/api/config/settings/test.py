from .base import *  # noqa: F403

SECRET_KEY = "canonos-test-secret-key"
DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",  # noqa: F405
    }
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "canonos-tests",
    }
}
CELERY_TASK_ALWAYS_EAGER = True
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
