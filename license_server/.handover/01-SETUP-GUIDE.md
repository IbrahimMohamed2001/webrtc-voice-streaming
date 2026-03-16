# License Server - Setup Guide

## Prerequisites

- Docker & Docker Compose
- Port 8000 available (API)
- Port 80/443 available (Nginx)

## Zero-to-Hero Setup

### 1. Clone & Navigate

```bash
cd /mnt/Files/Programming/playground/webrtc_backend
```

### 2. Generate SSL Certificates

```bash
# For development (self-signed)
bash generate-ssl.sh

# For production (Let's Encrypt)
certbot certonly --nginx -d license.yourdomain.com
```

### 3. Configure Environment (Production)

```bash
# Copy and edit environment
cp .env.example .env

# Edit .env with:
# - SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
# - ALLOWED_ORIGINS=https://yourdomain.com
```

### 4. Build & Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 5. Verify

```bash
# Health check
curl http://localhost:8000/health

# Should return: {"status":"healthy","database":"healthy"}
```

### 6. Run Tests

```bash
# Clean database first
docker-compose exec db psql -U license_user -d webrtc_licenses -c "TRUNCATE licenses, validation_logs, session_states, security_incidents CASCADE;"

# Run tests
./test_license_server.sh
./test_addon_simulation.sh
```

## Service URLs

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Nginx HTTP | http://localhost:80 |
| Nginx HTTPS | https://localhost:443 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Database Connection

```bash
# Connect to database
docker-compose exec db psql -U license_user -d webrtc_licenses

# View tables
docker-compose exec db psql -U license_user -d webrtc_licenses -c "\dt"

# View licenses
docker-compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM licenses;"
```

## Stop Services

```bash
docker-compose down        # Stop
docker-compose down -v    # Stop and remove volumes
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs license_server

# Check database connectivity
docker-compose exec license_server python3 -c "from sqlalchemy import create_engine; engine = create_engine('postgresql://license_user:license_pass@db:5432/webrtc_licenses'); engine.connect()"
```

### SSL Certificate Issues

```bash
# Regenerate self-signed certs
rm nginx/ssl/*.pem
bash generate-ssl.sh
docker-compose restart nginx
```
