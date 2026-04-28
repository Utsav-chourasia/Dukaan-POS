/* ============================================================
   utils.js — DOM helpers, sanitisation, toast, clock, CSV export
   ============================================================ */

/* ── DOM ─────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/** Get trimmed value of an input by id */
function val(id) {
  const el = $(id);
  return el ? el.value.trim() : '';
}

/** Set inner HTML safely */
function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

/* ── Sanitisation ────────────────────────────────────────────── */
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Toast Notifications ─────────────────────────────────────── */
let _toastTimer = null;

function toast(msg, duration = 2800) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ── Clock ───────────────────────────────────────────────────── */
function updateClock() {
  const el = $('clock');
  if (!el) return;
  const d = new Date();
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  el.textContent = `${h}:${m < 10 ? '0' : ''}${m} ${ampm}`;
}

function startClock() {
  updateClock();
  setInterval(updateClock, 30_000);
}

/* ── CSV Export ──────────────────────────────────────────────── */
function exportHistoryCSV() {
  if (!DB.history.length) { toast('No history to export'); return; }

  const rows = [['Order ID', 'Customer', 'Items', 'Total (₹)', 'Payment', 'Date']];

  DB.history.forEach(o => {
    const cust = o.customerId ? findCustomer(o.customerId) : null;
    rows.push([
      o.id,
      cust ? cust.name : 'Walk-in',
      o.items.map(i => `${i.name}×${i.qty}`).join(' | '),
      orderTotal(o).toFixed(2),
      o.payment,
      o.finalizedAt ? new Date(o.finalizedAt).toLocaleString('en-IN') : '',
    ]);
  });

  const csv = rows
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `dukaan-history-${Date.now()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ── Order total helper (used across modules) ────────────────── */
function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

/* ── Initials from name ──────────────────────────────────────── */
function makeInitials(name) {
  return name.trim()
    .split(/\s+/)
    .map(w => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';
}
