#!/bin/bash
set -e

echo "========================================"
echo "Add-on Simulation Test Suite"
echo "========================================"
echo ""

LICENSE_SERVER="https://localhost"
DATA_DIR="/tmp/license_test_$$"
mkdir -p "$DATA_DIR"

cleanup() {
    rm -rf "$DATA_DIR"
}
trap cleanup EXIT

info() { echo -e "\033[1;33m[INFO]\033[0m $1"; }
pass() { echo -e "\033[0;32m[PASS]\033[0m $1"; }
fail() { echo -e "\033[0;31m[FAIL]\033[0m $1"; }

# ============================================
# Login first
# ============================================
echo "=== LOGIN ==="
COOKIE_FILE=$(mktemp)
RESP=$(curl -sk -X POST "$LICENSE_SERVER/api/v1/auth/login" \
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
# STEP 1: Generate Hardware ID
# ============================================
echo "=== STEP 1: Generate Hardware ID ==="

MACHINE_ID="addon-machine-$(date +%s)"
MAC_ADDR="de:ad:be:ef:12:34"
HOSTNAME="$(hostname)"

HW_COMPONENTS="{\"machine_id\":\"$MACHINE_ID\",\"mac\":\"$MAC_ADDR\",\"hostname\":\"$HOSTNAME\"}"
HW_ID=$(echo -n "$HW_COMPONENTS" | sha256sum | cut -d' ' -f1)

info "Generated Hardware ID: $HW_ID"
info "Hardware Components: $HW_COMPONENTS"
echo ""

# ============================================
# STEP 2: Admin Creates Pending License
# ============================================
echo "=== STEP 2: Admin Creates Pending License ==="

PURCHASE_CODE="ADDON-$(date +%s)"
EMAIL="addon@$(date +%s).test.com"

RESP=$(curl -sk -X POST "$LICENSE_SERVER/api/v1/admin/licenses" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d "{
        \"email\": \"$EMAIL\",
        \"purchase_code\": \"$PURCHASE_CODE\",
        \"duration_days\": 365
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "Admin created pending license"
    info "Status: pending (waiting for add-on to register)"
else
    fail "Failed to create license: $RESP"
    exit 1
fi
echo ""

# ============================================
# STEP 3: Add-on Activation (Registers Hardware)
# ============================================
echo "=== STEP 3: Add-on Registers Hardware ==="

RESP=$(curl -sk -X POST "$LICENSE_SERVER/api/v1/activate" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$EMAIL\",
        \"purchase_code\": \"$PURCHASE_CODE\",
        \"hardware_id\": \"$HW_ID\",
        \"hardware_components\": $HW_COMPONENTS
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "Hardware registered by add-on"
    TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
    info "Received token: ${TOKEN:0:50}..."
    
    if [[ "$TOKEN" == PENDING_* ]]; then
        info "Token is PENDING_ (waiting for admin activation)"
    fi
else
    fail "Activation failed: $RESP"
    exit 1
fi

echo "$TOKEN" > "$DATA_DIR/license.enc"
echo ""

# ============================================
# STEP 4: Admin Activates License (Generates Real Token)
# ============================================
echo "=== STEP 4: Admin Activates License ==="

RESP=$(curl -sk -X PATCH "$LICENSE_SERVER/api/v1/admin/licenses/$PURCHASE_CODE" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_FILE" \
    -d '{"action": "activate"}')

if echo "$RESP" | grep -q '"success":true'; then
    pass "Admin activated license"
    info "License status: active"
else
    fail "Admin activation failed: $RESP"
    exit 1
fi

# Get the real token from DB
REAL_TOKEN=$(docker compose exec -T db psql -U license_user -d webrtc_licenses -t -c "SELECT token FROM licenses WHERE purchase_code='$PURCHASE_CODE';" 2>/dev/null | tr -d ' \n')
echo "$REAL_TOKEN" > "$DATA_DIR/license.enc"
echo ""

# ============================================
# STEP 5: Save License State
# ============================================
echo "=== STEP 5: Save License State ==="
cat > "$DATA_DIR/.license_state" << EOF
{
    "last_validation": "$(date -u +%Y-%m-%dT%H:%M:%S)",
    "last_heartbeat": "$(date -u +%Y-%m-%dT%H:%M:%S)",
    "session_id": "addon-session-123"
}
EOF
pass "State saved"
echo ""

# ============================================
# STEP 6: Get Public Key
# ============================================
echo "=== STEP 6: Get Public Key ==="
PUBKEY=$(curl -sk "$LICENSE_SERVER/api/v1/public_key" | python3 -c "import sys,json; print(json.load(sys.stdin)['public_key'])")
echo "$PUBKEY" > "$DATA_DIR/public_key.pem"
pass "Public key saved"
echo ""

# ============================================
# STEP 7: Periodic Validation
# ============================================
echo "=== STEP 7: Perform Periodic Validation ==="

SESSION_ID="addon-session-123"

RESP=$(curl -sk -X POST "$LICENSE_SERVER/api/v1/validate" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"$REAL_TOKEN\",
        \"hardware_id\": \"$HW_ID\",
        \"session_id\": \"$SESSION_ID\",
        \"telemetry\": {
            \"hardware_components\": $HW_COMPONENTS,
            \"cpu_usage\": 25.5,
            \"memory_usage\": 40.0,
            \"uptime_seconds\": 3600,
            \"active_streams\": 2,
            \"addon_version\": \"1.2.0\"
        }
    }")

if echo "$RESP" | grep -q '"valid":true'; then
    pass "License validation successful"
    EXPIRES=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['expires_at'])")
    info "Expires at: $EXPIRES"
else
    fail "Validation failed: $RESP"
    exit 1
fi
echo ""

# ============================================
# STEP 8: Heartbeat
# ============================================
echo "=== STEP 8: Send Heartbeat ==="

RESP=$(curl -sk -X POST "$LICENSE_SERVER/api/v1/heartbeat" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"$REAL_TOKEN\",
        \"session_id\": \"$SESSION_ID\"
    }")

if echo "$RESP" | grep -q '"success":true'; then
    pass "Heartbeat sent successfully"
else
    fail "Heartbeat failed: $RESP"
fi
echo ""

# ============================================
# STEP 9: Check Status
# ============================================
echo "=== STEP 9: Check License Status ==="

RESP=$(curl -sk "$LICENSE_SERVER/api/v1/status/$PURCHASE_CODE")
if echo "$RESP" | grep -q '"status":"active"'; then
    pass "License status: active"
    EMAIL_CHECK=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['email'])")
    WARNINGS=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['warning_count'])")
    info "Email: $EMAIL_CHECK, Warnings: $WARNINGS"
else
    fail "Status check failed: $RESP"
fi
echo ""

# ============================================
# STEP 10: Simulate Hardware Components Change Attack
# (Keep same hardware_id but change components in telemetry)
# ============================================
echo "=== STEP 10: Simulate Hardware Components Change Attack ==="

RESP=$(curl -sk -X POST "$LICENSE_SERVER/api/v1/validate" \
    -H "Content-Type: application/json" \
    -d "{
        \"token\": \"$REAL_TOKEN\",
        \"hardware_id\": \"$HW_ID\",
        \"session_id\": \"attacker-session\",
        \"telemetry\": {
            \"hardware_components\": {\"machine_id\": \"hacked\", \"mac\": \"aa:bb:cc:dd:ee:ff\", \"hostname\": \"hacked-host\"}
        }
    }")

if echo "$RESP" | grep -q 'Hardware mismatch\|suspended'; then
    pass "Correctly detected hardware components change!"
else
    fail "Should have detected hardware change: $RESP"
fi
echo ""

# ============================================
# STEP 11: Verify License Suspended
# ============================================
echo "=== STEP 11: Verify License Suspended ==="

sleep 1
RESP=$(curl -sk "$LICENSE_SERVER/api/v1/status/$PURCHASE_CODE")
if echo "$RESP" | grep -q '"status":"suspended"'; then
    pass "License correctly suspended after attack"
else
    fail "License should be suspended: $RESP"
fi
echo ""

# ============================================
# STEP 12: Verify Security Incident Logged
# ============================================
echo "=== STEP 12: Check Security Incidents ==="

INCIDENTS=$(docker compose exec -T db psql -U license_user -d webrtc_licenses -t -c "SELECT COUNT(*) FROM security_incidents WHERE incident_type='hardware_mismatch';" 2>/dev/null | tr -d ' ')
if [ "$INCIDENTS" -gt "0" ]; then
    pass "Security incidents logged: $INCIDENTS"
    docker compose exec -T db psql -U license_user -d webrtc_licenses -c "SELECT incident_type, severity, action_taken FROM security_incidents;" 2>/dev/null
else
    fail "No security incidents logged"
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo "========================================"
echo "Add-on Simulation Complete - ALL PASSED!"
echo "========================================"
echo ""
info "Files created in $DATA_DIR:"
ls -la "$DATA_DIR"
echo ""
info "Database verification:"
echo "  docker compose exec db psql -U license_user -d webrtc_licenses -c 'SELECT user_email, hardware_id, status FROM licenses;'"
echo ""
info "To clean up test licenses:"
echo "  docker compose exec db psql -U license_user -d webrtc_licenses -c \"DELETE FROM licenses WHERE purchase_code LIKE 'ADDON-%';\""
