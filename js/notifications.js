/* ============================================================
   NOTIFICATIONS — Dynamic panel with persistent read state
   Uses localStorage to track last-read time across pages
   ============================================================ */

let _notifLoaded = false;
const STORAGE_KEY = 'opsmart_notif_last_read';

function toggleNotif() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (isOpen) loadNotifications();
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Loading…</div>';

  try {
    const { supabase } = await import('./supabase.js');

    const [lowRes, txRes] = await Promise.all([
      supabase.from('low_stock_alerts')
        .select('product_name, quantity_on_hand, reorder_point, location_name, sku')
        .order('quantity_on_hand'),
      supabase.from('inventory_transactions')
        .select('type, quantity_delta, created_at, products(name), locations(name), profiles(display_name, full_name)')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const items = [];
    const lowAlerts = lowRes.data ?? [];
    const txRows    = txRes.data ?? [];

    // Low stock / out of stock alerts
    lowAlerts.slice(0, 6).forEach(r => {
      const isOut = r.quantity_on_hand === 0;
      items.push({
        icon: isOut ? '✕' : '⚠',
        type: isOut ? 'danger' : 'warn',
        text: isOut
          ? `<strong>${r.product_name}</strong> is out of stock at ${r.location_name}`
          : `<strong>${r.product_name}</strong> — ${r.quantity_on_hand} units left at ${r.location_name}`,
        time: 'Live alert',
        ts:   null, // live — always show
      });
    });

    // Recent inventory transactions
    txRows.forEach(tx => {
      const who     = tx.profiles?.display_name || tx.profiles?.full_name || 'System';
      const product = tx.products?.name || '—';
      const loc     = tx.locations?.name || '';
      const delta   = tx.quantity_delta > 0 ? '+' + tx.quantity_delta : String(tx.quantity_delta);
      const label   = {
        adjustment: 'adjusted',
        sale:       'recorded sale of',
        receive:    'received stock for',
        initial:    'set opening stock for',
      }[tx.type] || tx.type;

      items.push({
        icon: tx.type === 'sale' ? '↑' : tx.type === 'receive' ? '↓' : '○',
        type: tx.type === 'sale' ? 'info' : 'success',
        text: `<strong>${who}</strong> ${label} <strong>${product}</strong> (${delta} units)`,
        time: timeAgo(tx.created_at) + (loc ? ' · ' + loc : ''),
        ts:   tx.created_at,
      });
    });

    // ── Badge logic using last-read timestamp ─────────────────
    const lastRead     = localStorage.getItem(STORAGE_KEY);
    const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

    // Badge shows if: there are low-stock alerts (always unread)
    // OR there are transactions newer than last-read time
    const hasUnread = lowAlerts.length > 0
      || txRows.some(tx => new Date(tx.created_at).getTime() > lastReadTime);

    updateBadge(hasUnread ? (lowAlerts.length || txRows.length) : 0);

    if (!items.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">No notifications.</div>';
      _notifLoaded = true;
      return;
    }

    list.innerHTML = items.map(n => `
      <div class="notif-item">
        <div class="notif-item-icon ${n.type}">${n.icon}</div>
        <div>
          <div class="notif-item-text">${n.text}</div>
          <div class="notif-item-time">${n.time}</div>
        </div>
      </div>`).join('');

    _notifLoaded = true;

  } catch(e) {
    list.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">Could not load notifications.</div>';
    console.error('Notifications error:', e);
  }
}

function updateBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent   = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── Check badge on page load without opening panel ────────────
async function checkBadgeOnLoad() {
  try {
    const { supabase } = await import('./supabase.js');

    const [lowRes, txRes] = await Promise.all([
      supabase.from('low_stock_alerts')
        .select('product_name', { count: 'exact', head: false })
        .limit(1),
      supabase.from('inventory_transactions')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const lastRead     = localStorage.getItem(STORAGE_KEY);
    const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
    const lowCount     = (lowRes.data ?? []).length;
    const latestTx     = txRes.data?.[0]?.created_at;
    const hasNewTx     = latestTx && new Date(latestTx).getTime() > lastReadTime;

    // Only show badge if there are definite low-stock items or new transactions
    if (lowCount > 0 || hasNewTx) {
      updateBadge(lowCount > 0 ? lowCount : 1);
    } else {
      updateBadge(0);
    }
  } catch(e) {
    // Silently fail — badge just won't show
  }
}

// ── Mark all read ─────────────────────────────────────────────
function markAllRead() {
  // Save current time as last-read
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  updateBadge(0);

  const list = document.getElementById('notif-list');
  if (list) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-family:\'DM Mono\',monospace;font-size:0.75rem;">All caught up.</div>';
  }
  _notifLoaded = false;
  document.getElementById('notif-panel')?.classList.remove('open');
}

// Close when clicking outside
document.addEventListener('click', function(e) {
  const panel = document.getElementById('notif-panel');
  const btn   = document.getElementById('notif-btn');
  if (!panel || !btn) return;
  if (!panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
});

// Wire buttons and run badge check on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const clearBtn = document.getElementById('notif-clear-btn');
  if (clearBtn) clearBtn.addEventListener('click', markAllRead);

  // Check badge without loading full panel
  checkBadgeOnLoad();
});

// Expose reload
window.reloadNotifications = function() {
  _notifLoaded = false;
  const panel = document.getElementById('notif-panel');
  if (panel?.classList.contains('open')) loadNotifications();
};
