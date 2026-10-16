FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY . .
COPY enhanced_dataset_*.csv /


EXPOSE 8000
CMD ["gunicorn", "ai_service.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]