(function() {
  'use strict';

  const CONFIG = {
    SESSION_CHECK_INTERVAL: 5 * 60 * 1000,
    AUTO_REFRESH_INTERVAL: 30000,
    TOAST_DURATION: 3500,
  };

  const TOAST_ICONS = {
    success: "&#10003;",
    error: "&#10005;",
    info: "&#9679;"
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }

  function sanitize(str) {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, '');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPurchaseCode(code) {
    return /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code);
  }

  function truncate(str, len) {
    if (!str) return "—";
    return str.length > len ? str.slice(0, len) + "…" : str;
  }

  function formatDate(d) {
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

  function generateRandomPurchaseCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const seg = (n) => Array.from({ length: n }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    return `${seg(4)}-${seg(4)}-${seg(4)}`;
  }

  async function api(path, opts = {}) {
    try {
      const res = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        ...opts,
      });
      
      if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('auth-expired'));
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
      return { error: e.message };
    }
  }

  async function checkAuth() {
    try {
      const response = await fetch('/api/v1/auth/check', {
        credentials: 'include'
      });
      
      if (response.ok) {
        window.dispatchEvent(new CustomEvent('auth-success'));
        return true;
      } else {
        window.dispatchEvent(new CustomEvent('auth-required'));
        return false;
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('auth-required'));
      return false;
    }
  }

  async function login(email, password) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    return response;
  }

  async function logout() {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
    }
  }

  async function checkHealth() {
    return await api("/health");
  }

  function toast(msg, type) {
    if (!type) type = "info";
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span style="font-size:14px">${TOAST_ICONS[type]}</span><span>${msg}</span>`;
    document.getElementById("toast-container").appendChild(el);
    setTimeout(() => el.remove(), CONFIG.TOAST_DURATION);
  }

  function openModalById(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function closeModalById(id) {
    document.getElementById(id).classList.add("hidden");
  }

  function showConfirm(title, message, icon, isDanger) {
    if (isDanger === undefined) isDanger = false;
    if (icon === undefined) icon = "!";
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
        closeModalById("modal-confirm");
        resolve(true);
      };
      
      newCancelBtn.onclick = function() {
        closeModalById("modal-confirm");
        resolve(false);
      };
      
      openModalById("modal-confirm");
    });
  }

  window.showPage = function(name) {
    document.querySelectorAll(".page").forEach(function(p) { p.classList.remove("active"); });
    document.querySelectorAll(".nav-item").forEach(function(n) { n.classList.remove("active"); });
    document.getElementById("page-" + name).classList.add("active");
    document.getElementById("nav-" + name).classList.add("active");
    
    const event = new CustomEvent('page-changed', { detail: { page: name } });
    window.dispatchEvent(event);
  };

  function updateHealthUI(data) {
    const dot = document.getElementById("health-dot");
    const label = document.getElementById("health-label");
    const sub = document.getElementById("health-sub");
    
    if (data.status === "healthy") {
      dot.className = "dot dot-green";
      label.textContent = "Healthy";
      sub.innerHTML = "DB: " + (data.database || "ok") + " &nbsp;|&nbsp; v" + (data.version || "1.0");
    } else if (data.error) {
      dot.className = "dot dot-red";
      label.textContent = "Unreachable";
      sub.textContent = "Check: docker-compose ps";
    } else {
      dot.className = "dot dot-yellow";
      label.textContent = "Degraded";
    }

    const svcApi = document.getElementById("svc-api");
    const svcDb = document.getElementById("svc-db");
    const svcKeys = document.getElementById("svc-keys");

    if (!data.error) {
      svcApi.innerHTML = '<span class="badge badge-healthy">Healthy</span>';
      svcDb.innerHTML = data.database === "healthy" ? '<span class="badge badge-healthy">Connected</span>' : '<span class="badge badge-unhealthy">Degraded</span>';
    } else {
      svcApi.innerHTML = '<span class="badge badge-unhealthy">Offline</span>';
      svcDb.innerHTML = '<span class="badge badge-unhealthy">Unknown</span>';
    }
  }

  function showLoginModal() {
    document.getElementById('modal-login').classList.remove('hidden');
    document.querySelector('.layout').style.filter = 'blur(8px)';
    document.querySelector('.layout').style.pointerEvents = 'none';
    
    setTimeout(function() {
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
        
        const event = new CustomEvent('login-success');
        window.dispatchEvent(event);
      } else {
        const error = await response.json().catch(function() { return { detail: 'Login failed' }; });
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

  async function performLogout() {
    await logout();
    toast('Logged out successfully', 'info');
    showLoginModal();
  }

  function initAuthListeners() {
    const loginPassword = document.getElementById('login-password');
    const loginEmail = document.getElementById('login-email');
    
    if (loginPassword) {
      loginPassword.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performLogin();
      });
    }
    
    if (loginEmail) {
      loginEmail.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          document.getElementById('login-password').focus();
        }
      });
    }
  }

  let allLicenses = [];
  let isSubmitting = false;
  const licenseDataMap = new Map();

  function setLicenseData(code, data) {
    licenseDataMap.set(code, data);
  }

  function getLicenseData(code) {
    return licenseDataMap.get(code);
  }

  async function loadLicenses() {
    const tbody = document.getElementById("licenses-table");
    const tbody2 = document.getElementById("recent-licenses-table");
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><span class="spinner"></span> Loading…</td></tr>';

    const data = await api("/api/v1/admin/licenses");
    if (data.error || !Array.isArray(data)) {
      allLicenses = [];
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">◈</div><p>Could not load licenses.</p></div></td></tr>';
      tbody2.innerHTML = '<tr><td colspan="5"><div class="empty"><p>No data</p></div></td></tr>';
      updateStats([]);
      return;
    }

    allLicenses = data;
    updateStats(data);
    renderTable(data, tbody);
    renderRecentTable(data, tbody2);
  }

  function updateStats(licenses) {
    document.getElementById("stat-total").textContent = licenses.length;
    document.getElementById("stat-active").textContent = licenses.filter(function(l) { return l.status === "active"; }).length;
    document.getElementById("stat-suspended").textContent = licenses.filter(function(l) { return l.status === "suspended"; }).length;
  }

  function renderTable(data, tbody) {
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="empty-icon">◈</div><p>No licenses found.</p></div></td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(createLicenseRow).join("");
  }

  function renderRecentTable(data, tbody) {
    const recent = data.slice(0, 5);
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty"><div class="empty-icon">◈</div><p>No licenses yet.</p></div></td></tr>';
      return;
    }
    
    tbody.innerHTML = recent.map(createRecentRow).join("");
  }

  function createLicenseRow(l) {
    const rawCode = escapeHtml(l.purchase_code || "");
    setLicenseData(l.purchase_code, l);
    
    const actionBtn = getActionButton(l, rawCode);
    
    return '<tr>' +
      '<td>' + (escapeHtml(l.user_email) || "—") + '</td>' +
      '<td><code style="font-size:11px;">' + (escapeHtml(l.purchase_code) || "—") + '</code></td>' +
      '<td><span class="badge badge-' + escapeHtml(l.status) + '">' + escapeHtml(l.status) + '</span></td>' +
      '<td style="font-family:monospace;font-size:11px;" title="' + escapeHtml(l.hardware_id || "") + '">' + truncate(l.hardware_id, 20) + '</td>' +
      '<td>' + (l.warning_count ?? 0) + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted);">' + formatDate(l.created_at) + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +
          actionBtn +
          '<button class="btn btn-ghost btn-sm" style="color:var(--accent-cyan)" onclick="window.openEditModalByCode(\'' + rawCode + '\')" aria-label="Edit license">Edit</button>' +
          (l.hardware_id ? '<button class="btn btn-ghost btn-sm" style="color:var(--text-muted)" onclick="window.licenseAction(\'' + rawCode + '\',\'reset\')" aria-label="Reset hardware">Reset</button>' : '') +
          '<button class="btn btn-ghost btn-sm" style="color:var(--accent-rose)" onclick="window.licenseDelete(\'' + rawCode + '\')" aria-label="Delete license">Delete</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  function getActionButton(l, rawCode) {
    if (l.status === "active") {
      return '<button class="btn btn-ghost btn-sm" style="color:var(--accent-amber)" onclick="window.licenseAction(\'' + rawCode + '\',\'suspend\')" aria-label="Suspend license">Suspend</button>';
    } else if (l.status === "suspended") {
      return '<button class="btn btn-ghost btn-sm" style="color:var(--accent-emerald)" onclick="window.licenseAction(\'' + rawCode + '\',\'reinstate\')" aria-label="Reinstate license">Reinstate</button>';
    } else if (l.status === "pending") {
      return '<button class="btn btn-ghost btn-sm" style="color:var(--accent-emerald)" onclick="window.licenseAction(\'' + rawCode + '\',\'activate\')" aria-label="Activate license">Activate</button>' +
             '<button class="btn btn-ghost btn-sm" style="color:var(--accent-rose)" onclick="window.licenseAction(\'' + rawCode + '\',\'revoke\')" aria-label="Revoke license">Revoke</button>';
    } else {
      return '<button class="btn btn-ghost btn-sm" style="color:var(--accent-emerald)" onclick="window.licenseAction(\'' + rawCode + '\',\'reinstate\')" aria-label="Reinstate license">Reinstate</button>';
    }
  }

  function createRecentRow(l) {
    return '<tr>' +
      '<td>' + (escapeHtml(l.user_email) || "—") + '</td>' +
      '<td><code style="font-size:11px;">' + (escapeHtml(l.purchase_code) || "—") + '</code></td>' +
      '<td><span class="badge badge-' + escapeHtml(l.status) + '">' + escapeHtml(l.status) + '</span></td>' +
      '<td style="font-family:monospace;font-size:11px;">' + truncate(l.hardware_id, 16) + '</td>' +
      '<td>' + (l.warning_count ?? 0) + '</td>' +
    '</tr>';
  }

  window.filterLicenses = function() {
    const q = document.getElementById("license-search").value.toLowerCase();
    const status = document.getElementById("license-filter").value;
    const filtered = allLicenses.filter(function(l) {
      const matchText = !q || ((l.user_email || "").toLowerCase().indexOf(q) !== -1) || ((l.purchase_code || "").toLowerCase().indexOf(q) !== -1);
      const matchStatus = !status || l.status === status;
      return matchText && matchStatus;
    });
    renderTable(filtered, document.getElementById("licenses-table"));
  };

  window.toggleDurationField = function() {
    const isLimited = document.querySelector('input[name="license-type"]:checked').value === "limited";
    document.getElementById("duration-field").style.display = isLimited ? "flex" : "none";
  };

  window.generatePurchaseCode = function() {
    document.getElementById("act-code").value = generateRandomPurchaseCode();
  };

  function openEditModal(license) {
    document.getElementById("modal-activate-title").textContent = "◆ Edit License";
    document.getElementById("modal-activate-desc").textContent = "Update license details. Leave duration empty to keep current value.";
    document.getElementById("edit-purchase-code").value = license.purchase_code;
    document.getElementById("act-email").value = license.user_email || "";
    document.getElementById("act-code").value = license.purchase_code;
    document.getElementById("act-code").disabled = true;
    
    const isUnlimited = !license.expires_at || license.expires_at === "unlimited";
    var typeVal = isUnlimited ? "unlimited" : "limited";
    document.querySelector('input[name="license-type"][value="' + typeVal + '"]').checked = true;
    window.toggleDurationField();
    
    document.getElementById("modal-activate-btn").textContent = "Save Changes";
    document.getElementById("modal-activate-btn").onclick = saveLicenseChanges;
    openModalById("modal-activate");
  }

  window.openEditModalByCode = function(code) {
    var license = getLicenseData(code);
    if (license) {
      openEditModal(license);
    } else {
      toast("License data not found", "error");
    }
  };

  window.resetCreateModal = function() {
    document.getElementById("modal-activate-title").textContent = "◆ Create New License";
    document.getElementById("modal-activate-desc").textContent = "Pre-approve a license for a customer. They will bind their hardware when they install the add-on.";
    document.getElementById("edit-purchase-code").value = "";
    document.getElementById("act-email").value = "";
    document.getElementById("act-code").value = "";
    document.getElementById("act-code").disabled = false;
    document.getElementById("act-days").value = "365";
    document.querySelector('input[name="license-type"][value="limited"]').checked = true;
    window.toggleDurationField();
    document.getElementById("modal-activate-btn").textContent = "Create License";
    document.getElementById("modal-activate-btn").onclick = createLicense;
  };

  async function saveLicenseChanges() {
    if (isSubmitting) return;
    
    var email = sanitize(document.getElementById("act-email").value);
    var code = document.getElementById("edit-purchase-code").value.trim();
    var licenseType = document.querySelector('input[name="license-type"]:checked').value;
    var daysInput = document.getElementById("act-days").value.trim();
    
    if (!email || !code) {
      toast("Email and Purchase Code are required.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      toast("Please enter a valid email address.", "error");
      return;
    }

    var btn = document.getElementById("modal-activate-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving...';
    isSubmitting = true;

    try {
      var payload = { email: email, action: "update", extend_days: null, set_unlimited: null };
      
      if (licenseType === "unlimited") {
        payload.set_unlimited = true;
      } else if (daysInput) {
        payload.extend_days = parseInt(daysInput);
      }

      var data = await api("/api/v1/admin/licenses/" + encodeURIComponent(code), {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (data.success) {
        toast("License updated successfully!", "success");
        closeModalById("modal-activate");
        window.resetCreateModal();
        loadLicenses();
      } else {
        toast(data.detail || "Failed to update license.", "error");
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Changes";
      isSubmitting = false;
    }
  }

  async function createLicense() {
    if (isSubmitting) return;
    
    var email = sanitize(document.getElementById("act-email").value);
    var code = sanitize(document.getElementById("act-code").value);
    var licenseType = document.querySelector('input[name="license-type"]:checked').value;
    var days = licenseType === "limited" ? (parseInt(document.getElementById("act-days").value) || 365) : null;

    if (!email || !code) {
      toast("Email and Purchase Code are required.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      toast("Please enter a valid email address.", "error");
      return;
    }

    if (!isValidPurchaseCode(code)) {
      toast("Purchase code must be in format XXXX-XXXX-XXXX (letters and numbers only).", "error");
      return;
    }

    var btn = document.getElementById("modal-activate-btn");
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';
    isSubmitting = true;

    try {
      var payload = { email: email, purchase_code: code };
      if (days !== null) {
        payload.duration_days = days;
      } else {
        payload.unlimited = true;
      }

      var data = await api("/api/v1/admin/licenses", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (data.success) {
        toast("License created for " + email + "! Customer can now activate on their device.", "success");
        closeModalById("modal-activate");
        window.resetCreateModal();
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

  window.licenseAction = async function(purchaseCode, action) {
    if (action === "activate") {
      document.getElementById("activate-license-code").value = purchaseCode;
      document.getElementById("activate-hardware-id").value = "";
      openModalById("modal-activate-hardware");
      return;
    }
    
    var labels = { 
      suspend: "Suspend License", 
      reinstate: "Reinstate License", 
      revoke: "Revoke License", 
      reset: "Reset Hardware Binding"
    };
    var label = labels[action] || action;
    var isDanger = action === "suspend" || action === "revoke";
    
    var confirmed = await showConfirm(
      label,
      "Are you sure you want to " + action + ' license "' + purchaseCode + '"?',
      isDanger ? "!" : "✓",
      isDanger
    );
    if (!confirmed) return;

    var data = await api("/api/v1/admin/licenses/" + encodeURIComponent(purchaseCode), {
      method: "PATCH",
      body: JSON.stringify({ action: action }),
    });

    if (data.success) {
      toast("License " + action + "d → now: " + data.new_status, "success");
      loadLicenses();
    } else {
      toast(data.detail || "Action '" + action + "' failed.", "error");
    }
  };

  window.licenseDelete = async function(purchaseCode) {
    var confirmed = await showConfirm(
      "Delete License",
      'Permanently delete license "' + purchaseCode + '" and ALL its logs, sessions, and incidents? This cannot be undone.',
      "✕",
      true
    );
    if (!confirmed) return;

    var data = await api("/api/v1/admin/licenses/" + encodeURIComponent(purchaseCode), {
      method: "DELETE",
    });

    if (data.success) {
      toast("License " + purchaseCode + " deleted.", "success");
      loadLicenses();
    } else {
      toast(data.detail || "Delete failed.", "error");
    }
  };

  window.submitActivate = async function() {
    var purchaseCode = document.getElementById("activate-license-code").value;
    var hardwareId = document.getElementById("activate-hardware-id").value.trim();
    
    if (hardwareId && hardwareId.length !== 64) {
      toast("Hardware ID must be a 64-character SHA256 hash", "error");
      return;
    }
    
    var payload = { action: "activate" };
    if (hardwareId) {
      payload.hardware_id = hardwareId;
    }
    
    var data = await api("/api/v1/admin/licenses/" + encodeURIComponent(purchaseCode), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (data.success) {
      toast("License activated successfully", "success");
      closeModalById("modal-activate-hardware");
      loadLicenses();
    } else {
      toast(data.detail || "Failed to activate license", "error");
    }
  };

  window.openModal = openModalById;
  window.closeModal = closeModalById;

  async function loadSessions() {
    var tbody = document.getElementById("sessions-table");
    tbody.innerHTML = '<tr class="loading-row"><td colspan="5"><span class="spinner"></span> Loading…</td></tr>';

    var data = await api("/api/v1/admin/sessions");
    document.getElementById("sessions-updated").textContent = "Updated " + new Date().toLocaleTimeString();

    if (data.error || !Array.isArray(data)) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty"><div class="empty-icon">◷</div><p>No session data available.</p></div></td></tr>';
      document.getElementById("stat-sessions").textContent = "—";
      return;
    }

    document.getElementById("stat-sessions").textContent = data.length;

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty"><div class="empty-icon">◷</div><p>No active sessions right now.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = data.map(createSessionRow).join("");
  }

  function createSessionRow(s) {
    return '<tr>' +
      '<td style="font-family:monospace;font-size:11px;">' + (s.session_id || "—") + '</td>' +
      '<td>' + (s.user_email || s.license_email || "—") + '</td>' +
      '<td style="font-family:monospace;font-size:11px;">' + truncate(s.hardware_id, 18) + '</td>' +
      '<td style="font-size:12px;">' + formatDate(s.last_heartbeat || s.updated_at) + '</td>' +
      '<td><span class="badge badge-active">active</span></td>' +
    '</tr>';
  }

  async function loadIncidents() {
    var tbody = document.getElementById("incidents-table");
    var tbody2 = document.getElementById("recent-incidents-table");
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6"><span class="spinner"></span> Loading…</td></tr>';

    var data = await api("/api/v1/admin/incidents");
    document.getElementById("incident-count-badge").textContent = Array.isArray(data) ? data.length : "?";

    if (data.error || !Array.isArray(data)) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">⬡</div><p>No incident data available.</p></div></td></tr>';
      tbody2.innerHTML = '<tr><td colspan="3"><div class="empty"><p>No data</p></div></td></tr>';
      document.getElementById("sec-hw").textContent = "—";
      document.getElementById("sec-concurrent").textContent = "—";
      document.getElementById("sec-suspended").textContent = "—";
      return;
    }

    var hwCount = data.filter(function(i) { return i.incident_type === "hardware_mismatch"; }).length;
    var concCount = data.filter(function(i) { return i.incident_type === "concurrent_session"; }).length;
    var susCount = data.filter(function(i) { return i.action_taken === "suspended"; }).length;
    document.getElementById("sec-hw").textContent = hwCount;
    document.getElementById("sec-concurrent").textContent = concCount;
    document.getElementById("sec-suspended").textContent = susCount;

    function renderRow(i) {
      return '<tr>' +
        '<td><span class="badge badge-' + (i.severity === "critical" ? "critical" : "warning") + '">' + (escapeHtml(i.incident_type) || "—") + '</span></td>' +
        '<td><span class="badge badge-' + escapeHtml(i.severity) + '">' + (escapeHtml(i.severity) || "—") + '</span></td>' +
        '<td>' + (escapeHtml(i.action_taken) || "—") + '</td>' +
      '</tr>';
    }

    tbody2.innerHTML = data.slice(0, 5).map(renderRow).join("") || '<tr><td colspan="3"><div class="empty"><p>No incidents</p></div></td></tr>';

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty"><div class="empty-icon">✓</div><p>No security incidents recorded.</p></div></td></tr>';
      return;
    }

    tbody.innerHTML = data.map(createIncidentRow).join("");
  }

  function createIncidentRow(i) {
    return '<tr>' +
      '<td><span class="badge badge-' + (i.severity === "critical" ? "critical" : "warning") + '">' + (escapeHtml(i.incident_type) || "—") + '</span></td>' +
      '<td><span class="badge badge-' + escapeHtml(i.severity) + '">' + (escapeHtml(i.severity) || "—") + '</span></td>' +
      '<td>' + (escapeHtml(i.action_taken) || "—") + '</td>' +
      '<td style="font-size:12px;">' + (i.license_email || i.hardware_id ? truncate(i.hardware_id, 16) : "—") + '</td>' +
      '<td style="font-size:12px;">' + (escapeHtml(i.ip_address) || "—") + '</td>' +
      '<td style="font-size:11px;color:var(--text-muted);">' + formatDate(i.created_at) + '</td>' +
    '</tr>';
  }

  window.lookupLicense = async function() {
    var code = document.getElementById("lookup-code").value.trim();
    if (!code) {
      toast("Enter a purchase code.", "error");
      return;
    }
    var data = await api("/api/v1/status/" + encodeURIComponent(code));
    document.getElementById("lookup-output").textContent = JSON.stringify(data, null, 2);
    document.getElementById("lookup-result").style.display = "block";
    document.getElementById("lookup-code").value = code;
    if (data.error) toast("Lookup failed: " + data.error, "error");
  };

  window.runHealthCheck = async function() {
    var data = await api("/health");
    document.getElementById("health-output").textContent = JSON.stringify(data, null, 2);
    document.getElementById("health-result").style.display = "block";
  };

  window.confirmTruncate = function() {
    showConfirm(
      "Truncate Database",
      "This will DELETE all licenses, sessions, logs, and incidents from the database. Only use in development/testing!",
      "!",
      true
    ).then(function(confirmed) {
      if (confirmed) {
        toast(
          'Truncate must be run via CLI: docker-compose exec db psql -U license_user -d webrtc_licenses -c "TRUNCATE licenses, validation_logs, session_states, security_incidents CASCADE;"',
          "info"
        );
      }
    });
  };

  window.copyDbCmd = function() {
    var cmd = "docker-compose exec db psql -U license_user -d webrtc_licenses";
    try {
      navigator.clipboard.writeText(cmd);
      toast("DB connection command copied!", "success");
    } catch (e) {
      toast("Failed to copy - clipboard not available", "error");
    }
  };

  let loginCheckInterval = null;

  function startAuthCheck() {
    if (!loginCheckInterval) {
      loginCheckInterval = setInterval(checkAuth, CONFIG.SESSION_CHECK_INTERVAL);
    }
  }

  async function init() {
    initAuthListeners();
    
    const authenticated = await checkAuth();
    if (authenticated) {
      startAuthCheck();
      await refreshAll();
    }
    
    setInterval(async function() {
      var active = document.getElementById("page-sessions").classList.contains("active");
      if (active) await loadSessions();
    }, CONFIG.AUTO_REFRESH_INTERVAL);
  }

  window.addEventListener('page-changed', function(e) {
    var page = e.detail.page;
    if (page === 'licenses') loadLicenses();
    if (page === 'sessions') loadSessions();
    if (page === 'security') loadIncidents();
  });

  window.addEventListener('login-success', function() {
    refreshAll();
  });

  window.addEventListener('auth-required', function() {
    var loginModal = document.getElementById('modal-login');
    if (loginModal) {
      loginModal.classList.remove('hidden');
      document.querySelector('.layout').style.filter = 'blur(8px)';
      document.querySelector('.layout').style.pointerEvents = 'none';
    }
  });

  window.addEventListener('auth-expired', function() {
    toast('Session expired. Please login again.', 'error');
    window.dispatchEvent(new CustomEvent('auth-required'));
  });

  window.addEventListener('server-reconnected', function() {
    toast('Server is now reachable', 'success');
  });

  window.addEventListener('auth-success', async function() {
    var loginModal = document.getElementById('modal-login');
    if (loginModal) {
      loginModal.classList.add('hidden');
      document.querySelector('.layout').style.filter = '';
      document.querySelector('.layout').style.pointerEvents = '';
    }
    await refreshAll();
  });

  async function refreshAll() {
    await Promise.all([
      loadLicenses(),
      loadIncidents()
    ]);
    var healthData = await checkHealth();
    updateHealthUI(healthData);
    var pk = await api("/api/v1/public_key");
    var svcKeys = document.getElementById("svc-keys");
    svcKeys.innerHTML = pk.public_key ? '<span class="badge badge-healthy">Loaded</span>' : '<span class="badge badge-unhealthy">Missing</span>';
  }

  window.logout = function() {
    logout();
    window.location.reload();
  };

  window.loadLicenses = loadLicenses;
  window.loadSessions = loadSessions;
  window.loadIncidents = loadIncidents;
  window.performLogout = performLogout;
  window.refreshAll = refreshAll;

  window.checkHealth = async function() {
    var healthData = await checkHealth();
    updateHealthUI(healthData);
    return healthData;
  };

  window.onerror = function(msg, url, line) {
    toast("An error occurred: " + msg, "error");
    console.error("Error:", msg, "at", url, line);
    return false;
  };

  window.addEventListener('unhandledrejection', function(e) {
    toast("Request failed: " + (e.reason ? e.reason.message : "Unknown error"), "error");
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
