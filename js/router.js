/* ============================================================
   router.js — View switching + right-panel + history render
   ============================================================ */
let currentView = 'pos';
let currentRTab = 'r-customer';

function setView(viewName) {
  currentView = viewName;

  $$('.view').forEach(el => el.classList.remove('active-view'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active-view');

  // Sidebar nav
  $$('#sidebar-nav .nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === viewName)
  );
  // Mobile nav
  $$('#mobile-nav .mob-nav-btn[data-view]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === viewName)
  );

  if (viewName === 'inventory') renderInventoryView();
  if (viewName === 'customers') renderCustomersView();
  if (viewName === 'history')   renderHistoryView();
}

function rightTab(tabId) {
  currentRTab = tabId;
  $$('.rpanel').forEach(el => { el.classList.remove('active-rpanel'); el.style.display = 'none'; });
  const target = document.getElementById(tabId);
  if (target) { target.classList.add('active-rpanel'); target.style.display = 'block'; }
  $$('.vtab').forEach(btn => btn.classList.toggle('active', btn.dataset.rtab === tabId));
  if (tabId === 'r-stock')    renderStockMiniList();
  if (tabId === 'r-customer') renderCustPicker();
}

/* ── History view ───────────────────────────────────── */
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

    // Build customer display — permanent customer, walk-in with name, or anonymous
    let custDisplay = '';
    if (cust) {
      custDisplay = escHtml(cust.name);
    } else if (o.walkIn?.name) {
      custDisplay = `${escHtml(o.walkIn.name)}<span class="walkin-badge">walk-in</span>`;
    } else {
      custDisplay = 'Walk-in (anonymous)';
    }

    // Show convert button only for walk-in due orders not yet converted
    const showConvert = !o.customerId && o.walkIn && o.payment === 'due';

    return `<div class="hist-card">
      <div class="hc-hdr">
        <div>
          <div class="hc-id">#${o.id}</div>
          <div class="hc-cust">${custDisplay}</div>
          ${o.walkIn?.phone ? `<div style="font-size:11px;color:var(--muted)">${escHtml(o.walkIn.phone)}</div>` : ''}
          ${showConvert ? `<button class="convert-btn" onclick="convertWalkInToCustomer(${o.id})">+ Save as customer</button>` : ''}
        </div>
        <div>
          <div class="hc-total">₹${fmtPrice(total)}</div>
          <div class="hc-payment ${o.payment==='paid'?'paid':'due'}">${o.payment==='paid'?'✓ Paid':'📋 Due'}</div>
        </div>
      </div>
      <div class="hc-items">${o.items.map(i=>`${escHtml(i.name)} ×${fmtQty(i.qty)} (₹${fmtPrice(i.price*i.qty)})`).join(' · ')}</div>
      ${date?`<div class="hc-date">${date}</div>`:''}
    </div>`;
  }).join('');
}

/* ── Mobile order sheet ─────────────────────────────── */
function openMobSheet() {
  renderMobOrderTabs();
  $('mob-order-sheet').classList.add('show');
}
function closeMobSheet() { $('mob-order-sheet').classList.remove('show'); }
