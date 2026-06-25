/* ── i18n loaded via prior script tag ── */
const { t, setLang, getLang } = window.i18n;

/* ─────────────────────────────────────
   STATE
───────────────────────────────────── */
let cart = []; // [{ product_id, name, price, quantity }]
let allProducts = [];
let currentPage = 'catalog';

/* ─────────────────────────────────────
   UTILS
───────────────────────────────────── */
function fmt(n) { return Number(n).toFixed(2) + ' €'; }

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function $(id) { return document.getElementById(id); }

/* ─────────────────────────────────────
   NAVIGATION
───────────────────────────────────── */
document.querySelectorAll('nav button[data-page]').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.page));
});

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button[data-page]').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`nav button[data-page="${page}"]`).classList.add('active');
  if (page === 'catalog') loadCatalog();
  if (page === 'pos') loadPosProducts();
  if (page === 'history') loadHistory();
}

/* ─────────────────────────────────────
   CATALOG PAGE
───────────────────────────────────── */
async function loadCatalog(query = '') {
  const rows = query
    ? await window.productsAPI.search(query)
    : await window.productsAPI.list();
  allProducts = rows;
  renderCatalogTable(rows);
}

function renderCatalogTable(rows) {
  const tbody = $('catalog-body');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('no_products')}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(p => `
    <tr>
      <td>${p.barcode || '—'}</td>
      <td>${esc(p.name)}</td>
      <td>${fmt(p.price)}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" onclick="startEdit(${p.id})">${t('edit')}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">${t('delete')}</button>
      </td>
    </tr>
  `).join('');
}

$('catalog-search').addEventListener('input', e => loadCatalog(e.target.value));

$('btn-show-add-form').addEventListener('click', () => {
  clearForm();
  $('product-form-panel').style.display = '';
  $('f-name').focus();
});

$('btn-cancel-form').addEventListener('click', () => {
  $('product-form-panel').style.display = 'none';
  clearForm();
});

function clearForm() {
  $('f-barcode').value = '';
  $('f-name').value = '';
  $('f-price').value = '';
  $('f-edit-id').value = '';
  $('lookup-status').textContent = '';
}

$('product-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('f-edit-id').value;
  const data = {
    barcode: $('f-barcode').value.trim() || null,
    name: $('f-name').value.trim(),
    price: parseFloat($('f-price').value),
  };
  try {
    if (id) {
      await window.productsAPI.update(Number(id), data);
    } else {
      await window.productsAPI.add(data);
      toast(t('product_added'));
    }
    $('product-form-panel').style.display = 'none';
    clearForm();
    loadCatalog($('catalog-search').value);
  } catch (err) {
    alert(err.message);
  }
});

window.startEdit = async (id) => {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  $('f-edit-id').value = p.id;
  $('f-barcode').value = p.barcode || '';
  $('f-name').value = p.name;
  $('f-price').value = p.price;
  $('product-form-panel').style.display = '';
  $('f-name').focus();
};

window.deleteProduct = async (id) => {
  if (!confirm(t('confirm_delete'))) return;
  await window.productsAPI.remove(id);
  loadCatalog($('catalog-search').value);
};

$('btn-lookup').addEventListener('click', async () => {
  const barcode = $('f-barcode').value.trim();
  if (!barcode) return;
  $('lookup-status').textContent = '…';
  const result = await window.productsAPI.lookupBarcode(barcode);
  if (result) {
    $('f-name').value = result.name || $('f-name').value;
    $('lookup-status').textContent = '✓ ' + (result.brand || '');
  } else {
    $('lookup-status').textContent = t('not_found_off');
  }
});

/* ─────────────────────────────────────
   POS PAGE
───────────────────────────────────── */
async function loadPosProducts(query = '') {
  const rows = query
    ? await window.productsAPI.search(query)
    : await window.productsAPI.list();
  renderPosProducts(rows);
}

function renderPosProducts(rows) {
  const tbody = $('pos-product-body');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('no_products')}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(p => `
    <tr>
      <td>${esc(p.name)}</td>
      <td>${fmt(p.price)}</td>
      <td><input type="number" min="1" value="1" style="width:60px" class="qty-input" data-id="${p.id}" /></td>
      <td>
        <button class="btn btn-primary btn-sm pos-add-btn"
          data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.price}">
          ${t('add_to_cart')}
        </button>
      </td>
    </tr>
  `).join('');
}

$('pos-search').addEventListener('input', e => loadPosProducts(e.target.value));

// Event delegation — avoids inline onclick with string literals (injection risk)
$('pos-product-body').addEventListener('click', e => {
  const btn = e.target.closest('.pos-add-btn');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const name = btn.dataset.name;
  const price = Number(btn.dataset.price);
  const qtyInput = document.querySelector(`.qty-input[data-id="${id}"]`);
  const qty = Math.max(1, parseInt(qtyInput?.value || 1));
  const existing = cart.find(i => i.product_id === id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({ product_id: id, name, price, quantity: qty });
  }
  if (qtyInput) qtyInput.value = 1;
  renderCart();
});

function renderCart() {
  const tbody = $('cart-items');
  if (!cart.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('cart_empty')}</td></tr>`;
    $('cart-total-value').textContent = '0.00 €';
    return;
  }
  tbody.innerHTML = cart.map((item, idx) => `
    <tr>
      <td>${esc(item.name)}</td>
      <td>
        <input type="number" min="1" value="${item.quantity}" style="width:54px"
          class="cart-qty-input" data-idx="${idx}" />
      </td>
      <td>${fmt(item.price * item.quantity)}</td>
      <td><button class="btn btn-danger btn-sm cart-remove-btn" data-idx="${idx}">✕</button></td>
    </tr>
  `).join('');
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  $('cart-total-value').textContent = fmt(total);
}

$('cart-items').addEventListener('change', e => {
  const input = e.target.closest('.cart-qty-input');
  if (!input) return;
  cart[Number(input.dataset.idx)].quantity = Math.max(1, parseInt(input.value));
  renderCart();
});

$('cart-items').addEventListener('click', e => {
  const btn = e.target.closest('.cart-remove-btn');
  if (!btn) return;
  cart.splice(Number(btn.dataset.idx), 1);
  renderCart();
});

$('btn-clear-cart').addEventListener('click', () => { cart = []; renderCart(); });

$('btn-validate-sale').addEventListener('click', async () => {
  if (!cart.length) return;
  try {
    const sale = await window.salesAPI.create(cart);
    toast(t('sale_done') + ' — ' + fmt(sale.total));
    cart = [];
    renderCart();
  } catch (err) {
    alert(err.message);
  }
});

/* ─────────────────────────────────────
   HISTORY PAGE
───────────────────────────────────── */
const todayISO = new Date().toISOString().slice(0, 10);
$('history-date').value = todayISO;

async function loadHistory() {
  const date = $('history-date').value || todayISO;
  const rows = await window.salesAPI.listByDate(date);
  const tbody = $('history-body');
  $('sale-detail-panel').classList.remove('open');
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">${t('no_sales')}</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(s => `
    <tr>
      <td>#${s.id}</td>
      <td>${s.created_at.slice(0, 16).replace('T', ' ')}</td>
      <td>${fmt(s.total)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="showDetail(${s.id})">${t('detail')}</button></td>
    </tr>
  `).join('');
}

$('history-date').addEventListener('change', loadHistory);

window.showDetail = async (id) => {
  const sale = await window.salesAPI.getDetail(id);
  if (!sale) return;
  $('detail-title').textContent = `#${sale.id} — ${fmt(sale.total)}`;
  $('detail-body').innerHTML = sale.items.map(i => `
    <tr>
      <td>${esc(i.name)}</td>
      <td>${i.quantity}</td>
      <td>${fmt(i.price)}</td>
    </tr>
  `).join('');
  $('sale-detail-panel').classList.add('open');
};

$('btn-export-csv').addEventListener('click', async () => {
  const date = $('history-date').value || todayISO;
  const result = await window.salesAPI.exportCSV(date);
  if (!result.canceled) toast('CSV exporté : ' + result.filePath);
});

$('btn-export-pdf').addEventListener('click', async () => {
  const date = $('history-date').value || todayISO;
  const result = await window.salesAPI.exportPDF(date);
  if (!result.canceled) toast('PDF exporté : ' + result.filePath);
});

/* ─────────────────────────────────────
   SETTINGS PAGE
───────────────────────────────────── */
async function initSettings() {
  const lang = await window.settingsAPI.get('lang');
  const theme = await window.settingsAPI.get('theme');
  $('sel-lang').value = lang;
  $('sel-theme').value = theme;
  applyTheme(theme);
  setLang(lang);
}

$('sel-lang').addEventListener('change', async e => {
  await window.settingsAPI.set('lang', e.target.value);
  setLang(e.target.value);
  // Re-render current page
  navigateTo(currentPage);
});

$('sel-theme').addEventListener('change', async e => {
  await window.settingsAPI.set('theme', e.target.value);
  applyTheme(e.target.value);
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

/* ─────────────────────────────────────
   ESCAPE HELPER (XSS prevention)
───────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────
   BOOT
───────────────────────────────────── */
(async () => {
  await initSettings();
  loadCatalog();
})();
