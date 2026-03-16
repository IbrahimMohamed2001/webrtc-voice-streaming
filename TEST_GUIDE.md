# License Server Test Guide

## Quick Test Commands

### Start Services (if not running)
```bash
cd /mnt/Files/Programming/playground/webrtc_backend
make up
```

### Run Automated Tests
```bash
# Test license server API
chmod +x test_license_server.sh
./test_license_server.sh

# Test add-on simulation
chmod +x test_addon_simulation.sh
./test_addon_simulation.sh
```

---

## Manual Testing Steps

### 1. Health Check
```bash
curl http://localhost:8000/health
```
**Expected:** `{"status":"healthy","database":"healthy",...}`

---

### 2. Activate License
```bash
curl -X POST http://localhost:8000/api/v1/activate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "purchase_code": "YOUR-PURCHASE-CODE",
    "hardware_id": "abc123...",
    "hardware_components": {"machine_id": "abc", "mac": "00:11:22:33:44:55", "hostname": "myhost"}
  }'
```
**Expected:** `{"success": true, "token": "..."}`

---

### 3. Validate License
```bash
# Replace TOKEN and HWID with actual values
curl -X POST http://localhost:8000/api/v1/validate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN",
    "hardware_id": "YOUR_HWID",
    "session_id": "session-123",
    "telemetry": {"hardware_components": {"machine_id": "abc", "mac": "00:11:22:33:44:55", "hostname": "myhost"}}
  }'
```
**Expected:** `{"valid": true, "status": "active"}`

---

### 4. Heartbeat
```bash
curl -X POST http://localhost:8000/api/v1/heartbeat \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "session_id": "session-123"}'
```
**Expected:** `{"success": true}`

---

### 5. Check Status
```bash
curl http://localhost:8000/api/v1/status/YOUR-PURCHASE-CODE
```
**Expected:** License details including status, expiry, etc.

---

### 6. Get Public Key
```bash
curl http://localhost:8000/api/v1/public_key
```
**Expected:** PEM formatted public key

---

## Test Cases

### TC-001: Valid Activation
1. Send activation request with valid email and purchase code
2. **Verify:** Success response with token

### TC-002: Duplicate Hardware
1. Try to activate with same hardware ID twice
2. **Verify:** Second request fails with "already activated"

### TC-003: Duplicate Email
1. Activate with email that already has active license
2. **Verify:** Fails with "email already has active license"

### TC-004: Valid Validation
1. Validate with correct token and hardware components
2. **Verify:** Success, valid=true

### TC-005: Hardware Mismatch
1. Validate with correct token but different hardware
2. **Verify:** Fails with "Hardware mismatch"

### TC-006: Invalid Token
1. Validate with malformed token
2. **Verify:** Fails with "Invalid license"

### TC-007: Expired Token
1. Wait for token to expire (or check logic)
2. **Verify:** Fails with "Token expired"

### TC-008: Heartbeat
1. Send heartbeat after validation
2. **Verify:** Success

### TC-009: Status Check
1. Check status with purchase code
2. **Verify:** Returns license details

### TC-010: Concurrent Sessions Detection
1. Validate same token from two different sessions
2. **Verify:** Warning count increases

---

## Database Verification

### View All Licenses
```bash
docker-compose exec db psql -U license_user -d webrtc_licenses -c "SELECT id, user_email, hardware_id, status FROM licenses;"
```

### View Validation Logs
```bash
docker-compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM validation_logs;"
```

### View Sessions
```bash
docker-compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM session_states;"
```

### View Security Incidents
```bash
docker-compose exec db psql -U license_user -d webrtc_licenses -c "SELECT * FROM security_incidents;"
```

---

## View Logs

### License Server Logs
```bash
docker-compose logs -f license_server
```

### All Logs
```bash
docker-compose logs -f
```

---

## Stop Services
```bash
make down
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
