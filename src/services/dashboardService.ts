import { supabase } from '@/lib/supabase';

export interface DashboardKpis {
  inventoryValue: number;
  totalUnits: number;
  locationCount: number;
  lowStockCount: number;
  weeklySales: number;
  salesDeltaPct: number | null;
}

export interface TopSeller {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  qty: number;
}

export interface RecentProduct {
  id: string;
  name: string;
  brand: string | null;
  retailPrice: number | null;
  category: string | null;
  totalQty: number;
  isLow: boolean;
}

export interface ActivityItem {
  id: string;
  type: string;
  quantityDelta: number;
  notes: string | null;
  createdAt: string;
  productName: string;
  locationName: string;
  userName: string;
}

export const dashboardService = {
  async getKpis(): Promise<DashboardKpis> {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);

    const [invRes, lowRes, salesRes, prevSalesRes, valueRes] = await Promise.all([
      supabase.from('inventory_status').select('quantity_on_hand, location_name'),
      supabase.from('low_stock_alerts').select('product_id', { count: 'exact', head: true }),
      supabase.from('nightly_submissions').select('sales_total')
        .eq('status', 'approved').gte('submission_date', weekAgo),
      supabase.from('nightly_submissions').select('sales_total')
        .eq('status', 'approved').gte('submission_date', twoWeeksAgo).lt('submission_date', weekAgo),
      supabase.from('inventory').select('quantity_on_hand, products(cost_price, retail_price)'),
    ]);

    const invRows = invRes.data ?? [];
    const totalUnits = invRows.reduce((s, r: any) => s + (r.quantity_on_hand || 0), 0);
    const locationCount = new Set(invRows.map((r: any) => r.location_name)).size || 0;

    const inventoryValue = (valueRes.data ?? []).reduce((s, r: any) => {
      const price = r.products?.cost_price ?? r.products?.retail_price ?? 0;
      return s + ((r.quantity_on_hand || 0) * price);
    }, 0);

    const lowStockCount = lowRes.count ?? 0;
    const weeklySales = (salesRes.data ?? []).reduce((s, r: any) => s + (parseFloat(r.sales_total) || 0), 0);
    const prevSales = (prevSalesRes.data ?? []).reduce((s, r: any) => s + (parseFloat(r.sales_total) || 0), 0);
    const salesDeltaPct = prevSales > 0 ? ((weeklySales - prevSales) / prevSales * 100) : null;

    return { inventoryValue, totalUnits, locationCount, lowStockCount, weeklySales, salesDeltaPct };
  },

  async getTopSellers(): Promise<TopSeller[]> {
    const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

    const { data } = await supabase
      .from('nightly_submission_items')
      .select(`
        quantity_sold,
        products (id, name, brand, categories (name)),
        nightly_submissions!inner (submission_date, status)
      `)
      .eq('nightly_submissions.status', 'approved')
      .gte('nightly_submissions.submission_date', thirtyAgo);

    const totals: Record<string, TopSeller> = {};
    (data ?? []).forEach((row: any) => {
      const id = row.products?.id;
      if (!id) return;
      if (!totals[id]) {
        totals[id] = {
          id,
          name: row.products.name,
          brand: row.products.brand,
          category: row.products.categories?.name ?? null,
          qty: 0,
        };
      }
      totals[id].qty += row.quantity_sold;
    });

    return Object.values(totals).sort((a, b) => b.qty - a.qty).slice(0, 5);
  },

  async getRecentProducts(): Promise<RecentProduct[]> {
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, brand, retail_price, created_at,
        categories (name),
        inventory (quantity_on_hand, reorder_point)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6);

    return (data ?? []).map((p: any) => {
      const totalQty = (p.inventory ?? []).reduce((s: number, i: any) => s + (i.quantity_on_hand || 0), 0);
      const isLow = (p.inventory ?? []).some((i: any) => i.quantity_on_hand <= i.reorder_point);
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        retailPrice: p.retail_price ? parseFloat(p.retail_price) : null,
        category: p.categories?.name ?? null,
        totalQty,
        isLow,
      };
    });
  },

  async getActivityFeed(): Promise<ActivityItem[]> {
    const { data } = await supabase
      .from('inventory_transactions')
      .select(`
        id, type, quantity_delta, notes, created_at,
        products (name),
        locations (name),
        profiles (display_name, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(8);

    return (data ?? []).map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      quantityDelta: tx.quantity_delta,
      notes: tx.notes,
      createdAt: tx.created_at,
      productName: tx.products?.name || '—',
      locationName: tx.locations?.name || '—',
      userName: tx.profiles?.display_name || tx.profiles?.full_name || 'System',
    }));
  },
};
