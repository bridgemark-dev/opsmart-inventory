import { supabase } from '@/lib/supabase';

export interface SalesSummary {
  totalRevenue: number;
  totalUnits: number;
  submissionCount: number;
  avgDailyRevenue: number;
  dailySales: { date: string; revenue: number; units: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
}

export interface InvValRow {
  sku: string;
  name: string;
  category: string;
  location: string;
  qty: number;
  costEa: number;
  retailEa: number;
  costValue: number;
  retailValue: number;
}

export interface InvValSummary {
  totalCost: number;
  totalRetail: number;
  potentialProfit: number;
  totalSkus: number;
  rows: InvValRow[];
  byCategory: { name: string; cost: number }[];
  byLocation: { name: string; cost: number }[];
}

export interface POReportRow {
  po_number: string;
  supplier_name: string;
  location_name: string;
  ordered_at: string | null;
  expected_at: string | null;
  status: string;
  item_count: number;
  total_cost: number;
}

export interface POReportSummary {
  openCount: number;
  incomingValue: number;
  receivedCount: number;
  totalSpent: number;
  rows: POReportRow[];
}

export const reportService = {
  async getSalesSummary(from: string, to: string): Promise<SalesSummary> {
    const [{ data: subs }, { data: items }] = await Promise.all([
      supabase
        .from('nightly_submissions')
        .select('id, submission_date, sales_total, status')
        .eq('status', 'approved')
        .gte('submission_date', from)
        .lte('submission_date', to)
        .order('submission_date', { ascending: false }),
      supabase
        .from('nightly_submission_items')
        .select(`
          quantity_sold, unit_price,
          products ( name ),
          nightly_submissions!inner ( submission_date, status )
        `)
        .eq('nightly_submissions.status', 'approved')
        .gte('nightly_submissions.submission_date', from)
        .lte('nightly_submissions.submission_date', to),
    ]);

    const rows = subs ?? [];
    const iRows = items ?? [];

    const totalRevenue = rows.reduce((s, r: any) => s + (parseFloat(r.sales_total) || 0), 0);
    const totalUnits = iRows.reduce((s, r: any) => s + (r.quantity_sold || 0), 0);
    const uniqueDays = new Set(rows.map((r: any) => r.submission_date)).size;
    const avgDailyRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;

    // Daily sales
    const dayMap: Record<string, { revenue: number; units: number }> = {};
    rows.forEach((r: any) => {
      const d = r.submission_date;
      if (!dayMap[d]) dayMap[d] = { revenue: 0, units: 0 };
      dayMap[d].revenue += parseFloat(r.sales_total) || 0;
    });
    iRows.forEach((r: any) => {
      const d = (r as any).nightly_submissions?.submission_date;
      if (d && dayMap[d]) dayMap[d].units += r.quantity_sold || 0;
    });
    const dailySales = Object.entries(dayMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top products
    const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
    iRows.forEach((r: any) => {
      const name = r.products?.name || 'Unknown';
      if (!prodMap[name]) prodMap[name] = { name, units: 0, revenue: 0 };
      prodMap[name].units += r.quantity_sold || 0;
      prodMap[name].revenue += (r.quantity_sold || 0) * (parseFloat(r.unit_price) || 0);
    });
    const topProducts = Object.values(prodMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    return {
      totalRevenue,
      totalUnits,
      submissionCount: rows.length,
      avgDailyRevenue,
      dailySales,
      topProducts,
    };
  },

  async getInventoryValuation(): Promise<InvValSummary> {
    const { data, error } = await supabase
      .from('inventory')
      .select(`
        quantity_on_hand,
        products ( name, product_number, retail_price, cost_price,
          categories ( name, category_number ) ),
        locations ( name )
      `)
      .gt('quantity_on_hand', 0);
    if (error) throw error;

    const inv = data ?? [];
    let totalCost = 0;
    let totalRetail = 0;
    const byCat: Record<string, number> = {};
    const byLoc: Record<string, number> = {};
    const rows: InvValRow[] = [];

    inv.forEach((r: any) => {
      const qty = r.quantity_on_hand || 0;
      const cost = parseFloat(r.products?.cost_price || 0);
      const retail = parseFloat(r.products?.retail_price || 0);
      const loc = r.locations?.name || 'Unknown';
      const cat = r.products?.categories?.name || 'Unknown';
      const sku = `${r.products?.categories?.category_number ?? '?'}/${r.products?.product_number ?? '?'}`;

      totalCost += qty * cost;
      totalRetail += qty * retail;

      byCat[cat] = (byCat[cat] || 0) + qty * cost;
      byLoc[loc] = (byLoc[loc] || 0) + qty * cost;

      rows.push({
        sku,
        name: r.products?.name || '—',
        category: cat,
        location: loc,
        qty,
        costEa: cost,
        retailEa: retail,
        costValue: qty * cost,
        retailValue: qty * retail,
      });
    });

    rows.sort((a, b) => b.costValue - a.costValue);

    return {
      totalCost,
      totalRetail,
      potentialProfit: totalRetail - totalCost,
      totalSkus: new Set(inv.map((r: any) => r.products?.name)).size,
      rows,
      byCategory: Object.entries(byCat)
        .map(([name, cost]) => ({ name, cost }))
        .sort((a, b) => b.cost - a.cost),
      byLocation: Object.entries(byLoc)
        .map(([name, cost]) => ({ name, cost }))
        .sort((a, b) => b.cost - a.cost),
    };
  },

  async getPOReport(from: string, to: string): Promise<POReportSummary> {
    const { data, error } = await supabase
      .from('po_summary')
      .select('*')
      .gte('created_at', from + 'T00:00:00')
      .lte('created_at', to + 'T23:59:59')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as any[];
    const open = rows.filter(r => ['draft', 'sent', 'partial'].includes(r.status));
    const received = rows.filter(r => r.status === 'received');

    return {
      openCount: open.length,
      incomingValue: open.reduce((s, r) => s + (r.total_cost || 0), 0),
      receivedCount: received.length,
      totalSpent: received.reduce((s, r) => s + (r.total_cost || 0), 0),
      rows: rows.map(r => ({
        po_number: r.po_number,
        supplier_name: r.supplier_name,
        location_name: r.location_name,
        ordered_at: r.ordered_at,
        expected_at: r.expected_at,
        status: r.status,
        item_count: r.item_count || 0,
        total_cost: r.total_cost || 0,
      })),
    };
  },
};
