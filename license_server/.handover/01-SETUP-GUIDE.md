# License Server - Setup Guide

## Prerequisites

- Docker & Docker Compose
- Ports 80/443 available (Nginx)

## Zero-to-Hero Setup

### 1. Clone & Navigate

```bash
cd /mnt/Files/Programming/playground/webrtc_backend
```

### 2. Configure Environment (Production)

```bash
# Copy and edit environment
cp .env.example .env

# Edit .env with:
# - SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
# - ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Build & Start

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker compose ps
```

### 4. Verify

```bash
# Health check (self-signed cert, -k to skip verification)
curl -k https://localhost:8000/health

# Should return: {"status":"healthy","database":"healthy","timestamp":"..."}
```

### 5. Access Dashboard

Open https://localhost in your browser (accept self-signed cert warning).

## Service URLs

| Service | URL |
|---------|-----|
| Dashboard | https://localhost/ |
| Nginx HTTP | http://localhost:80 |
| Nginx HTTPS | https://localhost:443 |
| PostgreSQL | localhost:5432 |

## Database Connection

```bash
# Connect to database
docker compose exec db psql -U license_user -d webrtc_licenses

# View tables
docker compose exec db psql -U license_user -d webrtc_licenses -c "\dt"

# View licenses
docker compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM licenses;"
```

## Stop Services

```bash
docker compose down        # Stop
docker compose down -v     # Stop and remove volumes
```

## SSL Certificates

SSL certificates are **automatically generated** during the Docker build process:

1. The `license_server/Dockerfile` runs `openssl` to create self-signed certs
2. Certs are saved to `/keys/cert.pem` and `/keys/key.pem`
3. A Docker volume `license_keys` shares these with nginx

For production with Let's Encrypt, update `nginx/conf.d/license-server.conf` to point to real certificates.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs license_server

# Check database connectivity
docker compose exec license_server python3 -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://license_user:license_pass@db:5432/webrtc_licenses'); engine.connect()"
```

### Nginx fails with SSL certificate error

```bash
# Rebuild with fresh volume to regenerate certs
docker compose down
docker volume rm webrtc_backend_license_keys
docker compose up -d --build
```
