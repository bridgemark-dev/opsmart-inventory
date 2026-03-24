/* ============================================================
   SEARCH — Global header search with live dropdown results
   ============================================================ */

let _searchTimer = null;
let _searchPanel = null;

function handleSearch(val) {
  clearTimeout(_searchTimer);
  const q = val.trim();

  if (!q) { closeSearchPanel(); return; }
  if (q.length < 2) return;

  _searchTimer = setTimeout(() => runSearch(q), 280);
}

async function runSearch(q) {
  ensurePanel();

  _searchPanel.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Searching…</div>';
  _searchPanel.style.display = '';

  try {
    const { supabase } = await import('./supabase.js');

    // Search products by name, brand, or SKU
    const [prodRes, supRes] = await Promise.all([
      supabase.from('products')
        .select('id, name, brand, product_number, categories(category_number, name)')
        .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
        .eq('is_active', true)
        .limit(6),
      supabase.from('suppliers')
        .select('id, name, contact_name')
        .ilike('name', `%${q}%`)
        .is('deleted_at', null)
        .limit(3),
    ]);

    // Also check SKU pattern e.g. "10/172"
    let skuResults = [];
    if (/^\d+\/\d*$/.test(q)) {
      const [catNum, prodNum] = q.split('/');
      const skuRes = await supabase.from('products')
        .select('id, name, brand, product_number, categories(category_number, name)')
        .eq('categories.category_number', parseInt(catNum))
        .eq('is_active', true)
        .limit(4);
      skuResults = skuRes.data ?? [];
    }

    const products  = [...(prodRes.data ?? []), ...skuResults].slice(0, 6);
    const suppliers = supRes.data ?? [];

    if (!products.length && !suppliers.length) {
      _searchPanel.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">No results for "' + q + '"</div>';
      return;
    }

    let html = '';

    if (products.length) {
      html += '<div class="search-group-label">Products</div>';
      html += products.map(p => {
        const sku = p.categories?.category_number ? `${p.categories.category_number}/${p.product_number}` : '';
        const sub = [p.brand, p.categories?.name].filter(Boolean).join(' · ');
        // Determine correct products path
        const isInPages = window.location.pathname.includes('/pages/');
        const href = isInPages ? 'products.html' : 'pages/products.html';
        return `<div class="search-result-item" onclick="window.location.href='${href}'">
          <div class="search-result-name">${highlight(p.name, q)}</div>
          <div class="search-result-sub">${sku ? '<span class="search-sku">' + sku + '</span>' : ''} ${sub}</div>
        </div>`;
      }).join('');
    }

    if (suppliers.length) {
      html += '<div class="search-group-label">Suppliers</div>';
      html += suppliers.map(s => {
        const isInPages = window.location.pathname.includes('/pages/');
        const href = isInPages ? 'suppliers.html' : 'pages/suppliers.html';
        return `<div class="search-result-item" onclick="window.location.href='${href}'">
          <div class="search-result-name">${highlight(s.name, q)}</div>
          ${s.contact_name ? '<div class="search-result-sub">' + s.contact_name + '</div>' : ''}
        </div>`;
      }).join('');
    }

    _searchPanel.innerHTML = html;

  } catch(e) {
    _searchPanel.innerHTML = '<div style="padding:12px 16px;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Search unavailable.</div>';
  }
}

function highlight(text, q) {
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(re, '<mark style="background:rgba(201,168,76,0.25);color:var(--gold);border-radius:2px;padding:0 2px;">$1</mark>');
}

function ensurePanel() {
  if (_searchPanel) return;
  _searchPanel = document.createElement('div');
  _searchPanel.id = 'global-search-panel';
  _searchPanel.style.cssText = [
    'position:fixed',
    'top:calc(var(--header-h) + 4px)',
    'left:var(--sidebar-w)',
    'width:380px',
    'background:var(--surface)',
    'border:1px solid var(--border-light)',
    'border-radius:var(--radius-lg)',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'z-index:900',
    'overflow:hidden',
    'max-height:420px',
    'overflow-y:auto',
  ].join(';');

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .search-group-label {
      padding: 8px 16px 4px;
      font-size: 0.6rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
      border-top: 1px solid var(--border);
    }
    .search-group-label:first-child { border-top: none; }
    .search-result-item {
      display: flex;
      flex-direction: column;
      padding: 9px 16px;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid var(--border);
    }
    .search-result-item:last-child { border-bottom: none; }
    .search-result-item:hover { background: var(--surface2); }
    .search-result-name { font-size: 0.82rem; font-weight: 500; }
    .search-result-sub  { font-size: 0.7rem; color: var(--text-muted); font-family: 'DM Mono', monospace; margin-top: 2px; }
    .search-sku { color: var(--gold); margin-right: 6px; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(_searchPanel);
}

function closeSearchPanel() {
  if (_searchPanel) _searchPanel.style.display = 'none';
}

// Close on click outside
document.addEventListener('click', e => {
  const input = document.getElementById('global-search');
  if (!input) return;
  if (!input.contains(e.target) && (!_searchPanel || !_searchPanel.contains(e.target))) {
    closeSearchPanel();
  }
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSearchPanel();
    const input = document.getElementById('global-search');
    if (input) input.value = '';
  }
});
