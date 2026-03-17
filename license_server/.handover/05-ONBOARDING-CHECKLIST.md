# Onboarding Checklist - WebRTC License Server

**For**: New Developers  
**Last Updated**: 2026-03-17  
**Estimated Time**: 4-6 hours (complete setup and first task)

---

## Welcome! 👋

This checklist will help you get up to speed with the WebRTC License Server system. Work through each section in order and check off items as you complete them.

---

## Phase 1: Environment Setup (1-2 hours)

### 1.1 Prerequisites Verification

- [ ] Docker installed and running
  ```bash
  docker --version
  docker compose version
  ```

- [ ] Python 3.11+ installed
  ```bash
  python3 --version
  ```

- [ ] Git configured
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```

- [ ] Repository cloned
  ```bash
  git clone <repo-url>
  cd license_server
  ```

### 1.2 Development Environment

- [ ] Copy environment template
  ```bash
  cp .env.example .env
  ```

- [ ] Generate admin credentials
  ```bash
  pip install passlib[bcrypt]
  python generate_admin_hash.py
  # Add output to .env
  ```

- [ ] Generate SECRET_KEY
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
  # Add to .env
  ```

- [ ] Verify .env configuration
  ```bash
  cat .env
  # Should have: DATABASE_URL, SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
  ```

### 1.3 First Run

- [ ] Build and start services
  ```bash
  docker compose up -d --build
  ```

- [ ] Verify all services healthy
  ```bash
  docker compose ps
  # All should show "Up (healthy)"
  ```

- [ ] Check health endpoint
  ```bash
  curl -k https://localhost/health
  # Should return: {"status":"healthy","database":"healthy"}
  ```

- [ ] Access dashboard
  - [ ] Open https://localhost in browser
  - [ ] Accept self-signed certificate warning
  - [ ] Login with admin credentials
  - [ ] Verify dashboard loads

### 1.4 Run Tests

- [ ] Run integration tests
  ```bash
  cd tests
  chmod +x test_license_server.sh
  ./test_license_server.sh
  ```

- [ ] Verify all tests pass
  ```bash
  # Should see [PASS] for all tests
  ```

---

## Phase 2: Codebase Familiarization (1-2 hours)

### 2.1 Read Documentation

- [ ] Read [00-README-FIRST.md](./00-README-FIRST.md)
  - Understand system purpose and core concepts
  - Time: 15 minutes

- [ ] Skim [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)
  - Focus on data flow diagrams
  - Time: 30 minutes

- [ ] Review [04-GOTCHAS.md](./04-GOTCHAS.md)
  - Note critical issues
  - Time: 20 minutes

### 2.2 Code Walkthrough

- [ ] Read `main.py` (FastAPI application)
  - Focus on: routes, dependencies, business logic
  - Skip: boilerplate code initially
  - Time: 45 minutes

- [ ] Read `models.py` (Database schema)
  - Understand: License, ValidationLog, SecurityIncident, SessionState
  - Time: 20 minutes

- [ ] Read `token_generator.py` (Token service)
  - Understand: JWT generation, verification, checksum
  - Time: 30 minutes

- [ ] Read `hw_fingerprint.py` (Hardware service)
  - Understand: Hardware ID generation, validation threshold
  - Time: 20 minutes

### 2.3 Database Exploration

- [ ] Connect to database
  ```bash
  docker compose exec db psql -U license_user -d webrtc_licenses
  ```

- [ ] Explore schema
  ```sql
  \dt  -- List tables
  \d licenses  -- Describe licenses table
  \d validation_logs
  \d security_incidents
  \d session_states
  ```

- [ ] Query existing data
  ```sql
  SELECT user_email, status, hardware_id FROM licenses;
  SELECT COUNT(*) FROM validation_logs;
  SELECT * FROM security_incidents;
  ```

### 2.4 API Exploration

- [ ] View OpenAPI docs
  - Open https://localhost/docs in browser
  - Explore available endpoints
  - Time: 15 minutes

- [ ] Test public endpoints
  ```bash
  # Health check
  curl -k https://localhost/health

  # Get public key
  curl -k https://localhost/api/v1/public_key

  # Check auth status
  curl -k https://localhost/api/v1/auth/check
  ```

---

## Phase 3: Hands-On Practice (1-2 hours)

### 3.1 Create Test License

- [ ] Login to dashboard as admin

- [ ] Create a test license
  - Click "+ Create License"
  - Fill in: email, purchase code, duration
  - Click "Create License"

- [ ] Verify license in database
  ```bash
  docker compose exec db psql -U license_user -d webrtc_licenses \
    -c "SELECT * FROM licenses WHERE purchase_code='YOUR_TEST_CODE';"
  ```

### 3.2 Simulate Activation Flow

- [ ] Register hardware (simulate add-on)
  ```bash
  curl -k -X POST https://localhost/api/v1/activate \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "purchase_code": "YOUR_TEST_CODE",
      "hardware_id": "1111111111111111111111111111111111111111111111111111111111111111",
      "hardware_components": {"machine_id": "test123", "mac": "00:11:22:33:44:55", "hostname": "testhost"}
    }'
  ```

- [ ] Verify hardware registered
  ```bash
  docker compose exec db psql -U license_user -d webrtc_licenses \
    -c "SELECT status, hardware_id FROM licenses WHERE purchase_code='YOUR_TEST_CODE';"
  ```

- [ ] Activate license (via dashboard or API)
  - Dashboard: Click "Activate" button
  - Or API: See TEST_GUIDE.md for curl command

- [ ] Verify license active
  ```bash
  curl -k https://localhost/api/v1/status/YOUR_TEST_CODE
  ```

### 3.3 Test Validation Flow

- [ ] Get active token from database
  ```bash
  TOKEN=$(docker compose exec db psql -U license_user -d webrtc_licenses \
    -t -c "SELECT token FROM licenses WHERE purchase_code='YOUR_TEST_CODE';" | tr -d ' ')
  ```

- [ ] Validate token
  ```bash
  curl -k -X POST https://localhost/api/v1/validate \
    -H "Content-Type: application/json" \
    -d "{
      \"token\": \"$TOKEN\",
      \"hardware_id\": \"1111111111111111111111111111111111111111111111111111111111111111\",
      \"session_id\": \"test-session-001\",
      \"telemetry\": {\"hardware_components\": {\"machine_id\": \"test123\", \"mac\": \"00:11:22:33:44:55\", \"hostname\": \"testhost\"}}
    }"
  ```

- [ ] Verify validation logged
  ```bash
  docker compose exec db psql -U license_user -d webrtc_licenses \
    -c "SELECT * FROM validation_logs ORDER BY validated_at DESC LIMIT 1;"
  ```

### 3.4 Test Security Features

- [ ] Test hardware mismatch detection
  ```bash
  # Validate with WRONG hardware
  curl -k -X POST https://localhost/api/v1/validate \
    -H "Content-Type: application/json" \
    -d "{
      \"token\": \"$TOKEN\",
      \"hardware_id\": \"WRONG_HARDWARE_ID\",
      \"session_id\": \"test-session-002\",
      \"telemetry\": {\"hardware_components\": {\"machine_id\": \"hacked\", \"mac\": \"aa:bb:cc:dd:ee:ff\", \"hostname\": \"hacker\"}}
    }"
  ```

- [ ] Verify license suspended
  ```bash
  curl -k https://localhost/api/v1/status/YOUR_TEST_CODE
  # Should show status: "suspended"
  ```

- [ ] Check security incident logged
  ```bash
  docker compose exec db psql -U license_user -d webrtc_licenses \
    -c "SELECT * FROM security_incidents ORDER BY detected_at DESC LIMIT 1;"
  ```

---

## Phase 4: Development Workflow (30 min)

### 4.1 Local Development Setup

- [ ] Install Python dependencies
  ```bash
  pip install -r requirements.txt
  ```

- [ ] Configure for local development
  ```bash
  # Option 1: Use SQLite for simplicity
  export DATABASE_URL=sqlite:////keys/licenses.db

  # Option 2: Use local PostgreSQL
  export DATABASE_URL=postgresql://localhost:5432/webrtc_licenses
  ```

- [ ] Run development server
  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

### 4.2 Make Your First Change

- [ ] Pick a simple task
  - Fix a typo in documentation
  - Add a log statement
  - Update a comment

- [ ] Create feature branch
  ```bash
  git checkout -b feature/your-feature-name
  ```

- [ ] Make changes

- [ ] Test changes
  ```bash
  # Run tests again
  cd tests && ./test_license_server.sh
  ```

- [ ] Commit changes
  ```bash
  git add .
  git commit -m "feat: your commit message"
  ```

### 4.3 Code Review Process

- [ ] Push branch
  ```bash
  git push origin feature/your-feature-name
  ```

- [ ] Create pull request
  - Link to any related issues
  - Describe changes
  - Add screenshots if UI changes

- [ ] Address review feedback

- [ ] Merge after approval

---

## Phase 5: Production Awareness (30 min)

### 5.1 Production Checklist Review

- [ ] Review production deployment checklist in [01-SETUP-GUIDE.md](./01-SETUP-GUIDE.md#production-deployment)

- [ ] Understand critical security requirements:
  - [ ] Strong SECRET_KEY
  - [ ] Admin password hash (not default)
  - [ ] HTTPS with valid certificate
  - [ ] ALLOWED_ORIGINS restricted
  - [ ] RSA key backup

### 5.2 Monitoring & Operations

- [ ] Learn to view logs
  ```bash
  docker compose logs -f license_server
  docker compose logs -f db
  docker compose logs -f nginx
  ```

- [ ] Learn to check database
  ```bash
  docker compose exec db psql -U license_user -d webrtc_licenses
  ```

- [ ] Learn to backup data
  ```bash
  # Backup database
  docker compose exec db pg_dump -U license_user webrtc_licenses > backup.sql

  # Backup RSA keys
  docker compose exec license_server cat /keys/private_key.pem > private_key_backup.pem
  ```

### 5.3 Incident Response

- [ ] Understand auto-suspension triggers
  - Hardware mismatch → Critical → Auto-suspend
  - 3+ concurrent sessions → High → Auto-suspend

- [ ] Know how to reinstate license
  ```bash
  curl -k -X PATCH https://localhost/api/v1/admin/licenses/PURCHASE_CODE \
    -H "Content-Type: application/json" \
    -d '{"action": "reinstate"}'
  ```

- [ ] Know how to manually suspend
  ```bash
  curl -k -X PATCH https://localhost/api/v1/admin/licenses/PURCHASE_CODE \
    -H "Content-Type: application/json" \
    -d '{"action": "suspend", "reason": "Manual suspension"}'
  ```

---

## Knowledge Check

### Can You Explain...

- [ ] The two-step activation flow?
- [ ] How hardware binding works (both layers)?
- [ ] Why 60% match threshold is used?
- [ ] What triggers auto-suspension?
- [ ] How admin authentication works?
- [ ] Where RSA keys are stored and why they must be backed up?
- [ ] The difference between validation_logs and security_incidents?

### Can You Perform...

- [ ] Create a new license via dashboard?
- [ ] Activate a pending license?
- [ ] Validate a token via API?
- [ ] Check license status?
- [ ] Suspend/reinstate a license?
- [ ] View active sessions?
- [ ] Export validation logs?
- [ ] Backup database and RSA keys?

---

## Resources

### Documentation
- [00-README-FIRST.md](./00-README-FIRST.md) - Executive summary
- [01-SETUP-GUIDE.md](./01-SETUP-GUIDE.md) - Setup instructions
- [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) - System design
- [03-DECISION-LOG.md](./03-DECISION-LOG.md) - Why decisions were made
- [04-GOTCHAS.md](./04-GOTCHAS.md) - Known issues

### External Resources
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM Tutorial](https://docs.sqlalchemy.org/en/20/tutorial/)
- [JWT Best Practices (RFC 8725)](https://datatracker.ietf.org/doc/html/rfc8725)
- [Docker Compose Reference](https://docs.docker.com/compose/)

### Code References
- `main.py` - Main application (848 lines)
- `models.py` - Database models
- `token_generator.py` - JWT token service
- `hw_fingerprint.py` - Hardware fingerprinting
- `tests/test_license_server.sh` - Integration tests

---

## Next Steps

After completing this checklist:

1. [ ] Schedule 1:1 with team lead for questions
2. [ ] Get assigned first real task
3. [ ] Set up local development environment
4. [ ] Join team communication channels
5. [ ] Review upcoming sprint backlog

---

## Completion Sign-Off

- [ ] All Phase 1 tasks complete
- [ ] All Phase 2 tasks complete
- [ ] All Phase 3 tasks complete
- [ ] All Phase 4 tasks complete
- [ ] All Phase 5 tasks complete
- [ ] Knowledge check questions answered

**Completed By**: _________________  
**Date**: _________________  
**Reviewer**: _________________

---

**Congratulations!** You're now ready to work on the WebRTC License Server system. 🎉
