/* ============================================================
   orders.js — Order lifecycle: create, modify, finalize
   v3: walkIn customer support, decimal qty, due-safety check
   ============================================================ */
let activeOrderId = null;

function currentOrder() { return findOrder(activeOrderId); }

/* ── Create ─────────────────────────────────────────────── */
function createOrder() {
  const order = {
    id:          DB.nextOrderId++,
    items:       [],
    customerId:  null,
    walkIn:      null,          // { name, phone } set on walk-in due
    finalized:   false,
    payment:     null,
    created:     new Date().toISOString(),
    finalizedAt: null,
  };
  DB.orders.push(order);
  activeOrderId = order.id;
  saveDB();
  renderOrderTabs();
  renderMobOrderTabs();
  renderCurrentOrder();
  toast(`Order #${order.id} created`);
}

function switchOrder(id) {
  activeOrderId = id;
  renderOrderTabs();
  renderMobOrderTabs();
  renderCurrentOrder();
  renderCustPicker();
  closeMobSheet();
}

/* ── Add product (decimal qty safe) ─────────────────────── */
function addProductToOrder(product, qty = 1) {
  const order = currentOrder();
  if (!order)          { toast('Create an order first'); return; }
  if (order.finalized) { toast('Order is finalized'); return; }

  const q = typeof qty === 'number' ? qty : parseQty(qty);
  if (!q || q <= 0) { toast('Invalid quantity'); return; }
  const qRounded = Math.round(q * 1000) / 1000;

  if (product.stock < qRounded) {
    toast(`⚠ Only ${fmtQty(product.stock)} ${product.unit} in stock`);
    return;
  }

  const existing = order.items.find(i => i.productId === product.id);
  if (existing) {
    const newQty = Math.round((existing.qty + qRounded) * 1000) / 1000;
    if (product.stock < newQty) { toast('⚠ Insufficient stock'); return; }
    existing.qty = newQty;
  } else {
    order.items.push({
      productId: product.id,
      name:      product.name,
      price:     product.price,   // locked at time of sale
      unit:      product.unit,
      qty:       qRounded,
      delivered: false,
    });
  }

  saveDB();
  renderCurrentOrder();
  renderOrderTabs();
  renderMobOrderTabs();
  $('prod-search').value = '';
  $('product-results').innerHTML = '';
  toast(`${product.name} × ${fmtQty(qRounded)} added`);
}

/* ── Qty adjustment (step-aware) ─────────────────────────── */
function changeItemQty(itemIndex, delta) {
  const order = currentOrder();
  if (!order || order.finalized) return;
  const item = order.items[itemIndex];
  const isWeight = ['kg','g','litre','liter','l'].includes(item.unit.toLowerCase());
  const step = isWeight ? 0.25 : 1;
  const newQty = Math.round((item.qty + delta * step) * 1000) / 1000;
  if (newQty <= 0) { order.items.splice(itemIndex, 1); }
  else { item.qty = newQty; }
  saveDB(); renderCurrentOrder(); renderOrderTabs(); renderMobOrderTabs();
}

/* ── Tap qty to open edit modal ──────────────────────────── */
function editItemQty(itemIndex) {
  const order = currentOrder();
  if (!order || order.finalized) return;
  openModal('editqty', { itemIndex, item: order.items[itemIndex] });
}

function removeItem(itemIndex) {
  const order = currentOrder();
  if (!order || order.finalized) return;
  order.items.splice(itemIndex, 1);
  saveDB(); renderCurrentOrder(); renderOrderTabs(); renderMobOrderTabs();
}

function toggleItemDelivered(itemIndex, delivered) {
  const order = currentOrder();
  if (!order) return;
  order.items[itemIndex].delivered = delivered;
  saveDB();
  const el = document.getElementById(`oi-${itemIndex}`);
  if (el) el.classList.toggle('delivered', delivered);
}

/* ── Finalize ────────────────────────────────────────────── */
function finalizeOrder(payment = 'paid', walkInData = null) {
  const order = currentOrder();
  if (!order || !order.items.length || order.finalized) return;

  const total = orderTotal(order);

  // Deduct stock
  order.items.forEach(item => {
    const prod = findProduct(item.productId);
    if (prod) prod.stock = Math.round(Math.max(0, prod.stock - item.qty) * 1000) / 1000;
  });

  order.finalized   = true;
  order.payment     = payment;
  order.finalizedAt = new Date().toISOString();

  // Store walk-in data if provided
  if (walkInData) order.walkIn = walkInData;

  // Update customer due
  if (payment === 'due') {
    if (order.customerId) {
      const cust = findCustomer(order.customerId);
      if (cust) cust.due = Math.round((cust.due + total) * 100) / 100;
    }
    // walk-in dues are stored on the order itself (order.walkIn.name + order.walkIn.phone)
    // They show in history and can be converted to a customer later
  }

  DB.history.push(JSON.parse(JSON.stringify(order)));
  DB.orders = DB.orders.filter(o => o.id !== order.id);
  activeOrderId = DB.orders.length ? DB.orders[DB.orders.length - 1].id : null;

  saveDB(); closeModal();
  renderOrderTabs(); renderMobOrderTabs();
  renderCurrentOrder(); renderStockMiniList(); renderCustPicker();

  const who = order.customerId
    ? findCustomer(order.customerId)?.name
    : (walkInData?.name || 'Walk-in');
  toast(`#${order.id} ✓  ₹${fmtPrice(total)} · ${payment === 'paid' ? 'Paid' : `Due (${who})`}`);
}

function voidOrder() {
  const order = currentOrder();
  if (!order) return;
  if (!confirm(`Void order #${order.id}?`)) return;
  DB.orders = DB.orders.filter(o => o.id !== order.id);
  activeOrderId = DB.orders.length ? DB.orders[DB.orders.length - 1].id : null;
  saveDB(); renderOrderTabs(); renderMobOrderTabs(); renderCurrentOrder();
  toast('Order voided');
}

/* ── Convert walk-in to permanent customer ───────────────── */
function convertWalkInToCustomer(orderId) {
  const order = DB.history.find(o => o.id === orderId);
  if (!order || !order.walkIn) return;
  openModal('convertWalkin', order);
}

/* ── Render: order tabs ─────────────────────────────────── */
function _orderTabsHTML() {
  if (!DB.orders.length) {
    return '<div style="padding:8px 2px;font-size:12px;color:var(--muted)">No active orders</div>';
  }
  return DB.orders.map(o => {
    const name  = orderDisplayName(o);
    const total = orderTotal(o);
    return `<div class="order-tab ${o.id === activeOrderId ? 'active' : ''}"
                 onclick="switchOrder(${o.id})">
      <div class="ot-id">#${o.id}
        <span style="font-weight:400;color:var(--muted);font-size:10px">${o.finalized ? '✓' : 'open'}</span>
      </div>
      <div class="ot-meta">${escHtml(name)} · ₹${fmtPrice(total)}</div>
    </div>`;
  }).join('');
}
function renderOrderTabs()    { setHTML('order-tabs',     _orderTabsHTML()); }
function renderMobOrderTabs() { setHTML('mob-order-tabs', _orderTabsHTML()); }

/* ── Render: current order ──────────────────────────────── */
function renderCurrentOrder() {
  const order   = currentOrder();
  const titleEl = $('panel-title');
  const itemsEl = $('order-items');
  const totalEl = $('total-display');
  const countEl = $('item-count');
  const btnDue  = $('btn-add-due');
  const btnPaid = $('btn-mark-paid');

  if (!order) {
    titleEl.textContent  = 'No Order';
    itemsEl.innerHTML    = '<div class="empty-state"><span class="empty-icon">🛒</span>Tap "+ Order" to begin billing</div>';
    totalEl.textContent  = '₹0';
    countEl.textContent  = '';
    if (btnDue)  btnDue.className  = 'btn-locked';
    if (btnPaid) btnPaid.className = 'btn-locked';
    return;
  }

  const name  = orderDisplayName(order);
  const total = orderTotal(order);
  const count = order.items.reduce((s, i) => s + i.qty, 0);

  titleEl.textContent  = `#${order.id} — ${name}${order.finalized ? ' ✓' : ''}`;
  totalEl.textContent  = `₹${fmtPrice(total)}`;
  countEl.textContent  = `${fmtQty(count)} items`;

  if (btnDue)  btnDue.className  = order.finalized ? 'btn-locked' : 'btn-due';
  if (btnPaid) btnPaid.className = order.finalized ? 'btn-locked' : 'btn-paid';

  if (!order.items.length) {
    itemsEl.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🔍</span>
      Search above or tap 🎤<br>
      <small>Try: "cheeni", "0.5 kg chawal"</small>
    </div>`;
    return;
  }

  itemsEl.innerHTML = order.items.map((item, idx) => {
    const locked = order.finalized;
    return `<div class="order-item ${item.delivered ? 'delivered' : ''}" id="oi-${idx}">
      <label class="item-label">
        <input type="checkbox" class="delivered-check"
          ${item.delivered ? 'checked' : ''}
          ${locked ? 'disabled' : ''}
          onchange="toggleItemDelivered(${idx}, this.checked)">
        <div>
          <div class="item-name">${escHtml(item.name)}</div>
          <div class="item-meta">₹${item.price} / ${item.unit}</div>
        </div>
      </label>
      <div class="item-controls">
        ${locked ? '' : `<button class="qty-btn" onclick="changeItemQty(${idx},-1)">−</button>`}
        <span class="qty-val" ${locked ? '' : `onclick="editItemQty(${idx})"`} title="Tap to edit">${fmtQty(item.qty)}</span>
        ${locked ? '' : `<button class="qty-btn" onclick="changeItemQty(${idx},1)">+</button>`}
        <span class="item-price">₹${fmtPrice(item.price * item.qty)}</span>
        ${locked ? '' : `<button class="item-del" onclick="removeItem(${idx})">✕</button>`}
      </div>
    </div>`;
  }).join('');
}

/* ── Product search ─────────────────────────────────────── */
function searchProducts(query) {
  const el = $('product-results');
  const q  = (query || '').toLowerCase().trim();
  if (!q) { el.innerHTML = ''; return; }

  const results = DB.products
    .filter(p => p.name.toLowerCase().includes(q) || p.aliases.some(a => a.includes(q)))
    .slice(0, 10);

  if (!results.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:4px 2px">
      No product —
      <a href="#" onclick="openModal('product');return false" style="color:var(--accent)">Add "${escHtml(q)}"?</a>
    </div>`;
    return;
  }

  el.innerHTML = results.map(p => {
    const low = p.stock <= p.lowAt, zero = p.stock === 0;
    return `<div class="prod-chip ${zero ? 'out-of-stock' : ''}"
                 onclick="addProductToOrder(findProduct(${p.id}), 1)"
                 title="${escAttr(p.aliases.join(', '))}">
      <span class="pc-name">${escHtml(p.name)}</span>
      <span class="pc-detail ${low ? 'low' : ''}">
        ₹${p.price}/${p.unit} · ${zero ? 'Out of stock' : fmtQty(p.stock) + ' left' + (low ? ' ⚠' : '')}
      </span>
    </div>`;
  }).join('');
}

function handleSearchKeydown(e) {
  if (e.key !== 'Enter') return;
  const q = e.target.value.toLowerCase().trim();
  const found = DB.products.find(p => p.name.toLowerCase() === q || p.aliases.includes(q));
  if (found) addProductToOrder(found, 1);
}
