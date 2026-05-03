/* ============================================================
   modals.js — All modal dialogs
   v3: walkinDue modal, convertWalkin modal, qty-edit modal
   ============================================================ */
let _modalCtx = null;

function openModal(type, extra = null) {
  _modalCtx = extra;
  const bg = $('modal-bg'), el = $('modal-content');
  bg.classList.add('show');

  switch (type) {

    /* ── Add product ── */
    case 'product':
      el.innerHTML = `<h3>Add Product</h3>
        ${fg('Name', 'm-pname', 'text', 'e.g. Dal Moong')}
        ${fg('Aliases (comma separated)', 'm-palias', 'text', 'e.g. moong, green dal')}
        <div class="modal-grid">
          ${fg('Price (₹)', 'm-pprice', 'number', '90')}
          ${fg('Unit', 'm-punit', 'text', 'kg / litre / packet')}
        </div>
        <div class="modal-grid">
          ${fg('Stock', 'm-pstock', 'number', '50')}
          ${fg('Low-stock alert', 'm-plow', 'number', '10')}
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveNewProduct()">Save Product</button>
        </div>`;
      break;

    /* ── Edit product ── */
    case 'editprod': {
      const p = findProduct(extra); if (!p) { closeModal(); return; }
      el.innerHTML = `<h3>Edit — ${escHtml(p.name)}</h3>
        ${fgv('Name', 'm-pname', 'text', p.name)}
        ${fgv('Aliases', 'm-palias', 'text', p.aliases.join(', '))}
        <div class="modal-grid">
          ${fgv('Price (₹)', 'm-pprice', 'number', p.price)}
          ${fgv('Unit', 'm-punit', 'text', p.unit)}
        </div>
        <div class="modal-grid">
          ${fgv('Stock', 'm-pstock', 'number', fmtQty(p.stock))}
          ${fgv('Low-stock alert', 'm-plow', 'number', fmtQty(p.lowAt))}
        </div>
        <div class="modal-btns">
          <button class="modal-danger" onclick="deleteProduct(${p.id})">Delete</button>
          <button class="modal-ok" onclick="updateProduct(${p.id})">Save Changes</button>
        </div>`;
      break;
    }

    /* ── Adjust stock ── */
    case 'adjust': {
      const p = findProduct(extra); if (!p) { closeModal(); return; }
      el.innerHTML = `<h3>Adjust Stock — ${escHtml(p.name)}</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
          Current: <strong>${fmtQty(p.stock)} ${p.unit}</strong>
        </div>
        ${fg('New quantity (decimals OK)', 'm-adjqty', 'number', fmtQty(p.stock))}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveStockAdjust(${p.id})">Save</button>
        </div>`;
      const inp = el.querySelector('#m-adjqty');
      if (inp) { inp.step = '0.001'; inp.min = '0'; }
      break;
    }

    /* ── Add customer ── */
    case 'customer':
      el.innerHTML = `<h3>Add Customer</h3>
        ${fg('Full Name', 'm-cname', 'text', 'e.g. Ramesh Kumar')}
        ${fg('Phone', 'm-cphone', 'tel', '10-digit mobile')}
        ${fg('Opening Due (₹)', 'm-cdue', 'number', '0')}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveNewCustomer()">Save Customer</button>
        </div>`;
      break;

    /* ── Edit customer ── */
    case 'editcust': {
      const c = findCustomer(extra); if (!c) { closeModal(); return; }
      el.innerHTML = `<h3>Edit Customer</h3>
        ${fgv('Name', 'm-cname', 'text', c.name)}
        ${fgv('Phone', 'm-cphone', 'tel', c.phone)}
        <div class="modal-btns">
          <button class="modal-danger" onclick="deleteCustomer(${c.id})">Delete</button>
          <button class="modal-ok" onclick="updateCustomer(${c.id})">Save Changes</button>
        </div>`;
      break;
    }

    /* ── Record payment ── */
    case 'payment':
    case 'paymentDirect': {
      const custId = type === 'payment' ? currentOrder()?.customerId : extra;
      const c = custId ? findCustomer(custId) : null;
      if (!c) { closeModal(); toast('No customer assigned'); return; }
      el.innerHTML = `<h3>Record Payment</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
          ${escHtml(c.name)} · Due: <strong style="color:var(--danger)">₹${fmtPrice(c.due)}</strong>
        </div>
        ${fg('Amount received (₹)', 'm-payamt', 'number', fmtPrice(c.due))}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="recordPayment(${c.id})">Record</button>
        </div>`;
      break;
    }

    /* ── Finalize order ── */
    case 'finalize': {
      const order = currentOrder(); if (!order) { closeModal(); return; }
      const name  = orderDisplayName(order);
      const total = orderTotal(order);
      el.innerHTML = `<h3>Finalize Order #${order.id}</h3>
        <div class="finalize-summary">
          Customer: <strong>${escHtml(name)}</strong><br>
          Items: <strong>${order.items.length}</strong><br>
          Total: <span class="finalize-total">₹${fmtPrice(total)}</span>
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Back</button>
          <button class="btn-due"
            style="flex:1;padding:12px;border-radius:var(--radius-md);font-size:14px;font-weight:600;cursor:pointer"
            onclick="handleFinalizeWithDue()">📋 Due</button>
          <button class="modal-ok" onclick="finalizeOrder('paid')">✔ Paid</button>
        </div>`;
      break;
    }

    /* ── Walk-in Due prompt ────────────────────────────────
         Shown when user taps "Due" with NO customer assigned.
         Keeps the flow fast — both fields are optional.
         ─────────────────────────────────────────────────── */
    case 'walkinDue': {
      const order = currentOrder(); if (!order) { closeModal(); return; }
      const total = orderTotal(order);
      el.innerHTML = `
        <h3>Add to Due</h3>
        <div class="walkin-info">
          <div class="walkin-amount">₹${fmtPrice(total)}</div>
          <div class="walkin-label">No customer assigned. Enter walk-in details to track this due.</div>
        </div>
        <div class="walkin-tip">Both fields are optional — leave blank to save as anonymous walk-in.</div>
        ${fg('Customer Name', 'm-wi-name', 'text', 'e.g. Suresh (optional)')}
        ${fg('Phone Number', 'm-wi-phone', 'tel', '10-digit (optional)')}
        <div class="walkin-actions">
          <button class="walkin-or-select" onclick="closeModal();rightTab('r-customer')">
            ← Select existing customer
          </button>
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="submitWalkInDue()">Save Due ✓</button>
        </div>`;
      break;
    }

    /* ── Convert walk-in to permanent customer ── */
    case 'convertWalkin': {
      const order = extra;  // full history order object
      if (!order?.walkIn) { closeModal(); return; }
      el.innerHTML = `<h3>Save as Customer</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
          Convert walk-in from order #${order.id} to a permanent customer profile.
        </div>
        ${fgv('Name', 'm-cname', 'text', order.walkIn.name || '')}
        ${fgv('Phone', 'm-cphone', 'tel', order.walkIn.phone || '')}
        ${fg('Opening Due (₹)', 'm-cdue', 'number', fmtPrice(orderTotal(order)))}
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="saveNewCustomer()">Save Customer</button>
        </div>`;
      break;
    }

    /* ── Edit quantity inline ── */
    case 'editqty': {
      const { itemIndex, item } = extra;
      el.innerHTML = `<h3>Edit Quantity — ${escHtml(item.name)}</h3>
        <div class="qty-modal-display">
          <span class="qty-modal-val" id="qm-display">${fmtQty(item.qty)}</span>
          <span class="qty-modal-unit">${item.unit}</span>
        </div>
        ${fg('Enter quantity (decimals OK)', 'm-qtyedit', 'number', fmtQty(item.qty))}
        <div class="qty-modal-btns">
          ${[0.1, 0.25, 0.5, 1, 2, 5].map(v =>
            `<button class="qty-preset" onclick="qtyPreset(${v})">${v}</button>`
          ).join('')}
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="applyQtyEdit(${itemIndex})">Apply</button>
        </div>`;
      const inp = el.querySelector('#m-qtyedit');
      if (inp) {
        inp.step = '0.001'; inp.min = '0.001';
        inp.oninput = () => { $('qm-display').textContent = inp.value || '0'; };
      }
      break;
    }

    /* ── Settings ── */
    case 'settings':
      el.innerHTML = `<h3>Settings</h3>
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

  setTimeout(() => { const f = el.querySelector('input'); if (f) f.focus(); }, 80);
}

/* ── Walk-in due submit ─────────────────────────────────── */
function submitWalkInDue() {
  const name  = val('m-wi-name');
  const phone = val('m-wi-phone');
  const walkIn = (name || phone) ? { name, phone } : null;
  finalizeOrder('due', walkIn);
}

/* ── Qty helpers ────────────────────────────────────────── */
function qtyPreset(v) {
  const inp = $('m-qtyedit');
  if (inp) { inp.value = v; $('qm-display').textContent = v; }
}

function applyQtyEdit(itemIndex) {
  const q = parseQty(val('m-qtyedit'));
  if (!q) { toast('Invalid quantity'); return; }
  const order = currentOrder(); if (!order) return;
  order.items[itemIndex].qty = Math.round(q * 1000) / 1000;
  saveDB(); closeModal(); renderCurrentOrder(); renderOrderTabs(); renderMobOrderTabs();
  toast('Quantity updated');
}

/* ── Modal close ────────────────────────────────────────── */
function closeModal() {
  $('modal-bg').classList.remove('show');
  $('modal-content').innerHTML = '';
  _modalCtx = null;
}

function onModalBgClick(e) {
  if (e.target === $('modal-bg')) closeModal();
}

/* ── Settings ───────────────────────────────────────────── */
function saveSettings() {
  DB.storeName = val('m-sname') || DB.storeName;
  $('store-name-display').textContent = DB.storeName;
  saveDB(); closeModal(); toast('Settings saved');
}

function clearAllData() {
  if (!confirm('Delete ALL data? This cannot be undone.')) return;
  localStorage.removeItem('dukaan_pos_v3');
  localStorage.removeItem('dukaan_pos_v2');
  location.reload();
}

/* ── Form field builders ────────────────────────────────── */
function fg(label, id, type, ph = '', hint = '') {
  return `<div class="form-group">
    <label class="form-label" for="${id}">${label}</label>
    <input class="form-input" id="${id}" type="${type}"
      placeholder="${escAttr(ph)}"
      ${type === 'number' ? 'step="0.001" min="0"' : ''}>
    ${hint ? `<div class="form-hint">${hint}</div>` : ''}
  </div>`;
}

function fgv(label, id, type, value) {
  return `<div class="form-group">
    <label class="form-label" for="${id}">${label}</label>
    <input class="form-input" id="${id}" type="${type}"
      value="${escAttr(String(value))}"
      ${type === 'number' ? 'step="0.001" min="0"' : ''}>
  </div>`;
}
