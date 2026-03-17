# Production-Ready File Structure Plan

## 🎯 Goal: Modular, Maintainable, Production-Grade Dashboard

**Estimated Effort**: 4-6 hours
**Approach**: Progressive enhancement - split without breaking functionality

---

## 📁 **Recommended File Structure**

```
license-server/
├── backend/
│   ├── main.py                    # FastAPI app (existing)
│   ├── models.py                  # Database models (existing)
│   ├── token_generator.py         # Token logic (existing)
│   ├── hw_fingerprint.py          # Hardware ID (existing)
│   ├── requirements.txt           # Dependencies (existing)
│   ├── Dockerfile                 # Container (existing)
│   └── .env.example               # Environment template
│
├── frontend/
│   ├── index.html                 # Main HTML (minimal)
│   ├── css/
│   │   ├── variables.css          # CSS custom properties
│   │   ├── reset.css              # Base styles & reset
│   │   ├── layout.css             # Grid, sidebar, main
│   │   ├── components.css         # Buttons, cards, badges, modals
│   │   └── responsive.css         # Media queries
│   │
│   ├── js/
│   │   ├── config.js              # Configuration & constants
│   │   ├── api.js                 # API client & auth
│   │   ├── ui.js                  # Toast, modal, navigation
│   │   ├── auth.js                # Login/logout logic
│   │   ├── licenses.js            # License management
│   │   ├── sessions.js            # Sessions page
│   │   ├── security.js            # Security incidents
│   │   ├── logs.js                # Validation logs
│   │   ├── tools.js               # Tools page
│   │   ├── utils.js               # Helper functions
│   │   └── main.js                # Initialization
│   │
│   └── assets/
│       └── fonts/                 # (Optional) Self-hosted fonts
│
├── docker-compose.yml
├── nginx.conf                     # (Optional) Reverse proxy
├── generate_admin_hash.py         # Password hash generator
└── README.md                      # Setup instructions
```

---

## 📋 **Step-by-Step Migration Plan**

### **Phase 1: Extract CSS (1 hour)**

#### 1.1 Create `frontend/css/variables.css`
```css
/* CSS Custom Properties - Design Tokens */
:root {
  /* Colors - Background */
  --bg-primary: #0a0b0f;
  --bg-secondary: #111218;
  --bg-tertiary: #181a23;
  --bg-card: #13151c;
  --bg-hover: #1c1e28;
  
  /* Colors - Borders */
  --border-subtle: #232730;
  --border-focus: #3b82f6;
  
  /* Colors - Accent */
  --accent-blue: #3b82f6;
  --accent-blue-hover: #2563eb;
  --accent-cyan: #06b6d4;
  --accent-emerald: #10b981;
  --accent-amber: #f59e0b;
  --accent-rose: #f43f5e;
  --accent-violet: #8b5cf6;
  
  /* Colors - Text */
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  
  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  
  /* Typography */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  
  /* Spacing Scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### 1.2 Create `frontend/css/reset.css`
```css
/* Modern CSS Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 15px;
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Remove default button styles */
button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}

/* Remove default input styles */
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

/* Improve media defaults */
img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

/* Remove built-in form typography */
input,
button,
textarea,
select {
  font: inherit;
}

/* Avoid text overflow */
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}
```

#### 1.3 Create `frontend/css/layout.css`
```css
/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Layout Grid */
.layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  padding: var(--space-lg) 0;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.logo {
  padding: 0 var(--space-lg) var(--space-lg);
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: var(--space-sm);
}

.logo h1 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.logo h1::before {
  content: "";
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-cyan));
  border-radius: 2px;
}

.logo p {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: var(--space-xs);
  padding-left: var(--space-md);
}

/* Navigation */
.nav {
  padding: 12px 0;
  flex: 1;
}

.nav-section {
  padding: var(--space-sm) var(--space-md);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-top: var(--space-sm);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px var(--space-lg);
  cursor: pointer;
  font-size: 14px;
  color: var(--text-secondary);
  transition: all var(--transition-normal);
  border-left: 3px solid transparent;
  margin: 2px 0;
}

.nav-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item.active {
  color: var(--accent-blue);
  border-left-color: var(--accent-blue);
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
}

.nav-item .icon {
  width: 18px;
  text-align: center;
  font-size: 15px;
}

/* Main Content Area */
.main {
  padding: 28px var(--space-xl);
  overflow-y: auto;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(139, 92, 246, 0.04) 0%, transparent 50%), 
    var(--bg-primary);
}

/* Page Transitions */
.page {
  display: none;
  animation: fadeIn 0.25s ease;
}

.page.active {
  display: block;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-header {
  margin-bottom: 28px;
}

.page-header h2 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.page-header p {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 6px;
}
```

#### 1.4 Create `frontend/css/components.css`
```css
/* Extract all component styles:
   - Buttons (.btn, .btn-primary, .btn-ghost, etc.)
   - Cards (.card, .stat-card, etc.)
   - Badges (.badge, .badge-active, etc.)
   - Modals (.modal-overlay, .modal, etc.)
   - Forms (input, select, textarea, etc.)
   - Tables (table, th, td, etc.)
   - Toast (.toast, etc.)
   - Spinner (.spinner)
   - Empty state (.empty)
*/

/* See full component styles in previous index.html */
/* Copy from line ~180 to ~880 of original CSS */
```

#### 1.5 Create `frontend/css/responsive.css`
```css
/* Responsive Design - Mobile First */

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 220px 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    display: none;
  }
  
  .main {
    padding: var(--space-lg);
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .services-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .page-header h2 {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .services-grid {
    grid-template-columns: 1fr;
  }
}
```

#### 1.6 Update `frontend/index.html` - CSS Links
```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>License Server Dashboard</title>
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  
  <!-- Styles -->
  <link rel="stylesheet" href="css/variables.css" />
  <link rel="stylesheet" href="css/reset.css" />
  <link rel="stylesheet" href="css/layout.css" />
  <link rel="stylesheet" href="css/components.css" />
  <link rel="stylesheet" href="css/responsive.css" />
</head>
```

---

### **Phase 2: Extract JavaScript (2-3 hours)**

#### 2.1 Create `frontend/js/config.js`
```javascript
/**
 * Application Configuration
 */
export const CONFIG = {
  API_URL_KEY: 'license_dashboard_api_url',
  SESSION_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  AUTO_REFRESH_INTERVAL: 30 * 1000, // 30 seconds
  TOAST_DURATION: 3500,
  CONNECTION_RETRY_INTERVAL: 30000,
};

export const TOAST_ICONS = {
  success: "&#10003;",
  error: "&#10005;",
  info: "&#9679;"
};

export const LICENSE_ACTION_LABELS = {
  suspend: "Suspend License",
  reinstate: "Reinstate License",
  revoke: "Revoke License",
  reset: "Reset Hardware Binding"
};
```

#### 2.2 Create `frontend/js/utils.js`
```javascript
/**
 * Utility Functions
 */

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

/**
 * Sanitize user input
 */
export function sanitize(str) {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate purchase code format (XXXX-XXXX-XXXX)
 */
export function isValidPurchaseCode(code) {
  return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str, len) {
  if (!str) return "—";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

/**
 * Format date for display
 */
export function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, { 
      dateStyle: "short", 
      timeStyle: "short" 
    });
  } catch {
    return d;
  }
}

/**
 * Generate random purchase code
 */
export function generateRandomPurchaseCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n) => Array.from({ length: n }, () => 
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `${seg(4)}-${seg(4)}-${seg(4)}`;
}
```

#### 2.3 Create `frontend/js/api.js`
```javascript
/**
 * API Client & Authentication
 */
import { CONFIG } from './config.js';
import { showLoginModal, hideLoginModal } from './auth.js';
import { toast } from './ui.js';

export let API = localStorage.getItem(CONFIG.API_URL_KEY) || '';
export let isAuthenticated = false;
let loginCheckInterval = null;

/**
 * Set API URL
 */
export function setApiUrl(url) {
  API = url;
  localStorage.setItem(CONFIG.API_URL_KEY, url);
}

/**
 * Get API URL
 */
export function getApiUrl() {
  return API;
}

/**
 * Check if API is configured
 */
export function isApiConfigured() {
  return !!API;
}

/**
 * Main API request function
 */
export async function api(path, opts = {}) {
  if (!API && path !== '/health') {
    toast('API URL not configured', 'error');
    return { error: 'Not configured' };
  }
  
  try {
    const res = await fetch(API + path, {
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      ...opts,
    });
    
    // Handle 401 Unauthorized
    if (res.status === 401) {
      isAuthenticated = false;
      showLoginModal();
      toast('Session expired. Please login again.', 'error');
      return { error: 'Unauthorized' };
    }
    
    // Handle other errors
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

/**
 * Check authentication status
 */
export async function checkAuth() {
  if (!API) {
    return false;
  }
  
  try {
    const response = await fetch(API + '/api/v1/auth/check', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      isAuthenticated = true;
      hideLoginModal();
      startAuthCheck();
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

/**
 * Start periodic authentication check
 */
function startAuthCheck() {
  if (!loginCheckInterval) {
    loginCheckInterval = setInterval(checkAuth, CONFIG.SESSION_CHECK_INTERVAL);
  }
}

/**
 * Stop authentication check
 */
export function stopAuthCheck() {
  if (loginCheckInterval) {
    clearInterval(loginCheckInterval);
    loginCheckInterval = null;
  }
}

/**
 * Perform login
 */
export async function login(email, password) {
  const response = await fetch(API + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });
  
  return response;
}

/**
 * Perform logout
 */
export async function logout() {
  try {
    await fetch(API + '/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (e) {
    // Ignore errors
  }
  
  isAuthenticated = false;
  stopAuthCheck();
}
```

#### 2.4 Create `frontend/js/ui.js`
```javascript
/**
 * UI Components - Toast, Modal, Navigation
 */
import { CONFIG, TOAST_ICONS } from './config.js';

/**
 * Show toast notification
 */
export function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span style="font-size:14px">${TOAST_ICONS[type]}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(() => el.remove(), CONFIG.TOAST_DURATION);
}

/**
 * Open modal
 */
export function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
}

/**
 * Close modal
 */
export function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

/**
 * Show confirmation dialog
 */
export function showConfirm(title, message, icon = "!", isDanger = false) {
  return new Promise((resolve) => {
    const iconEl = document.getElementById("confirm-icon");
    
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-message").textContent = message;
    
    if (isDanger) {
      iconEl.innerHTML = "&#10005;";
      iconEl.style.background = "rgba(244, 63, 94, 0.15)";
      iconEl.style.color = "var(--accent-rose)";
    } else {
      iconEl.innerHTML = "&#10003;";
      iconEl.style.background = "rgba(16, 185, 129, 0.15)";
      iconEl.style.color = "var(--accent-emerald)";
    }
    
    const okBtn = document.getElementById("confirm-ok");
    const cancelBtn = document.getElementById("confirm-cancel");
    
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newOkBtn.onclick = function() {
      closeModal("modal-confirm");
      resolve(true);
    };
    
    newCancelBtn.onclick = function() {
      closeModal("modal-confirm");
      resolve(false);
    };
    
    openModal("modal-confirm");
  });
}

/**
 * Navigate to page
 */
export function showPage(name) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  document.getElementById("nav-" + name).classList.add("active");
  
  // Trigger page-specific loaders
  const event = new CustomEvent('page-changed', { detail: { page: name } });
  window.dispatchEvent(event);
}
```

#### 2.5 Create `frontend/js/auth.js`
```javascript
/**
 * Authentication Module
 */
import { login, logout, checkAuth, isAuthenticated } from './api.js';
import { toast, openModal, closeModal } from './ui.js';

/**
 * Show login modal
 */
export function showLoginModal() {
  document.getElementById('modal-login').classList.remove('hidden');
  document.querySelector('.layout').style.filter = 'blur(8px)';
  document.querySelector('.layout').style.pointerEvents = 'none';
  
  setTimeout(() => {
    document.getElementById('login-email').focus();
  }, 300);
}

/**
 * Hide login modal
 */
export function hideLoginModal() {
  document.getElementById('modal-login').classList.add('hidden');
  document.querySelector('.layout').style.filter = '';
  document.querySelector('.layout').style.pointerEvents = '';
}

/**
 * Perform login action
 */
export async function performLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  
  if (!email || !password) {
    errorDiv.textContent = 'Please enter both email and password';
    errorDiv.style.display = 'block';
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';
  errorDiv.style.display = 'none';
  
  try {
    const response = await login(email, password);
    
    if (response.ok) {
      const data = await response.json();
      toast('Login successful!', 'success');
      hideLoginModal();
      document.getElementById('login-password').value = '';
      
      // Trigger refresh
      const event = new CustomEvent('auth-success');
      window.dispatchEvent(event);
    } else {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      errorDiv.textContent = error.detail || 'Invalid credentials';
      errorDiv.style.display = 'block';
    }
  } catch (e) {
    errorDiv.textContent = 'Cannot connect to server. Check API URL.';
    errorDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
}

/**
 * Perform logout action
 */
export async function performLogout() {
  await logout();
  toast('Logged out successfully', 'info');
  showLoginModal();
}

/**
 * Initialize auth event listeners
 */
export function initAuthListeners() {
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
}
```

#### 2.6 Create `frontend/js/licenses.js`
```javascript
/**
 * License Management Module
 */
import { api } from './api.js';
import { toast, showConfirm, openModal, closeModal } from './ui.js';
import { escapeHtml, sanitize, isValidEmail, isValidPurchaseCode, truncate, formatDate, generateRandomPurchaseCode } from './utils.js';

let allLicenses = [];
let isSubmitting = false;
const licenseDataMap = new Map();

/**
 * Load licenses from API
 */
export async function loadLicenses() {
  const tbody = document.getElementById("licenses-table");
  const tbody2 = document.getElementById("recent-licenses-table");
  tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><span class="spinner"></span> Loading…</td></tr>';

  const data = await api("/api/v1/admin/licenses");
  if (data.error || !Array.isArray(data)) {
    allLicenses = [];
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty"><div class="empty-icon">◈</div><p>Could not load licenses.</p></div></td></tr>`;
    tbody2.innerHTML = `<tr><td colspan="5"><div class="empty"><p>No data</p></div></td></tr>`;
    updateStats([]);
    return;
  }

  allLicenses = data;
  updateStats(data);
  renderTable(data, tbody);
  renderRecentTable(data, tbody2);
}

/**
 * Update dashboard stats
 */
function updateStats(licenses) {
  document.getElementById("stat-total").textContent = licenses.length;
  document.getElementById("stat-active").textContent = licenses.filter((l) => l.status === "active").length;
  document.getElementById("stat-suspended").textContent = licenses.filter((l) => l.status === "suspended").length;
}

/**
 * Render license table
 */
function renderTable(data, tbody) {
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">◈</div><p>No licenses found.</p></div></td></tr>';
    return;
  }
  
  tbody.innerHTML = data.map(createLicenseRow).join("");
}

/**
 * Render recent licenses table
 */
function renderRecentTable(data, tbody) {
  const recent = data.slice(0, 5);
  if (!recent.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty"><div class="empty-icon">◈</div><p>No licenses yet.</p></div></td></tr>';
    return;
  }
  
  tbody.innerHTML = recent.map(createRecentRow).join("");
}

/**
 * Create license table row
 */
function createLicenseRow(l) {
  const code = encodeURIComponent(l.purchase_code);
  const rawCode = escapeHtml(l.purchase_code || "");
  licenseDataMap.set(l.purchase_code, l);
  
  const actionBtn = getActionButton(l, rawCode);
  
  return `
    <tr>
      <td>${escapeHtml(l.user_email) || "—"}</td>
      <td><code style="font-size:11px;">${escapeHtml(l.purchase_code) || "—"}</code></td>
      <td><span class="badge badge-${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
      <td style="font-family:monospace;font-size:11px;" title="${escapeHtml(l.hardware_id || "")}">${truncate(l.hardware_id, 20)}</td>
      <td>${l.warning_count ?? 0}</td>
      <td style="font-size:11px;color:var(--muted);">${formatDate(l.created_at)}</td>
      <td style="white-space:nowrap;">
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${actionBtn}
          <button class="btn btn-ghost btn-sm" style="color:var(--accent-cyan)" onclick="window.openEditModalByCode('${rawCode}')" aria-label="Edit license">Edit</button>
          ${l.hardware_id ? `<button class="btn btn-ghost btn-sm" style="color:var(--text-muted)" onclick="window.licenseAction('${rawCode}','reset')" aria-label="Reset hardware">Reset</button>` : ""}
          <button class="btn btn-ghost btn-sm" style="color:var(--accent-rose)" onclick="window.licenseDelete('${rawCode}')" aria-label="Delete license">Delete</button>
        </div>
      </td>
    </tr>`;
}

/**
 * Get action button based on license status
 */
function getActionButton(l, rawCode) {
  if (l.status === "active") {
    return `<button class="btn btn-ghost btn-sm" style="color:var(--accent-amber)" onclick="window.licenseAction('${rawCode}','suspend')">Suspend</button>`;
  } else if (l.status === "suspended") {
    return `<button class="btn btn-ghost btn-sm" style="color:var(--accent-emerald)" onclick="window.licenseAction('${rawCode}','reinstate')">Reinstate</button>`;
  } else if (l.status === "pending") {
    return `<button class="btn btn-ghost btn-sm" style="color:var(--accent-emerald)" onclick="window.licenseAction('${rawCode}','activate')">Activate</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--accent-rose)" onclick="window.licenseAction('${rawCode}','revoke')">Revoke</button>`;
  } else {
    return `<button class="btn btn-ghost btn-sm" style="color:var(--accent-emerald)" onclick="window.licenseAction('${rawCode}','reinstate')">Reinstate</button>`;
  }
}

/**
 * Create recent license row
 */
function createRecentRow(l) {
  return `
    <tr>
      <td>${escapeHtml(l.user_email) || "—"}</td>
      <td><code style="font-size:11px;">${escapeHtml(l.purchase_code) || "—"}</code></td>
      <td><span class="badge badge-${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
      <td style="font-family:monospace;font-size:11px;">${truncate(l.hardware_id, 16)}</td>
      <td>${l.warning_count ?? 0}</td>
    </tr>`;
}

/**
 * Filter licenses
 */
export function filterLicenses() {
  const q = document.getElementById("license-search").value.toLowerCase();
  const status = document.getElementById("license-filter").value;
  const filtered = allLicenses.filter((l) => {
    const matchText = !q || (l.user_email || "").toLowerCase().includes(q) || (l.purchase_code || "").toLowerCase().includes(q);
    const matchStatus = !status || l.status === status;
    return matchText && matchStatus;
  });
  renderTable(filtered, document.getElementById("licenses-table"));
}

// Export remaining license functions (create, edit, delete, actions)...
// This is getting long, so I'll show the pattern for one more:

/**
 * Create new license
 */
export async function createLicense() {
  if (isSubmitting) return;
  
  const email = sanitize(document.getElementById("act-email").value);
  const code = sanitize(document.getElementById("act-code").value);
  const licenseType = document.querySelector('input[name="license-type"]:checked').value;
  const days = licenseType === "limited" ? (parseInt(document.getElementById("act-days").value) || 365) : null;

  if (!email || !code) {
    toast("Email and Purchase Code are required.", "error");
    return;
  }

  if (!isValidEmail(email)) {
    toast("Please enter a valid email address.", "error");
    return;
  }

  if (!isValidPurchaseCode(code)) {
    toast("Purchase code must be in format XXXX-XXXX-XXXX", "error");
    return;
  }

  const btn = document.getElementById("modal-activate-btn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating...';
  isSubmitting = true;

  try {
    const payload = { email, purchase_code: code };
    if (days !== null) {
      payload.duration_days = days;
    } else {
      payload.unlimited = true;
    }

    const data = await api("/api/v1/admin/licenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data.success) {
      toast(`License created for ${email}!`, "success");
      closeModal("modal-activate");
      loadLicenses();
    } else {
      toast(data.detail || data.message || "Failed to create license.", "error");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Create License";
    isSubmitting = false;
  }
}

// ... continue with other functions (edit, delete, action, etc.)
```

#### 2.7 Create `frontend/js/main.js`
```javascript
/**
 * Main Application Entry Point
 */
import { CONFIG } from './config.js';
import { checkAuth, getApiUrl, setApiUrl } from './api.js';
import { initAuthListeners } from './auth.js';
import { showPage } from './ui.js';
import { loadLicenses, filterLicenses } from './licenses.js';
import { loadSessions } from './sessions.js';
import { loadIncidents } from './security.js';
import { loadLogs } from './logs.js';

/**
 * Check API configuration
 */
function checkConfig() {
  const API = getApiUrl();
  if (!API) {
    document.getElementById('modal-config').classList.remove('hidden');
    document.querySelector('.layout').style.filter = 'blur(5px)';
    document.querySelector('.layout').style.pointerEvents = 'none';
  }
}

/**
 * Save API configuration
 */
window.saveConfig = function() {
  const url = document.getElementById('config-api-url').value.trim().replace(/\/$/, '');
  
  if (!url) {
    toast('API URL is required', 'error');
    return;
  }
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    toast('Please enter a valid URL', 'error');
    return;
  }
  
  setApiUrl(url);
  document.getElementById('modal-config').classList.add('hidden');
  document.querySelector('.layout').style.filter = '';
  document.querySelector('.layout').style.pointerEvents = '';
  toast('Connected to ' + url, 'success');
  init();
};

/**
 * Initialize application
 */
async function init() {
  checkConfig();
  initAuthListeners();
  
  const API = getApiUrl();
  if (API) {
    const authenticated = await checkAuth();
    if (authenticated) {
      await refreshAll();
    }
  }
  
  // Auto-refresh sessions
  setInterval(async () => {
    const active = document.getElementById("page-sessions").classList.contains("active");
    if (active) await loadSessions();
  }, CONFIG.AUTO_REFRESH_INTERVAL);
}

/**
 * Refresh all data
 */
async function refreshAll() {
  await Promise.all([
    loadLicenses(),
    loadIncidents(),
    checkHealth()
  ]);
}

/**
 * Listen for page changes
 */
window.addEventListener('page-changed', (e) => {
  const page = e.detail.page;
  if (page === 'licenses') loadLicenses();
  if (page === 'sessions') loadSessions();
  if (page === 'security') loadIncidents();
  if (page === 'logs') loadLogs();
});

/**
 * Listen for auth success
 */
window.addEventListener('auth-success', () => {
  refreshAll();
});

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose functions to global scope (for inline onclick handlers)
// TODO: Migrate to event listeners to avoid this
window.showPage = showPage;
window.loadLicenses = loadLicenses;
window.filterLicenses = filterLicenses;
// ... expose other functions as needed
```

#### 2.8 Update `frontend/index.html` - JavaScript Modules
```html
<!-- At end of body, replace inline script with: -->
<script type="module" src="js/main.js"></script>
```

---

### **Phase 3: Update Backend to Serve Frontend (30 min)**

#### 3.1 Update `main.py`
```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="WebRTC License Server", version="1.0.0")

# ... existing CORS, middleware, etc.

# Serve static files
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")

@app.get("/")
async def serve_dashboard():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

# ... rest of existing code
```

#### 3.2 Update `Dockerfile`
```dockerfile
FROM python:3.11-slim

# ... existing setup

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./backend/

# Copy frontend
COPY frontend/ ./frontend/

# ... rest of existing Dockerfile
```

---

## 📋 **Migration Checklist**

### **Phase 1: CSS Extraction**
- [ ] Create `frontend/css/` directory
- [ ] Create `variables.css` with CSS custom properties
- [ ] Create `reset.css` with modern reset
- [ ] Create `layout.css` with grid & sidebar
- [ ] Create `components.css` with all components
- [ ] Create `responsive.css` with media queries
- [ ] Update `index.html` with CSS links
- [ ] Test: Dashboard loads with same appearance

### **Phase 2: JavaScript Modularization**
- [ ] Create `frontend/js/` directory
- [ ] Create `config.js` with constants
- [ ] Create `utils.js` with helper functions
- [ ] Create `api.js` with API client
- [ ] Create `ui.js` with modal/toast/navigation
- [ ] Create `auth.js` with login/logout
- [ ] Create `licenses.js` with license CRUD
- [ ] Create `sessions.js` with sessions page
- [ ] Create `security.js` with security incidents
- [ ] Create `logs.js` with validation logs
- [ ] Create `tools.js` with tools page
- [ ] Create `main.js` as entry point
- [ ] Update `index.html` with module script
- [ ] Test: All functionality works

### **Phase 3: Backend Integration**
- [ ] Update `main.py` to serve static files
- [ ] Update `Dockerfile` to copy frontend
- [ ] Update `docker-compose.yml` if needed
- [ ] Test: Full stack works together

### **Phase 4: Remove Inline Handlers (Optional)**
- [ ] Replace onclick handlers with event listeners
- [ ] Remove global function exposure
- [ ] Test: Everything still works

---

## 🎯 **Benefits of This Structure**

### **Maintainability**
- ✅ **Separation of Concerns** - Each module has one responsibility
- ✅ **Easy to Find Code** - Logical file organization
- ✅ **Smaller Files** - Each file < 300 lines

### **Performance**
- ✅ **Browser Caching** - Separate CSS/JS files cached independently
- ✅ **Lazy Loading** - Can load modules on demand
- ✅ **Minification Ready** - Easy to add build step later

### **Developer Experience**
- ✅ **Better IDE Support** - Autocomplete across modules
- ✅ **Easier Testing** - Pure functions in utils
- ✅ **Team Collaboration** - Multiple devs can work in parallel

### **Future-Proofing**
- ✅ **Easy to Add Build Step** - Vite, Webpack, etc.
- ✅ **Easy to Add TypeScript** - Rename `.js` to `.ts`
- ✅ **Easy to Add Framework** - Clear component boundaries

---

## 🚀 **Next Steps (Optional Enhancements)**

### **If You Want Even More Production-Ready:**

1. **Add Build Step (Vite)** - 2 hours
   - Minification, bundling, tree-shaking
   - Hot module replacement in dev
   - TypeScript support

2. **Add TypeScript** - 3-4 hours
   - Type safety for better refactoring
   - Better IDE support
   - Catch bugs at compile time

3. **Add Component Library** - 4-6 hours
   - Encapsulate reusable components
   - Web Components or lightweight framework
   - Better testability

4. **Add Testing** - 8-12 hours
   - Unit tests for utils
   - Integration tests for API calls
   - E2E tests with Playwright

---

## 📐 **Design Rationale**

### **Why ES Modules?**
- Native browser support (no bundler needed initially)
- Easy to add build step later
- Clear dependency graph

### **Why Separate CSS Files?**
- Browser caching (components.css rarely changes)
- Easier to find/edit styles
- Can load critical CSS inline later

### **Why Keep Some Global Functions?**
- Migrating away from inline `onclick` handlers takes time
- Can be done incrementally
- Doesn't break existing functionality

### **Why Not Use a Framework Yet?**
- YAGNI - current vanilla JS works fine
- Framework adds complexity and build step
- Easy to migrate later if needed

---

**Total Effort: 4-6 hours for complete modularization**
**Immediate Benefit: Much more maintainable, production-ready structure**
**Zero Breaking Changes: Same functionality, better organization**
