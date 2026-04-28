/* ============================================================
   app.js — Application entry point: boot sequence & event wiring
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Load persisted data ── */
  loadDB();
  $('store-name-display').textContent = DB.storeName;

  /* ── 2. Restore last active order (if any) ── */
  activeOrderId = DB.orders.length
    ? DB.orders[DB.orders.length - 1].id
    : null;

  /* ── 3. Initial renders ── */
  setView('pos');
  renderOrderTabs();
  renderCurrentOrder();
  renderCustPicker();
  renderStockMiniList();
  startClock();

  /* ── 4. Create a first order automatically if none exist ── */
  if (!DB.orders.length) createOrder();

  /* ══════════════════════════════════════════════════════════
     EVENT BINDINGS
     ══════════════════════════════════════════════════════════ */

  /* Top bar */
  $('btn-add-product').addEventListener('click', () => openModal('product'));
  $('btn-add-customer').addEventListener('click', () => openModal('customer'));
  $('btn-settings').addEventListener('click', () => openModal('settings'));

  /* Sidebar */
  $('btn-new-order').addEventListener('click', createOrder);

  document.querySelectorAll('#sidebar-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  /* POS panel */
  $('btn-assign-customer').addEventListener('click', () => rightTab('r-customer'));
  $('btn-void').addEventListener('click', voidOrder);
  $('btn-finalize').addEventListener('click', () => openModal('finalize'));
  $('btn-add-due').addEventListener('click', () => finalizeOrder('due'));
  $('btn-mark-paid').addEventListener('click', () => finalizeOrder('paid'));

  /* Product search */
  $('prod-search').addEventListener('input',   e => searchProducts(e.target.value));
  $('prod-search').addEventListener('keydown', e => handleSearchKeydown(e));

  /* Voice */
  $('voice-btn').addEventListener('click', toggleVoice);
  $('vo-cancel').addEventListener('click', cancelVoice);
  $('vo-confirm').addEventListener('click', confirmVoice);

  /* Right panel tabs */
  document.querySelectorAll('.vtab').forEach(btn => {
    btn.addEventListener('click', () => rightTab(btn.dataset.rtab));
  });

  /* Customer filter */
  $('cust-filter').addEventListener('input', e => renderCustPicker(e.target.value));

  /* Record payment button (right panel) */
  $('btn-record-payment').addEventListener('click', () => {
    const order = currentOrder();
    if (order?.customerId) openModal('paymentDirect', order.customerId);
    else toast('Assign a customer to this order first');
  });

  /* Inventory view buttons */
  $('btn-inv-add').addEventListener('click', () => openModal('product'));

  /* Customers view button */
  $('btn-cust-add').addEventListener('click', () => openModal('customer'));

  /* History export */
  $('btn-export-csv').addEventListener('click', exportHistoryCSV);

  /* Modal backdrop click to close */
  $('modal-bg').addEventListener('click', onModalBgClick);

  /* Keyboard shortcuts */
  document.addEventListener('keydown', e => {
    // Esc → close modal or cancel voice
    if (e.key === 'Escape') {
      if ($('modal-bg').classList.contains('show')) closeModal();
      else if (voiceActive) cancelVoice();
    }
    // Ctrl/Cmd + N → new order
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      createOrder();
    }
  });

});
