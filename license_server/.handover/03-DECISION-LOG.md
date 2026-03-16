# License Server - Decision Log

## Why This Design?

### 1. Hardware Fingerprinting

**Decision**: Use multi-component hardware fingerprinting
**Reason**: Single component (e.g., MAC address) can be spoofed. Combining machine-id, MAC, CPU serial, disk UUID, and hostname provides stronger binding.
**Trade-off**: May break if user更换 major hardware components

### 2. RSA-4096 Keys

**Decision**: Use RSA-4096 for token signing
**Reason**: Provides strong security for license tokens. 2048 would also work but 4096 is future-proof.
**Trade-off**: Key generation is slow, but happens only once

### 3. JWT with Hardware Checksum

**Decision**: Add SHA256 checksum to JWT payload
**Reason**: Prevents token transfer between devices. Even if JWT is valid, checksum ensures hardware binding.
**Trade-off**: Slightly more complex validation

### 4. Auto-Suspend on Hardware Mismatch

**Decision**: Immediately suspend on critical hardware mismatch
**Reason**: Prevent license sharing attacks
**Trade-off**: May inconvenience users with legitimate hardware changes (need manual support)

### 5. 60% Hardware Match Threshold

**Decision**: Allow 60% hardware component match
**Reason**: Accommodates minor changes (hostname, USB devices) while detecting major changes
**Trade-off**: Could potentially be gamed with partial hardware changes

### 6. PostgreSQL over SQLite

**Decision**: Use PostgreSQL
**Reason**: Production-grade, supports concurrent connections, better indexing
**Trade-off**: Requires more resources than SQLite

### 7. Gunicorn with Uvicorn Workers

**Decision**: Use Gunicorn with Uvicorn workers
**Reason**: Production-grade process management with async support
**Trade-off**: More complex than pure Uvicorn

## Future Considerations

- Redis integration for rate limiting and caching
- Payment provider webhook integration (Gumroad/Stripe/LemonSqueezy)
- License transfer functionality
- Admin dashboard
