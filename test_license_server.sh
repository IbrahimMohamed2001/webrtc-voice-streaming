#!/bin/bash
set -e

BASE_URL="http://localhost:8000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

echo "========================================"
echo "License Server Test Suite"
echo "========================================"
echo ""

# ============================================
# TEST 1: Health Check
# ============================================
echo "=== TEST 1: Health Check ==="
RESP=$(curl -s "$BASE_URL/health")
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
PUBKEY=$(curl -s "$BASE_URL/api/v1/public_key" | python3 -c "import sys,json; print(json.load(sys.stdin)['public_key'][:50])")
if [ -n "$PUBKEY" ]; then
    pass "Public key retrieved: $PUBKEY..."
else
    fail "Failed to get public key"
fi
echo ""

# ============================================
# TEST 3: Activate New License (for validation tests)
# ============================================
echo "=== TEST 3: Activate New License (for validation tests) ==="
HWID_VALID="1111111111111111111111111111111111111111111111111111111111111111"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"validation@test.com\",
        \"purchase_code\": \"VALIDATION-TEST-001\",
        \"hardware_id\": \"$HWID_VALID\",
        \"hardware_components\": {\"machine_id\": \"machine1\", \"mac\": \"11:11:11:11:11:11\", \"hostname\": \"host1\"}
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "License activated successfully"
    TOKEN_VALID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
    info "Token: ${TOKEN_VALID:0:50}..."
else
    fail "Activation failed: $RESP"
    TOKEN_VALID=""
fi
echo ""

# ============================================
# TEST 4: Validate License (correct HW)
# ============================================
echo "=== TEST 4: Validate License (correct HW) ==="
if [ -n "$TOKEN_VALID" ]; then
    RESP=$(curl -s -X POST "$BASE_URL/api/v1/validate" \
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
# TEST 5: Status Check (before hardware mismatch test)
# ============================================
echo "=== TEST 5: Status Check (before hardware mismatch) ==="
RESP=$(curl -s "$BASE_URL/api/v1/status/VALIDATION-TEST-001")
if echo "$RESP" | grep -q '"status":"active"'; then
    pass "Status check successful - license is active"
else
    fail "Status check failed: $RESP"
fi
echo ""

# ============================================
# TEST 6: Activate License (for hardware mismatch test)
# ============================================
echo "=== TEST 6: Activate License (for hardware mismatch test) ==="
HWID_MISMATCH="2222222222222222222222222222222222222222222222222222222222222222"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"mismatch@test.com\",
        \"purchase_code\": \"MISMATCH-TEST-001\",
        \"hardware_id\": \"$HWID_MISMATCH\",
        \"hardware_components\": {\"machine_id\": \"machine2\", \"mac\": \"22:22:22:22:22:22\", \"hostname\": \"host2\"}
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "License for mismatch test activated"
    TOKEN_MISMATCH=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
else
    fail "Activation failed: $RESP"
    TOKEN_MISMATCH=""
fi
echo ""

# ============================================
# TEST 7: Validate License (wrong HW - should fail)
# ============================================
echo "=== TEST 7: Validate License (wrong HW - should fail) ==="
if [ -n "$TOKEN_MISMATCH" ]; then
    RESP=$(curl -s -X POST "$BASE_URL/api/v1/validate" \
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
# TEST 8: Duplicate Hardware ID
# ============================================
echo "=== TEST 8: Duplicate Hardware ID (should fail) ==="
RESP=$(curl -s -X POST "$BASE_URL/api/v1/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"another@test.com\",
        \"purchase_code\": \"TEST-DUP\",
        \"hardware_id\": \"$HWID_VALID\",
        \"hardware_components\": {\"machine_id\": \"machine3\", \"mac\": \"33:33:33:33:33:33\"}
    }")

if echo "$RESP" | grep -q 'already activated'; then
    pass "Correctly rejected duplicate hardware"
else
    fail "Should have rejected duplicate hardware: $RESP"
fi
echo ""

# ============================================
# TEST 9: Heartbeat
# ============================================
echo "=== TEST 9: Heartbeat ==="
if [ -n "$TOKEN_VALID" ]; then
    RESP=$(curl -s -X POST "$BASE_URL/api/v1/heartbeat" \
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
# TEST 10: Invalid Token
# ============================================
echo "=== TEST 10: Invalid Token (should fail) ==="
RESP=$(curl -s -X POST "$BASE_URL/api/v1/validate" \
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
# TEST 11: Non-existent Status
# ============================================
echo "=== TEST 11: Non-existent Status (should fail) ==="
RESP=$(curl -s "$BASE_URL/api/v1/status/NONEXISTENT")
if echo "$RESP" | grep -q 'not found'; then
    pass "Correctly returned not found"
else
    fail "Should have returned not found: $RESP"
fi
echo ""

# ============================================
# TEST 12: Check Status After Hardware Mismatch
# ============================================
echo "=== TEST 12: Check Status After Hardware Mismatch ==="
RESP=$(curl -s "$BASE_URL/api/v1/status/MISMATCH-TEST-001")
if echo "$RESP" | grep -q '"status":"suspended"'; then
    pass "License correctly suspended after hardware mismatch"
else
    fail "Should be suspended: $RESP"
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
echo "  docker-compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT * FROM licenses;'"
echo "  docker-compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT * FROM validation_logs;'"
echo "  docker-compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT * FROM security_incidents;'"
echo ""
info "View logs:"
echo "  docker-compose logs -f license_server"
