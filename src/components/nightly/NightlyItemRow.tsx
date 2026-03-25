import { useState, useRef } from 'react';

interface SubmissionItem {
  id: string;
  quantity_sold: number;
  retail_price: number;
  products: {
    id: string;
    name: string;
    product_number: number;
    categories: { category_number: number; name: string } | null;
  } | null;
}

interface NightlyItemRowProps {
  item: SubmissionItem;
  editable: boolean;
  onQuantityChange: (productId: string, qty: number, price: number) => void;
  onRemove: (productId: string) => void;
}

export function NightlyItemRow({ item, editable, onQuantityChange, onRemove }: NightlyItemRowProps) {
  const [qty, setQty] = useState(item.quantity_sold);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const product = item.products;
  if (!product) return null;

  const sku = `${product.categories?.category_number || '?'}/${product.product_number}`;
  const price = parseFloat(String(item.retail_price)) || 0;
  const subtotal = qty * price;

  const handleQtyChange = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) return;
    setQty(n);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onQuantityChange(product.id, n, price);
    }, 400);
  };

  return (
    <tr>
      <td className="td-sku">{sku}</td>
      <td>
        <div className="td-name">{product.name}</div>
      </td>
      <td className="td-qty">
        <input
          className="qty-input"
          type="number"
          min={1}
          value={qty}
          disabled={!editable}
          onChange={(e) => handleQtyChange(e.target.value)}
        />
      </td>
      <td className="td-price">${price.toFixed(2)}</td>
      <td className="td-subtotal">${subtotal.toFixed(2)}</td>
      <td>
        {editable && (
          <button className="remove-btn" onClick={() => onRemove(product.id)} title="Remove">×</button>
        )}
      </td>
    </tr>
  );
}
