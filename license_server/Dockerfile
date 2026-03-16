FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /keys && chmod 755 /keys

# Generate SSL certificates for nginx if they don't exist
RUN if [ ! -f /keys/cert.pem ]; then \
    echo "Generating self-signed SSL certificates..."; \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /keys/key.pem \
        -out /keys/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=license-server" \
        -addext "subjectAltName=DNS:license-server,IP:127.0.0.1"; \
    chmod 600 /keys/key.pem; \
    chmod 644 /keys/cert.pem; \
    echo "SSL certificates generated."; \
    fi

RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app /keys

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["gunicorn", "main:app", "--bind", "0.0.0.0:8000", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker"]
