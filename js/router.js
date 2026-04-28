/* ============================================================
   router.js — View switching (billing / inventory / customers / history)
               and right-panel tab switching
   ============================================================ */

let currentView = 'pos';
let currentRTab = 'r-customer';

/* ── Main view router ────────────────────────────────────────── */
function setView(viewName) {
  currentView = viewName;

  // Show/hide view sections
  document.querySelectorAll('.view').forEach(el => {
    el.classList.remove('active-view');
  });
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active-view');

  // Update nav button active state
  document.querySelectorAll('#sidebar-nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Render the target view
  switch (viewName) {
    case 'inventory': renderInventoryView();  break;
    case 'customers': renderCustomersView();  break;
    case 'history':   renderHistoryView();    break;
    // 'pos' is always rendered live via renderCurrentOrder()
  }
}

/* ── Right panel tab router ──────────────────────────────────── */
function rightTab(tabId) {
  currentRTab = tabId;

  document.querySelectorAll('.rpanel').forEach(el => {
    el.classList.remove('active-rpanel');
    el.style.display = 'none';
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active-rpanel');
    target.style.display = 'block';
  }

  document.querySelectorAll('.vtab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rtab === tabId);
  });

  if (tabId === 'r-stock') renderStockMiniList();
  if (tabId === 'r-customer') renderCustPicker();
}

/* ── History view render ─────────────────────────────────────── */
function renderHistoryView() {
  const el = $('hist-list');
  if (!DB.history.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">📜</span>No completed orders yet</div>';
    return;
  }
  el.innerHTML = [...DB.history].reverse().map(o => {
    const cust  = o.customerId ? findCustomer(o.customerId) : null;
    const total = orderTotal(o);
    const date  = o.finalizedAt ? new Date(o.finalizedAt).toLocaleString('en-IN') : '';
    return `
      <div class="hist-card">
        <div class="hc-hdr">
          <div>
            <div class="hc-id">#${o.id}</div>
            <div class="hc-cust">${cust ? escHtml(cust.name) : 'Walk-in'}</div>
          </div>
          <div>
            <div class="hc-total">₹${total.toFixed(0)}</div>
            <div class="hc-payment ${o.payment === 'paid' ? 'paid' : 'due'}">
              ${o.payment === 'paid' ? '✓ Paid' : '📋 Due'}
            </div>
          </div>
        </div>
        <div class="hc-items">
          ${o.items.map(i => `${escHtml(i.name)} ×${i.qty} (₹${(i.price * i.qty).toFixed(0)})`).join(' &nbsp;·&nbsp; ')}
        </div>
        ${date ? `<div class="hc-date">${date}</div>` : ''}
      </div>`;
  }).join('');
}
