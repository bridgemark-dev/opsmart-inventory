/* ============================================================
   SUPABASE CLIENT
   Reads credentials from config.js — one file per deployment
   ============================================================ */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { CONFIG } from '../config.js';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON);

/* ── Auth ── */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  sessionStorage.removeItem('opsmart_profile');
  await supabase.auth.signOut();
  window.location.href = '/login';
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile() {
  // Check sessionStorage first — avoids re-fetching on every navigation
  const cached = sessionStorage.getItem('opsmart_profile');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) { /* fall through */ }
  }

  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, display_name')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;

  const { data: locationRows } = await supabase
    .from('user_locations')
    .select('location_id, role, locations(name)')
    .eq('user_id', user.id);

  const result = {
    ...profile,
    locations: (locationRows ?? []).map(row => ({
      location_id:   row.location_id,
      location_name: row.locations?.name ?? '',
      role:          row.role,
    })),
  };

  // Cache for this session
  sessionStorage.setItem('opsmart_profile', JSON.stringify(result));
  return result;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return user;
}

export function getTopRole(profile) {
  if (!profile?.locations?.length) return 'employee';
  const roles = profile.locations.map(l => l.role);
  if (roles.includes('owner'))   return 'owner';
  if (roles.includes('manager')) return 'manager';
  return 'employee';
}

export function getLocationLabel(profile) {
  if (!profile?.locations?.length) return 'ALL LOCATIONS';
  if (profile.locations.length === 1) return profile.locations[0].location_name.toUpperCase();
  return 'ALL LOCATIONS';
}

export function applySidebarRole(role) {
  if (!role || role === 'owner') return;

  const employeeHidden = [
    'Inventory', 'Products', 'Suppliers',
    'Purchase Orders', 'Reports & Analytics', 'Activity Logs'
  ];

  document.querySelectorAll('.nav-item').forEach(navEl => {
    const span = navEl.querySelector('span');
    if (!span) return;
    if (role === 'employee' && employeeHidden.includes(span.textContent.trim())) {
      navEl.style.display = 'none';
    }
  });

  document.querySelectorAll('.nav-section-label').forEach(labelEl => {
    let next = labelEl.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('nav-section-label')) {
      if (next.classList.contains('nav-item') && next.style.display !== 'none') hasVisible = true;
      next = next.nextElementSibling;
    }
    if (!hasVisible) labelEl.style.display = 'none';
  });
}

/* ── Inventory helpers ── */
export async function lookupSku(sku) {
  const parts = sku.split('/');
  if (parts.length !== 2) return null;
  const [catNum, prodNum] = parts.map(Number);
  if (isNaN(catNum) || isNaN(prodNum)) return null;

  const { data } = await supabase
    .from('product_sku_lookup')
    .select('*')
    .eq('category_number', catNum)
    .eq('product_number', prodNum)
    .single();
  return data;
}

export async function searchProducts(query) {
  const { data } = await supabase
    .from('products')
    .select('id, name, brand, product_number, retail_price, categories(name, category_number)')
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(10);
  return data ?? [];
}

export async function getLowStockAlerts() {
  const { data } = await supabase
    .from('low_stock_alerts')
    .select('*')
    .order('quantity_on_hand');
  return data ?? [];
}

export async function getOrCreateTodaySubmission(locationId) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('nightly_submissions')
    .select('*')
    .eq('location_id', locationId)
    .eq('submission_date', today)
    .in('status', ['open', 'rejected'])
    .maybeSingle();

  if (existing) return existing;

  const user = await getCurrentUser();
  const { data: created } = await supabase
    .from('nightly_submissions')
    .insert({ location_id: locationId, submission_date: today, submitted_by: user?.id, status: 'open' })
    .select()
    .single();
  return created;
}

export async function getSubmissionItems(submissionId) {
  const { data } = await supabase
    .from('nightly_submission_items')
    .select(`
      id, quantity_sold, retail_price,
      products ( id, name, product_number, categories(category_number, name) )
    `)
    .eq('submission_id', submissionId)
    .order('created_at');
  return data ?? [];
}

export async function upsertSubmissionItem(submissionId, productId, quantitySold, retailPrice) {
  const { data: existing } = await supabase
    .from('nightly_submission_items')
    .select('id')
    .eq('submission_id', submissionId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    return supabase.from('nightly_submission_items')
      .update({ quantity_sold: quantitySold, retail_price: retailPrice })
      .eq('id', existing.id);
  }
  return supabase.from('nightly_submission_items')
    .insert({ submission_id: submissionId, product_id: productId, quantity_sold: quantitySold, retail_price: retailPrice });
}

export async function updateSalesTotal(submissionId, salesTotal) {
  return supabase.from('nightly_submissions')
    .update({ sales_total: salesTotal })
    .eq('id', submissionId);
}

export async function submitNightly(submissionId, salesTotal) {
  const user = await getCurrentUser();
  return supabase.from('nightly_submissions')
    .update({ status: 'submitted', sales_total: salesTotal, submitted_at: new Date().toISOString(), submitted_by: user?.id })
    .eq('id', submissionId);
}

export async function approveNightly(submissionId) {
  const user = await getCurrentUser();
  return supabase.from('nightly_submissions')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id })
    .eq('id', submissionId);
}

export async function rejectNightly(submissionId, reason) {
  const user = await getCurrentUser();
  return supabase.from('nightly_submissions')
    .update({ status: 'rejected', rejection_reason: reason, approved_by: user?.id })
    .eq('id', submissionId);
}
