/* ============================================================
   customers.js — Customer profiles, dues, payments, rendering
   ============================================================ */

/* ── Render: Right-panel customer picker ─────────────────────── */
function renderCustPicker(query = '') {
  const pickerEl     = $('cust-picker');
  const dueSectionEl = $('cust-due-section');
  const order        = currentOrder();

  const filtered = DB.customers.filter(c => {
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.phone.includes(query)
    );
  });

  pickerEl.innerHTML = filtered.map(c => {
    const selected = order && order.customerId === c.id;
    return `
      <div class="cust-row ${selected ? 'selected' : ''}" onclick="assignCustomer(${c.id})">
        <div class="cust-avatar">${escHtml(c.initials)}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:${selected ? '600' : '400'}">${escHtml(c.name)}</div>
          <div class="cust-sub">${escHtml(c.phone)}</div>
        </div>
        ${c.due > 0 ? `<span class="cust-due-badge">₹${c.due}</span>` : ''}
      </div>`;
  }).join('');

  // Show due section if a customer with dues is assigned
  const selCust = order?.customerId ? findCustomer(order.customerId) : null;
  if (selCust && selCust.due > 0) {
    dueSectionEl.style.display = 'block';
    $('cust-due-info').innerHTML = `
      <div class="due-amount">₹${selCust.due}</div>
      <div class="due-sub">outstanding from ${escHtml(selCust.name)}</div>`;
  } else {
    dueSectionEl.style.display = 'none';
  }
}

/* ── Render: Full customers view ─────────────────────────────── */
function renderCustomersView() {
  const el = $('cust-list-full');
  if (!DB.customers.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">👥</span>No customers yet. Add one!</div>';
    return;
  }
  el.innerHTML = DB.customers.map(c => `
    <div class="cust-card">
      <div class="cc-avatar">${escHtml(c.initials)}</div>
      <div style="flex:1">
        <div class="cc-name">${escHtml(c.name)}</div>
        <div class="cc-phone">${escHtml(c.phone)}</div>
      </div>
      ${c.due > 0
        ? `<div class="cc-due">
             <div class="cc-due-amt">₹${c.due}</div>
             <div style="font-size:11px;color:var(--muted)">due</div>
           </div>`
        : `<div class="cc-settled">✓ Settled</div>`
      }
      <div class="cc-actions">
        ${c.due > 0
          ? `<button class="ic-btn primary" onclick="openModal('paymentDirect', ${c.id})">Pay</button>`
          : ''}
        <button class="ic-btn" onclick="openModal('editcust', ${c.id})">Edit</button>
      </div>
    </div>`
  ).join('');
}

/* ── Assign customer to current order ────────────────────────── */
function assignCustomer(custId) {
  const order = currentOrder();
  if (!order) { toast('Create an order first'); return; }
  // toggle off if same customer clicked again
  order.customerId = order.customerId === custId ? null : custId;
  saveDB();
  renderCurrentOrder();
  renderOrderTabs();
  renderCustPicker();
}

/* ── CRUD ────────────────────────────────────────────────────── */
function saveNewCustomer() {
  const name  = val('m-cname');
  const phone = val('m-cphone');
  const due   = parseFloat(val('m-cdue')) || 0;

  if (!name) { toast('Customer name is required'); return; }

  DB.customers.push({
    id:       DB.nextCustomerId++,
    name,
    phone:    phone || '—',
    due,
    initials: makeInitials(name),
  });

  saveDB();
  closeModal();
  renderCustPicker();
  renderCustomersView();
  toast(`${name} added`);
}

function updateCustomer(custId) {
  const c = findCustomer(custId);
  if (!c) return;

  c.name     = val('m-cname')  || c.name;
  c.phone    = val('m-cphone') || c.phone;
  c.initials = makeInitials(c.name);

  saveDB();
  closeModal();
  renderCustPicker();
  renderCustomersView();
  toast(`${c.name} updated`);
}

function deleteCustomer(custId) {
  if (!confirm('Delete this customer? Their due history will be lost.')) return;
  DB.customers = DB.customers.filter(c => c.id !== custId);
  saveDB();
  closeModal();
  renderCustPicker();
  renderCustomersView();
  toast('Customer deleted');
}

function recordPayment(custId) {
  const amt = parseFloat(val('m-payamt'));
  if (isNaN(amt) || amt <= 0) { toast('Enter a valid amount'); return; }

  const c = findCustomer(custId);
  if (!c) return;

  c.due = Math.max(0, c.due - amt);
  saveDB();
  closeModal();
  renderCustPicker();
  renderCustomersView();
  toast(`₹${amt} recorded for ${c.name} · Remaining due: ₹${c.due}`);
}
