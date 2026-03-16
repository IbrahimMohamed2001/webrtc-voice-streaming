# License Server - Quick Reference

## What This Is

A production-ready license validation server for the WebRTC Voice Streaming add-on. Provides hardware-based license activation with **admin-controlled approval flow**, validation, and security monitoring.

## Tech Stack

- **Python 3.11** - Runtime
- **FastAPI** - Web framework
- **PostgreSQL** - Database
- **Nginx** - Reverse proxy with SSL termination
- **Docker** - Containerization

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check health
curl -k https://localhost:8000/health

# Create a pending license (admin)
curl -X POST https://localhost:8000/api/v1/admin/licenses \
  -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","purchase_code":"ABC123","duration_days":365}'
```

## Key Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI application (all endpoints) |
| `models.py` | SQLAlchemy database models |
| `token_generator.py` | RSA key & JWT token generation |
| `hw_fingerprint.py` | Hardware ID generation |
| `index.html` | Admin dashboard UI |
| `Dockerfile` | Container image (generates SSL certs) |

## Key URLs

| Service | URL |
|---------|-----|
| Dashboard | https://localhost/ |
| API | https://localhost:8000 |
| Health | https://localhost:8000/health |
