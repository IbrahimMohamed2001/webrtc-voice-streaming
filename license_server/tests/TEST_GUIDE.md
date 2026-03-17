# License Server Test Guide

## Quick Test Commands

### Start Services (if not running)
```bash
cd /mnt/Files/Programming/playground/webrtc_backend
docker compose up -d --build
```

### Run Automated Tests
```bash
cd license_server/tests

# Test license server API
chmod +x test_license_server.sh
./test_license_server.sh

# Test add-on simulation
chmod +x test_addon_simulation.sh
./test_addon_simulation.sh
```

---

## New Activation Flow (Admin-Gated)

The license system now uses a **two-step activation flow**:

1. **Admin creates pending license** - No hardware ID, waiting for customer
2. **Add-on registers hardware** - Gets `PENDING_<hwid>` token
3. **Admin clicks Activate** - Server generates real RSA-signed JWT
4. **Add-on validates** - Exchanges pending token for real token

---

## Manual Testing Steps

### 1. Health Check
```bash
curl -k https://localhost:8000/health
```
**Expected:** `{"status":"healthy","database":"healthy",...}`

---

### 2. Create Pending License (Admin)
```bash
curl -k -X POST https://localhost:8000/api/v1/admin/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "purchase_code": "YOUR-PURCHASE-CODE",
    "duration_days": 365
  }'

# Or unlimited:
curl -k -X POST https://localhost:8000/api/v1/admin/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "purchase_code": "YOUR-PURCHASE-CODE",
    "unlimited": true
  }'
```
**Expected:** `{"success": true, "status": "pending", ...}`

---

### 3. Add-on Registers Hardware
```bash
curl -k -X POST https://localhost:8000/api/v1/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "purchase_code": "YOUR-PURCHASE-CODE",
    "hardware_id": "abc123...",
    "hardware_components": {"machine_id": "abc", "mac": "00:11:22:33:44:55", "hostname": "myhost"}
  }'
```
**Expected:** `{"success": true, "token": "PENDING_...", "status": "pending_activation"}`

---

### 4. Admin Activates License
```bash
curl -k -X PATCH https://localhost:8000/api/v1/admin/licenses/YOUR-PURCHASE-CODE \
  -H "Content-Type: application/json" \
  -d '{"action": "activate"}'
```
**Expected:** `{"success": true, "new_status": "active"}`

---

### 5. Validate License
```bash
# Get token from DB
TOKEN=$(docker compose exec -T db psql -U license_user -d webrtc_licenses -t -c "SELECT token FROM licenses WHERE purchase_code='YOUR-PURCHASE-CODE';" | tr -d ' ')

curl -k -X POST https://localhost:8000/api/v1/validate \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"hardware_id\": \"YOUR_HWID\",
    \"session_id\": \"session-123\",
    \"telemetry\": {\"hardware_components\": {\"machine_id\": \"abc\", \"mac\": \"00:11:22:33:44:55\", \"hostname\": \"myhost\"}}
  }"
```
**Expected:** `{"valid": true, "status": "active"}`

---

### 6. Heartbeat
```bash
curl -k -X POST https://localhost:8000/api/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "session_id": "session-123"}'
```
**Expected:** `{"success": true}`

---

### 7. Check Status
```bash
curl -k https://localhost:8000/api/v1/status/YOUR-PURCHASE-CODE
```
**Expected:** License details including status, expiry, etc.

---

### 8. Get Public Key
```bash
curl -k https://localhost:8000/api/v1/public_key
```
**Expected:** PEM formatted public key

---

## Admin Actions

### Suspend License
```bash
curl -k -X PATCH https://localhost:8000/api/v1/admin/licenses/YOUR-CODE \
  -H "Content-Type: application/json" \
  -d '{"action": "suspend", "reason": "Payment issue"}'
```

### Reinstate License
```bash
curl -k -X PATCH https://localhost:8000/api/v1/admin/licenses/YOUR-CODE \
  -H "Content-Type: application/json" \
  -d '{"action": "reinstate"}'
```

### Reset License (for new device)
```bash
curl -k -X PATCH https://localhost:8000/api/v1/admin/licenses/YOUR-CODE \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
```

### Extend Duration
```bash
curl -k -X PATCH https://localhost:8000/api/v1/admin/licenses/YOUR-CODE \
  -H "Content-Type: application/json" \
  -d '{"action": "update", "extend_days": 30}'
```

### Make Unlimited
```bash
curl -k -X PATCH https://localhost:8000/api/v1/admin/licenses/YOUR-CODE \
  -H "Content-Type: application/json" \
  -d '{"action": "update", "set_unlimited": true}'
```

### Delete License
```bash
curl -k -X DELETE https://localhost:8000/api/v1/admin/licenses/YOUR-CODE
```

---

## Test Cases

### TC-001: Create Pending License
1. Create license via admin API
2. **Verify:** Success response with status "pending"

### TC-002: Add-on Registers Hardware
1. Send activation request with valid email and purchase code
2. **Verify:** Success response with PENDING_ token

### TC-003: Admin Activates
1. Admin clicks activate or calls PATCH API
2. **Verify:** Status changes to "active", real token generated

### TC-004: Valid Validation
1. Validate with correct token and hardware components
2. **Verify:** Success, valid=true

### TC-005: Hardware Mismatch
1. Validate with correct token but different hardware in telemetry
2. **Verify:** Fails with "Hardware mismatch", license suspended

### TC-006: Invalid Token
1. Validate with malformed token
2. **Verify:** Fails with "Invalid license"

### TC-007: Heartbeat
1. Send heartbeat after validation
2. **Verify:** Success

### TC-008: Status Check
1. Check status with purchase code
2. **Verify:** Returns license details

### TC-009: Unlimited License
1. Create license with unlimited=true
2. **Verify:** expires_at returns "unlimited"

### TC-010: Concurrent Sessions Detection
1. Validate same token from two different sessions
2. **Verify:** Warning count increases, auto-suspend after 3

---

## Database Verification

### View All Licenses
```bash
docker compose exec db psql -U license_user -d webrtc_licenses -c "SELECT id, user_email, hardware_id, status, expires_at FROM licenses;"
```

### View Validation Logs
```bash
docker compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM validation_logs;"
```

### View Sessions
```bash
docker compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM session_states;"
```

### View Security Incidents
```bash
docker compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM security_incidents;"
```

---

## View Logs

### License Server Logs
```bash
docker compose logs -f license_server
```

### All Logs
```bash
docker compose logs -f
```

---

## Stop Services
```bash
docker compose down
```

---

## Production Deployment Checklist

- [ ] Generate SSL certificates (Let's Encrypt)
- [ ] Update nginx config with domain
- [ ] Set SECRET_KEY environment variable
- [ ] Update ALLOWED_ORIGINS
- [ ] Backup private_key.pem
- [ ] Update CORS settings
- [ ] Configure firewall
- [ ] Setup monitoring
