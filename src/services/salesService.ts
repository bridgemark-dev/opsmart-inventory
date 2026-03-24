import { supabase } from '@/lib/supabase';

export const salesService = {
  async getTodaySubmission(locationId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from('nightly_submissions')
      .select('*')
      .eq('location_id', locationId)
      .eq('submission_date', today)
      .in('status', ['open', 'rejected'])
      .maybeSingle();

    if (existing) return existing;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from('nightly_submissions')
      .insert({
        location_id: locationId,
        submission_date: today,
        submitted_by: user?.id,
        status: 'open',
      })
      .select()
      .single();
    if (error) throw error;
    return created;
  },

  async getSubmissionItems(submissionId: string) {
    const { data, error } = await supabase
      .from('nightly_submission_items')
      .select(`
        id, quantity_sold, retail_price,
        products ( id, name, product_number, categories(category_number, name) )
      `)
      .eq('submission_id', submissionId)
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },

  async upsertItem(submissionId: string, productId: string, qty: number, price: number) {
    const { data: existing } = await supabase
      .from('nightly_submission_items')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('nightly_submission_items')
        .update({ quantity_sold: qty, retail_price: price })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('nightly_submission_items')
        .insert({
          submission_id: submissionId,
          product_id: productId,
          quantity_sold: qty,
          retail_price: price,
        });
      if (error) throw error;
    }
  },

  async removeItem(submissionId: string, productId: string) {
    const { error } = await supabase
      .from('nightly_submission_items')
      .delete()
      .eq('submission_id', submissionId)
      .eq('product_id', productId);
    if (error) throw error;
  },

  async submit(submissionId: string, salesTotal: number) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('nightly_submissions')
      .update({
        status: 'submitted',
        sales_total: salesTotal,
        submitted_at: new Date().toISOString(),
        submitted_by: user?.id,
      })
      .eq('id', submissionId);
    if (error) throw error;
  },

  async approve(submissionId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('nightly_submissions')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', submissionId);
    if (error) throw error;
  },

  async reject(submissionId: string, reason: string) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('nightly_submissions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: user?.id,
      })
      .eq('id', submissionId);
    if (error) throw error;
  },

  async getSummaries(locationId?: string, from?: string, to?: string) {
    let q = supabase
      .from('nightly_summary')
      .select('*')
      .order('submission_date', { ascending: false });
    if (locationId) q = q.eq('location_id', locationId);
    if (from) q = q.gte('submission_date', from);
    if (to) q = q.lte('submission_date', to);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
};
