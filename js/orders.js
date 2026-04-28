/* ============================================================
   orders.js — Order lifecycle: create, modify, finalize, render
   ============================================================ */

/* ── State ───────────────────────────────────────────────────── */
let activeOrderId = null;

/* ── Getters ─────────────────────────────────────────────────── */
function currentOrder() { return findOrder(activeOrderId); }

/* ── Create ──────────────────────────────────────────────────── */
function createOrder() {
  const order = {
    id:          DB.nextOrderId++,
    items:       [],
    customerId:  null,
    finalized:   false,
    payment:     null,
    created:     new Date().toISOString(),
    finalizedAt: null,
  };
  DB.orders.push(order);
  activeOrderId = order.id;
  saveDB();
  renderOrderTabs();
  renderCurrentOrder();
  toast(`Order #${order.id} created`);
}

function switchOrder(id) {
  activeOrderId = id;
  renderOrderTabs();
  renderCurrentOrder();
}

/* ── Items ───────────────────────────────────────────────────── */
function addProductToOrder(product, qty = 1) {
  const order = currentOrder();
  if (!order)              { toast('Create an order first'); return; }
  if (order.finalized)     { toast('Order is finalized — cannot modify'); return; }
  if (product.stock < qty) { toast(`⚠ Only ${product.stock} ${product.unit} in stock`); return; }

  const existing = order.items.find(i => i.productId === product.id);
  if (existing) {
    if (product.stock < existing.qty + qty) { toast('⚠ Insufficient stock'); return; }
    existing.qty += qty;
  } else {
    order.items.push({
      productId: product.id,
      name:      product.name,
      price:     product.price,   // price locked at time of sale
      unit:      product.unit,
      qty,
      delivered: false,
    });
  }

  saveDB();
  renderCurrentOrder();
  renderOrderTabs();

  // clear search
  $('prod-search').value = '';
  $('product-results').innerHTML = '';

  toast(`${product.name} × ${qty} added`);
}

function changeItemQty(itemIndex, delta) {
  const order = currentOrder();
  if (!order || order.finalized) return;

  order.items[itemIndex].qty += delta;
  if (order.items[itemIndex].qty <= 0) order.items.splice(itemIndex, 1);

  saveDB();
  renderCurrentOrder();
  renderOrderTabs();
}

function removeItem(itemIndex) {
  const order = currentOrder();
  if (!order || order.finalized) return;

  order.items.splice(itemIndex, 1);
  saveDB();
  renderCurrentOrder();
  renderOrderTabs();
}

function toggleItemDelivered(itemIndex, delivered) {
  const order = currentOrder();
  if (!order) return;
  order.items[itemIndex].delivered = delivered;
  saveDB();
  // toggle class without full re-render for performance
  const el = document.getElementById(`oi-${itemIndex}`);
  if (el) el.classList.toggle('delivered', delivered);
}

/* ── Finalize ────────────────────────────────────────────────── */
function finalizeOrder(payment = 'paid') {
  const order = currentOrder();
  if (!order || order.items.length === 0 || order.finalized) return;

  const total = orderTotal(order);

  // Deduct stock — business rule: stock updated on finalization
  order.items.forEach(item => {
    const prod = findProduct(item.productId);
    if (prod) prod.stock = Math.max(0, prod.stock - item.qty);
  });

  order.finalized  = true;
  order.payment    = payment;
  order.finalizedAt = new Date().toISOString();

  // Add to customer dues if payment === 'due'
  if (payment === 'due' && order.customerId) {
    const cust = findCustomer(order.customerId);
    if (cust) cust.due += total;
  }

  // Move to history (deep copy to freeze state)
  DB.history.push(JSON.parse(JSON.stringify(order)));

  // Remove from active orders
  DB.orders = DB.orders.filter(o => o.id !== order.id);
  activeOrderId = DB.orders.length ? DB.orders[DB.orders.length - 1].id : null;

  saveDB();
  closeModal();
  renderOrderTabs();
  renderCurrentOrder();
  renderStockMiniList();
  renderCustPicker();

  toast(`Order #${order.id} ✓  ₹${total.toFixed(0)} · ${payment === 'paid' ? 'Paid' : 'Added to due'}`);
}

function voidOrder() {
  const order = currentOrder();
  if (!order) return;
  if (!confirm(`Void order #${order.id}? This cannot be undone.`)) return;

  DB.orders = DB.orders.filter(o => o.id !== order.id);
  activeOrderId = DB.orders.length ? DB.orders[DB.orders.length - 1].id : null;

  saveDB();
  renderOrderTabs();
  renderCurrentOrder();
  toast(`Order voided`);
}

/* ── Render: Tab list ────────────────────────────────────────── */
function renderOrderTabs() {
  const el = $('order-tabs');
  if (!DB.orders.length) {
    el.innerHTML = '<div style="padding:8px 2px;font-size:12px;color:var(--muted)">No active orders</div>';
    return;
  }
  el.innerHTML = DB.orders.map(o => {
    const cust  = o.customerId ? findCustomer(o.customerId) : null;
    const total = orderTotal(o);
    return `
      <div class="order-tab ${o.id === activeOrderId ? 'active' : ''} ${o.finalized ? 'finalized' : ''}"
           onclick="switchOrder(${o.id})">
        <div class="ot-id">
          #${o.id}
          <span style="font-weight:400;color:var(--muted);font-size:10px">
            ${o.finalized ? '✓ done' : 'open'}
          </span>
        </div>
        <div class="ot-meta">${cust ? escHtml(cust.name) : 'Walk-in'} · ₹${total.toFixed(0)}</div>
      </div>`;
  }).join('');
}

/* ── Render: Current order items + footer ────────────────────── */
function renderCurrentOrder() {
  const order    = currentOrder();
  const titleEl  = $('panel-title');
  const itemsEl  = $('order-items');
  const totalEl  = $('total-display');
  const countEl  = $('item-count');
  const btnDue   = $('btn-add-due');
  const btnPaid  = $('btn-mark-paid');

  if (!order) {
    titleEl.textContent = 'No Order — tap "+ New Order"';
    itemsEl.innerHTML   = `<div class="empty-state"><span class="empty-icon">🛒</span>Tap "+ New Order" to begin billing</div>`;
    totalEl.textContent = '₹0';
    countEl.textContent = '';
    btnDue.className    = 'btn-locked';
    btnPaid.className   = 'btn-locked';
    return;
  }

  const cust  = order.customerId ? findCustomer(order.customerId) : null;
  const total = orderTotal(order);
  const count = order.items.reduce((s, i) => s + i.qty, 0);

  titleEl.textContent = `Order #${order.id} — ${cust ? cust.name : 'Walk-in'}${order.finalized ? '  ✓ Finalized' : ''}`;
  totalEl.textContent = `₹${total.toFixed(0)}`;
  countEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  btnDue.className  = order.finalized ? 'btn-locked' : 'btn-due';
  btnPaid.className = order.finalized ? 'btn-locked' : 'btn-paid';

  if (!order.items.length) {
    itemsEl.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span>Search products above or use the 🎤 mic<br><span style="font-size:11px">Try: "cheeni", "maggi", "doodh 2"</span></div>`;
    return;
  }

  itemsEl.innerHTML = order.items.map((item, idx) => {
    const locked = order.finalized;
    return `
      <div class="order-item ${item.delivered ? 'delivered' : ''}" id="oi-${idx}">
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
          <span class="qty-val">${item.qty}</span>
          ${locked ? '' : `<button class="qty-btn" onclick="changeItemQty(${idx},1)">+</button>`}
          <span class="item-price">₹${(item.price * item.qty).toFixed(0)}</span>
          ${locked ? '' : `<button class="item-del" onclick="removeItem(${idx})" title="Remove">✕</button>`}
        </div>
      </div>`;
  }).join('');
}

/* ── Product search ──────────────────────────────────────────── */
function searchProducts(query) {
  const el = $('product-results');
  const q  = (query || '').toLowerCase().trim();

  if (!q) { el.innerHTML = ''; return; }

  const results = DB.products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.aliases.some(a => a.includes(q))
  ).slice(0, 10);

  if (!results.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:4px 2px">
      No product found —
      <a href="#" onclick="openModal('product');return false;" style="color:var(--accent)">Add "${escHtml(q)}"?</a>
    </div>`;
    return;
  }

  el.innerHTML = results.map(p => {
    const low  = p.stock <= p.lowAt;
    const zero = p.stock === 0;
    return `
      <div class="prod-chip ${zero ? 'out-of-stock' : ''}"
           onclick="addProductToOrder(findProduct(${p.id}), 1)"
           title="${escAttr(p.aliases.join(', '))}">
        <span class="pc-name">${escHtml(p.name)}</span>
        <span class="pc-detail ${low ? 'low' : ''}">
          ₹${p.price}/${p.unit} · ${zero ? 'Out of stock' : p.stock + ' left' + (low ? ' ⚠' : '')}
        </span>
      </div>`;
  }).join('');
}

function handleSearchKeydown(e) {
  if (e.key !== 'Enter') return;
  const q = e.target.value.toLowerCase().trim();
  const found = DB.products.find(p =>
    p.name.toLowerCase() === q || p.aliases.includes(q)
  );
  if (found) addProductToOrder(found, 1);
}
