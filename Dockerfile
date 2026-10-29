FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app

# Create non-root user (UID 1000 required by Hugging Face Spaces)
RUN useradd -m -u 1000 appuser

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY --chown=appuser:appuser backend /app/backend
COPY --chown=appuser:appuser module_pdf_to_csv_fit_anki /app/module_pdf_to_csv_fit_anki

RUN mkdir -p /app/backend/media /app/backend/staticfiles /app/backend/.cache/whisper \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 7860

# shortcut: local container media dir resets on container rebuild, switch to S3/R2 when persistent user uploads are needed
CMD ["sh", "-c", "python backend/manage.py migrate --noinput && python backend/manage.py collectstatic --noinput && gunicorn --chdir backend core.wsgi:application --bind 0.0.0.0:${PORT:-7860} --workers 1 --threads 2 --timeout 180"]
