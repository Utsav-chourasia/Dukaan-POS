/* ============================================================
   modals.js — All modal dialogs including qty-edit modal
   ============================================================ */
let _modalCtx = null;

function openModal(type, extra = null) {
  _modalCtx = extra;
  const bg = $('modal-bg'), el = $('modal-content');
  bg.classList.add('show');

  switch (type) {

    case 'product':
      el.innerHTML = `<h3>Add Product</h3>
        ${fg('Name','m-pname','text','e.g. Dal Moong')}
        ${fg('Aliases (comma separated)','m-palias','text','e.g. moong, green dal')}
        <div class="modal-grid">
          ${fg('Price (₹)','m-pprice','number','90')}
          ${fg('Unit','m-punit','text','kg / litre / packet')}
        </div>
        <div class="modal-grid">
          ${fg('Stock','m-pstock','number','50')}
          ${fg('Low-stock alert','m-plow','number','10')}
        </div>
        <div class="modal-btns"><button onclick="closeModal()">Cancel</button><button class="modal-ok" onclick="saveNewProduct()">Save</button></div>`;
      break;

    case 'editprod': {
      const p = findProduct(extra); if (!p) { closeModal(); return; }
      el.innerHTML = `<h3>Edit — ${escHtml(p.name)}</h3>
        ${fgv('Name','m-pname','text',p.name)}
        ${fgv('Aliases','m-palias','text',p.aliases.join(', '))}
        <div class="modal-grid">
          ${fgv('Price (₹)','m-pprice','number',p.price)}
          ${fgv('Unit','m-punit','text',p.unit)}
        </div>
        <div class="modal-grid">
          ${fgv('Stock','m-pstock','number',fmtQty(p.stock))}
          ${fgv('Low-stock alert','m-plow','number',fmtQty(p.lowAt))}
        </div>
        <div class="modal-btns">
          <button class="modal-danger" onclick="deleteProduct(${p.id})">Delete</button>
          <button class="modal-ok" onclick="updateProduct(${p.id})">Save</button>
        </div>`;
      break; }

    case 'adjust': {
      const p = findProduct(extra); if (!p) { closeModal(); return; }
      el.innerHTML = `<h3>Adjust Stock — ${escHtml(p.name)}</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">Current: <strong>${fmtQty(p.stock)} ${p.unit}</strong></div>
        ${fg('New quantity (decimals OK — e.g. 2.5)','m-adjqty','number',`${fmtQty(p.stock)}`)}
        <div class="modal-btns"><button onclick="closeModal()">Cancel</button><button class="modal-ok" onclick="saveStockAdjust(${p.id})">Save</button></div>`;
      const inp = el.querySelector('#m-adjqty'); if(inp){ inp.step='0.001'; inp.min='0'; }
      break; }

    case 'customer':
      el.innerHTML = `<h3>Add Customer</h3>
        ${fg('Full Name','m-cname','text','e.g. Ramesh Kumar')}
        ${fg('Phone','m-cphone','tel','10-digit')}
        ${fg('Opening Due (₹)','m-cdue','number','0')}
        <div class="modal-btns"><button onclick="closeModal()">Cancel</button><button class="modal-ok" onclick="saveNewCustomer()">Save</button></div>`;
      break;

    case 'editcust': {
      const c = findCustomer(extra); if (!c) { closeModal(); return; }
      el.innerHTML = `<h3>Edit Customer</h3>
        ${fgv('Name','m-cname','text',c.name)}
        ${fgv('Phone','m-cphone','tel',c.phone)}
        <div class="modal-btns">
          <button class="modal-danger" onclick="deleteCustomer(${c.id})">Delete</button>
          <button class="modal-ok" onclick="updateCustomer(${c.id})">Save</button>
        </div>`;
      break; }

    case 'payment':
    case 'paymentDirect': {
      const custId = type === 'payment' ? currentOrder()?.customerId : extra;
      const c = custId ? findCustomer(custId) : null;
      if (!c) { closeModal(); toast('No customer assigned'); return; }
      el.innerHTML = `<h3>Record Payment</h3>
        <div style="margin-bottom:12px;font-size:13px;color:var(--muted)">
          ${escHtml(c.name)} · Due: <strong style="color:var(--danger)">₹${fmtPrice(c.due)}</strong>
        </div>
        ${fg('Amount received (₹)','m-payamt','number',`${fmtPrice(c.due)}`)}
        <div class="modal-btns"><button onclick="closeModal()">Cancel</button><button class="modal-ok" onclick="recordPayment(${c.id})">Record</button></div>`;
      break; }

    case 'finalize': {
      const order = currentOrder(); if (!order) { closeModal(); return; }
      const cust  = order.customerId ? findCustomer(order.customerId) : null;
      const total = orderTotal(order);
      el.innerHTML = `<h3>Finalize Order #${order.id}</h3>
        <div class="finalize-summary">
          Customer: <strong>${cust ? escHtml(cust.name) : 'Walk-in'}</strong><br>
          Items: <strong>${order.items.length}</strong><br>
          Total: <span class="finalize-total">₹${fmtPrice(total)}</span>
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Back</button>
          <button class="btn-due" style="flex:1;padding:12px;border-radius:var(--radius-md);font-size:14px;font-weight:600;cursor:pointer" onclick="finalizeOrder('due')">📋 Due</button>
          <button class="modal-ok" onclick="finalizeOrder('paid')">✔ Paid</button>
        </div>`;
      break; }

    /* ── Inline qty edit ── */
    case 'editqty': {
      const { itemIndex, item } = extra;
      el.innerHTML = `<h3>Edit Quantity — ${escHtml(item.name)}</h3>
        <div class="qty-modal-display">
          <span class="qty-modal-val" id="qm-display">${fmtQty(item.qty)}</span>
          <span class="qty-modal-unit">${item.unit}</span>
        </div>
        ${fg('Enter quantity (decimals OK)','m-qtyedit','number',fmtQty(item.qty))}
        <div class="qty-modal-btns">
          ${[0.1,0.25,0.5,1,2,5].map(v=>`<button class="qty-preset" onclick="qtyPreset(${v})">${v}</button>`).join('')}
        </div>
        <div class="modal-btns">
          <button onclick="closeModal()">Cancel</button>
          <button class="modal-ok" onclick="applyQtyEdit(${itemIndex})">Apply</button>
        </div>`;
      const inp = el.querySelector('#m-qtyedit');
      if (inp) { inp.step='0.001'; inp.min='0.001'; inp.oninput = () => { $('qm-display').textContent = inp.value||'0'; }; }
      break; }

    case 'settings':
      el.innerHTML = `<h3>Settings</h3>
        ${fgv('Store Name','m-sname','text',DB.storeName)}
        <div style="font-size:12px;color:var(--muted);margin-bottom:12px">All data is stored on this device.</div>
        <div class="modal-btns">
          <button class="modal-danger" onclick="clearAllData()">Clear All Data</button>
          <button class="modal-ok" onclick="saveSettings()">Save</button>
        </div>`;
      break;
  }

  setTimeout(() => { const f = el.querySelector('input'); if(f) f.focus(); }, 80);
}

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

function closeModal() {
  $('modal-bg').classList.remove('show');
  $('modal-content').innerHTML = '';
  _modalCtx = null;
}

function onModalBgClick(e) { if (e.target === $('modal-bg')) closeModal(); }

function saveSettings() {
  DB.storeName = val('m-sname') || DB.storeName;
  $('store-name-display').textContent = DB.storeName;
  saveDB(); closeModal(); toast('Saved');
}

function clearAllData() {
  if (!confirm('Delete ALL data?')) return;
  localStorage.removeItem('dukaan_pos_v2');
  location.reload();
}

function fg(label, id, type, ph='', hint='') {
  return `<div class="form-group">
    <label class="form-label" for="${id}">${label}</label>
    <input class="form-input" id="${id}" type="${type}" placeholder="${escAttr(ph)}" ${type==='number'?'step="0.001" min="0"':''}>
    ${hint?`<div class="form-hint">${hint}</div>`:''}
  </div>`;
}

function fgv(label, id, type, value) {
  return `<div class="form-group">
    <label class="form-label" for="${id}">${label}</label>
    <input class="form-input" id="${id}" type="${type}" value="${escAttr(String(value))}" ${type==='number'?'step="0.001" min="0"':''}>
  </div>`;
}
