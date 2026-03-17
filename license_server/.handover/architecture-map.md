# Architecture Map - WebRTC License Server

**Generated**: 2026-03-17  
**Project Root**: `/mnt/Files/Programming/playground/webrtc_backend/license_server`

---

## File Structure

```
license_server/
├── 📄 main.py                          # FastAPI application (848 lines)
├── 📄 models.py                        # SQLAlchemy ORM models (4 entities)
├── 📄 token_generator.py               # RSA JWT token service
├── 📄 hw_fingerprint.py                # Hardware fingerprinting (Linux-only)
├── 📄 generate_admin_hash.py           # Admin password hash generator
├── 📄 index.html                       # Admin dashboard SPA
├── 📄 requirements.txt                 # Python dependencies (11 packages)
├── 📄 .env.example                     # Environment template
├── 📄 Dockerfile                       # Container build instructions
├── 📄 docker-compose.yml               # Multi-service orchestration
│
├── 📁 nginx/
│   ├── 📄 nginx.conf                   # Main nginx configuration
│   └── 📁 conf.d/                      # Server block configurations
│
├── 📁 frontend/
│   ├── 📄 bundle.js                    # Compiled frontend JavaScript
│   └── 📁 css/                         # Stylesheets
│
├── 📁 tests/
│   ├── 📄 test_license_server.sh       # Integration test suite
│   ├── 📄 test_addon_simulation.sh     # Add-on simulation tests
│   └── 📄 TEST_GUIDE.md                # Testing documentation
│
└── 📁 .handover/                       # Generated documentation
    ├── 📄 00-README-FIRST.md           # Executive summary
    ├── 📄 01-SETUP-GUIDE.md            # Setup instructions
    ├── 📄 02-ARCHITECTURE.md           # System design
    ├── 📄 03-DECISION-LOG.md           # Architectural decisions
    ├── 📄 04-GOTCHAS.md                # Known issues
    ├── 📄 05-ONBOARDING-CHECKLIST.md   # New developer checklist
    │
    ├── 📁 .state/
    │   └── 📄 license_server-state.json  # Analysis state
    │
    ├── 📁 .context/
    │   └── 📄 license_server-context.md  # Analysis context log
    │
    └── 📁 internal/
        └── 📄 dependency-graph.json      # Internal artifact
```

---

## Component Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Dependencies                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FastAPI (0.104.1)                                              │
│  ├── uvicorn[standard] (ASGI server)                           │
│  ├── pydantic[email] (validation)                              │
│  └── python-multipart (form data)                              │
│                                                                  │
│  SQLAlchemy (2.0.23)                                            │
│  └── PostgreSQL driver (psycopg2 - implicit)                   │
│                                                                  │
│  Security                                                       │
│  ├── bcrypt (password hashing)                                 │
│  ├── pyjwt (JWT support)                                       │
│  ├── cryptography (RSA operations)                             │
│  └── itsdangerous (session signing)                            │
│                                                                  │
│  HTTP Client                                                    │
│  └── httpx (geolocation API calls)                             │
│                                                                  │
│  Production                                                     │
│  ├── gunicorn (process manager)                                │
│  └── nginx (reverse proxy)                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Services                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │     nginx       │───▶│  license_server │───▶│     db      │ │
│  │  (nginx:alpine) │    │ (FastAPI/Python)│    │(postgres:15)│ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────┤ │
│  │ Port: 80, 443   │    │ Port: 8000      │    │ Port: 5432  │ │
│  │ SSL Termination │    │ Business Logic  │    │ Data Store  │ │
│  │ Rate Limiting   │    │ Token Generation│    │ Persistence │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│         │                       │                      │        │
│         ▼                       ▼                      ▼        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Docker Volumes                         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ license_keys: /keys (RSA keys, SSL certs) - CRITICAL       ││
│  │ license_postgres_data: DB files - CRITICAL                 ││
│  │ license_logs: nginx logs - Low priority                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    License Lifecycle Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CREATE (Admin)                                               │
│     Dashboard → POST /api/v1/admin/licenses → Database          │
│     Status: pending                                             │
│                                                                  │
│  2. ACTIVATE (Add-on)                                            │
│     Add-on → POST /api/v1/activate → Database                   │
│     Hardware registered, Status: pending                        │
│                                                                  │
│  3. APPROVE (Admin)                                              │
│     Dashboard → PATCH /api/v1/admin/licenses/{code}             │
│     Token generated (RSA-signed JWT), Status: active            │
│                                                                  │
│  4. VALIDATE (Add-on)                                            │
│     Add-on → POST /api/v1/validate → TokenGenerator             │
│     → HwFingerprint → Database → SecurityIncident (if failed)   │
│     Status: active or suspended                                 │
│                                                                  │
│  5. HEARTBEAT (Add-on)                                           │
│     Add-on → POST /api/v1/heartbeat → SessionState              │
│     Session kept active                                         │
│                                                                  │
│  6. MONITOR (Admin)                                              │
│     Dashboard → GET /api/v1/admin/* → Database                  │
│     View licenses, sessions, incidents, logs                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoint Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Endpoint Groups                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PUBLIC (No Auth)                   ADMIN (Session Required)    │
│  ─────────────────                  ────────────────────────    │
│  POST /api/v1/activate              POST   /api/v1/admin/licenses
│  POST /api/v1/validate              GET    /api/v1/admin/licenses
│  POST /api/v1/heartbeat             PATCH  /api/v1/admin/licenses/{code}
│  GET  /api/v1/status/{code}         DELETE /api/v1/admin/licenses/{code}
│  GET  /api/v1/public_key            GET    /api/v1/admin/sessions
│  POST /api/v1/auth/login            GET    /api/v1/admin/incidents
│  POST /api/v1/auth/logout           GET    /api/v1/admin/logs
│  GET  /api/v1/auth/check                                      │
│  GET  /health                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    Entity Relationship Diagram                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│         ┌──────────────────────────────────────────┐            │
│         │              licenses                    │            │
│         │  ─────────────────────────────────────   │            │
│         │  id (PK), user_email, purchase_code,     │            │
│         │  hardware_id, token, expires_at,         │            │
│         │  status, warning_count, ...              │            │
│         └──────────────────────────────────────────┘            │
│                    │ 1:N                                        │
│         ┌───────────┼───────────────┬───────────┐              │
│         │           │               │           │              │
│         ▼           ▼               ▼           ▼              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │validation│ │security_ │ │session_  │ │          │         │
│  │_logs     │ │incidents │ │states    │ │          │         │
│  ├──────────┤ ├──────────┤ ├──────────┤ │          │         │
│  │id (PK)   │ │id (PK)   │ │id (PK)   │ │          │         │
│  │license_id│ │license_id│ │license_id│ │          │         │
│  │validated_│ │detected_ │ │session_  │ │          │         │
│  │at        │ │at        │ │id        │ │          │         │
│  │ip_address│ │incident_ │ │hardware_ │ │          │         │
│  │hardware_ │ │type      │ │id        │ │          │         │
│  │id        │ │severity  │ │last_     │ │          │         │
│  │session_id│ │action_   │ │heartbeat │ │          │         │
│  │...       │ │taken     │ │active    │ │          │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Flow Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Detection Flow                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Validation Request                                              │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │ 1. JWT Verify   │ ← RSA-4096 signature check                │
│  └────────┬────────┘                                            │
│           │ Invalid → HTTP 401                                  │
│           ▼ Valid                                               │
│  ┌─────────────────┐                                            │
│  │ 2. Checksum     │ ← SHA256(token\|hwid\|salt) verify         │
│  └────────┬────────┘                                            │
│           │ Mismatch → HTTP 401                                 │
│           ▼ Match                                               │
│  ┌─────────────────┐                                            │
│  │ 3. Hardware HW  │ ← Compare stored vs current               │
│  └────────┬────────┘                                            │
│           │ <60% match → Create incident (critical)             │
│           │              Auto-suspend license                   │
│           │              HTTP 403                               │
│           ▼ ≥60% match                                          │
│  ┌─────────────────┐                                            │
│  │ 4. Concurrent   │ ← Check active sessions (30min window)    │
│  └────────┬────────┘                                            │
│           │ >1 sessions → Create incident (high)                │
│           │               warning_count++                       │
│           │               Auto-suspend if ≥3                    │
│           ▼ All checks pass                                     │
│  ┌─────────────────┐                                            │
│  │ 5. Log Success  │ ← validation_logs + heartbeat             │
│  └─────────────────┘                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Critical Paths Summary

| Path | Files Involved | Risk Level |
|------|----------------|------------|
| Token Generation | `token_generator.py`, `/keys/*.pem` | 🔴 Critical |
| Hardware Fingerprinting | `hw_fingerprint.py` | 🟡 High |
| Admin Authentication | `main.py` (login endpoints) | 🟡 High |
| Database Operations | `models.py`, `main.py` | 🟡 High |
| Security Detection | `main.py` (validate endpoint) | 🟡 High |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~1,500 |
| Python Files | 5 |
| API Endpoints | 16 |
| Database Tables | 4 |
| Docker Services | 3 |
| Test Coverage | Integration tests only |

---

## Next Steps

Start with **[00-README-FIRST.md](./00-README-FIRST.md)** for executive overview.
