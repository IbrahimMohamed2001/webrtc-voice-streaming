#!/bin/bash
set -e

BASE_URL="https://localhost"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

echo "Waiting for server to be ready..."
for i in {1..30}; do
    if curl -sk "$BASE_URL/health" 2>/dev/null | grep -q '"status":"healthy"'; then
        echo "Server is ready!"
        break
    fi
    sleep 1
done

echo "========================================"
echo "License Server Test Suite"
echo "========================================"
echo ""

# ============================================
# Login first to get session cookie
# ============================================
echo "=== LOGIN ==="
COOKIE_FILE=$(mktemp)
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}' \
    -c "$COOKIE_FILE")
if echo "$RESP" | grep -q '"success":true'; then
    pass "Login successful"
else
    fail "Login failed: $RESP"
    exit 1
fi
echo ""

# ============================================
# TEST 1: Health Check
# ============================================
echo "=== TEST 1: Health Check ==="
RESP=$(curl -sk "$BASE_URL/health")
if echo "$RESP" | grep -q '"status":"healthy"'; then
    pass "Server is healthy"
else
    fail "Server not healthy: $RESP"
fi
echo ""

# ============================================
# TEST 2: Get Public Key
# ============================================
echo "=== TEST 2: Get Public Key ==="
PUBKEY=$(curl -sk "$BASE_URL/api/v1/public_key" | python3 -c "import sys,json; print(json.load(sys.stdin)['public_key'][:50])")
if [ -n "$PUBKEY" ]; then
    pass "Public key retrieved: $PUBKEY..."
else
    fail "Failed to get public key"
fi
echo ""

# ============================================
# TEST 3: Create Pending License (Admin)
# ============================================
echo "=== TEST 3: Create Pending License (Admin) ==="
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/admin/licenses" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "email": "test@example.com",
        "purchase_code": "ADMIN-TEST-001",
        "duration_days": 365
    }')

if echo "$RESP" | grep -q '"success":true'; then
    pass "Pending license created"
    info "Status: pending (waiting for add-on to register hardware)"
else
    fail "Failed to create license: $RESP"
fi
echo ""

# ============================================
# TEST 4: Add-on Registers Hardware (Gets PENDING_ token)
# ============================================
echo "=== TEST 4: Add-on Registers Hardware ==="
HWID_VALID="1111111111111111111111111111111111111111111111111111111111111111"
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"test@example.com\",
        \"purchase_code\": \"ADMIN-TEST-001\",
        \"hardware_id\": \"$HWID_VALID\",
        \"hardware_components\": {\"machine_id\": \"machine1\", \"mac\": \"11:11:11:11:11:11\", \"hostname\": \"host1\"}
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "Hardware registered successfully"
    TOKEN_PENDING=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
    info "Received PENDING_ token: ${TOKEN_PENDING:0:50}..."
else
    fail "Hardware registration failed: $RESP"
    TOKEN_PENDING=""
fi
echo ""

# ============================================
# TEST 5: Admin Activates License (Generates Real Token)
# ============================================
echo "=== TEST 5: Admin Activates License ==="
if [ -n "$TOKEN_PENDING" ]; then
    RESP=$(curl -sk -X PATCH "$BASE_URL/api/v1/admin/licenses/ADMIN-TEST-001" \
        -H "Content-Type: application/json" \
        -b "$COOKIE_FILE" \
        -d '{"action": "activate"}')
    
    if echo "$RESP" | grep -q '"success":true'; then
        pass "License activated by admin"
        info "New status: active"
    else
        fail "Activation failed: $RESP"
    fi
else
    info "Skipped (no pending token)"
fi
echo ""

# ============================================
# TEST 6: Get Active Token from DB (for validation tests)
# ============================================
echo "=== TEST 6: Get Active Token ==="
TOKEN_VALID=$(docker compose exec -T db psql -U license_user -d webrtc_licenses -t --quiet -c "SELECT token FROM licenses WHERE purchase_code='ADMIN-TEST-001';" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
if [ -n "$TOKEN_VALID" ] && [ "$TOKEN_VALID" != "None" ]; then
    pass "Retrieved active token"
    info "Token: ${TOKEN_VALID:0:50}..."
else
    fail "Failed to get token"
    TOKEN_VALID=""
fi
echo ""

# ============================================
# TEST 7: Validate License (correct HW)
# ============================================
echo "=== TEST 7: Validate License (correct HW) ==="
if [ -n "$TOKEN_VALID" ]; then
    RESP=$(curl -sk -X POST "$BASE_URL/api/v1/validate" \
        -H "Content-Type: application/json" \
        -d "{
            \"token\": \"$TOKEN_VALID\",
            \"hardware_id\": \"$HWID_VALID\",
            \"session_id\": \"session-valid-001\",
            \"telemetry\": {\"hardware_components\": {\"machine_id\": \"machine1\", \"mac\": \"11:11:11:11:11:11\", \"hostname\": \"host1\"}}
        }")
    
    if echo "$RESP" | grep -q '"valid":true'; then
        pass "Validation successful with correct HW"
    else
        fail "Validation failed: $RESP"
    fi
else
    info "Skipped (no token)"
fi
echo ""

# ============================================
# TEST 8: Status Check
# ============================================
echo "=== TEST 8: Status Check ==="
RESP=$(curl -sk "$BASE_URL/api/v1/status/ADMIN-TEST-001")
if echo "$RESP" | grep -q '"status":"active"'; then
    pass "Status check successful - license is active"
else
    fail "Status check failed: $RESP"
fi
echo ""

# ============================================
# TEST 9: Create License for Hardware Mismatch Test
# ============================================
echo "=== TEST 9: Create License for Hardware Mismatch Test ==="
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/admin/licenses" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "email": "mismatch@test.com",
        "purchase_code": "MISMATCH-TEST-001",
        "duration_days": 365
    }')

if echo "$RESP" | grep -q '"success":true'; then
    pass "License created for mismatch test"
else
    fail "Failed: $RESP"
fi
echo ""

# ============================================
# TEST 10: Add-on Registers Hardware (Mismatch Test)
# ============================================
echo "=== TEST 10: Add-on Registers Hardware (Mismatch Test) ==="
HWID_MISMATCH="2222222222222222222222222222222222222222222222222222222222222222"
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"mismatch@test.com\",
        \"purchase_code\": \"MISMATCH-TEST-001\",
        \"hardware_id\": \"$HWID_MISMATCH\",
        \"hardware_components\": {\"machine_id\": \"machine2\", \"mac\": \"22:22:22:22:22:22\", \"hostname\": \"host2\"}
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "Hardware registered"
else
    fail "Failed: $RESP"
fi
echo ""

# ============================================
# TEST 11: Admin Activates Mismatch License
# ============================================
echo "=== TEST 11: Admin Activates Mismatch License ==="
RESP=$(curl -sk -X PATCH "$BASE_URL/api/v1/admin/licenses/MISMATCH-TEST-001" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{"action": "activate"}')

if echo "$RESP" | grep -q '"success":true'; then
    pass "License activated"
    TOKEN_MISMATCH=$(docker compose exec -T db psql -U license_user -d webrtc_licenses -t --quiet -c "SELECT token FROM licenses WHERE purchase_code='MISMATCH-TEST-001';" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
else
    fail "Failed: $RESP"
    TOKEN_MISMATCH=""
fi
echo ""

# ============================================
# TEST 12: Validate License (wrong HW - should fail)
# ============================================
echo "=== TEST 12: Validate License (wrong HW - should fail) ==="
if [ -n "$TOKEN_MISMATCH" ]; then
    RESP=$(curl -sk -X POST "$BASE_URL/api/v1/validate" \
        -H "Content-Type: application/json" \
        -d "{
            \"token\": \"$TOKEN_MISMATCH\",
            \"hardware_id\": \"$HWID_MISMATCH\",
            \"session_id\": \"session-mismatch-001\",
            \"telemetry\": {\"hardware_components\": {\"machine_id\": \"hacked\", \"mac\": \"aa:bb:cc:dd:ee:ff\"}}
        }")
    
    if echo "$RESP" | grep -q 'Hardware mismatch'; then
        pass "Correctly detected hardware mismatch"
    else
        fail "Should have detected hardware mismatch: $RESP"
    fi
else
    info "Skipped (no token)"
fi
echo ""

# ============================================
# TEST 13: Verify License Suspended
# ============================================
echo "=== TEST 13: Verify License Suspended ==="
sleep 1
RESP=$(curl -sk "$BASE_URL/api/v1/status/MISMATCH-TEST-001")
if echo "$RESP" | grep -q '"status":"suspended"'; then
    pass "License correctly suspended after hardware mismatch"
else
    fail "Should be suspended: $RESP"
fi
echo ""

# ============================================
# TEST 14: Heartbeat
# ============================================
echo "=== TEST 14: Heartbeat ==="
if [ -n "$TOKEN_VALID" ]; then
    RESP=$(curl -sk -X POST "$BASE_URL/api/v1/heartbeat" \
        -H "Content-Type: application/json" \
        -d "{\"token\": \"$TOKEN_VALID\", \"session_id\": \"session-valid-001\"}")
    
    if echo "$RESP" | grep -q '"success":true'; then
        pass "Heartbeat successful"
    else
        fail "Heartbeat failed: $RESP"
    fi
else
    info "Skipped (no token)"
fi
echo ""

# ============================================
# TEST 15: Invalid Token
# ============================================
echo "=== TEST 15: Invalid Token (should fail) ==="
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/validate" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"invalid.token.here\",
        \"hardware_id\": \"$HWID_VALID\",
        \"session_id\": \"session-003\",
        \"telemetry\": {}
    }")

if echo "$RESP" | grep -q 'Invalid license'; then
    pass "Correctly rejected invalid token"
else
    fail "Should have rejected invalid token: $RESP"
fi
echo ""

# ============================================
# TEST 16: Non-existent Status
# ============================================
echo "=== TEST 16: Non-existent Status (should fail) ==="
RESP=$(curl -sk "$BASE_URL/api/v1/status/NONEXISTENT")
if echo "$RESP" | grep -q 'not found'; then
    pass "Correctly returned not found"
else
    fail "Should have returned not found: $RESP"
fi
echo ""

# ============================================
# TEST 17: Unlimited License
# ============================================
echo "=== TEST 17: Create Unlimited License ==="
RESP=$(curl -sk -X POST "$BASE_URL/api/v1/admin/licenses" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{
        "email": "unlimited@test.com",
        "purchase_code": "UNLIMITED-TEST-001",
        "unlimited": true
    }')

if echo "$RESP" | grep -q '"success":true'; then
    if echo "$RESP" | grep -q '"unlimited":true'; then
        pass "Unlimited license created"
    else
        fail "License created but not unlimited: $RESP"
    fi
else
    fail "Failed: $RESP"
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo "========================================"
echo "All Tests Complete!"
echo "========================================"
echo ""
info "Database queries to verify:"
echo "  docker compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT user_email, status, hardware_id FROM licenses;'"
echo "  docker compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT * FROM validation_logs;'"
echo "  docker compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT * FROM security_incidents;'"
echo ""
info "View logs:"
echo "  docker compose logs -f license_server"
