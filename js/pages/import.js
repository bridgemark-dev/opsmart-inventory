/* PAGE: import */
import { requireAuth, getCurrentProfile, supabase, applySidebarRole } from '../supabase.js';

let _profile = null;


const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Product Importer</div>
      <div class="page-subtitle">BULK IMPORT FROM CSV · OWNER / MANAGER ONLY</div>
    </div>
    <a href="../tools/pandoras-product-import-template.xlsx"
       style="display:flex;align-items:center;gap:8px;padding:10px 18px;background:var(--surface2);border:1px solid var(--border-light);border-radius:var(--radius);font-size:0.82rem;color:var(--text-dim);text-decoration:none;transition:var(--transition);"
       onmouseover="this.style.borderColor='var(--gold)';this.style.color='var(--gold)'"
       onmouseout="this.style.borderColor='';this.style.color=''">
      ⬇ Download CSV Template
    </a>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <!-- Step indicator -->
  <div class="steps">
    <div class="step active" id="step-1"><span class="step-num">1</span>UPLOAD</div>
    <div class="step"        id="step-2"><span class="step-num">2</span>VALIDATE</div>
    <div class="step"        id="step-3"><span class="step-num">3</span>IMPORT</div>
    <div class="step"        id="step-4"><span class="step-num">4</span>DONE</div>
  </div>

  <div class="import-grid">

    <!-- Left column -->
    <div>

      <!-- Drop zone -->
      <div class="drop-zone" id="drop-zone"
           ondragover="handleDragOver(event)"
           ondragleave="handleDragLeave(event)"
           ondrop="handleDrop(event)"
           onclick="document.getElementById('file-input').click()">
        <div class="drop-icon">📂</div>
        <div class="drop-title">Drop your CSV here</div>
        <div class="drop-sub">or click to browse — CSV format only</div>
        <div class="drop-btn">Choose File</div>
        <input type="file" id="file-input" accept=".csv" style="display:none" onchange="handleFileSelect(this.files[0])">
      </div>

      <!-- Validation summary -->
      <div class="val-card card" id="val-card">
        <div class="card-header">
          <div class="card-title">Validation Results</div>
          <div class="card-action" id="val-action"></div>
        </div>
        <div id="val-rows"></div>
      </div>

      <!-- Preview table -->
      <div class="preview-card card" id="preview-card">
        <div class="card-header">
          <div class="card-title">Preview</div>
          <div class="card-action" id="preview-count"></div>
        </div>
        <div class="preview-scroll">
          <table class="preview-table">
            <thead>
              <tr>
                <th>#</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Brand</th>
                <th>Retail</th>
                <th>Cost</th>
                <th>Supplier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="preview-tbody"></tbody>
          </table>
        </div>
      </div>

      <!-- Progress -->
      <div id="progress-section" style="display:none;" class="card" >
        <div class="card-header">
          <div class="card-title">Importing…</div>
          <div class="card-action" id="progress-label">0 / 0</div>
        </div>
        <div style="padding:16px 20px;">
          <div class="progress-wrap" style="display:block;">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
          <div class="progress-label" id="progress-text">Starting…</div>
        </div>
      </div>

      <!-- Results -->
      <div id="results-card" class="card" style="display:none;">
        <div class="card-header">
          <div class="card-title">Import Complete</div>
          <div class="card-action" id="results-summary"></div>
        </div>
        <div class="result-list" id="result-list"></div>
      </div>

    </div>

    <!-- Right panel -->
    <div>
      <div class="info-card">
        <div class="card-header">
          <div class="card-title">File Info</div>
        </div>
        <div class="info-body">
          <div class="info-row">
            <span class="info-label">File</span>
            <span class="info-value" id="info-filename">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total rows</span>
            <span class="info-value" id="info-total">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Valid</span>
            <span class="info-value ok" id="info-valid">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Errors</span>
            <span class="info-value err" id="info-errors">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Warnings</span>
            <span class="info-value warn" id="info-warnings">—</span>
          </div>
          <div class="info-row">
            <span class="info-label">Mode</span>
            <span class="info-value" id="info-mode">—</span>
          </div>
        </div>

        <!-- Import mode toggle -->
        <div style="padding:0 18px 16px;">
          <div style="font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted);font-family:'DM Mono',monospace;margin-bottom:8px;">Import Mode</div>
          <div style="display:flex;gap:6px;">
            <div id="mode-skip" onclick="setMode('skip')"
              style="flex:1;padding:7px;border-radius:6px;font-size:0.75rem;font-family:'DM Mono',monospace;text-align:center;cursor:pointer;background:var(--gold-dim);border:1px solid var(--gold);color:var(--gold);">
              Skip Dupes
            </div>
            <div id="mode-update" onclick="setMode('update')"
              style="flex:1;padding:7px;border-radius:6px;font-size:0.75rem;font-family:'DM Mono',monospace;text-align:center;cursor:pointer;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);">
              Update Dupes
            </div>
          </div>
          <div style="font-size:0.68rem;color:var(--text-muted);margin-top:6px;font-family:'DM Mono',monospace;" id="mode-desc">
            Existing products with the same SKU will be skipped.
          </div>
        </div>

        <div style="padding:0 18px 18px;">
          <button class="import-btn" id="import-btn" onclick="runImport()" disabled>
            Import Products
          </button>
          <button class="reset-btn" onclick="resetImporter()">
            ✕ Clear &amp; Start Over
          </button>
        </div>
      </div>

      <!-- Instructions -->
      <div class="card" style="overflow:hidden;">
        <div class="card-header"><div class="card-title">How to use</div></div>
        <div style="padding:16px 18px;font-size:0.78rem;color:var(--text-dim);line-height:1.7;">
          <div style="margin-bottom:8px;"><span style="color:var(--gold);font-family:'DM Mono',monospace;">1.</span> Download the CSV template above</div>
          <div style="margin-bottom:8px;"><span style="color:var(--gold);font-family:'DM Mono',monospace;">2.</span> Open in Excel — your data should match the columns exactly</div>
          <div style="margin-bottom:8px;"><span style="color:var(--gold);font-family:'DM Mono',monospace;">3.</span> In Excel: <strong>File → Save As → CSV (Comma delimited)</strong></div>
          <div style="margin-bottom:8px;"><span style="color:var(--gold);font-family:'DM Mono',monospace;">4.</span> Drop that CSV file onto this page</div>
          <div style="margin-bottom:8px;"><span style="color:var(--gold);font-family:'DM Mono',monospace;">5.</span> Review validation results — fix any red rows in Excel first</div>
          <div><span style="color:var(--gold);font-family:'DM Mono',monospace;">6.</span> Click Import — only valid rows are inserted</div>
          <div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:6px;border:1px solid var(--border);font-size:0.72rem;color:var(--text-muted);">
            ⚠ Category numbers must already exist in the database. Check the Category Reference tab in the template.
          </div>
        </div>
      </div>

    </div>
  </div>
<div class="notif-panel" id="notif-panel">
  <div class="notif-head">
    <span class="notif-head-title">Notifications</span>
    <span class="notif-head-clear" id="notif-clear-btn">Mark all read</span>
  </div>
  <div class="notif-list" id="notif-list">
    <div style="padding:16px;text-align:center;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">Loading…</div>
  </div>
</div>`;

// Inject page-specific styles
function _injectStyle() {
  let el = document.getElementById('page-style-import');
  if (!el) {
    el = document.createElement('style');
    el.id = 'page-style-import';
    document.head.appendChild(el);
  }
  el.textContent = `/* ── Importer-specific styles ── */
    .import-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      align-items: start;
    }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--border-light);
      border-radius: var(--radius-lg);
      padding: 56px 32px;
      text-align: center;
      cursor: pointer;
      transition: var(--transition);
      background: var(--surface);
      margin-bottom: 20px;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--gold);
      background: var(--gold-dim);
    }
    .drop-icon  { font-size: 36px; margin-bottom: 12px; opacity: 0.6; }
    .drop-title { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; margin-bottom: 6px; }
    .drop-sub   { font-size: 0.78rem; color: var(--text-muted); font-family: 'DM Mono', monospace; }
    .drop-btn   {
      display: inline-block;
      margin-top: 16px;
      padding: 9px 22px;
      background: var(--surface2);
      border: 1px solid var(--border-light);
      border-radius: var(--radius);
      font-size: 0.82rem;
      color: var(--text-dim);
      cursor: pointer;
      transition: var(--transition);
      font-family: 'Outfit', sans-serif;
    }
    .drop-btn:hover { border-color: var(--gold); color: var(--gold); }

    /* Preview table */
    .preview-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 20px;
      display: none;
    }
    .preview-scroll { overflow-x: auto; max-height: 360px; overflow-y: auto; }
    .preview-table  { width: 100%; border-collapse: collapse; min-width: 700px; }
    .preview-table th {
      background: var(--surface2);
      padding: 9px 14px;
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-family: 'DM Mono', monospace;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      position: sticky; top: 0;
    }
    .preview-table td {
      padding: 8px 14px;
      font-size: 0.8rem;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
      font-family: 'DM Mono', monospace;
    }
    .preview-table tr:hover td { background: var(--surface2); }
    .preview-table tr.row-error td { background: var(--crimson-dim); }
    .preview-table tr.row-warn  td { background: rgba(201,168,76,0.08); }

    .td-sku   { color: var(--gold); }
    .td-error { color: var(--crimson); font-size: 0.72rem; font-style: italic; }
    .td-ok    { color: var(--sage); }

    /* Validation summary */
    .val-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 20px;
      display: none;
    }
    .val-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 18px;
      border-bottom: 1px solid var(--border);
      font-size: 0.82rem;
    }
    .val-row:last-child { border-bottom: none; }
    .val-icon { font-size: 16px; flex-shrink: 0; }
    .val-text { flex: 1; }
    .val-count {
      font-family: 'DM Mono', monospace;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    /* Progress */
    .progress-wrap {
      background: var(--surface3);
      border-radius: 4px;
      height: 6px;
      margin: 10px 0 4px;
      overflow: hidden;
      display: none;
    }
    .progress-bar {
      height: 100%;
      background: var(--gold);
      border-radius: 4px;
      transition: width 0.2s ease;
      width: 0%;
    }
    .progress-label {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-family: 'DM Mono', monospace;
      text-align: center;
    }

    /* Right panel */
    .info-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 16px;
      position: sticky;
      top: calc(var(--header-h) + 20px);
    }
    .info-body { padding: 18px; }
    .info-row  {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 7px 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: var(--text-dim); }
    .info-value { font-family: 'DM Mono', monospace; font-weight: 500; }
    .info-value.ok   { color: var(--sage); }
    .info-value.warn { color: var(--gold); }
    .info-value.err  { color: var(--crimson); }

    .import-btn {
      width: 100%;
      padding: 13px;
      background: var(--gold);
      color: var(--bg);
      border: none;
      border-radius: var(--radius);
      font-family: 'Outfit', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      margin-top: 16px;
    }
    .import-btn:hover    { background: #d4b05a; box-shadow: 0 4px 20px var(--gold-glow); }
    .import-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

    .reset-btn {
      width: 100%;
      padding: 9px;
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-family: 'Outfit', sans-serif;
      font-size: 0.8rem;
      cursor: pointer;
      transition: var(--transition);
      margin-top: 8px;
    }
    .reset-btn:hover { border-color: var(--crimson); color: var(--crimson); }

    /* Step indicator */
    .steps {
      display: flex;
      gap: 0;
      margin-bottom: 24px;
    }
    .step {
      flex: 1;
      text-align: center;
      padding: 10px 4px;
      font-size: 0.7rem;
      font-family: 'DM Mono', monospace;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 2px solid var(--border);
      transition: var(--transition);
    }
    .step.active  { color: var(--gold); border-color: var(--gold); }
    .step.done    { color: var(--sage); border-color: var(--sage); }
    .step-num     { font-size: 1rem; display: block; margin-bottom: 2px; }

    /* Result list */
    .result-list { padding: 6px 0; max-height: 220px; overflow-y: auto; }
    .result-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 7px 18px;
      font-size: 0.78rem;
      border-bottom: 1px solid var(--border);
    }
    .result-item:last-child { border-bottom: none; }
    .result-item.err  { background: var(--crimson-dim); }
    .result-item.ok   { background: var(--sage-dim); }

    @media (max-width: 900px) {
      .import-grid { grid-template-columns: 1fr; }
      .info-card   { position: static; }
    }`;
}

export async function init(profile) {
  _profile = profile;
  document.getElementById('outlet').innerHTML = _HTML;
  _injectStyle();
  await _run(profile);
}

  /* ── State ── */
  let parsedRows   = [];   // all CSV rows
  let validRows    = [];   // rows that passed validation
  let categories   = {};   // { category_number: uuid }
  let suppliers    = {};   // { name_lower: uuid }
  let importMode   = 'skip'; // 'skip' | 'update'
  let importDone   = false;

  /* ── Init ── */
  async function _run(profile) {
    // Only owners and managers can import
    const isPrivileged = _profile.locations.some(l => ['owner','manager'].includes(l.role));
    if (!isPrivileged) {
      document.querySelector('.drop-zone').innerHTML = '<div style="color:var(--crimson);font-family:\'DM Mono\',monospace;">Access denied — managers and owners only.</div>';
      return;
    }

    // Set header user info
    const _roleArr = _profile.locations.map(l => l.role);
    const _role = _roleArr.includes('owner') ? 'owner' : _roleArr.includes('manager') ? 'manager' : _roleArr.includes('employee') ? 'employee' : 'employee';

    // Pre-load categories and suppliers for validation
    await loadLookups();
  }

  async function loadLookups() {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, category_number')
      .is('deleted_at', null);
    (cats ?? []).forEach(c => { categories[c.category_number] = c.id; });

    const { data: sups } = await supabase
      .from('suppliers')
      .select('id, name')
      .is('deleted_at', null);
    (sups ?? []).forEach(s => { suppliers[s.name.toLowerCase().trim()] = s.id; });
  }

  /* ── Drag & Drop ── */
  window.handleDragOver = (e) => {
    e.preventDefault();
    document.getElementById('drop-zone').classList.add('drag-over');
  };
  window.handleDragLeave = () => {
    document.getElementById('drop-zone').classList.remove('drag-over');
  };
  window.handleDrop = (e) => {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  window.handleFileSelect = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      showToast('Please select a CSV file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processCSV(e.target.result, file.name);
    reader.readAsText(file);
  };

  /* ── CSV Parsing ── */
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const rows  = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      // Handle quoted fields containing commas
      const cols = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      rows.push(cols);
    }
    return rows;
  }

  function processCSV(text, filename) {
    const rows  = parseCSV(text);
    if (rows.length < 2) { showToast('File appears empty or has no data rows.'); return; }

    // Find header row — skip instruction rows from the template
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      if (rows[i].includes('category_number')) { headerIdx = i; break; }
    }
    if (headerIdx === -1) { showToast('Could not find header row. Make sure column names match the template.'); return; }

    const headers   = rows[headerIdx].map(h => h.trim().toLowerCase().replace(/^"|"$/g,''));
    const dataRows  = rows.slice(headerIdx + 1).filter(r => r.some(c => c.trim()));

    const REQUIRED = ['category_number','product_number','name'];
    const missing  = REQUIRED.filter(r => !headers.includes(r));
    if (missing.length) {
      showToast('Missing required columns: ' + missing.join(', '));
      return;
    }

    // Map rows to objects
    parsedRows = dataRows.map((cols, idx) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cols[i] ?? '').trim().replace(/^"|"$/g,''); });
      obj._rowNum = idx + 2;
      return obj;
    });

    document.getElementById('info-filename').textContent = filename;
    setStep(2);
    validateRows();
  }

  /* ── Validation ── */
  function validateRows() {
    validRows = [];
    const errors   = [];
    const warnings = [];
    const seen     = new Set(); // detect duplicate SKUs within the file

    parsedRows.forEach(row => {
      const rowErrors = [];
      const rowWarns  = [];

      const catNum  = parseInt(row.category_number, 10);
      const prodNum = parseInt(row.product_number,  10);
      const name    = row.name?.trim();

      // Required field checks
      if (isNaN(catNum))  rowErrors.push('category_number must be a number');
      if (isNaN(prodNum)) rowErrors.push('product_number must be a number');
      if (!name)          rowErrors.push('name is required');

      // Category existence check
      if (!isNaN(catNum) && !categories[catNum]) {
        rowErrors.push(`Category ${catNum} not found in database — add it first`);
      }

      // Duplicate SKU within file
      const sku = `${catNum}/${prodNum}`;
      if (seen.has(sku)) rowErrors.push(`Duplicate SKU ${sku} in this file`);
      else seen.add(sku);

      // Numeric price checks
      if (row.retail_price && isNaN(parseFloat(row.retail_price))) rowErrors.push('retail_price must be a number');
      if (row.cost_price   && isNaN(parseFloat(row.cost_price)))   rowErrors.push('cost_price must be a number');

      // Supplier warning (not an error — just note if unrecognised)
      if (row.supplier && row.supplier.trim() && !suppliers[row.supplier.toLowerCase().trim()]) {
        rowWarns.push(`Supplier "${row.supplier}" not found — will be imported without supplier link`);
      }

      // Attributes JSON check
      if (row.attributes && row.attributes.trim()) {
        try { JSON.parse(row.attributes); }
        catch { rowErrors.push('attributes must be valid JSON or left blank'); }
      }

      row._errors   = rowErrors;
      row._warnings = rowWarns;
      row._valid    = rowErrors.length === 0;
      row._sku      = `${catNum}/${prodNum}`;

      if (rowErrors.length)   errors.push(row);
      if (rowWarns.length)    warnings.push(row);
      if (row._valid)         validRows.push(row);
    });

    renderValidation(errors, warnings);
    renderPreview();
    updateInfoPanel(errors, warnings);
    document.getElementById('import-btn').disabled = validRows.length === 0;
  }

  function renderValidation(errors, warnings) {
    const card   = document.getElementById('val-card');
    const rows   = document.getElementById('val-rows');
    card.style.display = '';

    const items = [
      { icon: '✓', color: 'var(--sage)',    text: `${validRows.length} rows ready to import`, show: validRows.length > 0 },
      { icon: '✕', color: 'var(--crimson)', text: `${errors.length} rows have errors and will be skipped`, show: errors.length > 0 },
      { icon: '⚠', color: 'var(--gold)',    text: `${warnings.length} rows have warnings (will still import)`, show: warnings.length > 0 },
    ];

    rows.innerHTML = items.filter(i => i.show).map(i => `
      <div class="val-row">
        <span class="val-icon" style="color:${i.color};">${i.icon}</span>
        <span class="val-text">${i.text}</span>
      </div>
    `).join('') || '<div class="val-row"><span class="val-text" style="color:var(--text-muted);">No data to validate.</span></div>';

    document.getElementById('val-action').textContent = parsedRows.length + ' rows total';
  }

  function renderPreview() {
    const card  = document.getElementById('preview-card');
    const tbody = document.getElementById('preview-tbody');
    card.style.display = '';
    document.getElementById('preview-count').textContent = `Showing ${Math.min(parsedRows.length, 200)} of ${parsedRows.length}`;

    const shown = parsedRows.slice(0, 200);
    tbody.innerHTML = shown.map(row => {
      const cls   = row._errors.length ? 'row-error' : (row._warnings.length ? 'row-warn' : '');
      const status = row._errors.length
        ? `<span class="td-error">✕ ${row._errors[0]}</span>`
        : (row._warnings.length ? `<span style="color:var(--gold);font-size:0.72rem;">⚠ ${row._warnings[0]}</span>` : '<span class="td-ok">✓ Valid</span>');
      return `
        <tr class="${cls}">
          <td style="color:var(--text-muted);">${row._rowNum}</td>
          <td class="td-sku">${row._sku}</td>
          <td>${row.name || '—'}</td>
          <td style="color:var(--text-muted);">${row.brand || '—'}</td>
          <td>${row.retail_price ? '$'+parseFloat(row.retail_price).toFixed(2) : '—'}</td>
          <td>${row.cost_price   ? '$'+parseFloat(row.cost_price).toFixed(2)   : '—'}</td>
          <td style="color:var(--text-muted);font-size:0.75rem;">${row.supplier || '—'}</td>
          <td>${status}</td>
        </tr>
      `;
    }).join('');
  }

  function updateInfoPanel(errors, warnings) {
    document.getElementById('info-total').textContent    = parsedRows.length;
    document.getElementById('info-valid').textContent    = validRows.length;
    document.getElementById('info-errors').textContent   = errors.length;
    document.getElementById('info-warnings').textContent = warnings.length;
    document.getElementById('info-mode').textContent     = importMode === 'skip' ? 'Skip duplicates' : 'Update duplicates';
  }

  /* ── Import Mode ── */
  window.setMode = function(mode) {
    importMode = mode;
    const skip   = document.getElementById('mode-skip');
    const update = document.getElementById('mode-update');
    const desc   = document.getElementById('mode-desc');
    const gold = 'background:var(--gold-dim);border:1px solid var(--gold);color:var(--gold);';
    const grey = 'background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);';
    skip.style.cssText   = mode === 'skip'   ? gold : grey;
    update.style.cssText = mode === 'update' ? gold : grey;
    desc.textContent = mode === 'skip'
      ? 'Existing products with the same SKU will be skipped.'
      : 'Existing products with the same SKU will have their details updated.';
    document.getElementById('info-mode').textContent = mode === 'skip' ? 'Skip duplicates' : 'Update duplicates';
  };

  /* ── Import ── */
  window.runImport = async function() {
    if (validRows.length === 0 || importDone) return;
    setStep(3);

    const btn      = document.getElementById('import-btn');
    const progSec  = document.getElementById('progress-section');
    const progBar  = document.getElementById('progress-bar');
    const progText = document.getElementById('progress-text');
    const progLbl  = document.getElementById('progress-label');

    btn.disabled          = true;
    progSec.style.display = '';

    const BATCH   = 25;
    const results = { ok: 0, skipped: 0, updated: 0, failed: 0, errors: [] };
    const total   = validRows.length;

    for (let i = 0; i < total; i += BATCH) {
      const batch = validRows.slice(i, i + BATCH);

      // Build upsert rows
      const upsertRows = batch.map(row => {
        const catNum  = parseInt(row.category_number, 10);
        const prodNum = parseInt(row.product_number,  10);
        const catId   = categories[catNum];
        const supId   = row.supplier ? (suppliers[row.supplier.toLowerCase().trim()] ?? null) : null;
        let attrs = {};
        try { if (row.attributes?.trim()) attrs = JSON.parse(row.attributes); } catch { /* invalid JSON — leave attrs as empty object */ }
        return {
          category_id:    catId,
          product_number: prodNum,
          name:           row.name,
          brand:          row.brand   || null,
          retail_price:   row.retail_price ? parseFloat(row.retail_price) : null,
          cost_price:     row.cost_price   ? parseFloat(row.cost_price)   : null,
          supplier_id:    supId,
          attributes:     attrs,
          is_active:      true,
        };
      });

      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(upsertRows, {
            onConflict: 'category_id,product_number',
            ignoreDuplicates: importMode === 'skip',
          })
          .select('id');

        if (error) {
          batch.forEach(row => {
            results.failed++;
            results.errors.push({ sku: row._sku, name: row.name, msg: error.message });
          });
        } else {
          if (importMode === 'skip') {
            results.ok += (data?.length ?? 0);
            results.skipped += batch.length - (data?.length ?? 0);
          } else {
            results.updated += (data?.length ?? 0);
            results.ok      += (data?.length ?? 0);
          }
        }
      } catch (err) {
        batch.forEach(row => {
          results.failed++;
          results.errors.push({ sku: row._sku, name: row.name, msg: err.message });
        });
      }

      // Update progress
      const done    = Math.min(i + BATCH, total);
      const pct     = Math.round((done / total) * 100);
      progBar.style.width  = pct + '%';
      progText.textContent = `Importing ${done} of ${total} products…`;
      progLbl.textContent  = `${done} / ${total}`;

      // Yield to browser to update UI
      await new Promise(r => setTimeout(r, 10));
    }

    importDone = true;
    setStep(4);
    showResults(results, total);
  };

  function showResults(results, total) {
    const card    = document.getElementById('results-card');
    const summary = document.getElementById('results-summary');
    const list    = document.getElementById('result-list');

    card.style.display = '';
    summary.textContent = `${results.ok} imported · ${results.skipped} skipped · ${results.failed} failed`;

    const items = [
      results.ok      > 0 ? { cls:'ok',  text:`✓ ${results.ok} products imported successfully` }   : null,
      results.skipped > 0 ? { cls:'',    text:`→ ${results.skipped} skipped (already exist)` }     : null,
      results.updated > 0 ? { cls:'ok',  text:`↑ ${results.updated} products updated` }            : null,
      results.failed  > 0 ? { cls:'err', text:`✕ ${results.failed} failed — see errors below` }    : null,
      ...results.errors.slice(0, 20).map(e => ({ cls:'err', text:`✕ ${e.sku} ${e.name}: ${e.msg}` })),
    ].filter(Boolean);

    list.innerHTML = items.map(i => `
      <div class="result-item ${i.cls}">
        <span style="font-size:0.78rem;color:${i.cls==='err'?'var(--crimson)':i.cls==='ok'?'var(--sage)':'var(--text-dim)'};">${i.text}</span>
      </div>
    `).join('');

    if (results.failed === 0) {
      showToast(`Import complete — ${results.ok} products added!`, 4000);
    } else {
      showToast(`Import done with ${results.failed} errors. Check results below.`, 4000);
    }
  }

  /* ── Steps ── */
  function setStep(n) {
    [1,2,3,4].forEach(i => {
      const el = document.getElementById(`step-${i}`);
      el.className = 'step' + (i < n ? ' done' : i === n ? ' active' : '');
    });
  }

  /* ── Reset ── */
  window.resetImporter = function() {
    parsedRows = []; validRows = []; importDone = false;
    document.getElementById('preview-card').style.display   = 'none';
    document.getElementById('val-card').style.display       = 'none';
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('results-card').style.display   = 'none';
    document.getElementById('import-btn').disabled = true;
    document.getElementById('file-input').value = '';
    ['info-filename','info-total','info-valid','info-errors','info-warnings'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    setStep(1);
  };

