import { supabase } from '@/lib/supabase';

export interface POItemInput {
  productId: string;
  qty: number;
  cost: number;
}

export interface ReceiptInput {
  item_id: string;
  quantity_received: number;
}

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export const purchaseOrderService = {
  async getPOs(locationId?: string) {
    let q = supabase
      .from('po_summary')
      .select('*')
      .order('created_at', { ascending: false });
    if (locationId) q = q.eq('location_id', locationId);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async getPOWithItems(poId: string) {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*, purchase_order_items(*, products(name, brand))')
      .eq('id', poId)
      .single();
    if (error) throw error;
    return data;
  },

  async createPO(supplierId: string, locationId: string, items: POItemInput[]) {
    const { data: po, error } = await supabase
      .from('purchase_orders')
      .insert({ supplier_id: supplierId, location_id: locationId, status: 'draft' })
      .select()
      .single();
    if (error) throw error;

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(
        items.map(i => ({
          po_id: po.id,
          product_id: i.productId,
          quantity_ordered: i.qty,
          unit_cost: i.cost,
        }))
      );
    if (itemsError) throw itemsError;
    return po;
  },

  async updateStatus(poId: string, status: POStatus) {
    const update: Record<string, any> = { status };
    if (status === 'sent') update.ordered_at = new Date().toISOString();

    const { error } = await supabase
      .from('purchase_orders')
      .update(update)
      .eq('id', poId);
    if (error) throw error;
  },

  async receiveItems(poId: string, receipts: ReceiptInput[]) {
    const { data, error } = await supabase.rpc('receive_po_items', {
      p_po_id: poId,
      p_receipts: receipts,
    });
    if (error) throw error;
    return data;
  },
};
