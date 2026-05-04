FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN addgroup --system canonos && adduser --system --ingroup canonos canonos

COPY apps/api/requirements.txt ./requirements.txt
RUN python -m pip install --upgrade pip && python -m pip install -r requirements.txt

COPY apps/api ./

RUN mkdir -p /app/staticfiles /app/media && chown -R canonos:canonos /app

USER canonos
EXPOSE 8000

CMD ["python", "-m", "gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-"]
