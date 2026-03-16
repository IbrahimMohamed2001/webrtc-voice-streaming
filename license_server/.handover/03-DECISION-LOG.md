# License Server - Decision Log

## Why This Design?

### 1. Admin-Gated Activation

**Decision**: Add-on cannot self-activate; requires admin approval
**Reason**: Prevents unauthorized use even if someone discovers server URL
**Trade-off**: Additional admin step required; more secure

### 2. Hardware Fingerprinting

**Decision**: Use multi-component hardware fingerprinting
**Reason**: Single component (e.g., MAC address) can be spoofed. Combining machine-id, MAC, CPU serial, disk UUID, and hostname provides stronger binding.
**Trade-off**: May break if user changes major hardware components

### 3. RSA-4096 Keys

**Decision**: Use RSA-4096 for token signing
**Reason**: Provides strong security for license tokens
**Trade-off**: Key generation is slow, but happens only once at build

### 4. JWT with Hardware Checksum

**Decision**: Add SHA256 checksum to JWT payload
**Reason**: Prevents token transfer between devices
**Trade-off**: Slightly more complex validation

### 5. 60% Hardware Match Threshold

**Decision**: Allow 60% hardware component match
**Reason**: Accommodates minor changes (hostname, USB devices) while detecting major changes
**Trade-off**: Could potentially be gamed with partial hardware changes

### 6. PostgreSQL over SQLite

**Decision**: Use PostgreSQL
**Reason**: Production-grade, supports concurrent connections, better indexing
**Trade-off**: Requires more resources than SQLite

### 7. Unlimited Licenses

**Decision**: Support licenses with no expiration (NULL expires_at)
**Reason**: Some customers prefer lifetime licenses
**Trade-off**: Must track manually in billing system

### 8. Self-Signed SSL in Dockerfile

**Decision**: Generate SSL certs at container build time
**Reason**: Zero-config setup; certificates shared via Docker volume
**Trade-off**: Must regenerate volume for new certs; use Let's Encrypt for production

### 9. Modern Dashboard UI

**Decision**: Custom HTML/CSS/JS with modals instead of native prompts
**Reason**: Better UX, consistent with modern web apps
**Trade-off**: More code to maintain than simple server-side rendering
