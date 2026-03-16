# Analysis Context: License Server

## Discovery Log

- **[2026-03-16 17:00]**: Identified 6 Python modules in license_server/
- **[2026-03-16 17:01]**: Found FastAPI application with 6 endpoints
- **[2026-03-16 17:02]**: Identified SQLAlchemy models: License, ValidationLog, SecurityIncident, SessionState
- **[2026-03-16 17:03]**: Found RSA-4096 key generation in token_generator.py
- **[2026-03-16 17:04]**: Found hardware fingerprinting using machine-id, MAC, CPU serial, disk UUID, hostname
- **[2026-03-16 17:05]**: Identified Docker Compose orchestration with PostgreSQL, Redis, Nginx

## "Aha!" Moments (The "Why")

- The system uses hardware fingerprinting to prevent license sharing across devices
- Token includes checksum that binds it to specific hardware
- Hardware mismatch >40% triggers automatic license suspension
- Geolocation is fetched async via ipapi.co after validation

## Technical Debt & Gotchas

- **Critical**: Private key stored in Docker volume - must backup or lose ability to issue licenses
- **Warning**: CORS allows all origins by default in dev
- **Warning**: Redis service defined but not actively used
- **Note**: Hardware components matching requires 60% similarity (not exact match)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/v1/activate | POST | Activate new license |
| /api/v1/validate | POST | Validate license token |
| /api/v1/heartbeat | POST | Lightweight session check |
| /api/v1/status/{code} | GET | Check license status |
| /api/v1/public_key | GET | Get public key |
| /health | GET | Health check |

## Database Tables

- licenses: Stores license info with hardware binding
- validation_logs: Tracks validation history
- security_incidents: Logs security events
- session_states: Tracks active sessions
