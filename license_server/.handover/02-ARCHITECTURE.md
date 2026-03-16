# License Server - Architecture

## System Overview

```
┌─────────────────┐     HTTPS      ┌─────────────────┐
│  Add-on/Client │ ─────────────> │  Nginx Reverse  │
│                 │   (port 443)   │     Proxy       │
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
            │   PostgreSQL   │      │   SSL Certs    │      │  External API  │
            │   (licenses)  │      │  (/keys vol)    │      │   (ipapi.co)  │
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

### 5. Admin Dashboard (`index.html`)

- Modern dark-themed HTML/CSS/JS UI
- Custom modals (no native browser prompts)
- Real-time license management

### 6. SSL Certificate Generation

- Self-signed certs generated in Dockerfile at build time
- Shared via `license_keys` Docker volume to nginx

## License Status Flow

```
pending → (add-on registers hardware) → pending_activation → (admin clicks Activate) → active
                                                                      ↓
                                      suspended ← (security incident / admin action)
                                      expired ← (expires_at reached)
                                      revoked ← (admin action)
```

## API Flow

### Activation Flow (Two-Step)

```
Step 1 - Add-on Activation:
1. Client sends: email, purchase_code, hardware_id, hardware_components
2. Server finds pending license, records hardware_id
3. Returns: {token: "PENDING_<hwid>", status: "pending_activation"}

Step 2 - Admin Approval:
1. Admin clicks "Activate" in dashboard
2. Server generates RSA-signed JWT token
3. Returns: {success: true, new_status: "active"}

Step 3 - Add-on Validation:
1. Add-on calls /validate with pending token
2. Server detects PENDING_ prefix, exchanges for real token
3. Returns: {valid: true, token: "<real_jwt>", expires_at: "..."}
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

## Unlimited Licenses

- `expires_at` column is nullable (NULL = unlimited)
- Set via `unlimited: true` when creating license or admin action

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| DATABASE_URL | postgresql://... | PostgreSQL connection |
| SECRET_KEY | auto-generated | Session secret |
| ALLOWED_ORIGINS | http://localhost | CORS origins |
