/* ============================================================
   customers.js — Customer profiles, dues, payments
   ============================================================ */
function renderCustPicker(query = '') {
  const pickerEl = $('cust-picker');
  const dueEl    = $('cust-due-section');
  const order    = currentOrder();

  const filtered = DB.customers.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)
  );

  pickerEl.innerHTML = filtered.map(c => {
    const sel = order && order.customerId === c.id;
    return `<div class="cust-row ${sel?'selected':''}" onclick="assignCustomer(${c.id})">
      <div class="cust-avatar">${escHtml(c.initials)}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:${sel?'600':'400'}">${escHtml(c.name)}</div>
        <div class="cust-sub">${escHtml(c.phone)}</div>
      </div>
      ${c.due > 0 ? `<span class="cust-due-badge">₹${fmtPrice(c.due)}</span>` : ''}
    </div>`;
  }).join('');

  const selCust = order?.customerId ? findCustomer(order.customerId) : null;
  if (selCust && selCust.due > 0) {
    dueEl.style.display = 'block';
    $('cust-due-info').innerHTML = `<div class="due-amount">₹${fmtPrice(selCust.due)}</div><div class="due-sub">from ${escHtml(selCust.name)}</div>`;
  } else {
    dueEl.style.display = 'none';
  }
}

function renderCustomersView() {
  const el = $('cust-list-full');
  if (!DB.customers.length) { el.innerHTML='<div class="empty-state"><span class="empty-icon">👥</span>No customers yet</div>'; return; }
  el.innerHTML = DB.customers.map(c => `
    <div class="cust-card">
      <div class="cc-avatar">${escHtml(c.initials)}</div>
      <div style="flex:1"><div class="cc-name">${escHtml(c.name)}</div><div class="cc-phone">${escHtml(c.phone)}</div></div>
      ${c.due > 0
        ? `<div class="cc-due"><div class="cc-due-amt">₹${fmtPrice(c.due)}</div><div style="font-size:11px;color:var(--muted)">due</div></div>`
        : `<div class="cc-settled">✓ Clear</div>`}
      <div class="cc-actions">
        ${c.due > 0 ? `<button class="ic-btn primary" onclick="openModal('paymentDirect',${c.id})">Pay</button>` : ''}
        <button class="ic-btn" onclick="openModal('editcust',${c.id})">Edit</button>
      </div>
    </div>`).join('');
}

function assignCustomer(custId) {
  const order = currentOrder();
  if (!order) { toast('Create an order first'); return; }
  order.customerId = order.customerId === custId ? null : custId;
  saveDB(); renderCurrentOrder(); renderOrderTabs(); renderMobOrderTabs(); renderCustPicker();
}

function saveNewCustomer() {
  const name  = val('m-cname');
  const phone = val('m-cphone');
  const due   = parseFloat(val('m-cdue')) || 0;
  if (!name) { toast('Name required'); return; }
  DB.customers.push({ id:DB.nextCustomerId++, name, phone:phone||'—', due, initials:makeInitials(name) });
  saveDB(); closeModal(); renderCustPicker(); renderCustomersView(); toast(`${name} added`);
}

function updateCustomer(custId) {
  const c = findCustomer(custId); if (!c) return;
  c.name  = val('m-cname')  || c.name;
  c.phone = val('m-cphone') || c.phone;
  c.initials = makeInitials(c.name);
  saveDB(); closeModal(); renderCustPicker(); renderCustomersView(); toast(`${c.name} updated`);
}

function deleteCustomer(custId) {
  if (!confirm('Delete customer?')) return;
  DB.customers = DB.customers.filter(c => c.id !== custId);
  saveDB(); closeModal(); renderCustPicker(); renderCustomersView(); toast('Deleted');
}

function recordPayment(custId) {
  const amt = parseFloat(val('m-payamt'));
  if (isNaN(amt) || amt <= 0) { toast('Enter valid amount'); return; }
  const c = findCustomer(custId); if (!c) return;
  c.due = Math.max(0, Math.round((c.due - amt) * 100) / 100);
  saveDB(); closeModal(); renderCustPicker(); renderCustomersView();
  toast(`₹${amt} recorded · Due: ₹${fmtPrice(c.due)}`);
}
