import { supabase } from '@/lib/supabase';

export type LogCategory = 'inventory' | 'sale' | 'receive' | 'submission' | 'product';

export interface LogEntry {
  id: string;
  source: 'transaction' | 'submission' | 'audit';
  category: LogCategory;
  type: string;
  timestamp: string;
  product: string | null;
  location: string;
  user: string;
  delta: number | null;
  before: number | null;
  after: number | null;
  notes: string | null;
  date?: string;
  status?: string;
}

export interface ActivityFilters {
  dateFrom?: string;
  dateTo?: string;
  locationId?: string;
  userId?: string;
  offset?: number;
  pageSize?: number;
}

function txCategory(type: string): LogCategory {
  if (['adjustment', 'initial'].includes(type)) return 'inventory';
  if (type === 'sale') return 'sale';
  if (['receive', 'transfer_in', 'transfer_out'].includes(type)) return 'receive';
  return 'inventory';
}

export const activityService = {
  async getLogs(filters: ActivityFilters = {}): Promise<LogEntry[]> {
    const { dateFrom, dateTo, locationId, userId, offset = 0, pageSize = 50 } = filters;

    // Inventory transactions
    let txQuery = supabase
      .from('inventory_transactions')
      .select(`
        id, type, quantity_delta, quantity_before, quantity_after,
        notes, created_at, reference_type,
        products ( name, product_number, categories(category_number) ),
        locations ( id, name ),
        profiles ( id, display_name, full_name )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (dateFrom) txQuery = txQuery.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo) txQuery = txQuery.lte('created_at', dateTo + 'T23:59:59');
    if (locationId) txQuery = txQuery.eq('location_id', locationId);
    if (userId) txQuery = txQuery.eq('performed_by', userId);

    // Nightly submissions
    let nsQuery = supabase
      .from('nightly_submissions')
      .select(`
        id, status, submission_date, sales_total, submitted_at, approved_at,
        locations ( id, name ),
        submitted_by:profiles!nightly_submissions_submitted_by_fkey ( id, display_name, full_name ),
        approved_by:profiles!nightly_submissions_approved_by_fkey ( id, display_name, full_name )
      `)
      .in('status', ['submitted', 'approved', 'rejected'])
      .order('approved_at', { ascending: false })
      .limit(pageSize);

    if (dateFrom) nsQuery = nsQuery.gte('submission_date', dateFrom);
    if (dateTo) nsQuery = nsQuery.lte('submission_date', dateTo);
    if (locationId) nsQuery = nsQuery.eq('location_id', locationId);

    // Audit log
    let auditQuery = supabase
      .from('audit_log')
      .select('id, event_type, entity_type, entity_name, entity_id, details, created_at, changed_by')
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (dateFrom) auditQuery = auditQuery.gte('created_at', dateFrom + 'T00:00:00');
    if (dateTo) auditQuery = auditQuery.lte('created_at', dateTo + 'T23:59:59');

    const [txRes, nsRes, auditRes] = await Promise.all([txQuery, nsQuery, auditQuery]);

    const txEntries: LogEntry[] = (txRes.data ?? []).map((tx: any) => ({
      id: tx.id,
      source: 'transaction' as const,
      category: txCategory(tx.type),
      type: tx.type,
      timestamp: tx.created_at,
      product: tx.products
        ? `${tx.products.categories?.category_number}/${tx.products.product_number} — ${tx.products.name}`
        : null,
      location: tx.locations?.name ?? '—',
      user: tx.profiles?.display_name || tx.profiles?.full_name || 'System',
      delta: tx.quantity_delta,
      before: tx.quantity_before,
      after: tx.quantity_after,
      notes: tx.notes,
    }));

    const nsEntries: LogEntry[] = (nsRes.data ?? []).map((ns: any) => ({
      id: ns.id,
      source: 'submission' as const,
      category: 'submission' as const,
      type: 'submission_' + ns.status,
      timestamp: ns.approved_at || ns.submitted_at || ns.submission_date,
      product: null,
      location: ns.locations?.name ?? '—',
      user: ns.status === 'approved'
        ? (ns.approved_by?.display_name || ns.approved_by?.full_name || '—')
        : (ns.submitted_by?.display_name || ns.submitted_by?.full_name || '—'),
      delta: null,
      before: null,
      after: null,
      notes: ns.sales_total ? `$${parseFloat(ns.sales_total).toFixed(2)} sales total` : null,
      date: ns.submission_date,
      status: ns.status,
    }));

    const auditEntries: LogEntry[] = (auditRes.data ?? []).map((a: any) => ({
      id: a.id,
      source: 'audit' as const,
      category: 'product' as const,
      type: a.event_type,
      timestamp: a.created_at,
      product: a.entity_name ?? '—',
      location: '—',
      user: 'System',
      delta: null,
      before: null,
      after: null,
      notes: null,
    }));

    return [...txEntries, ...nsEntries, ...auditEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, pageSize);
  },

  async getStats() {
    const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString();

    const [adjRes, saleRes, recRes, subRes] = await Promise.all([
      supabase.from('inventory_transactions').select('quantity_delta')
        .eq('type', 'adjustment').gte('created_at', thirtyAgo),
      supabase.from('inventory_transactions').select('quantity_delta', { count: 'exact', head: true })
        .eq('type', 'sale').gte('created_at', thirtyAgo),
      supabase.from('inventory_transactions').select('quantity_delta')
        .eq('type', 'receive').gte('created_at', thirtyAgo),
      supabase.from('nightly_submissions').select('id', { count: 'exact', head: true })
        .eq('status', 'approved').gte('submission_date', thirtyAgo.slice(0, 10)),
    ]);

    const adjRows = adjRes.data ?? [];
    const recRows = recRes.data ?? [];

    const unitsAdded = recRows.reduce((s, r) => s + Math.max(0, r.quantity_delta ?? 0), 0)
      + adjRows.filter(r => (r.quantity_delta ?? 0) > 0).reduce((s, r) => s + (r.quantity_delta ?? 0), 0);
    const unitsRemoved = Math.abs(
      adjRows.filter(r => (r.quantity_delta ?? 0) < 0).reduce((s, r) => s + (r.quantity_delta ?? 0), 0)
    );

    return {
      adjustments: adjRows.length,
      sales: saleRes.count ?? 0,
      received: recRows.reduce((s, r) => s + (r.quantity_delta ?? 0), 0),
      submissions: subRes.count ?? 0,
      unitsRemoved,
      unitsAdded,
    };
  },

  async getTopUsers() {
    const thirtyAgo = new Date(Date.now() - 30 * 864e5).toISOString();
    const { data: txUsers } = await supabase
      .from('inventory_transactions')
      .select('performed_by, profiles(display_name, full_name)')
      .gte('created_at', thirtyAgo)
      .not('performed_by', 'is', null);

    const counts: Record<string, { name: string; count: number }> = {};
    (txUsers ?? []).forEach((tx: any) => {
      const id = tx.performed_by as string;
      const name = tx.profiles?.display_name || tx.profiles?.full_name || 'Unknown';
      counts[id] = counts[id] || { name, count: 0 };
      counts[id].count++;
    });

    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  },

  async getLocations() {
    const { data } = await supabase.from('locations').select('id, name').eq('is_active', true).order('name');
    return data ?? [];
  },

  async getUsers() {
    const { data } = await supabase.from('profiles').select('id, display_name, full_name').eq('is_active', true).order('full_name');
    return data ?? [];
  },
};
