<thinking>
Stage 0: Requirement Analysis & Strategic Planning

The user has a license server system with:
- FastAPI backend (main.py)
- PostgreSQL database
- HTML dashboard (index.html)
- Docker deployment

Current issues for production:
1. **CRITICAL**: No authentication on admin endpoints - anyone can create/delete licenses
2. **CRITICAL**: API endpoint is hardcoded as empty string in HTML
3. **HIGH**: No API key/token protection
4. **HIGH**: Dashboard has no login mechanism
5. **MEDIUM**: No HTTPS enforcement in code
6. **MEDIUM**: No rate limiting
7. **LOW**: No session management for dashboard

User wants:
- Simple password protection for admin dashboard
- Production-ready security
- NO over-engineering
- Keep it simple

Stage 1: Problem Deconstruction

Core problems:
1. Admin endpoints are completely open (create, delete, suspend licenses)
2. Dashboard can be accessed by anyone
3. No authentication layer at all
4. API URL not configurable from UI

Stage 2: Architecture Analysis

Simple approaches (ranked by simplicity):

Option A: HTTP Basic Auth on admin endpoints
- Pros: Built into FastAPI, very simple, no JWT complexity
- Cons: Password sent with each request (mitigated by HTTPS)

Option B: Simple session-based auth with cookie
- Pros: User-friendly, one login
- Cons: Need session storage

Option C: API key in headers
- Pros: Simple for API clients
- Cons: Still need dashboard login

**WINNER: Hybrid approach**
- Dashboard: Simple login form → set session cookie
- Backend: Check session cookie OR API key header
- Use FastAPI's built-in security utilities
- Store admin password as env variable (hashed)

Stage 3: Design Pattern Selection

Patterns to apply:
1. Dependency Injection (FastAPI's Depends) - for auth checks
2. Middleware pattern - for CORS and security headers
3. Decorator pattern - protect routes with simple decorator

Stage 4: Implementation Strategy

Minimal changes needed:
1. Add admin password hash to environment
2. Add /login endpoint (POST email/password → set cookie)
3. Add /logout endpoint
4. Add dependency function to check authentication
5. Protect all /admin/* endpoints with auth dependency
6. Update index.html with login modal
7. Add API URL configuration modal (already planned)

Stage 5: Quality Assurance Planning

Security checklist:
- Password hashed with bcrypt
- Secure session cookies (httpOnly, secure, sameSite)
- Rate limiting on login endpoint
- HTTPS required in production
- CORS properly configured

Stage 6: Solution Refinement

Keep simple:
- Single admin user (email/password from env)
- No user database needed
- Session stored in signed cookie (itsdangerous)
- 24-hour session timeout
- Simple logout clears cookie

Stage 7: Documentation Preparation

Need to document:
- Environment variables setup
- First-time admin password creation
- How to reset password
- Deployment checklist
</thinking>

# Production-Ready Security Plan (Simple & Pragmatic)

## 🎯 Goal: Secure Admin Access with Minimal Complexity

**Estimated Effort**: 3-4 hours
**Approach**: Session-based auth with password, no database changes needed

---

## ✅ **Critical Security Improvements**

### **1. Add Admin Authentication (2 hours)**

#### Backend Changes (main.py)

**Step 1.1: Add Dependencies**
```python
# Add to requirements.txt
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
itsdangerous==2.1.2
slowapi==0.1.9  # Rate limiting
```

**Step 1.2: Add Auth Configuration (top of main.py)**
```python
from passlib.context import CryptContext
from fastapi import Cookie, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import secrets

# ── Admin Configuration ──
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")  # bcrypt hash
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
SESSION_MAX_AGE = 86400  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
session_serializer = URLSafeTimedSerializer(SECRET_KEY)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Helper Functions ──
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_session_token(email: str) -> str:
    """Create signed session token"""
    return session_serializer.dumps({"email": email}, salt="session")

def verify_session_token(token: str) -> dict:
    """Verify and decode session token"""
    try:
        return session_serializer.loads(token, salt="session", max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None

async def require_admin(session_token: str = Cookie(None, alias="admin_session")):
    """Dependency: Require valid admin session"""
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please login.",
        )
    
    session_data = verify_session_token(session_token)
    if not session_data or session_data.get("email") != ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please login again.",
        )
    
    return session_data
```

**Step 1.3: Add Login/Logout Endpoints**
```python
from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")  # Rate limit: 5 attempts per minute
async def login(request: LoginRequest, req: Request):
    """Admin login - returns session cookie"""
    
    # Check credentials
    if request.email != ADMIN_EMAIL:
        await asyncio.sleep(1)  # Prevent timing attacks
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not ADMIN_PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Admin password not configured. Set ADMIN_PASSWORD_HASH environment variable."
        )
    
    if not verify_password(request.password, ADMIN_PASSWORD_HASH):
        await asyncio.sleep(1)  # Prevent timing attacks
        logger.warning(f"Failed login attempt for {request.email} from {req.client.host}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create session token
    session_token = create_session_token(request.email)
    
    response = JSONResponse({
        "success": True,
        "email": request.email,
        "message": "Login successful"
    })
    
    # Set secure cookie
    response.set_cookie(
        key="admin_session",
        value=session_token,
        max_age=SESSION_MAX_AGE,
        httponly=True,  # Prevent XSS
        secure=os.getenv("ENVIRONMENT", "development") == "production",  # HTTPS only in prod
        samesite="lax",  # CSRF protection
    )
    
    logger.info(f"Admin login successful: {request.email} from {req.client.host}")
    return response

@app.post("/api/v1/auth/logout")
async def logout():
    """Admin logout - clear session cookie"""
    response = JSONResponse({"success": True, "message": "Logged out"})
    response.delete_cookie("admin_session")
    return response

@app.get("/api/v1/auth/check")
async def check_auth(admin = Depends(require_admin)):
    """Check if current session is valid"""
    return {"authenticated": True, "email": admin["email"]}
```

**Step 1.4: Protect All Admin Endpoints**
```python
# Add 'admin = Depends(require_admin)' to ALL admin endpoints:

@app.post("/api/v1/admin/licenses", status_code=201)
async def admin_create_license(
    request: AdminCreateLicenseRequest, 
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code

@app.get("/api/v1/admin/licenses")
async def get_admin_licenses(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code

@app.patch("/api/v1/admin/licenses/{purchase_code}")
async def admin_patch_license(
    purchase_code: str, 
    request: AdminPatchLicenseRequest, 
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code

@app.delete("/api/v1/admin/licenses/{purchase_code}", status_code=200)
async def admin_delete_license(
    purchase_code: str, 
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code

@app.get("/api/v1/admin/sessions")
async def get_admin_sessions(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code

@app.get("/api/v1/admin/incidents")
async def get_admin_incidents(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code

@app.get("/api/v1/admin/logs")
async def get_admin_logs(
    db: Session = Depends(get_db),
    admin = Depends(require_admin)  # ← ADD THIS
):
    # ... existing code
```

---

### **2. Add Login UI to Dashboard (1 hour)**

**Step 2.1: Add Login Modal to index.html**

Add this modal after existing modals (before `<div class="layout">`):

```html
<!-- Modal: Admin Login -->
<div class="modal-overlay" id="modal-login" style="z-index: 10000;">
  <div class="modal" style="max-width: 400px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan)); display: flex; align-items: center; justify-content: center; font-size: 28px; color: white;">
        🔒
      </div>
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Admin Login</h3>
      <p style="font-size: 13px; color: var(--text-muted);">Enter your credentials to access the dashboard</p>
    </div>
    
    <div class="form-grid">
      <div class="form-group">
        <label>Email</label>
        <input id="login-email" type="email" placeholder="admin@example.com" autocomplete="email" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input id="login-password" type="password" placeholder="Enter password" autocomplete="current-password" />
      </div>
      <div id="login-error" style="display: none; padding: 10px; background: rgba(244, 63, 94, 0.1); border: 1px solid var(--accent-rose); border-radius: 6px; font-size: 13px; color: var(--accent-rose); margin-top: 10px;"></div>
    </div>
    
    <div style="margin-top: 20px;">
      <button class="btn btn-primary" id="login-btn" onclick="performLogin()" style="width: 100%; justify-content: center;">
        Login
      </button>
    </div>
    
    <p style="font-size: 11px; color: var(--text-muted); margin-top: 16px; text-align: center;">
      Your session will expire after 24 hours
    </p>
  </div>
</div>
```

**Step 2.2: Add Login JavaScript (in `<script>` section)**

Add at the very beginning of the script section:

```javascript
/* ─── Authentication ─── */
let isAuthenticated = false;
let loginCheckInterval = null;

// Check authentication on page load
async function checkAuth() {
  try {
    const response = await fetch(API + '/api/v1/auth/check', {
      credentials: 'include'  // Send cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      isAuthenticated = true;
      hideLoginModal();
      return true;
    } else {
      isAuthenticated = false;
      showLoginModal();
      return false;
    }
  } catch (e) {
    isAuthenticated = false;
    showLoginModal();
    return false;
  }
}

function showLoginModal() {
  document.getElementById('modal-login').classList.remove('hidden');
  document.querySelector('.layout').style.filter = 'blur(8px)';
  document.querySelector('.layout').style.pointerEvents = 'none';
  
  // Focus email field
  setTimeout(() => {
    document.getElementById('login-email').focus();
  }, 300);
}

function hideLoginModal() {
  document.getElementById('modal-login').classList.add('hidden');
  document.querySelector('.layout').style.filter = '';
  document.querySelector('.layout').style.pointerEvents = '';
}

async function performLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  
  if (!email || !password) {
    errorDiv.textContent = 'Please enter both email and password';
    errorDiv.style.display = 'block';
    return;
  }
  
  // Disable button during request
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';
  errorDiv.style.display = 'none';
  
  try {
    const response = await fetch(API + '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // Important: send/receive cookies
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      isAuthenticated = true;
      toast('Login successful!', 'success');
      hideLoginModal();
      
      // Clear password field
      document.getElementById('login-password').value = '';
      
      // Start session check interval (every 5 minutes)
      if (!loginCheckInterval) {
        loginCheckInterval = setInterval(checkAuth, 5 * 60 * 1000);
      }
      
      // Refresh dashboard data
      await refreshAll();
    } else {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      errorDiv.textContent = error.detail || 'Invalid credentials';
      errorDiv.style.display = 'block';
      isAuthenticated = false;
    }
  } catch (e) {
    errorDiv.textContent = 'Cannot connect to server. Check API URL.';
    errorDiv.style.display = 'block';
    isAuthenticated = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

async function performLogout() {
  try {
    await fetch(API + '/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (e) {
    // Ignore errors
  }
  
  isAuthenticated = false;
  if (loginCheckInterval) {
    clearInterval(loginCheckInterval);
    loginCheckInterval = null;
  }
  
  toast('Logged out successfully', 'info');
  showLoginModal();
}

// Allow Enter key to submit login
document.addEventListener('DOMContentLoaded', () => {
  const loginPassword = document.getElementById('login-password');
  const loginEmail = document.getElementById('login-email');
  
  if (loginPassword) {
    loginPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performLogin();
    });
  }
  
  if (loginEmail) {
    loginEmail.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('login-password').focus();
      }
    });
  }
});
```

**Step 2.3: Update API Helper to Handle 401**

Replace the existing `api()` function:

```javascript
/* ─── API helper ─── */
async function api(path, opts = {}) {
  if (!API) {
    toast('API URL not configured', 'error');
    return { error: 'Not configured' };
  }
  
  try {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      credentials: 'include',  // ← IMPORTANT: Send cookies
      ...opts,
    });
    
    // Handle 401 Unauthorized
    if (res.status === 401) {
      isAuthenticated = false;
      showLoginModal();
      toast('Session expired. Please login again.', 'error');
      return { error: 'Unauthorized' };
    }
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { 
        error: errData.detail || errData.message || `HTTP ${res.status}`,
        status: res.status 
      };
    }
    
    return await res.json();
  } catch (e) {
    if (e.name === 'TypeError' && e.message.includes('fetch')) {
      return { error: "Cannot connect to server. Check API URL." };
    }
    return { error: e.message };
  }
}
```

**Step 2.4: Add Logout Button to Sidebar**

Replace the server-status section in the sidebar:

```html
<div class="server-status">
  <div class="server-status-header">
    <span class="dot dot-yellow" id="health-dot"></span>
    <span id="health-label" style="font-weight: 600">Checking...</span>
  </div>
  <div style="color: var(--text-muted); font-size: 12px" id="health-sub">API: localhost:8000</div>
  <button class="btn btn-ghost btn-sm" style="margin-top: 10px; width: 100%; justify-content: center" onclick="refreshAll()">&#8635; Refresh</button>
  <!-- NEW: Logout button -->
  <button class="btn btn-ghost btn-sm" style="margin-top: 8px; width: 100%; justify-content: center; color: var(--accent-rose);" onclick="performLogout()">
    🔓 Logout
  </button>
</div>
```

**Step 2.5: Update Init Function**

Replace the init function at the bottom of the script:

```javascript
/* ─── Init ─── */
(async () => {
  // Check authentication first
  const authenticated = await checkAuth();
  
  if (authenticated) {
    await refreshAll();
  }
  
  // Auto-refresh sessions every 30s (only if authenticated)
  setInterval(async () => {
    if (isAuthenticated) {
      const active = document.getElementById("page-sessions").classList.contains("active");
      if (active) await loadSessions();
    }
  }, 30000);
})();
```

---

### **3. Environment Configuration (30 min)**

**Step 3.1: Create `.env.example`**

```bash
# API Server Configuration
DATABASE_URL=postgresql://license_user:license_pass@db:5432/webrtc_licenses
SECRET_KEY=your-secret-key-here-minimum-32-characters
ENVIRONMENT=production

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2b$12$REPLACE_WITH_ACTUAL_BCRYPT_HASH

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com

# Optional: Rate Limiting
MAX_LOGIN_ATTEMPTS=5
```

**Step 3.2: Generate Password Hash Script**

Create `generate_admin_hash.py`:

```python
#!/usr/bin/env python3
"""
Generate bcrypt password hash for admin user.
Usage: python generate_admin_hash.py
"""
from passlib.context import CryptContext
import getpass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

print("=== Admin Password Hash Generator ===\n")
email = input("Admin Email: ").strip()
password = getpass.getpass("Admin Password: ")
confirm = getpass.getpass("Confirm Password: ")

if password != confirm:
    print("ERROR: Passwords don't match!")
    exit(1)

if len(password) < 8:
    print("ERROR: Password must be at least 8 characters!")
    exit(1)

hash_value = pwd_context.hash(password)

print("\n=== Add these to your .env file ===")
print(f"ADMIN_EMAIL={email}")
print(f"ADMIN_PASSWORD_HASH={hash_value}")
print("\nKeep this hash secure!")
```

**Step 3.3: Update `docker-compose.yml`**

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://license_user:license_pass@db:5432/webrtc_licenses
      - SECRET_KEY=${SECRET_KEY}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD_HASH=${ADMIN_PASSWORD_HASH}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-*}
      - ENVIRONMENT=${ENVIRONMENT:-production}
    depends_on:
      - db
    volumes:
      - ./keys:/keys
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=license_user
      - POSTGRES_PASSWORD=license_pass
      - POSTGRES_DB=webrtc_licenses
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  # Optional: Add nginx for HTTPS
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./keys/cert.pem:/etc/nginx/ssl/cert.pem:ro
      - ./keys/key.pem:/etc/nginx/ssl/key.pem:ro
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

---

### **4. Optional: Add Nginx Reverse Proxy (30 min)**

**Step 4.1: Create `nginx.conf`**

```nginx
events {
    worker_connections 1024;
}

http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    upstream backend {
        server api:8000;
    }

    server {
        listen 80;
        server_name _;
        
        # Redirect HTTP to HTTPS
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Rate limit login endpoint
        location /api/v1/auth/login {
            limit_req zone=login burst=3 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Rate limit other API calls
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Dashboard
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 📋 **Deployment Checklist**

### **Before First Deployment**

```bash
# 1. Generate admin password hash
python generate_admin_hash.py

# 2. Create .env file
cp .env.example .env
# Edit .env with your values

# 3. Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Add to .env

# 4. Verify configuration
cat .env  # Check all values are set

# 5. Build and start
docker-compose build
docker-compose up -d

# 6. Check logs
docker-compose logs -f api

# 7. Test login
# Open browser → https://your-server-ip
# Login with ADMIN_EMAIL and password
```

### **Production Security Checklist**

```markdown
CRITICAL:
[ ] ADMIN_PASSWORD_HASH is set (not default)
[ ] SECRET_KEY is random and unique (32+ chars)
[ ] ENVIRONMENT=production in .env
[ ] HTTPS enabled (nginx with valid cert)
[ ] ALLOWED_ORIGINS restricted to your domain
[ ] Database password changed from default

IMPORTANT:
[ ] Firewall configured (only 80/443 open)
[ ] Regular database backups configured
[ ] Logs being monitored
[ ] Rate limiting active (test login attempts)
[ ] Session timeout working (24 hours)

RECOMMENDED:
[ ] Use Let's Encrypt for SSL (instead of self-signed)
[ ] Set up automated backups
[ ] Configure log rotation
[ ] Add monitoring/alerting
[ ] Document password reset procedure
```

---

## 🔧 **Quick Commands**

### **Reset Admin Password**

```bash
# 1. Generate new hash
python generate_admin_hash.py

# 2. Update .env file
nano .env  # Update ADMIN_PASSWORD_HASH

# 3. Restart service
docker-compose restart api
```

### **Check Who's Logged In**

```bash
# View recent login attempts (if you add logging)
docker-compose exec api tail -f /var/log/access.log | grep login
```

### **Emergency Access Recovery**

```bash
# If you're locked out, temporarily disable auth:
# 1. Comment out 'admin = Depends(require_admin)' in main.py
# 2. Restart: docker-compose restart api
# 3. Access dashboard, reset password
# 4. Uncomment the line
# 5. Restart again

# Better: Use environment variable to bypass auth temporarily
# Add to .env: DISABLE_AUTH=true
# Check in require_admin(): if os.getenv("DISABLE_AUTH"): return {}
```

---

## 📐 **Design Rationale**

### **Why Session Cookies Over JWT?**
- Simpler implementation (no token refresh logic)
- Automatic secure cookie handling by browser
- Easy logout (just delete cookie)
- No need to store tokens in localStorage (XSS risk)

### **Why Single Admin User?**
- YAGNI principle - most license servers have 1-2 admins
- No user management UI needed
- Simple password reset (just update env variable)
- Can add multi-user later if needed

### **Why bcrypt?**
- Industry standard for password hashing
- Built-in salt handling
- Configurable work factor (future-proof)
- Supported by passlib

### **Why Rate Limiting on Login?**
- Prevent brute-force attacks
- 5 attempts/minute is reasonable
- Implemented at both nginx and app level (defense in depth)

### **Security Trade-offs**

| Decision | Risk | Mitigation |
|----------|------|------------|
| Session cookies | Session hijacking | httpOnly, secure, sameSite flags + HTTPS |
| Single admin | No audit trail | Can add logging later if needed |
| 24-hour timeout | Convenience vs security | Reasonable for admin dashboard, can shorten |
| Password in env | Server compromise exposes hash | Bcrypt makes rainbow tables infeasible |

---

## 💡 **What We Deliberately Skipped**

❌ **Multi-user support** - Single admin is sufficient for most use cases  
❌ **Password reset flow** - Just update env variable (simpler than email flow)  
❌ **2FA/MFA** - Can add later if needed, adds complexity  
❌ **OAuth/SSO** - Overkill for internal admin panel  
❌ **Session storage in DB** - Signed cookies are simpler and stateless  
❌ **Refresh tokens** - 24-hour session is reasonable, simpler UX  

---

## 🚀 **Total Estimated Time: 3-4 hours**

- Backend auth implementation: 2 hours
- Frontend login UI: 1 hour
- Environment setup & testing: 1 hour
- (Optional) Nginx setup: 30 min

**Result**: Production-ready authentication with minimal code changes, no database migrations, and simple deployment.
