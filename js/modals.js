/* ============================================================
   modals.js — Modal dialog builder & form handlers
   ============================================================ */

let _modalContext = null; // stores extra data (e.g. product id for edit)

/* ── Open ────────────────────────────────────────────────────── */
function openModal(type, extra = null) {
  _modalContext = extra;
  const bg = $('modal-bg');
  const el = $('modal-content');
  bg.classList.add('show');

  switch (type) {

    /* ── Add product ── */
    case 'product':
      el.innerHTML = `
        <h3>Add New Product</h3>
        ${fg('Product Name', 'm-pname', 'text', 'e.g. Dal Moong')}
        ${fg('Aliases — comma separated', 'm-palias', 'text', 'e.g. moong, green dal, daal')}
        <div class="modal-grid">
          ${fg('Price per unit (₹)', 'm-pprice', 'number', 'e.g. 90')}
          ${fg('Unit', 'm-punit', 'text', 'kg / litre / packet')}
        </div>
        <div class="modal-grid">
          ${fg('Current stock', 'm-pstock', 'number', 'e.g. 50')}
          ${fg('Low-stock alert at', 'm-plow', 'number', 'e.g. 10')}
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveNewProduct()">Save Product</button>
        </div>`;
      break;

    /* ── Edit product ── */
    case 'editprod': {
      const p = findProduct(extra);
      if (!p) { closeModal(); return; }
      el.innerHTML = `
        <h3>Edit Product</h3>
        ${fgv('Product Name', 'm-pname', 'text', p.name)}
        ${fgv('Aliases', 'm-palias', 'text', p.aliases.join(', '))}
        <div class="modal-grid">
          ${fgv('Price (₹)', 'm-pprice', 'number', p.price)}
          ${fgv('Unit', 'm-punit', 'text', p.unit)}
        </div>
        <div class="modal-grid">
          ${fgv('Stock', 'm-pstock', 'number', p.stock)}
          ${fgv('Low-stock alert at', 'm-plow', 'number', p.lowAt)}
        </div>
        <div class="modal-btns">
          <button class="modal-danger" onclick="deleteProduct(${p.id})">Delete</button>
          <button class="modal-ok" onclick="updateProduct(${p.id})">Save Changes</button>
        </div>`;
      break;
    }

    /* ── Adjust stock ── */
    case 'adjust': {
      const p = findProduct(extra);
      if (!p) { closeModal(); return; }
      el.innerHTML = `
        <h3>Adjust Stock — ${escHtml(p.name)}</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
          Current stock: <strong>${p.stock} ${p.unit}</strong>
        </div>
        ${fg('New stock quantity', 'm-adjqty', 'number', `Enter new total (e.g. ${p.stock + 10})`)}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveStockAdjust(${p.id})">Save</button>
        </div>`;
      break;
    }

    /* ── Add customer ── */
    case 'customer':
      el.innerHTML = `
        <h3>Add Customer</h3>
        ${fg('Full Name', 'm-cname', 'text', 'e.g. Ramesh Kumar')}
        ${fg('Phone Number', 'm-cphone', 'tel', '10-digit mobile')}
        ${fg('Opening Due (₹) — if any', 'm-cdue', 'number', '0')}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveNewCustomer()">Save Customer</button>
        </div>`;
      break;

    /* ── Edit customer ── */
    case 'editcust': {
      const c = findCustomer(extra);
      if (!c) { closeModal(); return; }
      el.innerHTML = `
        <h3>Edit Customer</h3>
        ${fgv('Full Name', 'm-cname', 'text', c.name)}
        ${fgv('Phone', 'm-cphone', 'tel', c.phone)}
        <div class="modal-btns">
          <button class="modal-danger" onclick="deleteCustomer(${c.id})">Delete</button>
          <button class="modal-ok" onclick="updateCustomer(${c.id})">Save Changes</button>
        </div>`;
      break;
    }

    /* ── Record payment (from order panel) ── */
    case 'payment': {
      const order = currentOrder();
      if (!order?.customerId) { closeModal(); return; }
      openModal('paymentDirect', order.customerId);
      return;
    }

    /* ── Record payment (direct by customer id) ── */
    case 'paymentDirect': {
      const c = findCustomer(extra);
      if (!c) { closeModal(); return; }
      el.innerHTML = `
        <h3>Record Payment</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
          Customer: <strong>${escHtml(c.name)}</strong><br>
          Outstanding due: <strong style="color:var(--danger)">₹${c.due}</strong>
        </div>
        ${fg('Amount Received (₹)', 'm-payamt', 'number', `e.g. ${c.due}`)}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="recordPayment(${c.id})">Record</button>
        </div>`;
      break;
    }

    /* ── Finalize order confirmation ── */
    case 'finalize': {
      const order = currentOrder();
      if (!order) { closeModal(); return; }
      const cust  = order.customerId ? findCustomer(order.customerId) : null;
      const total = orderTotal(order);
      el.innerHTML = `
        <h3>Finalize Order #${order.id}</h3>
        <div class="finalize-summary">
          Customer: <strong>${cust ? escHtml(cust.name) : 'Walk-in'}</strong><br>
          Items: <strong>${order.items.length}</strong><br>
          Total: <span class="finalize-total">₹${total.toFixed(0)}</span>
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Back</button>
          <button class="btn-due" style="flex:1;padding:9px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer"
            onclick="finalizeOrder('due')">📋 Add to Due</button>
          <button class="modal-ok" onclick="finalizeOrder('paid')">✔ Mark Paid</button>
        </div>`;
      break;
    }

    /* ── Settings ── */
    case 'settings':
      el.innerHTML = `
        <h3>Settings</h3>
        ${fgv('Store Name', 'm-sname', 'text', DB.storeName)}
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
          All data is stored locally on this device.
        </div>
        <div class="modal-btns">
          <button class="modal-danger" onclick="clearAllData()">Clear All Data</button>
          <button class="modal-ok" onclick="saveSettings()">Save</button>
        </div>`;
      break;
  }

  // Auto-focus first input
  setTimeout(() => { const f = el.querySelector('input'); if (f) f.focus(); }, 80);
}

/* ── Close ───────────────────────────────────────────────────── */
function closeModal() {
  $('modal-bg').classList.remove('show');
  $('modal-content').innerHTML = '';
  _modalContext = null;
}

function onModalBgClick(e) {
  if (e.target === $('modal-bg')) closeModal();
}

/* ── Settings actions ────────────────────────────────────────── */
function saveSettings() {
  DB.storeName = val('m-sname') || DB.storeName;
  $('store-name-display').textContent = DB.storeName;
  saveDB();
  closeModal();
  toast('Settings saved');
}

function clearAllData() {
  if (!confirm('Delete ALL data including products, customers, and history? This cannot be undone.')) return;
  localStorage.removeItem('dukaan_pos_v1');
  location.reload();
}

/* ── Form field helpers ──────────────────────────────────────── */
/** Empty field */
function fg(label, id, type, placeholder = '', hint = '') {
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="${type}" placeholder="${escAttr(placeholder)}">
      ${hint ? `<div class="form-hint">${hint}</div>` : ''}
    </div>`;
}

/** Pre-filled field */
function fgv(label, id, type, value) {
  return `
    <div class="form-group">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="${type}" value="${escAttr(String(value))}">
    </div>`;
}
