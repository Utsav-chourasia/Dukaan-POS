/* ============================================================
   app.js — Boot + all event bindings
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* 1. Load data */
  loadDB();
  $('store-name-display').textContent = DB.storeName;

  /* 2. Restore last active order */
  activeOrderId = DB.orders.length ? DB.orders[DB.orders.length-1].id : null;

  /* 3. Initial renders */
  setView('pos');
  renderOrderTabs();
  renderMobOrderTabs();
  renderCurrentOrder();
  renderCustPicker();
  renderStockMiniList();
  startClock();

  /* 4. Auto-create first order */
  if (!DB.orders.length) createOrder();

  /* ═══════════════ EVENT BINDINGS ═══════════════ */

  /* Top bar */
  $('btn-add-product').addEventListener('click', () => openModal('product'));
  $('btn-settings').addEventListener('click',     () => openModal('settings'));

  /* Sidebar new order */
  $('btn-new-order')?.addEventListener('click', createOrder);

  /* POS panel header */
  $('btn-new-order-hdr').addEventListener('click', createOrder);
  $('btn-void').addEventListener('click', voidOrder);
  $('btn-finalize').addEventListener('click', () => openModal('finalize'));
  $('btn-add-due').addEventListener('click',  () => finalizeOrder('due'));
  $('btn-mark-paid').addEventListener('click',() => finalizeOrder('paid'));

  /* Product search */
  $('prod-search').addEventListener('input',   e => searchProducts(e.target.value));
  $('prod-search').addEventListener('keydown', e => handleSearchKeydown(e));

  /* Voice */
  $('voice-btn').addEventListener('click', toggleVoice);
  $('vo-cancel').addEventListener('click', cancelVoice);
  $('vo-confirm').addEventListener('click', confirmVoice);

  /* Right panel tabs */
  $$('.vtab').forEach(btn => btn.addEventListener('click', () => rightTab(btn.dataset.rtab)));

  /* Customer filter */
  $('cust-filter').addEventListener('input', e => renderCustPicker(e.target.value));

  /* Record payment (right panel) */
  $('btn-record-payment').addEventListener('click', () => {
    const o = currentOrder();
    if (o?.customerId) openModal('paymentDirect', o.customerId);
    else toast('Assign a customer first');
  });

  /* Inventory view */
  $('btn-inv-add').addEventListener('click', () => openModal('product'));

  /* Customers view */
  $('btn-cust-add').addEventListener('click', () => openModal('customer'));

  /* History */
  $('btn-export-csv').addEventListener('click', exportHistoryCSV);

  /* Sidebar nav (desktop/tablet) */
  $$('#sidebar-nav .nav-btn').forEach(btn =>
    btn.addEventListener('click', () => setView(btn.dataset.view))
  );

  /* Mobile bottom nav */
  $$('#mobile-nav .mob-nav-btn[data-view]').forEach(btn =>
    btn.addEventListener('click', () => setView(btn.dataset.view))
  );

  /* Mobile orders button */
  $('mob-orders-btn').addEventListener('click', openMobSheet);
  $('mob-sheet-close').addEventListener('click', closeMobSheet);
  $('mob-sheet-bg').addEventListener('click', closeMobSheet);
  $('mob-new-order').addEventListener('click', () => { createOrder(); closeMobSheet(); });

  /* Modal close on backdrop */
  $('modal-bg').addEventListener('click', onModalBgClick);

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if ($('modal-bg').classList.contains('show')) closeModal();
      else if ($('mob-order-sheet').classList.contains('show')) closeMobSheet();
      else if (voiceActive) cancelVoice();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); createOrder(); }
  });

  /* Prevent double-tap zoom on buttons (iOS) */
  document.addEventListener('touchend', e => {
    if (e.target.tagName === 'BUTTON') e.preventDefault();
  }, { passive: false });

});
