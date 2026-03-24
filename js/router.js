/* ============================================================
   ROUTER — Client-side path routing for the SPA
   Maps URL paths to page modules and renders them into #outlet
   ============================================================ */

import { requireAuth, getCurrentProfile, getTopRole, getLocationLabel, applySidebarRole } from './supabase.js';
import { CONFIG } from '../config.js';

/* ── Route map: path → page module ── */
const ROUTES = {
  '/':                 () => import('./pages/dashboard.js'),
  '/dashboard':        () => import('./pages/dashboard.js'),
  '/inventory':        () => import('./pages/inventory.js'),
  '/products':         () => import('./pages/products.js'),
  '/nightly':          () => import('./pages/nightly.js'),
  '/suppliers':        () => import('./pages/suppliers.js'),
  '/purchase-orders':  () => import('./pages/purchase-orders.js'),
  '/reports':          () => import('./pages/reports.js'),
  '/activity':         () => import('./pages/activity.js'),
  '/settings':         () => import('./pages/settings.js'),
  '/import':           () => import('./pages/import.js'),
};

/* ── Nav path map for active state ── */
const NAV_PATHS = {
  '/':               'dashboard',
  '/dashboard':      'dashboard',
  '/inventory':      'inventory',
  '/products':       'products',
  '/nightly':        'nightly',
  '/suppliers':      'suppliers',
  '/purchase-orders':'purchase-orders',
  '/reports':        'reports',
  '/activity':       'activity',
  '/settings':       'settings',
  '/import':         'products',
};

let _currentPath = null;
let _profile     = null;

/* ── Init ── */
export async function initRouter() {
  // Auth guard
  const user = await requireAuth();
  if (!user) return;

  // Load profile once — cached in sessionStorage by supabase.js
  _profile = await getCurrentProfile();
  if (!_profile) { window.location.href = '/login'; return; }

  // Populate header
  populateHeader(_profile);

  // Apply role-based sidebar visibility
  const role = getTopRole(_profile);
  applySidebarRole(role);

  // Intercept all link clicks
  document.addEventListener('click', handleClick);

  // Handle browser back/forward
  window.addEventListener('popstate', () => navigate(location.pathname, false));

  // Navigate to current path
  await navigate(location.pathname, false);
}

/* ── Navigate ── */
export async function navigate(path, pushState = true) {
  // Normalize trailing slash
  const cleanPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;

  if (pushState && cleanPath !== _currentPath) {
    history.pushState({}, '', cleanPath);
  }
  _currentPath = cleanPath;

  // Update sidebar active state
  setActiveNav(cleanPath);

  // Find matching route
  const loader = ROUTES[cleanPath] || ROUTES['/'];

  // Show loading state in outlet
  const outlet = document.getElementById('outlet');
  outlet.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.78rem;">Loading…</div>';

  try {
    const module = await loader();
    // Each page module exports an init(profile) function
    await module.init(_profile);
  } catch(e) {
    console.error('Route error:', e);
    outlet.innerHTML = `<div style="padding:40px;color:var(--crimson);font-family:'DM Mono',monospace;">
      Failed to load page: ${e.message}
    </div>`;
  }
}

/* ── Intercept link clicks ── */
function handleClick(e) {
  const link = e.target.closest('[data-route]');
  if (!link) return;
  e.preventDefault();
  const path = link.dataset.route;
  if (path) navigate(path);
}

/* ── Active nav ── */
function setActiveNav(path) {
  const activeKey = NAV_PATHS[path] || 'dashboard';
  document.querySelectorAll('.nav-item[data-route]').forEach(el => {
    const elPath = el.dataset.route;
    const elKey  = NAV_PATHS[elPath] || '';
    el.classList.toggle('active', elKey === activeKey);
  });
}

/* ── Populate header with profile (runs once) ── */
function populateHeader(profile) {
  const role     = getTopRole(profile);
  const locLabel = getLocationLabel(profile);
  const name     = profile.display_name || profile.full_name;

  const nameEl = document.getElementById('user-name');
  const locEl  = document.getElementById('user-location');
  const roleEl = document.getElementById('user-role');

  if (nameEl) nameEl.textContent = name;
  if (locEl)  locEl.textContent  = locLabel;
  if (roleEl) {
    roleEl.textContent = role;
    roleEl.className   = 'urole role-' + role;
  }
}

/* ── Expose navigate globally for inline onclick usage ── */
window.navigateTo = navigate;
