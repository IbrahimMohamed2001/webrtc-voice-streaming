# License Server - Gotchas

## Critical (Read Before Production)

### 1. Private Key Backup

**Issue**: Private key stored in Docker volume
**Impact**: If volume is lost/deleted, cannot issue new licenses
**Fix**: 
```bash
# Backup private key
docker compose exec license_server cat /keys/private_key.pem > backup/private_key.pem

# Or mount host directory in docker-compose.yml:
# volumes:
#   - ./keys:/keys
```

### 2. SSL Certificate Volume

**Issue**: SSL certs stored in named volume, not rebuilt on container restart
**Impact**: If volume exists from previous build, new certs won't be generated
**Fix**:
```bash
# Remove volume to regenerate certs
docker compose down
docker volume rm webrtc_backend_license_keys
docker compose up -d --build
```

### 3. Default Credentials

**Issue**: Default DB credentials in code
**Impact**: Security vulnerability
**Fix**: Use environment variables in production
```bash
# .env file
DATABASE_URL=postgresql://secure_user:secure_pass@db:5432/webrtc_licenses
```

### 4. CORS Wildcard

**Issue**: ALLOWED_ORIGINS defaults to "*"
**Impact**: Security vulnerability in production
**Fix**: Set specific origins
```bash
ALLOWED_ORIGINS=https://yourdomain.com
```

## Warnings

### 5. Hardware Match Threshold

**Issue**: 60% match allows some hardware changes
**Impact**: Could be exploited with partial hardware swaps
**Fix**: Adjust threshold in `hw_fingerprint.py` if needed

### 6. Geolocation External API

**Issue**: Uses ipapi.co for geolocation
**Impact**: External dependency, rate limits
**Fix**: Consider self-hosted GeoIP database

### 7. No Email Validation Webhook

**Issue**: Purchase code not validated against payment provider
**Impact**: Anyone can generate license with any purchase code
**Fix**: Integrate payment provider webhook

## Minor Issues

### 8. Session Cleanup

**Issue**: No automatic cleanup of old sessions
**Impact**: Session table grows indefinitely
**Fix**: Add cron job or background task

### 9. No Rate Limiting on Activation

**Issue**: Activation endpoint has no rate limit
**Impact**: Could be abused
**Fix**: Add rate limiting in Nginx

## Testing Notes

### Hardware Components Must Match

When testing validation, hardware_components in telemetry MUST match stored components:
```bash
# This FAILS - different components
{"telemetry": {"hardware_components": {"machine_id": "different"}}}

# This WORKS - same components
{"telemetry": {"hardware_components": {"machine_id": "machine1", "mac": "11:11:11:11:11:11", "hostname": "host1"}}}
```

### Database Cleanup

Run between tests:
```bash
docker compose exec db psql -U license_user -d webrtc_licenses -c "TRUNCATE licenses, validation_logs, session_states, security_incidents CASCADE;"
```

### Testing Pending Activation Flow

```bash
# Step 1: Create pending license
curl -X POST https://localhost:8000/api/v1/admin/licenses \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","purchase_code":"TEST-001","duration_days":365}'

# Step 2: Simulate add-on activation (will get PENDING_ token)
curl -X POST https://localhost:8000/api/v1/activate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","purchase_code":"TEST-001","hardware_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","hardware_components":{}}'

# Step 3: Admin activates via dashboard or API
curl -X PATCH https://localhost:8000/api/v1/admin/licenses/TEST-001 \
  -H "Content-Type: application/json" \
  -d '{"action":"activate"}'
```
