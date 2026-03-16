# License Server - Quick Reference

## What This Is

A production-ready license validation server for the WebRTC Voice Streaming add-on. Provides hardware-based license activation, validation, and security monitoring.

## Tech Stack

- **Python 3.11** - Runtime
- **FastAPI** - Web framework
- **PostgreSQL** - Database
- **Redis** - Session cache (available but not actively used)
- **Nginx** - Reverse proxy
- **Docker** - Containerization

## Quick Start

```bash
# Start all services
docker-compose up -d

# Check health
curl http://localhost:8000/health

# Activate license
curl -X POST http://localhost:8000/api/v1/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","purchase_code":"ABC123","hardware_id":"...","hardware_components":{}}'
```

## Key Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI application |
| `models.py` | SQLAlchemy database models |
| `token_generator.py` | RSA key & JWT token generation |
| `hw_fingerprint.py` | Hardware ID generation |
| `Dockerfile` | Container image |
| `docker-compose.yml` | Service orchestration |

## Test Scripts

```bash
./test_license_server.sh      # API tests
./test_addon_simulation.sh    # Add-on simulation
```
