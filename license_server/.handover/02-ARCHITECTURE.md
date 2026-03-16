# License Server - Architecture

## System Overview

```
┌─────────────────┐     HTTPS      ┌─────────────────┐
│  Add-on/Client │ ─────────────> │  Nginx Reverse  │
│                 │                │     Proxy       │
└─────────────────┘                └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  FastAPI App    │
                                    │  (Gunicorn)     │
                                    └────────┬────────┘
                                             │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
           ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
           │   PostgreSQL   │      │     Redis      │      │  External API  │
           │   (licenses)   │      │   (sessions)   │      │   (ipapi.co)  │
           └────────────────┘      └────────────────┘      └────────────────┘
```

## Components

### 1. FastAPI Application (`main.py`)

- **Purpose**: REST API server
- **Workers**: 2 Gunicorn workers with Uvicorn
- **Port**: 8000

### 2. Database Models (`models.py`)

| Table | Purpose |
|-------|---------|
| `licenses` | License records with hardware binding |
| `validation_logs` | Validation history with geolocation |
| `security_incidents` | Security events (HW mismatch, etc.) |
| `session_states` | Active session tracking |

### 3. Token System (`token_generator.py`)

- **Algorithm**: RSA-4096 with JWT RS256
- **Hardware Binding**: SHA256 checksum of token + hardware_id
- **Key Storage**: `/keys/private_key.pem`, `/keys/public_key.pem`
- **Token Format**: Base64 encoded `{jwt}.{checksum}`

### 4. Hardware Fingerprinting (`hw_fingerprint.py`)

Collects multiple components:
1. `/etc/machine-id` (Linux)
2. Primary MAC address
3. CPU serial (Raspberry Pi)
4. Root filesystem UUID
5. Hostname

**Final HWID**: SHA256 hash of sorted components

### 5. Security Logic

- **Hardware Match Threshold**: 60% (allows minor changes)
- **Concurrent Sessions**: Warn after 1, suspend after 3
- **Auto-Suspend**: Critical incidents (hardware_mismatch)
- **Session Timeout**: 30 minutes

## API Flow

### Activation Flow

```
1. Client sends: email, purchase_code, hardware_id, hardware_components
2. Server checks:
   - Hardware not already activated?
   - Email doesn't have active license?
3. Generate JWT token with RSA signature
4. Add hardware checksum
5. Store in database with status='active'
6. Return token to client
```

### Validation Flow

```
1. Client sends: token, hardware_id, session_id, telemetry
2. Server verifies:
   - JWT signature (RSA public key)
   - Hardware checksum
   - Token expiration
   - License status (not suspended/revoked)
   - Hardware components match (≥60%)
   - No concurrent sessions
3. Log validation
4. Update session
5. Return valid=true/false
```

## Data Flow

```
Request → Nginx → FastAPI → Token Verification → DB Query → Response
                                       ↓
                              Hardware Validation
                                       ↓
                              Security Incident Check
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| DATABASE_URL | postgresql://... | PostgreSQL connection |
| SECRET_KEY | auto-generated | Session secret |
| ALLOWED_ORIGINS | http://localhost | CORS origins |
