const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
if ($$('.tab').length) {
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const id = btn.dataset.tab;
      $$('.tabpane').forEach((p) => p.classList.remove('is-active'));
      const pane = document.getElementById(`tab-${id}`);
      if (pane) pane.classList.add('is-active');
    });
  });
}

// Admin panel demo
const adminTarget = $('#adminTarget');
const adminHours = $('#adminHours');
const adminBandwidth = $('#adminBandwidth');
const applyPolicyBtn = $('#applyPolicy');
const adminToast = $('#adminToast');

const previewTarget = $('#previewTarget');
const previewHours = $('#previewHours');
const previewBandwidth = $('#previewBandwidth');

if (applyPolicyBtn) {
  applyPolicyBtn.addEventListener('click', () => {
    previewTarget.textContent = adminTarget.value;
    previewHours.textContent = String(adminHours.value);
    previewBandwidth.textContent = `${adminBandwidth.value} Mbps`;
    adminToast.textContent = `Applied policy to ${adminTarget.value}`;
    adminToast.style.display = 'block';
    setTimeout(() => { adminToast.style.display = 'none'; }, 2200);
  });
}

// Session demo
const heroRemaining = $('#heroRemaining');
const statAllocated = $('#statAllocated');
const statRemaining = $('#statRemaining');
const statBandwidth = $('#statBandwidth');
const startBtn = $('#startSession');
const endBtn = $('#endSession');
const speedSelect = $('#simSpeed');
const chooseFree = $('#chooseFree');
const choosePaid = $('#choosePaid');

const modal = $('#modal');
const modalRemaining = $('#modalRemaining');
const modalClose = $('#modalClose');
const extendBtn = $('#extendBtn');
const cancelBtn = $('#cancelBtn');

// Auth elements
const authPanel = $('#authPanel');
const authEmail = $('#authEmail');
const authPassword = $('#authPassword');
const loginBtn = $('#loginBtn');
const registerBtn = $('#registerBtn');
const authUser = $('#authUser');
const guestBtn = $('#guestBtn');

// Usage elements
const usageBar = $('#usageBar');
const usageValue = $('#usageValue');
const usageCanvas = document.getElementById('usageChart');
let usageCtx = null;
let usageSeries = [];
if (usageCanvas) {
  usageCtx = usageCanvas.getContext('2d');
}
function resizeUsageCanvas() {
  if (!usageCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = usageCanvas.clientWidth || 300;
  const cssH = usageCanvas.clientHeight || 150;
  usageCanvas.width = Math.round(cssW * dpr);
  usageCanvas.height = Math.round(cssH * dpr);
  if (usageCtx) usageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
if (usageCanvas) {
  resizeUsageCanvas();
  window.addEventListener('resize', resizeUsageCanvas);
}

let timer = null;
let state = {
  allocatedSeconds: 0,
  remainingSeconds: 0,
  bandwidthLabel: '—',
  mode: 'uni',
  notified: false,
  loggedInEmail: null,
  usageTimer: null,
  maxGuestMbps: 4,
  selectedPublicTier: 'public-free'
};

function formatDuration(totalSeconds) {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getModeConfig(mode) {
  switch (mode) {
    case 'uni-student':
      return { hours: 4, bandwidth: '4 Mbps', extendable: true, maxMbps: 4 };
    case 'uni-staff':
      return { hours: 5, bandwidth: '6 Mbps', extendable: true, maxMbps: 6 };
    case 'uni':
      // default to student settings for legacy pages
      return { hours: 4, bandwidth: '4 Mbps', extendable: true, maxMbps: 4 };
    case 'public-free':
      return { hours: 4, bandwidth: '1.5 Mbps', extendable: false, maxMbps: 1.5 };
    case 'public-paid':
      return { hours: 6, bandwidth: '6 Mbps', extendable: true, maxMbps: 6 };
    default:
      return { hours: 4, bandwidth: '4 Mbps', extendable: true, maxMbps: 4 };
  }
}

function getGuestConfig() {
  return { hours:2, bandwidth: '1.5 Mbps (Guest)', extendable: false, guest: true, maxMbps: 1.5 };
}

// small non-blocking message helper (replaces alerts)
function showToast(msg) {
  // prefer adminToast if present, otherwise modalRemaining, otherwise console
  const el = adminToast || modalRemaining;
  if (el) {
    el.textContent = msg;
    if (el.style) el.style.display = 'block';
    setTimeout(() => { if (el.style) el.style.display = 'none'; }, 2400);
  } else {
    console.warn(msg);
  }
}

// Hide graph / canvas and stop updates
function hideGraph() {
  stopUsage();
  if (usageCanvas) {
    usageCanvas.style.display = 'none';
  }
  if (usageBar) {
    usageBar.style.width = '0%';
  }
  if (usageValue) {
    usageValue.textContent = '';
  }
  usageSeries = [];
  if (usageCtx) clearUsageCanvas();
}

// Reflect allocation preview whenever tier/auth changes
function updateAllocationPreview() {
  const page = (document.title || '').toLowerCase();
  let mode;
  if (page.includes('public')) {
    mode = state.selectedPublicTier || 'public-free';
  } else if (page.includes('university') || page.includes('uni')) {
    // support uni-student / uni-staff selection
    mode = state.selectedUniRole ? `uni-${state.selectedUniRole}` : 'uni-student';
  } else {
    mode = 'uni';
  }

  const cfg = state.loggedInEmail === 'GUEST' ? getGuestConfig() : getModeConfig(mode);
  if (statAllocated) statAllocated.textContent = `${cfg.hours}h`;
  if (statBandwidth) statBandwidth.textContent = cfg.bandwidth;
  if (statRemaining) statRemaining.textContent = '—';
  // keep state in sync
  state.mode = mode;
  state.maxGuestMbps = cfg.maxMbps || state.maxGuestMbps;
  state.bandwidthLabel = cfg.bandwidth;
}


function startSession() {
  if (!state.loggedInEmail) {
    setLoggedIn('GUEST');
  }
  const page = (document.title || '').toLowerCase();
  const inferredMode = page.includes('public') ? (state.selectedPublicTier || 'public-free') : 'uni';
  const mode = inferredMode;
  const cfg = state.loggedInEmail === 'GUEST' ? getGuestConfig() : getModeConfig(mode);
  state.mode = mode;
  state.allocatedSeconds = cfg.hours * 3600;
  state.remainingSeconds = state.allocatedSeconds;
  state.bandwidthLabel = cfg.bandwidth;
  state.notified = false;
  state.maxGuestMbps = cfg.maxMbps || 4;
  updateUI();
  if (timer) clearInterval(timer);
  const speed = Number(speedSelect?.value || 60);
  timer = setInterval(() => {
    state.remainingSeconds -= speed;
    if (!state.notified && state.remainingSeconds <= 15 * 60) {
      state.notified = true;
      if (modalRemaining) modalRemaining.textContent = formatDuration(state.remainingSeconds);
      if (modal) modal.hidden = false;
    }
    if (state.remainingSeconds <= 0) {
      endSession();
    } else {
      updateUI();
    }
  }, 1000);
  startUsage();
}

function updateUI() {
  if (heroRemaining) heroRemaining.textContent = formatDuration(state.remainingSeconds);
  if (statAllocated) statAllocated.textContent = formatDuration(state.allocatedSeconds);
  if (statRemaining) statRemaining.textContent = formatDuration(state.remainingSeconds);
  if (statBandwidth) statBandwidth.textContent = state.bandwidthLabel;
}

function endSession() {
  if (timer) clearInterval(timer);
  timer = null;
  state.remainingSeconds = 0;
  updateUI();
  if (modal) modal.hidden = true;
  pauseUsage();
}

function extendSession() {
  // If a guest or the current mode is non-extendable, send to payment/upgrade page
  if (state.loggedInEmail === 'GUEST') {
    // guests must go to payment to upgrade/convert
    window.location.href = `payment.html?reason=extend&guest=1&mode=${encodeURIComponent(state.mode)}`;
    return;
  }
  const cfg = getModeConfig(state.mode);
  if (!cfg.extendable) {
    // non-extendable tiers -> payment page to upgrade
    window.location.href = `payment.html?reason=upgrade&mode=${encodeURIComponent(state.mode)}`;
    return;
  }
  // extend by 1 hour for extendable tiers
  state.remainingSeconds += 60 * 60;
  state.allocatedSeconds += 60 * 60;
  if (modal) modal.hidden = true;
  updateUI();
}

// Simulate live bandwidth usage relative to tier
function startUsage() {
  stopUsage();
  state.usageTimer = setInterval(() => {
    const max = state.maxGuestMbps || 4;
    // Random usage between 10% and 90% of max, with occasional spikes up to 130%
    const spike = Math.random() < 0.15 ? 1.3 : 1.0;
    const usage = Math.min(max * 1.3, (Math.random() * 0.8 + 0.1) * max * spike);
    // Text fallback if present
    if (usageValue) usageValue.textContent = `${usage.toFixed(1)} Mbps`;
    if (usageBar) usageBar.style.width = `${Math.min(100, (usage / max) * 100)}%`;
    // Graph
    if (usageCtx) {
      usageSeries.push(usage);
      if (usageSeries.length > 60) usageSeries.shift(); // keep last 60 samples
      drawUsageSeries();
    }
  }, 800);
  if (usageCanvas) usageCanvas.style.display = 'block';
}

function stopUsage() {
  if (state.usageTimer) clearInterval(state.usageTimer);
  state.usageTimer = null;
  if (usageValue) usageValue.textContent = '0.0 Mbps';
  if (usageBar) usageBar.style.width = '0%';
  usageSeries = [];
  if (usageCtx) clearUsageCanvas();
}

// Pause graph updates but keep the current plot visible
function pauseUsage() {
  if (state.usageTimer) clearInterval(state.usageTimer);
  state.usageTimer = null;
}

function clearUsageCanvas() {
  if (!usageCtx) return;
  resizeUsageCanvas();
  const width = usageCanvas.clientWidth || usageCanvas.width;
  const height = usageCanvas.clientHeight || usageCanvas.height;
  usageCtx.clearRect(0, 0, width, height);
  const max = state.maxGuestMbps || 4;
  const padLeft = 44;
  const padTopBottom = 14;
  const padRight = 8;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTopBottom * 2;
  // background grid and y-axis labels (0, 25%, 50%, 75%, 100%, 130%)
  const ratios = [0, 0.25, 0.5, 0.75, 1.0, 1.3];
  usageCtx.strokeStyle = '#273159';
  usageCtx.fillStyle = '#b9bfd3';
  usageCtx.lineWidth = 1;
  usageCtx.font = '12px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ratios.forEach((r) => {
    const norm = Math.min(1.3, r) / 1.3;
    const y = padTopBottom + (1 - norm) * chartH + 0.5;
    usageCtx.beginPath();
    usageCtx.moveTo(padLeft, y);
    usageCtx.lineTo(width, y);
    usageCtx.stroke();
    // tick and label
    const label = `${(max * r).toFixed(1)} Mbps`;
    usageCtx.fillText(label, 4, y + 4);
  });
  // red limit line at 100%
  const limitY = padTopBottom + (1 - (1.0 / 1.3)) * chartH + 0.5;
  usageCtx.strokeStyle = '#ff5252';
  usageCtx.lineWidth = 2;
  usageCtx.beginPath();
  usageCtx.moveTo(padLeft, limitY);
  usageCtx.lineTo(width, limitY);
  usageCtx.stroke();
}

function drawUsageSeries() {
  if (!usageCtx) return;
  clearUsageCanvas();
  if (usageSeries.length === 0) return;
  const width = usageCanvas.clientWidth || usageCanvas.width;
  const height = usageCanvas.clientHeight || usageCanvas.height;
  const max = state.maxGuestMbps || 4;
  const padLeft = 44;
  const padTopBottom = 14;
  const padRight = 8;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTopBottom * 2;
  const step = chartW / Math.max(1, usageSeries.length - 1);
  usageCtx.strokeStyle = '#6c7cff';
  usageCtx.lineWidth = 2;
  usageCtx.beginPath();
  usageSeries.forEach((v, i) => {
    const x = padLeft + i * step;
    const ratio = Math.min(1.3, v / max) / 1.3;
    const y = padTopBottom + (1 - ratio) * chartH;
    if (i === 0) usageCtx.moveTo(x, y);
    else usageCtx.lineTo(x, y);
  });
  usageCtx.stroke();
}

// Auth logic (mock)
function setLoggedIn(email) {
  state.loggedInEmail = email;
  if (authUser) authUser.textContent = email || 'Guest';
}

// Initialize Start button - keep enabled
if (startBtn) {
  startBtn.addEventListener('click', startSession);
}
if (endBtn) endBtn.addEventListener('click', endSession);
if (modalClose) modalClose.addEventListener('click', () => (modal.hidden = true));
if (extendBtn) extendBtn.addEventListener('click', extendSession);
// change cancel to hide modal so session can continue
if (cancelBtn) cancelBtn.addEventListener('click', () => { if (modal) modal.hidden = true; });

// Initialize displays
if (heroRemaining) heroRemaining.textContent = '—';
updateAllocationPreview();

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    const email = authEmail?.value?.trim();
    const pass = authPassword?.value || '';
    if (!email || pass.length < 4) {
      showToast('Enter a valid email and a password (min 4 chars)');
      return;
    }
    setLoggedIn(email);
    updateAllocationPreview();
    // clear sensitive fields on all pages after login
    if (authEmail) authEmail.value = '';
    if (authPassword) authPassword.value = '';
    hideGraph();
  });
}

if (registerBtn) {
  registerBtn.addEventListener('click', () => {
    const email = authEmail?.value?.trim();
    const pass = authPassword?.value || '';
    if (!email || pass.length < 4) {
      showToast('Enter a valid email and a password (min 4 chars)');
      return;
    }
    showToast('Registered (mock). You are now logged in.');
    setLoggedIn(email);
    updateAllocationPreview();
    hideGraph();
    // clear sensitive fields on all pages after register
    if (authEmail) authEmail.value = '';
    if (authPassword) authPassword.value = '';
  });
}

/* Payment page initializer moved from payment.html */
function initPaymentPage() {
  const params = new URLSearchParams(location.search);
  const from = params.get('from');
  const reason = params.get('reason');
  const guest = params.get('guest');
  const ctx = document.getElementById('context');
  const msg = document.getElementById('message');
  const guestEl = document.getElementById('guestExtend');

  if (!ctx || !msg || !guestEl) return;

  function showMsg(text, timeout = 2400) {
    msg.textContent = text;
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, timeout);
  }

  // adapt UI
  if (reason === 'extend' && guest === '1') {
    ctx.textContent = 'You arrived here to extend a guest session. Choose to extend temporarily or convert to a paid account.';
    guestEl.style.display = 'block';
    guestEl.setAttribute('aria-hidden', 'false');
    document.getElementById('title').textContent = 'Guest: Extend or Convert';
  } else if (reason === 'upgrade' || from === 'public-paid' || from === 'register') {
    ctx.textContent = 'Upgrade options are shown below. You can upgrade an existing account or register & pay to become a paid user.';
    guestEl.style.display = 'none';
    guestEl.setAttribute('aria-hidden', 'true');
    document.getElementById('title').textContent = 'Upgrade / Register';
  } else {
    ctx.textContent = 'Choose an action: upgrade to a paid tier or register as a paid user.';
    guestEl.style.display = guest === '1' ? 'block' : 'none';
    guestEl.setAttribute('aria-hidden', guest === '1' ? 'false' : 'true');
  }

  function finishAndReturn(payload = {}) {
    // return to public.html and apply the paid plan so UI updates
    const dest = new URL(window.location.origin + '/public.html');
    try {
      if (payload.email) dest.searchParams.set('email', payload.email);
      // indicate paid and plan -> public-paid
      dest.searchParams.set('paid', '1');
      dest.searchParams.set('plan', 'public-paid');
      if (payload.extend) dest.searchParams.set('extended', '1');
    } catch (e) { /* ignore */ }
    showMsg('Payment successful — returning...');
    setTimeout(() => { window.location.href = dest.pathname + dest.search; }, 900);
  }

  const payUpgrade = document.getElementById('payUpgrade');
  const payExtend = document.getElementById('payExtend');
  const convertBtn = document.getElementById('convertBtn');
  const backBtn = document.getElementById('backBtn');
  const clearBtn = document.getElementById('clearBtn');
  const payRegister = document.getElementById('payRegister');

  if (payUpgrade) payUpgrade.addEventListener('click', () => {
    showMsg('Processing payment for upgrade...');
    setTimeout(() => finishAndReturn({ email: 'paid-user@example.com' }), 900);
  });
  if (payExtend) payExtend.addEventListener('click', () => {
    showMsg('Processing guest extension...');
    setTimeout(() => finishAndReturn({ email: 'guest-paid@example.com', extend: 1 }), 900);
  });
  if (convertBtn) convertBtn.addEventListener('click', () => {
    const emailEl = document.getElementById('email');
    if (emailEl) emailEl.focus();
    showMsg('Fill the form to convert to a paid account');
  });
  if (backBtn) backBtn.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else location.href = 'index.html';
  });
  if (clearBtn) clearBtn.addEventListener('click', () => {
    const e = document.getElementById('email'); if (e) e.value = '';
    const p = document.getElementById('password'); if (p) p.value = '';
  });
  if (payRegister) payRegister.addEventListener('click', () => {
    const email = (document.getElementById('email').value || '').trim();
    const pw = (document.getElementById('password').value || '').trim();
    if (!email || pw.length < 6) {
      showMsg('Provide a valid email and a password (min 6 chars)');
      return;
    }
    showMsg('Registering and processing payment...');
    setTimeout(() => finishAndReturn({ email }), 900);
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (history.length > 1) history.back();
      else location.href = 'index.html';
    }
  });
}

// auto-init only when on payment.html or public.html / uni pages
document.addEventListener('DOMContentLoaded', () => {
  const path = (location.pathname || '').toLowerCase();

  // payment page init
  if (path.endsWith('/payment.html') || path.endsWith('payment.html')) {
    initPaymentPage();
  }

  // handle return from payment on public.html: apply paid plan and optionally extend
  if (path.endsWith('/public.html') || path.endsWith('public.html')) {
    const params = new URLSearchParams(location.search);
    if (params.get('paid') === '1') {
      const plan = params.get('plan') || 'public-paid';
      const email = params.get('email') || 'paid-user@example.com';
      // log in mock
      setLoggedIn(email);
      state.selectedPublicTier = plan;
      const cfg = getModeConfig(plan);
      // apply allocation immediately so UI reflects paid plan
      state.allocatedSeconds = cfg.hours * 3600;
      state.remainingSeconds = state.allocatedSeconds;
      state.bandwidthLabel = cfg.bandwidth;
      state.maxGuestMbps = cfg.maxMbps || state.maxGuestMbps;
      updateAllocationPreview();
      updateUI();
      // if extension flag present, add 1 hour
      if (params.get('extended') === '1') {
        state.remainingSeconds += 3600;
        state.allocatedSeconds += 3600;
        updateUI();
      }
      showToast('Payment applied — plan set to paid');
      // clear query string from URL (non-destructive history replace)
      history.replaceState({}, '', location.pathname);
    }
  }
});
 
// Uni page: student / staff choose handlers
const chooseStudent = $('#chooseStudent');
const chooseStaff = $('#chooseStaff');

if (chooseStudent) {
  chooseStudent.addEventListener('click', (e) => {
    e.preventDefault();
    state.selectedUniRole = 'student';
    updateAllocationPreview();
    hideGraph();
    showToast('Role set: Student');
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}
if (chooseStaff) {
  chooseStaff.addEventListener('click', (e) => {
    e.preventDefault();
    state.selectedUniRole = 'staff';
    updateAllocationPreview();
    hideGraph();
    showToast('Role set: Staff');
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}
if (guestBtn) {
  guestBtn.addEventListener('click', () => {
    setLoggedIn('GUEST');
    updateAllocationPreview();
    hideGraph();
  });
}

// Public page: choose free/paid -> scroll & highlight auth
function pulseAuth() {
  if (!authPanel) return;
  authPanel.classList.add('pulse');
  authPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => authPanel.classList.remove('pulse'), 400);
}

if (chooseFree) {
  chooseFree.addEventListener('click', (e) => {
    e.preventDefault();
    state.selectedPublicTier = 'public-free';
    pulseAuth();
    updateAllocationPreview();
    hideGraph();
  });
}
if (choosePaid) {
  choosePaid.addEventListener('click', (e) => {
    e.preventDefault();
    state.selectedPublicTier = 'public-paid';
    pulseAuth();
    updateAllocationPreview();
    hideGraph();
    // open payment/upgrade page so user can upgrade or register as paid
    window.location.href = 'payment.html?from=public-paid';
    });
}

// Device management demo
let connectedDevices = 1;
let maxDevices = 3; // Default for free tier
let registeredDevices = [];

function updateDeviceCount() {
  setInterval(() => {
    // Randomly fluctuate connected devices every 75-95 minutes
    if (Math.random() > 0.5 && connectedDevices < registeredDevices.length) {
      connectedDevices++;
    } else if (connectedDevices > 0) {
      connectedDevices--;
    }
    
    document.getElementById('connectedDevices').textContent = 
      `${connectedDevices}/${maxDevices}`;
  }, Math.random() * (95 - 75) + 75 * 60 * 1000); // Random interval between 75-95 minutes
}

// Remove this event listener since we're using the modal version below
/* document.getElementById('addDeviceBtn')?.addEventListener('click', () => {
  if (registeredDevices.length >= maxDevices) {
    alert('Maximum device limit reached');
    return;
  }

  const deviceName = prompt('Enter device name (e.g. "iPhone 13"):');
  if (deviceName) {
    registeredDevices.push({
      name: deviceName,
      id: Date.now()
    });
    updateDeviceList();
  }
}); */

// Update the modal version to be the only handler

const deviceModal = document.getElementById('deviceModal');
const deviceForm = document.getElementById('deviceForm');
const deviceModalClose = document.getElementById('deviceModalClose');
const saveDeviceBtn = document.getElementById('saveDeviceBtn');
const cancelDeviceBtn = document.getElementById('cancelDeviceBtn');
const addDeviceBtn = document.getElementById('addDeviceBtn');
addDeviceBtn?.addEventListener('click', () => {
  if (registeredDevices.length >= maxDevices) {
    showToast(`Maximum ${maxDevices} devices allowed for your plan.`);
    return;
  }
  deviceModal.hidden = false;
});

// Show device modal
addDeviceBtn?.addEventListener('click', () => {
  if (registeredDevices.length >= maxDevices) {
    showToast(`Maximum ${maxDevices} devices allowed for your plan.`);
    return;
  }
  deviceModal.hidden = false;
});

// Hide device modal
[deviceModalClose, cancelDeviceBtn].forEach(btn => {
  btn?.addEventListener('click', () => {
    deviceModal.hidden = true;
    deviceForm.reset();
  });
});

// Save device
saveDeviceBtn?.addEventListener('click', () => {
  const name = document.getElementById('deviceName').value;
  const mac = document.getElementById('deviceMac').value;
  const type = document.getElementById('deviceType').value;

  if (!name) return;

  registeredDevices.push({
    id: Date.now(),
    name,
    mac,
    type,
    dateAdded: new Date()
  });

  updateDeviceList();
  deviceModal.hidden = true;
  deviceForm.reset();
});

function updateDeviceList() {
  const deviceList = document.getElementById('deviceList');
  if (!deviceList) return;

  deviceList.innerHTML = registeredDevices.map(device => `
    <div class="device-item">
      <div class="device-item__info">
        <div class="device-item__name">${device.name}</div>
        <div class="device-item__type">${device.type} ${device.mac ? '• ' + device.mac : ''}</div>
      </div>
      <button onclick="removeDevice(${device.id})" class="device-item__remove" aria-label="Remove device">✕</button>
    </div>
  `).join('');
}

function removeDevice(id) {
  registeredDevices = registeredDevices.filter(d => d.id !== id);
  updateDeviceList();
}

// Update max devices based on user type
function updateMaxDevices(userType) {
  switch(userType) {
    case 'student':
    case 'staff':
      maxDevices = 5;
      break;
    case 'paid':
      maxDevices = 3;
      break;
    default:
      maxDevices = 2;
  }
  updateDeviceList();
}

// Initialize device monitoring
updateDeviceCount();

(function () {
  // only initialize if admin simulator UI exists
  if (!document.getElementById('simulator')) return;

  const aps = [
    { id: 'AP-1', band: '2.4GHz', load: 45, neighbours: ['AP-2'] },
    { id: 'AP-2', band: '5GHz', load: 20, neighbours: ['AP-1', 'AP-3'] },
    { id: 'AP-3', band: '2.4GHz', load: 85, neighbours: ['AP-2'] },
  ];

  const devices = [
    { user: 'alice@uni.com', ap: 'AP-1', supports5g: true, jitter: 12, pattern: 'stable', packetVar: 10, priorityUser: false, priority: 'normal' },
    { user: 'bob@corp.com', ap: 'AP-3', supports5g: true, jitter: 42, pattern: 'stable', packetVar: 8, priorityUser: true, priority: 'normal' },
    { user: 'carol@guest.com', ap: 'AP-3', supports5g: false, jitter: 18, pattern: 'large_download', packetVar: 30, priorityUser: false, priority: 'normal' },
    { user: 'dave@public.com', ap: 'AP-2', supports5g: true, jitter: 8, pattern: 'burst', packetVar: 50, priorityUser: false, priority: 'normal' },
  ];

  const el = {
    apsTable: document.querySelector('#apsTable tbody'),
    devicesTable: document.querySelector('#devicesTable tbody'),
    resetSim: document.getElementById('resetSim'),
    actionLog: document.getElementById('actionLog'),
    simToast: document.getElementById('simToast'),
  };

  // element for high usage monitor
  const highUsageBody = document.getElementById('highUsageBody');

  // buffered logging: collect entries and flush to DOM on interval (1 min)
  const logBuffer = [];
  function log(msg) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    // push newest first (we will insert in DOM newest-first)
    logBuffer.unshift(entry);
    // also console for debugging
    console.log(`[Simulator] ${msg}`);
  }

  function flushLogs(limit = 100) {
    if (!el.actionLog) return;
    // insert buffered entries into DOM newest-first
    while (logBuffer.length) {
      const entry = logBuffer.shift();
      el.actionLog.insertAdjacentHTML('afterbegin', `<div>${entry}</div>`);
    }
    // trim to keep only latest `limit` entries
    const children = Array.from(el.actionLog.children);
    if (children.length > limit) {
      for (let i = limit; i < children.length; i++) {
        children[i].remove();
      }
    }
  }

  // initial styling for action log
  if (el.actionLog) {
    el.actionLog.style.fontFamily = "'Courier New', monospace";
    el.actionLog.style.color = '#000';
    el.actionLog.style.whiteSpace = 'pre-wrap';
  }

  function renderAPs() {
    if (!el.apsTable) return;
    el.apsTable.innerHTML = '';
    aps.forEach(a => {
      const row = document.createElement('tr');
      const state = a.load > 80 ? 'Congested' : a.load > 60 ? 'High' : 'Normal';
      row.innerHTML = `<td>${a.id}</td><td>${a.band}</td><td>${a.load}%</td><td>${state}</td>`;
      el.apsTable.appendChild(row);
    });
  }

  function renderDevices() {
    if (!el.devicesTable) return;
    el.devicesTable.innerHTML = '';
    devices.forEach(d => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${d.user}</td><td>${d.ap}</td><td>${d.supports5g ? 'Yes' : 'No'}</td><td>${d.jitter}</td><td>${d.pattern}</td><td>${d.classification || '-'}</td><td>${d.priority}</td>`;
      el.devicesTable.appendChild(row);
    });
  }

  // High-usage monitor randomizer (updates table every 2 minutes)
  const highUsageDefaults = [
    { user: 'small@things.com', tier: 'University', cap: 4, peak: 6.2, devices: '4/5', breaches: 5, status: 'Review', tag: 'tag--warn' },
    { user: 'alister@crowley.com', tier: 'Guest', cap: 1.5, peak: 3.1, devices: '2/3', breaches: 11, status: 'High Risk', tag: 'tag--danger' },
    { user: 'tedhughes@ovenHeaven.com', tier: 'Public Paid', cap: 4, peak: 4.9, devices: '3/3', breaches: 3, status: 'Caution', tag: '' },
  ];
  const firstNames = ['alex','sam','morgan','casey','jamie','taylor','riley','jordan','blake','kai'];
  const lastNames = ['wright','lee','patel','singh','garcia','nguyen','brown','johnson','khan','martin'];
  const tier = ['guest', 'paid', 'faculty', 'student']
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randomUser(base) {   // sometimes keep base name, otherwise generate new
  if (Math.random() < 0.35) return base;
    const fn = firstNames[randInt(0, firstNames.length - 1)];
    const ln = lastNames[randInt(0, lastNames.length - 1)];
    const num = Math.random() < 0.35 ? '' : String(randInt(1, 99));
    const domain = ['example.com','campus.edu','guest.net'][randInt(0,2)];
    return `${fn}${num}.${ln}@${domain}`;
}
  function randomizeHighUsage() {
    if (!highUsageBody) return;
    // mutate defaults slightly to feel live
    const rows = highUsageDefaults.map(u => {
      const displayUser = randomUser(u.user);
      const peakJitter = (Math.random() * 1.4 - 0.7);
      const peak = Math.max(u.cap + 0.1, +(u.peak + peakJitter).toFixed(1));
      const devicesNum = Math.max(1, Math.min(6, parseInt(u.devices.split('/')[0], 10) + Math.floor((Math.random() - 0.4) * 2)));
      const devicesDen = parseInt(u.devices.split('/')[1], 10);
      const breaches = Math.max(0, u.breaches + Math.floor((Math.random() - 0.5) * 3));
      const statuses = ['Review', 'High Risk', 'Caution', 'OK'];
      const status = Math.random() < 0.06 ? statuses[Math.floor(Math.random() * statuses.length)] : u.status;
      const tagClass = status === 'High Risk' ? 'tag--danger' : (status === 'Review' ? 'tag--warn' : '');
      return `<tr>
        <td>${displayUser}</td>
        <td>${u.tier}</td>
        <td>${u.cap} Mbps</td>
        <td>${peak} Mbps</td>
        <td>${devicesNum}/${devicesDen}</td>
        <td>${breaches}</td>
        <td><span class="tag ${tagClass}">${status}</span></td>
      </tr>`;
    });
    highUsageBody.innerHTML = rows.join('\n');
    log('High Usage Monitor refreshed');
  }

  // Behavior-based classifier (privacy-safe: uses jitter, pattern, packet variance)
  function classifyFlow(device) {
    if (device.jitter > 30 && device.pattern === 'stable') {
      device.classification = 'video_call';
      device.priority = 'high';
      return 'video_call';
    }
    if (device.pattern === 'large_download') {
      device.classification = 'large_download';
      device.priority = 'normal';
      return 'large_download';
    }
    if (device.pattern === 'stable' && device.jitter <= 30) {
      device.classification = 'streaming';
      device.priority = 'medium';
      return 'streaming';
    }
    device.classification = 'best_effort';
    device.priority = 'normal';
    return 'best_effort';
  }

  // Detect congested APs
  function detectCongestion() {
    aps.forEach(a => {
      a.congested = a.load > 80;
      if (a.congested) log(`${a.id} marked congested (load ${a.load}%)`);
    });
  }

  // Auto-prioritize important users when AP congested
  function autoPrioritize() {
    aps.forEach(ap => {
      if (!ap.congested) return;
      // find priority users on this AP
      const priorityUsers = devices.filter(d => d.ap === ap.id && d.priorityUser);
      if (priorityUsers.length) {
        priorityUsers.forEach(pu => {
          pu.priority = 'boosted';
          log(`Boosted priority for ${pu.user} on ${ap.id}`);
        });
        // throttle low-priority users on same AP
        devices.filter(d => d.ap === ap.id && !d.priorityUser).forEach(d => {
          d.priority = d.priority === 'high' ? 'normal' : 'throttled';
          log(`Throttled ${d.user} on ${ap.id} to relieve congestion`);
        });
      }
    });
  }

  // Auto-load balancing suggestions
  function autoLoadBalance() {
    aps.forEach(ap => {
      if (ap.load <= 80) return;
      ap.neighbours.forEach(nid => {
        const neighbour = aps.find(x => x.id === nid);
        if (!neighbour) return;
        if (neighbour.load < 50) {
          // suggest move for devices on congested AP to neighbour (prefer 5GHz if supported)
          devices.filter(d => d.ap === ap.id).forEach(d => {
            if (d.supports5g && neighbour.band.includes('5GHz')) {
              log(`Suggest ${d.user} move from ${ap.id} to ${neighbour.id} (5GHz)`);
            } else {
              log(`Suggest ${d.user} connect to closer AP ${neighbour.id}`);
            }
          });
        }
      });
    });
  }

  // Band-steering: move device to 5GHz if supported and 2.4GHz congested
  function bandSteering() {
    const congested24 = aps.filter(a => a.band.includes('2.4') && a.load > 80);
    const available5 = aps.filter(a => a.band.includes('5GHz') && a.load < 70);
    congested24.forEach(a24 => {
      devices.filter(d => d.ap === a24.id && d.supports5g).forEach(d => {
        if (available5.length) {
          const target = available5[0];
          log(`Band-steering: propose ${d.user} from ${a24.id} -> ${target.id}`);
          // simulate steering by updating device ap and adjusting loads
          d.ap = target.id;
          a24.load = Math.max(0, a24.load - 10);
          target.load = Math.min(100, target.load + 10);
        }
      });
    });
  }

  // One tick: randomize some metrics and re-render (this runs frequently to make the page appear live)
  function tick() {
    aps.forEach(a => {
      const delta = Math.floor((Math.random() - 0.4) * 10);
      a.load = Math.max(0, Math.min(100, a.load + delta));
    });
    devices.forEach(d => {
      d.jitter = Math.max(1, d.jitter + Math.floor((Math.random() - 0.5) * 8));
      if (Math.random() < 0.08) d.pattern = d.pattern === 'large_download' ? 'stable' : 'large_download';
    });
    renderAPs();
    renderDevices();
    log('Tick: metrics randomized');
  }

  // Live update loop: device churn + AP load recalculation (runs every 10s)
  function liveUpdate() {
    // device join/leave and mutations (same as before)
    if (Math.random() < 0.30 && devices.length < 24) {
      const id = `dev${Math.floor(Math.random() * 9000 + 1000)}`;
      const chosenAP = aps[Math.floor(Math.random() * aps.length)].id;
      const newDev = {
        user: `guest${id}@net`,
        ap: chosenAP,
        supports5g: Math.random() < 0.6,
        jitter: Math.floor(Math.random() * 60) + 1,
        pattern: ['stable', 'burst', 'large_download'][Math.floor(Math.random() * 3)],
        packetVar: Math.floor(Math.random() * 60),
        priorityUser: Math.random() < 0.06,
        priority: 'normal'
      };
      devices.push(newDev);
      log(`Device joined: ${newDev.user} → ${newDev.ap}`);
    }

    if (Math.random() < 0.20 && devices.length > 3) {
      const candidates = devices.map((d, i) => ({ d, i })).filter(x => !x.d.priorityUser);
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const removed = devices.splice(pick.i, 1)[0];
        log(`Device left: ${removed.user} (disconnect)`);
      }
    }

    devices.forEach(d => {
      const prevJ = d.jitter;
      const prevP = d.pattern;
      if (Math.random() < 0.45) d.jitter = Math.max(1, d.jitter + Math.floor((Math.random() - 0.5) * 12));
      if (Math.random() < 0.18) d.pattern = Math.random() < 0.6 ? 'stable' : (Math.random() < 0.5 ? 'burst' : 'large_download');
      const jDelta = Math.abs(d.jitter - prevJ);
      if (jDelta >= 8) log(`Metric: ${d.user} jitter ${prevJ} -> ${d.jitter} ms`);
      if (prevP !== d.pattern) log(`Metric: ${d.user} pattern ${prevP} -> ${d.pattern}`);
      if (Math.random() < 0.07) {
        const candidateAP = aps[Math.floor(Math.random() * aps.length)].id;
        if (candidateAP !== d.ap) {
          log(`Roam: ${d.user} ${d.ap} -> ${candidateAP}`);
          d.ap = candidateAP;
        }
      }
    });

    aps.forEach(ap => {
      const count = devices.filter(d => d.ap === ap.id).length;
      const baseLoad = Math.min(95, Math.round(count * 8 + (Math.random() * 10 - 5)));
      ap.load = Math.max(3, Math.min(99, baseLoad));
    });

    renderAPs();
    renderDevices();

    const summary = aps.map(a => `${a.id}:${a.load}%`).join(' | ');
    log(`Periodic status — AP loads: ${summary}`);
  }

  // periodic timers:
  // - liveUpdate every 10s (keeps page changing)
  // - flushLogs every 60s (updates access log DOM)
  // - randomizeHighUsage every 120s (updates high usage monitor)
  let liveInterval = null;
  function startLiveUpdates() {
    if (liveInterval) return;
    liveInterval = setInterval(liveUpdate, 10_000);
    log('Live updates started (10s interval)');
  }
  function stopLiveUpdates() {
    if (!liveInterval) return;
    clearInterval(liveInterval);
    liveInterval = null;
    log('Live updates stopped');
  }

  const flushInterval = setInterval(() => flushLogs(200), 60_000); // 1 minute
  const highUsageInterval = setInterval(randomizeHighUsage, 120_000); // 2 minutes

  // expose ability to call immediately on load
  randomizeHighUsage();
  flushLogs();
  startLiveUpdates();

  // Reset button clears simulation and logs
  el.resetSim?.addEventListener('click', () => {
    aps[0].load = 45; aps[1].load = 20; aps[2].load = 85;
    devices.splice(0, devices.length, 
      { user: 'alice@uni.com', ap: 'AP-1', supports5g: true, jitter: 12, pattern: 'stable', packetVar: 10, priorityUser: false, priority: 'normal' },
      { user: 'bob@corp.com', ap: 'AP-3', supports5g: true, jitter: 42, pattern: 'stable', packetVar: 8, priorityUser: true, priority: 'normal' },
      { user: 'carol@guest.com', ap: 'AP-3', supports5g: false, jitter: 18, pattern: 'large_download', packetVar: 30, priorityUser: false, priority: 'normal' },
      { user: 'dave@public.com', ap: 'AP-2', supports5g: true, jitter: 8, pattern: 'burst', packetVar: 50, priorityUser: false, priority: 'normal' }
    );
    renderAPs();
    renderDevices();
    // clear DOM logs and buffer
    if (el.actionLog) el.actionLog.innerHTML = '';
    logBuffer.length = 0;
    randomizeHighUsage();
    flushLogs();
    if (el.simToast) {
      el.simToast.textContent = 'Simulator reset';
      setTimeout(() => { el.simToast.textContent = ''; }, 1600);
    }
  });

  // Generate report (include buffered log entries too)
  const generateReportBtn = document.getElementById('generateReport');
  generateReportBtn?.addEventListener('click', () => {
    // Build users-exceeding table: treat devices with pattern 'large_download' OR jitter>50 OR AP load>80 as exceeding
    const exceeding = devices.filter(d => {
      const ap = aps.find(a => a.id === d.ap);
      return d.pattern === 'large_download' || d.jitter > 50 || (ap && ap.load > 80);
    });

    const lines = [];
    lines.push('=== Users exceeding bandwidth (simulated) ===');
    lines.push('user,ap,supports5g,jitter_ms,pattern,priorityUser');
    if (exceeding.length === 0) {
      lines.push('none');
    } else {
      exceeding.forEach(u => {
        lines.push([
          `"${u.user}"`,
          u.ap,
          u.supports5g ? 'yes' : 'no',
          u.jitter,
          u.pattern,
          u.priorityUser ? 'yes' : 'no'
        ].join(','));
      });
    }

    lines.push('');
    lines.push('=== Top 100 Access Log (newest first) ===');
    lines.push('timestamp | message');

    // collect DOM entries first (newest to oldest)
    const domEntries = el.actionLog ? Array.from(el.actionLog.children).slice(0, 100).map(n => n.textContent?.trim().replace(/\s+/g, ' ') || '') : [];
    // include any buffered (not yet flushed) entries after DOM ones
    const buffered = logBuffer.slice(0, 100 - domEntries.length);
    const allEntries = domEntries.concat(buffered);
    if (allEntries.length === 0) {
      lines.push('no log entries');
    } else {
      allEntries.slice(0, 100).forEach(text => lines.push(`"${text.replace(/"/g, '""')}"`));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `wifi-admin-report-${ts}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    log(`Report generated (${exceeding.length} users flagged)`);
    if (el.simToast) {
      el.simToast.textContent = 'Report generated and downloaded';
      setTimeout(() => { el.simToast.textContent = ''; }, 2200);
    }
  });

  // pause/resume updates when page visibility changes (keeps CPU low)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLiveUpdates();
    } else {
      startLiveUpdates();
      log('Live updates resumed');
    }
  });

})(); 

//# sourceMappingURL=app.js.map
