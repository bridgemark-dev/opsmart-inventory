import { supabase } from '@/lib/supabase';

export const inventoryService = {
  async getInventoryStatus(locationId?: string) {
    let q = supabase.from('inventory_status').select('*').order('category_name').order('product_name');
    if (locationId) q = q.eq('location_id', locationId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async adjustStock(productId: string, locationId: string, delta: number, notes: string) {
    const { data, error } = await supabase.rpc('apply_manual_adjustment', {
      p_product_id: productId,
      p_location_id: locationId,
      p_delta: delta,
      p_new_qty: 0,
      p_notes: notes,
    });
    if (error) throw error;
    return data as number;
  },

  async getLowStockAlerts() {
    const { data, error } = await supabase
      .from('low_stock_alerts')
      .select('*')
      .order('quantity_on_hand');
    if (error) throw error;
    return data ?? [];
  },

  async updateReorderPoint(productId: string, locationId: string, point: number, qty: number) {
    const { error } = await supabase.rpc('upsert_reorder_point', {
      p_product_id: productId,
      p_location_id: locationId,
      p_reorder_point: point,
      p_reorder_qty: qty,
    });
    if (error) throw error;
  },
};
