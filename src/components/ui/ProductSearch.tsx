import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  product_number: number;
  retail_price: number | null;
  categories: { name: string; category_number: number } | null;
}

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export function ProductSearch({ onSelect, placeholder = 'Search products…' }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, brand, product_number, retail_price, categories(name, category_number)')
        .or(`name.ilike.%${val}%,brand.ilike.%${val}%`)
        .eq('is_active', true)
        .limit(10);
      setResults((data as Product[] | null) ?? []);
      setOpen(true);
    }, 250);
  }

  function handleSelect(product: Product) {
    onSelect(product);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="page-search-wrap" style={{ maxWidth: '100%' }}>
      <span className="page-search-icon">\u2315</span>
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 200,
          background: 'var(--surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius)',
          marginTop: '4px',
          maxHeight: '240px',
          overflowY: 'auto',
        }}>
          {results.map(p => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                borderBottom: '1px solid var(--border)',
                transition: 'background var(--transition)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 500 }}>
                {p.categories?.category_number}/{p.product_number} — {p.name}
              </div>
              {p.brand && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                  {p.brand}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
