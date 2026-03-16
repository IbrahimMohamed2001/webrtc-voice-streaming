# License Server - Onboarding Checklist

## Day 1: Setup

- [ ] Clone repository
- [ ] Run `docker-compose up -d`
- [ ] Verify health: `curl http://localhost:8000/health`
- [ ] Run test suite: `./test_license_server.sh`

## Day 2: Understanding

- [ ] Read `00-README-FIRST.md`
- [ ] Read `01-SETUP-GUIDE.md` 
- [ ] Read `02-ARCHITECTURE.md`
- [ ] Read `03-DECISION-LOG.md`
- [ ] Read `04-GOTCHAS.md`

## Day 3: Development

- [ ] Understand API endpoints in `main.py`
- [ ] Understand database models in `models.py`
- [ ] Understand token generation in `token_generator.py`
- [ ] Understand hardware fingerprinting in `hw_fingerprint.py`

## Day 4: Testing

- [ ] Run activation test
- [ ] Run validation test
- [ ] Test hardware mismatch detection
- [ ] Test concurrent session detection

## Production Checklist

- [ ] Generate SSL certificates
- [ ] Configure SECRET_KEY
- [ ] Configure ALLOWED_ORIGINS
- [ ] Change database credentials
- [ ] Backup private key
- [ ] Configure monitoring
- [ ] Setup log rotation

## Key Commands

```bash
# Start
docker-compose up -d

# Logs
docker-compose logs -f license_server

# Database
docker-compose exec db psql -U license_user -d webrtc_licenses

# Stop
docker-compose down

# Clean volumes
docker-compose down -v
```
