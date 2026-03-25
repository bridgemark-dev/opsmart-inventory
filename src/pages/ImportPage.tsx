import { useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { productsService } from '@/services/productsService';
import { ImportPreviewTable, type ParsedRow } from '@/components/import/ImportPreviewTable';
import { Spinner } from '@/components/ui/Spinner';

type ImportMode = 'skip' | 'update';
type Step = 1 | 2 | 3 | 4;

interface ImportResults {
  ok: number;
  skipped: number;
  updated: number;
  failed: number;
  errors: { sku: string; name: string; msg: string }[];
}

interface Lookups {
  categories: Record<number, string>; // category_number → id
  suppliers: Record<string, string>;  // lowercase name → id
}

const REQUIRED_COLS = ['category_number', 'product_number', 'name'] as const;
const BATCH_SIZE = 25;

export default function ImportPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<ImportMode>('skip');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResults | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Role guard
  const isPrivileged = useMemo(
    () => profile?.locations.some((l) => ['owner', 'manager'].includes(l.role)) ?? false,
    [profile],
  );

  const validRows = useMemo(() => parsedRows.filter((r) => r._valid), [parsedRows]);
  const errorRows = useMemo(() => parsedRows.filter((r) => r._errors.length > 0), [parsedRows]);
  const warnRows = useMemo(() => parsedRows.filter((r) => r._warnings.length > 0), [parsedRows]);

  /* ── Load lookups ── */
  const ensureLookups = useCallback(async (): Promise<Lookups> => {
    if (lookups) return lookups;

    const [{ data: cats }, { data: sups }] = await Promise.all([
      supabase.from('categories').select('id, category_number').is('deleted_at', null),
      supabase.from('suppliers').select('id, name').is('deleted_at', null),
    ]);

    const lk: Lookups = { categories: {}, suppliers: {} };
    (cats ?? []).forEach((c: any) => { lk.categories[c.category_number] = c.id; });
    (sups ?? []).forEach((s: any) => { lk.suppliers[s.name.toLowerCase().trim()] = s.id; });
    setLookups(lk);
    return lk;
  }, [lookups]);

  /* ── File handling ── */
  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
        alert('Please select an XLSX or CSV file.');
        return;
      }

      const lk = await ensureLookups();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
      });

      if (!rawRows.length) {
        alert('File appears empty or has no data rows.');
        return;
      }

      // Normalise header keys
      const first = rawRows[0];
      const keys = Object.keys(first).map((k) => k.trim().toLowerCase());
      const missing = REQUIRED_COLS.filter((r) => !keys.includes(r));
      if (missing.length) {
        alert('Missing required columns: ' + missing.join(', '));
        return;
      }

      // Map to ParsedRow with validation
      const seen = new Set<string>();
      const parsed: ParsedRow[] = rawRows.map((raw, idx) => {
        // Normalise keys
        const obj: Record<string, string> = {};
        Object.entries(raw).forEach(([k, v]) => {
          obj[k.trim().toLowerCase()] = String(v).trim();
        });

        const rowErrors: string[] = [];
        const rowWarns: string[] = [];

        const catNum = parseInt(obj.category_number, 10);
        const prodNum = parseInt(obj.product_number, 10);
        const name = obj.name?.trim();

        if (isNaN(catNum)) rowErrors.push('category_number must be a number');
        if (isNaN(prodNum)) rowErrors.push('product_number must be a number');
        if (!name) rowErrors.push('name is required');
        if (!isNaN(catNum) && !lk.categories[catNum])
          rowErrors.push(`Category ${catNum} not found — add it first`);

        const sku = `${catNum}/${prodNum}`;
        if (seen.has(sku)) rowErrors.push(`Duplicate SKU ${sku} in this file`);
        else seen.add(sku);

        if (obj.retail_price && isNaN(parseFloat(obj.retail_price)))
          rowErrors.push('retail_price must be a number');
        if (obj.cost_price && isNaN(parseFloat(obj.cost_price)))
          rowErrors.push('cost_price must be a number');

        if (obj.supplier?.trim() && !lk.suppliers[obj.supplier.toLowerCase().trim()])
          rowWarns.push(`Supplier "${obj.supplier}" not found — imported without supplier link`);

        if (obj.attributes?.trim()) {
          try { JSON.parse(obj.attributes); }
          catch { rowErrors.push('attributes must be valid JSON or left blank'); }
        }

        return {
          ...obj,
          _rowNum: idx + 2,
          _sku: sku,
          _valid: rowErrors.length === 0,
          _errors: rowErrors,
          _warnings: rowWarns,
          category_number: obj.category_number,
          product_number: obj.product_number,
          name: name ?? '',
        } as ParsedRow;
      });

      setFileName(file.name);
      setParsedRows(parsed);
      setStep(2);
    },
    [ensureLookups],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  /* ── Import ── */
  const runImport = useCallback(async () => {
    if (!validRows.length || importing || !lookups) return;
    setImporting(true);
    setStep(3);

    const res: ImportResults = { ok: 0, skipped: 0, updated: 0, failed: 0, errors: [] };
    const total = validRows.length;
    setProgress({ done: 0, total });

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const upsertRows = batch.map((row) => {
        const catNum = parseInt(row.category_number, 10);
        const supId = row.supplier
          ? lookups.suppliers[row.supplier.toLowerCase().trim()] ?? null
          : null;
        let attrs: Record<string, unknown> = {};
        try { if (row.attributes && String(row.attributes).trim()) attrs = JSON.parse(String(row.attributes)); }
        catch { /* skip */ }

        return {
          category_id: lookups.categories[catNum],
          product_number: parseInt(row.product_number, 10),
          name: row.name,
          brand: row.brand || null,
          retail_price: row.retail_price ? parseFloat(row.retail_price) : null,
          cost_price: row.cost_price ? parseFloat(row.cost_price) : null,
          supplier_id: supId,
          attributes: attrs,
          is_active: true,
        };
      });

      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(upsertRows, {
            onConflict: 'category_id,product_number',
            ignoreDuplicates: mode === 'skip',
          })
          .select('id');

        if (error) {
          batch.forEach((row) => {
            res.failed++;
            res.errors.push({ sku: row._sku, name: row.name, msg: error.message });
          });
        } else if (mode === 'skip') {
          res.ok += data?.length ?? 0;
          res.skipped += batch.length - (data?.length ?? 0);
        } else {
          res.updated += data?.length ?? 0;
          res.ok += data?.length ?? 0;
        }
      } catch (err: any) {
        batch.forEach((row) => {
          res.failed++;
          res.errors.push({ sku: row._sku, name: row.name, msg: err.message ?? 'Unknown' });
        });
      }

      setProgress({ done: Math.min(i + BATCH_SIZE, total), total });
      await new Promise((r) => setTimeout(r, 10)); // yield to browser
    }

    setResults(res);
    setImporting(false);
    setStep(4);
    qc.invalidateQueries({ queryKey: ['products'] });
  }, [validRows, importing, lookups, mode, qc]);

  /* ── Error report download ── */
  const downloadErrorReport = useCallback(() => {
    const errRows = parsedRows.filter((r) => r._errors.length > 0);
    if (!errRows.length) return;
    const lines = ['Row,SKU,Name,Errors'];
    errRows.forEach((r) => {
      lines.push(`${r._rowNum},"${r._sku}","${r.name}","${r._errors.join('; ')}"`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedRows]);

  /* ── Reset ── */
  const reset = useCallback(() => {
    setParsedRows([]);
    setFileName('');
    setStep(1);
    setResults(null);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  /* ── Render helpers ── */
  const stepLabel = (n: number, label: string) => {
    const cls = n < step ? 'step done' : n === step ? 'step active' : 'step';
    return (
      <div key={n} className={cls}>
        <span className="step-num">{n}</span>
        {label}
      </div>
    );
  };

  if (!isPrivileged) {
    return (
      <div id="outlet-react">
        <div className="page-header">
          <div>
            <div className="page-title">Product Importer</div>
            <div className="page-subtitle">BULK IMPORT FROM XLSX {'\u00B7'} OWNER / MANAGER ONLY</div>
          </div>
        </div>
        <div className="accent-line" />
        <div style={{ marginTop: 40, textAlign: 'center', color: 'var(--crimson)', fontFamily: "'DM Mono', monospace" }}>
          Access denied {'\u2014'} managers and owners only.
        </div>
      </div>
    );
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div id="outlet-react">
      <div className="page-header">
        <div>
          <div className="page-title">Product Importer</div>
          <div className="page-subtitle">BULK IMPORT FROM XLSX {'\u00B7'} OWNER / MANAGER ONLY</div>
        </div>
        <a
          href="../tools/pandoras-product-import-template.xlsx"
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          {'\u2B07'} Download Template
        </a>
      </div>

      <div className="accent-line" />
      <div style={{ height: 20 }} />

      {/* Step indicator */}
      <div className="steps">
        {stepLabel(1, 'UPLOAD')}
        {stepLabel(2, 'VALIDATE')}
        {stepLabel(3, 'IMPORT')}
        {stepLabel(4, 'DONE')}
      </div>

      <div className="import-grid">
        {/* Left column */}
        <div>
          {/* Drop zone */}
          {step <= 2 && (
            <div
              className={`drop-zone${dragOver ? ' drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="drop-icon">{'\uD83D\uDCC2'}</div>
              <div className="drop-title">Drop your file here</div>
              <div className="drop-sub">XLSX, XLS, or CSV format</div>
              <div className="drop-btn">Choose File</div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          )}

          {/* Validation summary */}
          {step >= 2 && parsedRows.length > 0 && (
            <div className="val-card card" style={{ display: 'block' }}>
              <div className="card-header">
                <div className="card-title">Validation Results</div>
                <div className="card-action">{parsedRows.length} rows total</div>
              </div>
              {validRows.length > 0 && (
                <div className="val-row">
                  <span className="val-icon" style={{ color: 'var(--sage)' }}>{'\u2713'}</span>
                  <span className="val-text">{validRows.length} rows ready to import</span>
                </div>
              )}
              {errorRows.length > 0 && (
                <div className="val-row">
                  <span className="val-icon" style={{ color: 'var(--crimson)' }}>{'\u2715'}</span>
                  <span className="val-text">{errorRows.length} rows have errors and will be skipped</span>
                </div>
              )}
              {warnRows.length > 0 && (
                <div className="val-row">
                  <span className="val-icon" style={{ color: 'var(--gold)' }}>{'\u26A0'}</span>
                  <span className="val-text">{warnRows.length} rows have warnings (will still import)</span>
                </div>
              )}
            </div>
          )}

          {/* Preview table */}
          {step >= 2 && <ImportPreviewTable rows={parsedRows} />}

          {/* Progress bar */}
          {step === 3 && importing && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Importing{'\u2026'}</div>
                <div className="card-action">{progress.done} / {progress.total}</div>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div className="progress-wrap" style={{ display: 'block' }}>
                  <div className="progress-bar" style={{ width: `${pct}%` }} />
                </div>
                <div className="progress-label">
                  Importing {progress.done} of {progress.total} products{'\u2026'}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {step === 4 && results && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Import Complete</div>
                <div className="card-action">
                  {results.ok} imported {'\u00B7'} {results.skipped} skipped {'\u00B7'} {results.failed} failed
                </div>
              </div>
              <div className="result-list">
                {results.ok > 0 && (
                  <div className="result-item ok">
                    <span style={{ color: 'var(--sage)' }}>{'\u2713'} {results.ok} products imported successfully</span>
                  </div>
                )}
                {results.skipped > 0 && (
                  <div className="result-item">
                    <span style={{ color: 'var(--text-dim)' }}>{'\u2192'} {results.skipped} skipped (already exist)</span>
                  </div>
                )}
                {results.updated > 0 && (
                  <div className="result-item ok">
                    <span style={{ color: 'var(--sage)' }}>{'\u2191'} {results.updated} products updated</span>
                  </div>
                )}
                {results.failed > 0 && (
                  <div className="result-item err">
                    <span style={{ color: 'var(--crimson)' }}>{'\u2715'} {results.failed} failed {'\u2014'} see errors below</span>
                  </div>
                )}
                {results.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="result-item err">
                    <span style={{ color: 'var(--crimson)' }}>{'\u2715'} {e.sku} {e.name}: {e.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div>
          <div className="info-card">
            <div className="card-header">
              <div className="card-title">File Info</div>
            </div>
            <div className="info-body">
              <div className="info-row">
                <span className="info-label">File</span>
                <span className="info-value">{fileName || '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total rows</span>
                <span className="info-value">{parsedRows.length || '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Valid</span>
                <span className="info-value ok">{parsedRows.length ? validRows.length : '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Errors</span>
                <span className="info-value err">{parsedRows.length ? errorRows.length : '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Warnings</span>
                <span className="info-value warn">{parsedRows.length ? warnRows.length : '\u2014'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Mode</span>
                <span className="info-value">
                  {mode === 'skip' ? 'Skip duplicates' : 'Update duplicates'}
                </span>
              </div>
            </div>

            {/* Import mode toggle */}
            <div style={{ padding: '0 18px 16px' }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  fontFamily: "'DM Mono', monospace",
                  marginBottom: 8,
                }}
              >
                Import Mode
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['skip', 'update'] as const).map((m) => (
                  <div
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      flex: 1,
                      padding: 7,
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontFamily: "'DM Mono', monospace",
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: mode === m ? 'var(--gold-dim)' : 'var(--surface2)',
                      border: `1px solid ${mode === m ? 'var(--gold)' : 'var(--border)'}`,
                      color: mode === m ? 'var(--gold)' : 'var(--text-muted)',
                    }}
                  >
                    {m === 'skip' ? 'Skip Dupes' : 'Update Dupes'}
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  marginTop: 6,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {mode === 'skip'
                  ? 'Existing products with the same SKU will be skipped.'
                  : 'Existing products with the same SKU will have their details updated.'}
              </div>
            </div>

            <div style={{ padding: '0 18px 18px' }}>
              <button
                className="import-btn"
                disabled={validRows.length === 0 || importing || step >= 3}
                onClick={runImport}
              >
                {importing ? 'Importing\u2026' : 'Import Products'}
              </button>

              {errorRows.length > 0 && step >= 2 && (
                <button className="reset-btn" onClick={downloadErrorReport} style={{ marginTop: 8 }}>
                  {'\u2B07'} Download Error Report
                </button>
              )}

              <button className="reset-btn" onClick={reset}>
                {'\u2715'} Clear &amp; Start Over
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-header">
              <div className="card-title">How to use</div>
            </div>
            <div
              style={{
                padding: '16px 18px',
                fontSize: '0.78rem',
                color: 'var(--text-dim)',
                lineHeight: 1.7,
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--gold)', fontFamily: "'DM Mono', monospace" }}>1.</span>{' '}
                Download the XLSX template above
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--gold)', fontFamily: "'DM Mono', monospace" }}>2.</span>{' '}
                Fill in your data matching the column headers exactly
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--gold)', fontFamily: "'DM Mono', monospace" }}>3.</span>{' '}
                Drop the file onto this page or click to browse
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--gold)', fontFamily: "'DM Mono', monospace" }}>4.</span>{' '}
                Review validation results {'\u2014'} fix any red rows in Excel first
              </div>
              <div>
                <span style={{ color: 'var(--gold)', fontFamily: "'DM Mono', monospace" }}>5.</span>{' '}
                Click Import {'\u2014'} only valid rows are inserted
              </div>
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  background: 'var(--surface2)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                }}
              >
                {'\u26A0'} Category numbers must already exist in the database. Check the Category
                Reference tab in the template.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
