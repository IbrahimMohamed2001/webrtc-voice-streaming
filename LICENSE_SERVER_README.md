# License Server - Production Deployment Guide

## Quick Start

```bash
# 1. Generate SSL certificates (self-signed for development)
make generate-ssl

# 2. Build and start all services
make build
make up

# 3. Test the server
make test

# 4. View logs
make logs
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| license_server | 8000 | FastAPI application |
| license_db | 5432 | PostgreSQL database |
| nginx | 80/443 | Reverse proxy with SSL |

## API Endpoints

- `POST /api/v1/activate` - Activate a new license
- `POST /api/v1/validate` - Validate license token
- `POST /api/v1/heartbeat` - Lightweight session check
- `GET /api/v1/status/{purchase_code}` - Check license status
- `GET /api/v1/public_key` - Get public key for offline validation
- `GET /health` - Health check

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | postgresql://license_user:license_pass@db:5432/webrtc_licenses | PostgreSQL connection |
| SECRET_KEY | auto-generated | Secret key for sessions |
| ALLOWED_ORIGINS | http://localhost,https://localhost | CORS allowed origins |

## Production Deployment

1. **Generate SSL certificates**:
   ```bash
   # For production, use Let's Encrypt:
   certbot certonly --nginx -d license.yourdomain.com
   ```

2. **Update nginx configuration** with your domain and SSL certificate paths.

3. **Set production environment variables**:
   ```bash
   export SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
   export ALLOWED_ORIGINS=https://yourdomain.com
   ```

4. **Backup the private key**: The keys are stored in the `license_keys` Docker volume. Back up `/keys/private_key.pem` securely - without it, you cannot issue new licenses.

## Directory Structure

```
.
├── license_server/
│   ├── main.py              # FastAPI application
│   ├── models.py            # SQLAlchemy models
│   ├── token_generator.py   # JWT token generation
│   ├── hw_fingerprint.py    # Hardware fingerprinting
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile           # Container image
├── nginx/
│   ├── nginx.conf           # Main nginx config
│   └── conf.d/
│       └── license-server.conf
├── docker-compose.yml
├── generate-ssl.sh
└── Makefile
```

## Security Notes

- The private key is stored in a Docker volume and must be backed up
- Change default database credentials in production
- Use strong SECRET_KEY values
- Restrict ALLOWED_ORIGINS to your actual domains
- Use proper SSL certificates in production (Let's Encrypt or purchased)
