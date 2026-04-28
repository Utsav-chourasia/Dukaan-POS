/* ============================================================
   inventory.js — Product catalog management & stock operations
   ============================================================ */

/* ── Render: Full inventory view ─────────────────────────────── */
function renderInventoryView() {
  const el = $('inv-list');
  if (!DB.products.length) {
    el.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span>No products yet. Add one!</div>';
    return;
  }
  el.innerHTML = DB.products.map(p => {
    const low = p.stock <= p.lowAt;
    return `
      <div class="item-card">
        <div>
          <div class="ic-name">${escHtml(p.name)}</div>
          <div class="ic-aliases">Aliases: ${escHtml(p.aliases.join(', '))}</div>
        </div>
        <div>
          <div class="ic-price">₹${p.price} / ${p.unit}</div>
          <div class="ic-stock ${low ? 'low' : ''}">${p.stock} ${p.unit}${low ? ' ⚠' : ''}</div>
        </div>
        <div class="ic-btns">
          <button class="ic-btn" onclick="openModal('adjust', ${p.id})">Adjust Stock</button>
          <button class="ic-btn" onclick="openModal('editprod', ${p.id})">Edit</button>
        </div>
      </div>`;
  }).join('');
}

/* ── Render: Compact stock list (right panel) ────────────────── */
function renderStockMiniList() {
  const el = $('stock-mini-list');
  if (!el) return;
  el.innerHTML = DB.products.map(p => {
    const low = p.stock <= p.lowAt;
    return `
      <div class="inv-row">
        <div>
          <div class="inv-name">${escHtml(p.name)}</div>
          <div class="inv-alias">${escHtml(p.aliases.slice(0, 2).join(', '))}</div>
        </div>
        <div style="text-align:right">
          <div class="inv-qty ${low ? 'low' : ''}">${p.stock} ${p.unit}</div>
          ${low ? '<span class="low-badge">Low Stock</span>' : ''}
        </div>
      </div>`;
  }).join('');
}

/* ── CRUD ────────────────────────────────────────────────────── */
function saveNewProduct() {
  const name  = val('m-pname');
  const alias = val('m-palias');
  const price = parseFloat(val('m-pprice'));
  const unit  = val('m-punit') || 'piece';
  const stock = parseFloat(val('m-pstock')) || 0;
  const lowAt = parseFloat(val('m-plow'))   || 5;

  if (!name || isNaN(price) || price < 0) {
    toast('Product name and a valid price are required'); return;
  }

  const aliases = alias
    ? alias.split(',').map(a => a.trim().toLowerCase()).filter(Boolean)
    : [];
  if (!aliases.includes(name.toLowerCase())) aliases.push(name.toLowerCase());

  DB.products.push({ id: DB.nextProductId++, name, aliases, price, unit, stock, lowAt });
  saveDB();
  closeModal();
  renderInventoryView();
  renderStockMiniList();
  toast(`${name} added to inventory`);
}

function updateProduct(pid) {
  const p = findProduct(pid);
  if (!p) return;

  p.name  = val('m-pname')  || p.name;
  p.price = parseFloat(val('m-pprice')) || p.price;
  p.unit  = val('m-punit')  || p.unit;
  p.stock = parseFloat(val('m-pstock'));
  p.lowAt = parseFloat(val('m-plow'));

  const alias = val('m-palias');
  if (alias) {
    p.aliases = alias.split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    if (!p.aliases.includes(p.name.toLowerCase())) p.aliases.push(p.name.toLowerCase());
  }

  saveDB();
  closeModal();
  renderInventoryView();
  renderStockMiniList();
  toast(`${p.name} updated`);
}

function deleteProduct(pid) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  DB.products = DB.products.filter(p => p.id !== pid);
  saveDB();
  closeModal();
  renderInventoryView();
  renderStockMiniList();
  toast('Product deleted');
}

function saveStockAdjust(pid) {
  const qty = parseFloat(val('m-adjqty'));
  if (isNaN(qty) || qty < 0) { toast('Enter a valid quantity'); return; }
  const p = findProduct(pid);
  if (p) {
    p.stock = qty;
    saveDB();
    closeModal();
    renderInventoryView();
    renderStockMiniList();
    toast(`${p.name} stock updated → ${qty} ${p.unit}`);
  }
}
