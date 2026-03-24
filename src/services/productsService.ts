import { supabase } from '@/lib/supabase';

export interface ProductRow {
  id: string;
  product_number: number;
  name: string;
  brand: string | null;
  retail_price: number | null;
  cost_price: number | null;
  is_active: boolean;
  notes: string | null;
  attributes: Record<string, unknown> | null;
  categories: { id: string; category_number: number; name: string } | null;
  suppliers: { id: string; name: string } | null;
  inventory: {
    location_id: string;
    quantity_on_hand: number;
    reorder_point: number;
    reorder_quantity: number;
    locations: { name: string } | null;
  }[];
}

export interface ProductInput {
  category_id: string;
  product_number: number;
  name: string;
  brand?: string | null;
  retail_price?: number | null;
  cost_price?: number | null;
  supplier_id?: string | null;
  notes?: string | null;
  attributes?: Record<string, unknown> | null;
  is_active?: boolean;
}

export interface CategoryOption {
  id: string;
  category_number: number;
  name: string;
}

export interface SupplierOption {
  id: string;
  name: string;
}

export interface LocationOption {
  id: string;
  name: string;
}

export const productsService = {
  async getProducts(): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, product_number, name, brand, retail_price, cost_price, is_active, notes, attributes,
        categories (id, category_number, name),
        suppliers (id, name),
        inventory (location_id, quantity_on_hand, reorder_point, reorder_quantity, locations (name))
      `)
      .order('name');
    if (error) throw error;
    return (data ?? []) as unknown as ProductRow[];
  },

  async getCategories(): Promise<CategoryOption[]> {
    const { data } = await supabase
      .from('categories')
      .select('id, category_number, name')
      .is('deleted_at', null)
      .order('category_number');
    return (data ?? []) as CategoryOption[];
  },

  async getSuppliers(): Promise<SupplierOption[]> {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .is('deleted_at', null)
      .order('name');
    return (data ?? []) as SupplierOption[];
  },

  async getLocations(): Promise<LocationOption[]> {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    return (data ?? []) as LocationOption[];
  },

  async upsertProduct(id: string | null, input: ProductInput): Promise<string> {
    const { data, error } = await supabase.rpc('upsert_product', {
      p_id: id,
      p_category_id: input.category_id,
      p_product_number: input.product_number,
      p_name: input.name,
      p_brand: input.brand ?? null,
      p_retail_price: input.retail_price ?? null,
      p_cost_price: input.cost_price ?? null,
      p_supplier_id: input.supplier_id ?? null,
      p_notes: input.notes ?? null,
      p_attributes: input.attributes ?? null,
      p_is_active: input.is_active ?? true,
    });
    if (error) throw error;
    return data as string;
  },

  async setProductActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.rpc('set_product_active', { p_id: id, p_is_active: isActive });
    if (error) throw error;
  },

  async updateReorderPoint(productId: string, locationId: string, reorderPoint: number, reorderQty: number): Promise<void> {
    const { error } = await supabase.rpc('upsert_reorder_point', {
      p_product_id: productId,
      p_location_id: locationId,
      p_reorder_point: reorderPoint,
      p_reorder_qty: reorderQty,
    });
    if (error) throw error;
  },
};
