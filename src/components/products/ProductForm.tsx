import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useProductCategories,
  useProductSuppliers,
  useProductLocations,
  useUpsertProduct,
  useSetProductActive,
  useUpdateProductReorder,
} from '@/hooks/useProducts';
import type { ProductRow, CategoryOption } from '@/services/productsService';

interface FormFields {
  category_id: string;
  product_number: string;
  name: string;
  brand: string;
  retail_price: string;
  cost_price: string;
  supplier_id: string;
  notes: string;
}

const KNOWN_ATTRS = ['puff_count', 'nicotine', 'size_ml', 'vg_pg', 'flavor', 'variant'] as const;

interface ProductFormProps {
  product: ProductRow | null;
  onClose: () => void;
}

export function ProductForm({ product, onClose }: ProductFormProps) {
  const { show } = useToast();
  const { data: categories } = useProductCategories();
  const { data: suppliers } = useProductSuppliers();
  const { data: locations } = useProductLocations();
  const upsert = useUpsertProduct();
  const setActive = useSetProductActive();
  const updateReorder = useUpdateProductReorder();

  const [activeTab, setActiveTab] = useState<'details' | 'stock' | 'attributes'>('details');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Attributes state
  const [puffCount, setPuffCount] = useState('');
  const [nicotine, setNicotine] = useState('');
  const [sizeMl, setSizeMl] = useState('');
  const [vgPg, setVgPg] = useState('');
  const [flavor, setFlavor] = useState('');
  const [variant, setVariant] = useState('');
  const [otherJson, setOtherJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Reorder state
  const [reorderEdits, setReorderEdits] = useState<Record<string, { point: string; qty: string }>>({});

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormFields>();

  const watchCategory = watch('category_id');
  const watchProdNum = watch('product_number');

  const skuPreview = useMemo(() => {
    if (!watchCategory || !watchProdNum) return '—';
    const cat = categories?.find((c) => c.id === watchCategory);
    return cat ? `${cat.category_number}/${watchProdNum}` : '—';
  }, [watchCategory, watchProdNum, categories]);

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        category_id: product.categories?.id || '',
        product_number: String(product.product_number),
        name: product.name,
        brand: product.brand || '',
        retail_price: product.retail_price != null ? String(product.retail_price) : '',
        cost_price: product.cost_price != null ? String(product.cost_price) : '',
        supplier_id: product.suppliers?.id || '',
        notes: product.notes || '',
      });

      // Attributes
      const attrs = product.attributes || {};
      setPuffCount(attrs.puff_count != null ? String(attrs.puff_count) : '');
      setNicotine(String(attrs.nicotine ?? ''));
      setSizeMl(attrs.size_ml != null ? String(attrs.size_ml) : '');
      setVgPg(String(attrs.vg_pg ?? ''));
      setFlavor(String(attrs.flavor ?? ''));
      setVariant(String(attrs.variant ?? ''));

      // Other JSON (non-known keys)
      const other: Record<string, unknown> = {};
      Object.entries(attrs).forEach(([k, v]) => {
        if (!KNOWN_ATTRS.includes(k as any)) other[k] = v;
      });
      setOtherJson(Object.keys(other).length ? JSON.stringify(other, null, 2) : '');

      // Reorder points
      const re: Record<string, { point: string; qty: string }> = {};
      (product.inventory ?? []).forEach((inv) => {
        re[inv.location_id] = {
          point: String(inv.reorder_point ?? ''),
          qty: String(inv.reorder_quantity ?? ''),
        };
      });
      setReorderEdits(re);
    } else {
      reset({ category_id: '', product_number: '', name: '', brand: '', retail_price: '', cost_price: '', supplier_id: '', notes: '' });
      setPuffCount(''); setNicotine(''); setSizeMl(''); setVgPg(''); setFlavor(''); setVariant('');
      setOtherJson(''); setJsonError('');
      setReorderEdits({});
    }
  }, [product, reset]);

  const buildAttributes = (): Record<string, unknown> | null => {
    const attrs: Record<string, unknown> = {};
    if (puffCount) attrs.puff_count = Number(puffCount);
    if (nicotine) attrs.nicotine = nicotine;
    if (sizeMl) attrs.size_ml = Number(sizeMl);
    if (vgPg) attrs.vg_pg = vgPg;
    if (flavor) attrs.flavor = flavor;
    if (variant) attrs.variant = variant;

    if (otherJson.trim()) {
      try {
        const parsed = JSON.parse(otherJson);
        Object.assign(attrs, parsed);
        setJsonError('');
      } catch {
        setJsonError('Invalid JSON format.');
        return null;
      }
    }

    return Object.keys(attrs).length ? attrs : null;
  };

  const onSubmit = async (data: FormFields) => {
    const attributes = buildAttributes();
    if (jsonError) return;

    try {
      await upsert.mutateAsync({
        id: product?.id ?? null,
        input: {
          category_id: data.category_id,
          product_number: parseInt(data.product_number, 10),
          name: data.name,
          brand: data.brand || null,
          retail_price: data.retail_price ? parseFloat(data.retail_price) : null,
          cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
          supplier_id: data.supplier_id || null,
          notes: data.notes || null,
          attributes,
          is_active: product?.is_active ?? true,
        },
      });
      show(product ? 'Product updated.' : `${data.name} added.`);
      onClose();
    } catch (err: any) {
      show('Save failed: ' + err.message);
    }
  };

  const handleToggleActive = () => setConfirmOpen(true);

  const confirmToggle = async () => {
    if (!product) return;
    try {
      await setActive.mutateAsync({ id: product.id, isActive: !product.is_active });
      show(product.is_active ? 'Product deactivated.' : 'Product reactivated.');
      onClose();
    } catch (err: any) {
      show('Failed: ' + err.message);
    }
    setConfirmOpen(false);
  };

  const handleSaveReorder = async (locId: string) => {
    if (!product) return;
    const edit = reorderEdits[locId];
    if (!edit) return;
    try {
      await updateReorder.mutateAsync({
        productId: product.id,
        locationId: locId,
        reorderPoint: parseInt(edit.point, 10) || 0,
        reorderQty: parseInt(edit.qty, 10) || 0,
      });
      show('Reorder point saved.');
    } catch (err: any) {
      show('Failed: ' + err.message);
    }
  };

  return (
    <div className="side-panel open">
      <div className="side-panel-header">
        <div className="side-panel-title">{product ? 'Edit Product' : 'Add Product'}</div>
        <div className="side-panel-close" onClick={onClose}>×</div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        {(['details', 'stock', 'attributes'] as const).map((tab) => (
          <div
            key={tab}
            className={`panel-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="side-panel-body">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="modal-label">Category <span className="required">*</span></label>
                  <select className={`form-control${errors.category_id ? ' error' : ''}`} {...register('category_id', { required: true })}>
                    <option value="">Select…</option>
                    {(categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.category_number} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="modal-label">Product # <span className="required">*</span></label>
                  <input className={`form-control${errors.product_number ? ' error' : ''}`} type="number" min={1}
                    placeholder="172" {...register('product_number', { required: true })} />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <span className="product-sku" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--gold)', fontSize: '0.82rem' }}>
                  SKU: {skuPreview}
                </span>
              </div>

              <div className="form-group">
                <label className="modal-label">Product Name <span className="required">*</span></label>
                <input className={`form-control${errors.name ? ' error' : ''}`} type="text" placeholder="e.g. Elf Bar BC5000"
                  {...register('name', { required: true })} />
              </div>
              <div className="form-group">
                <label className="modal-label">Brand</label>
                <input className="form-control" type="text" placeholder="e.g. Elf Bar" {...register('brand')} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="modal-label">Retail Price</label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">$</span>
                    <input className="form-control" type="number" min={0} step={0.01} placeholder="0.00" {...register('retail_price')} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="modal-label">Cost Price</label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">$</span>
                    <input className="form-control" type="number" min={0} step={0.01} placeholder="0.00" {...register('cost_price')} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="modal-label">Supplier</label>
                <select className="form-control" {...register('supplier_id')}>
                  <option value="">None</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="modal-label">Notes</label>
                <textarea className="form-control" placeholder="Optional notes…" rows={2} {...register('notes')} />
              </div>

              {product && (
                <div className="danger-zone" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <button type="button"
                    className={`btn ${product.is_active ? 'btn-danger' : 'btn-secondary'} btn-full btn-sm`}
                    onClick={handleToggleActive}
                  >
                    {product.is_active ? 'Deactivate Product' : 'Reactivate Product'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Stock Tab */}
          {activeTab === 'stock' && (
            <>
              {!product ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: "'DM Mono', monospace" }}>
                  Save the product first to manage stock.
                </div>
              ) : (
                <table className="reorder-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Location</th>
                      <th style={{ textAlign: 'right' }}>On Hand</th>
                      <th style={{ textAlign: 'right' }}>Reorder At</th>
                      <th style={{ textAlign: 'right' }}>Reorder Qty</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(locations ?? []).map((loc) => {
                      const inv = product.inventory?.find((i) => i.location_id === loc.id);
                      const edit = reorderEdits[loc.id] || { point: String(inv?.reorder_point ?? ''), qty: String(inv?.reorder_quantity ?? '') };
                      const qty = inv?.quantity_on_hand ?? 0;
                      const qtyClass = qty <= 0 ? 'out' : qty <= (inv?.reorder_point ?? 0) ? 'low' : 'ok';

                      return (
                        <tr key={loc.id}>
                          <td>{loc.name}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`stock-loc-qty ${qtyClass}`}>{qty}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input className="reorder-input" type="number" min={0} value={edit.point}
                              onChange={(e) => setReorderEdits((prev) => ({
                                ...prev, [loc.id]: { ...edit, point: e.target.value },
                              }))} style={{ width: 60, textAlign: 'right' }} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input className="reorder-input" type="number" min={0} value={edit.qty}
                              onChange={(e) => setReorderEdits((prev) => ({
                                ...prev, [loc.id]: { ...edit, qty: e.target.value },
                              }))} style={{ width: 60, textAlign: 'right' }} />
                          </td>
                          <td>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleSaveReorder(loc.id)}>Save</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}

          {/* Attributes Tab */}
          {activeTab === 'attributes' && (
            <>
              <div className="attr-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="modal-label">Puff Count</label>
                  <input className="form-control" type="number" placeholder="5000" value={puffCount} onChange={(e) => setPuffCount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="modal-label">Nicotine</label>
                  <input className="form-control" type="text" placeholder="5%" value={nicotine} onChange={(e) => setNicotine(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="modal-label">Size (ml)</label>
                  <input className="form-control" type="number" placeholder="60" value={sizeMl} onChange={(e) => setSizeMl(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="modal-label">VG / PG Ratio</label>
                  <input className="form-control" type="text" placeholder="70/30" value={vgPg} onChange={(e) => setVgPg(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="modal-label">Flavor</label>
                  <input className="form-control" type="text" placeholder="Watermelon Ice" value={flavor} onChange={(e) => setFlavor(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="modal-label">Variant / Color</label>
                  <input className="form-control" type="text" placeholder="Black" value={variant} onChange={(e) => setVariant(e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="modal-label">Other (JSON)</label>
                <textarea className={`form-control${jsonError ? ' error' : ''}`} rows={3}
                  placeholder='{"resistance":"0.6ohm"}' value={otherJson}
                  onChange={(e) => { setOtherJson(e.target.value); setJsonError(''); }} />
                {jsonError && <div className="form-error visible">{jsonError}</div>}
                <div className="form-hint">Any extra fields as JSON. Leave blank if not needed.</div>
              </div>
            </>
          )}
        </div>

        <div className="side-panel-footer">
          <button type="submit" className="btn btn-primary btn-full" disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving…' : product ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title={product?.is_active ? 'Deactivate this product?' : 'Reactivate this product?'}
        message={product?.is_active ? 'Product will be hidden from active lists.' : 'Product will appear in active lists again.'}
        confirmLabel={product?.is_active ? 'Deactivate' : 'Reactivate'}
        danger={product?.is_active ?? false}
        onConfirm={confirmToggle}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
