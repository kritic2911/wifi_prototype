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
  const speed = Number(speedSelect?.value || 3600);
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