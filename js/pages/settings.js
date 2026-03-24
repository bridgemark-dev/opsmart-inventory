/* PAGE: settings */
import { signOut, supabase, getTopRole, getLocationLabel } from '../supabase.js';

let _profile = null;
let locations = [];
let editingCatId = null;
let editingBrandId = null;

const _HTML = `<div class="page-header">
    <div>
      <div class="page-title">Settings</div>
      <div class="page-subtitle">PANDORA'S BOX - SYSTEM CONFIGURATION · OWNER ACCESS REQUIRED FOR SOME SECTIONS</div>
    </div>
  </div>

  <div class="accent-line"></div>
  <div style="height:20px;"></div>

  <div class="settings-grid">

    <!-- Left nav -->
    <div class="settings-nav">
      <div class="settings-nav-item active" data-section="users"          data-min-role="owner">Users & Access</div>
      <div class="settings-nav-item"        data-section="stores"         data-min-role="owner">Store Setup</div>
      <div class="settings-nav-item"        data-section="inventory"      data-min-role="owner">Inventory Defaults</div>
      <div class="settings-nav-item"        data-section="pricing"        data-min-role="owner">Pricing & Tax</div>
      <div class="settings-nav-item"        data-section="categories"     data-min-role="manager">Categories</div>
      <div class="settings-nav-item"        data-section="brands"         data-min-role="manager">Brands</div>
      <div class="settings-nav-item"        data-section="notifications"  data-min-role="manager">Notifications</div>
      <div class="settings-nav-item"        data-section="account">My Account</div>
    </div>

    <!-- Right content -->
    <div>

      <!-- ══════════════════════════════════
           USERS & ACCESS
      ══════════════════════════════════ -->
      <div class="settings-section active" id="section-users">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div>
              <div class="settings-panel-title">Users & Access</div>
              <div class="settings-panel-sub">Manage who can access the system and what they can do</div>
            </div>
            <button class="btn btn-primary btn-sm" id="add-user-btn">+ Add User</button>
          </div>
          <div class="settings-panel-body">
            <div id="users-list">
              <div style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.78rem;">Loading users…</div>
            </div>
          </div>
        </div>

        <!-- Role guide -->
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">Role Permissions</div>
          </div>
          <div class="settings-panel-body">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label"><span class="role-chip owner">Owner</span></div>
                <div class="setting-desc" style="margin-top:4px;">Full access to all locations, settings, user management, and financial data. Can add/remove users and change roles.</div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label"><span class="role-chip manager">Manager</span></div>
                <div class="setting-desc" style="margin-top:4px;">Full inventory access at assigned locations. Can approve nightly submissions, adjust stock, create POs, and view reports. Cannot manage users or system settings.</div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label"><span class="role-chip employee">Employee</span></div>
                <div class="setting-desc" style="margin-top:4px;">Can view inventory and submit nightly totals at their assigned location. Cannot adjust stock, approve submissions, or access reports.</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           STORE SETUP
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-stores">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">Store Locations</div>
            <div class="settings-panel-sub">Add, edit, or remove store locations</div>
          </div>
          <div class="settings-panel-body" id="locations-body">
            <div style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.78rem;">Loading locations…</div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           INVENTORY DEFAULTS
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-inventory">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">Inventory Defaults</div>
          </div>
          <div class="settings-panel-body">

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Default Reorder Point</div>
                <div class="setting-desc">Low-stock alert fires when quantity drops to or below this number. Applied to new products — existing products keep their individual settings.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input" type="number" id="s-reorder-point" min="0" placeholder="5">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Default Reorder Quantity</div>
                <div class="setting-desc">Suggested quantity to order when a product hits its reorder point.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input" type="number" id="s-reorder-qty" min="0" placeholder="20">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Allow Negative Inventory</div>
                <div class="setting-desc">If enabled, stock can go below zero. Recommended off — prevents phantom stock situations.</div>
              </div>
              <div class="setting-control">
                <label class="setting-checkbox-label">
                  <input type="checkbox" id="s-negative-inv" class="setting-checkbox">
                  <span class="setting-checkbox-box"></span>
                </label>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">SKU Format</div>
                <div class="setting-desc">How product SKUs are assigned. Manual = you set category/product numbers. Auto = system generates sequentially.</div>
              </div>
              <div class="setting-control">
                <select class="setting-select" id="s-sku-format">
                  <option value="manual">Manual</option>
                  <option value="auto">Auto-generate</option>
                </select>
              </div>
            </div>

            <div class="settings-save-bar">
              <span class="settings-saved-msg" id="inv-saved">✓ Saved</span>
              <button class="btn btn-primary" id="save-inv-btn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           PRICING & TAX
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-pricing">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">Pricing & Tax</div>
          </div>
          <div class="settings-panel-body">

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Washington Tax Rate (%)</div>
                <div class="setting-desc">Applied to Richland and Kennewick locations.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input" type="number" id="s-tax-wa" min="0" max="30" step="0.1" placeholder="8.6">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Oregon Tax Rate (%)</div>
                <div class="setting-desc">Applied to Pendleton location. Oregon has no sales tax — set to 0 unless your situation differs.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input" type="number" id="s-tax-or" min="0" max="30" step="0.1" placeholder="0">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Tax Included in Price</div>
                <div class="setting-desc">If on, retail prices already include tax. If off, tax is added at checkout.</div>
              </div>
              <div class="setting-control">
                <label class="setting-checkbox-label">
                  <input type="checkbox" id="s-tax-included" class="setting-checkbox">
                  <span class="setting-checkbox-box"></span>
                </label>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Default Markup % <span style="color:var(--text-muted);font-size:0.72rem;">(optional)</span></div>
                <div class="setting-desc">If set, products without a retail price will default to cost × (1 + markup). Leave blank to not enforce.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input" type="number" id="s-markup" min="0" max="500" step="1" placeholder="—">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Minimum Margin % <span style="color:var(--text-muted);font-size:0.72rem;">(optional)</span></div>
                <div class="setting-desc">Warn if a product's margin falls below this threshold. Protects against accidental underpricing.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input" type="number" id="s-min-margin" min="0" max="100" step="1" placeholder="—">
              </div>
            </div>

            <div class="settings-save-bar">
              <span class="settings-saved-msg" id="pricing-saved">✓ Saved</span>
              <button class="btn btn-primary" id="save-price-btn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           CATEGORIES
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-categories">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">Product Categories</div>
            <button class="btn btn-primary btn-sm" id="add-cat-btn">+ Add</button>
          </div>
          <div class="settings-panel-body" id="categories-body">
            <div style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.78rem;">Loading…</div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           BRANDS
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-brands">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div>
              <div class="settings-panel-title">Brand List</div>
              <div class="settings-panel-sub">Standardised brand names for consistent product data</div>
            </div>
            <button class="btn btn-primary btn-sm" id="add-brand-btn">+ Add</button>
          </div>
          <div class="settings-panel-body" id="brands-body">
            <div style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.78rem;">Loading…</div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           NOTIFICATIONS
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-notifications">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">Notification Preferences</div>
          </div>
          <div class="settings-panel-body">

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Low Stock Alerts</div>
                <div class="setting-desc">Show a notification when any product drops to or below its reorder point.</div>
              </div>
              <div class="setting-control">
                <label class="setting-checkbox-label">
                  <input type="checkbox" id="s-notify-low" class="setting-checkbox">
                  <span class="setting-checkbox-box"></span>
                </label>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Out of Stock Alerts</div>
                <div class="setting-desc">Show a notification when any product hits zero stock.</div>
              </div>
              <div class="setting-control">
                <label class="setting-checkbox-label">
                  <input type="checkbox" id="s-notify-oos" class="setting-checkbox">
                  <span class="setting-checkbox-box"></span>
                </label>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Daily Sales Summary</div>
                <div class="setting-desc">Show a summary of the day's approved nightly submissions on the dashboard.</div>
              </div>
              <div class="setting-control">
                <label class="setting-checkbox-label">
                  <input type="checkbox" id="s-notify-daily" class="setting-checkbox">
                  <span class="setting-checkbox-box"></span>
                </label>
              </div>
            </div>

            <div class="settings-save-bar">
              <span class="settings-saved-msg" id="notif-saved">✓ Saved</span>
              <button class="btn btn-primary" id="save-notif-btn">Save Changes</button>
            </div>
          </div>
        </div>
      </div>


      <!-- ══════════════════════════════════
           MY ACCOUNT
      ══════════════════════════════════ -->
      <div class="settings-section" id="section-account">
        <div class="settings-panel">
          <div class="settings-panel-header">
            <div class="settings-panel-title">My Account</div>
          </div>
          <div class="settings-panel-body">

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Full Name</div>
                <div class="setting-desc">Your legal name — used in audit logs and reports.</div>
              </div>
              <div class="setting-control">
                <input class="setting-input wide" type="text" id="a-full-name" placeholder="Full name">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Display Name</div>
                <div class="setting-desc">Short name shown in the header and activity feed (e.g. "Talon L.").</div>
              </div>
              <div class="setting-control">
                <input class="setting-input wide" type="text" id="a-display-name" placeholder="Display name">
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-label">Interface Theme</div>
                <div class="setting-desc">Saved to this browser only.</div>
              </div>
              <div class="setting-control">
                <select class="setting-select" id="a-theme" onchange="applyTheme(this.value)">
                  <option value="dark">Dark</option>
                  <option value="light">Light (coming soon)</option>
                </select>
              </div>
            </div>

            <div class="settings-save-bar">
              <span class="settings-saved-msg" id="account-saved">✓ Saved</span>
              <button class="btn btn-primary" id="save-acc-btn">Save Changes</button>
            </div>

            <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border);">
              <button class="btn btn-ghost" id="sign-out-btn" style="color:var(--crimson);border-color:var(--crimson);">
                Sign Out
              </button>
            </div>

          </div>
        </div>
      </div>

    </div><!-- /right content -->
  </div><!-- /settings-grid -->
<!-- Add/Edit User Modal -->
<div class="modal-overlay" id="user-modal">
  <div class="modal" style="max-width:500px;">
    <div class="modal-header">
      <div class="modal-title" id="user-modal-title">Add User</div>
      <div class="modal-close" data-close-modal="user-modal">×</div>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="modal-label">Full Name <span style="color:var(--crimson);">*</span></label>
        <input class="form-control" type="text" id="u-full-name" placeholder="Employee full name">
      </div>
      <div class="form-group">
        <label class="modal-label">Display Name</label>
        <input class="form-control" type="text" id="u-display-name" placeholder="e.g. Jordan M.">
      </div>
      <div class="form-group">
        <label class="modal-label">Email Address <span style="color:var(--crimson);">*</span></label>
        <input class="form-control" type="email" id="u-email" placeholder="employee@email.com">
        <div class="form-hint">A Supabase account must be created manually for this user in the Supabase dashboard, then their UUID entered below.</div>
      </div>
      <div class="form-group">
        <label class="modal-label">Supabase User UUID <span style="color:var(--crimson);">*</span></label>
        <input class="form-control" type="text" id="u-uuid" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:'DM Mono',monospace;font-size:0.82rem;">
        <div class="form-hint">Found in Supabase Dashboard → Authentication → Users → click the user.</div>
      </div>
      <div style="margin-top:4px;font-size:0.72rem;color:var(--text-muted);font-family:'DM Mono',monospace;margin-bottom:12px;">ASSIGN TO LOCATIONS</div>
      <div id="u-location-roles">
        <!-- Populated by JS -->
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-cancel-btn" data-close-modal="user-modal">Cancel</button>
      <button class="modal-submit-btn" id="save-user-btn">Save User</button>
    </div>
  </div>
</div>

<!-- Category Form Modal -->
<div class="modal-overlay" id="cat-modal">
  <div class="modal" style="max-width:420px;">
    <div class="modal-header">
      <div class="modal-title" id="cat-modal-title">Add Category</div>
      <div class="modal-close" data-close-modal="cat-modal">×</div>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="modal-label">Category # <span style="color:var(--crimson);">*</span></label>
          <input class="form-control" type="number" id="cat-num" placeholder="10" min="1">
          <div class="form-hint">The SKU prefix (e.g. 10 → 10/172)</div>
        </div>
        <div class="form-group">
          <label class="modal-label">Name <span style="color:var(--crimson);">*</span></label>
          <input class="form-control" type="text" id="cat-name" placeholder="Disposables">
        </div>
      </div>
      <div class="form-group">
        <label class="modal-label">Description</label>
        <input class="form-control" type="text" id="cat-desc" placeholder="Optional description">
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-cancel-btn" data-close-modal="cat-modal">Cancel</button>
      <button class="modal-submit-btn" id="save-cat-btn">Save Category</button>
    </div>
  </div>
</div>

<!-- Brand Form Modal -->
<div class="modal-overlay" id="brand-modal">
  <div class="modal" style="max-width:380px;">
    <div class="modal-header">
      <div class="modal-title" id="brand-modal-title">Add Brand</div>
      <div class="modal-close" data-close-modal="brand-modal">×</div>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="modal-label">Brand Name <span style="color:var(--crimson);">*</span></label>
        <input class="form-control" type="text" id="brand-name" placeholder="e.g. Elf Bar">
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-cancel-btn" data-close-modal="brand-modal">Cancel</button>
      <button class="modal-submit-btn" id="save-brand-btn">Save Brand</button>
    </div>
  </div>
</div>

<!-- Confirm dialog -->
<div class="confirm-overlay" id="confirm-overlay">
  <div class="confirm-box">
    <div class="confirm-title" id="confirm-title">Are you sure?</div>
    <div class="confirm-msg"   id="confirm-msg"></div>
    <div class="confirm-actions">
      <button class="btn btn-secondary" id="close-confirm-btn">Cancel</button>
      <button class="btn btn-danger"    id="confirm-ok-btn">Confirm</button>
    </div>
  </div>
</div>

<div class="notif-panel" id="notif-panel">
  <div class="notif-head">
    <span class="notif-head-title">Notifications</span>
    <span class="notif-head-clear" id="notif-clear-btn">Mark all read</span>
  </div>
  <div class="notif-list" id="notif-list">
    <div style="padding:16px;text-align:center;color:var(--text-muted);font-family:'DM Mono',monospace;font-size:0.75rem;">Loading…</div>
  </div>
</div>`;

export async function init(profile) {
  _profile = profile;
  profile = p;
  document.getElementById('outlet').innerHTML = _HTML;

  // Pre-fill account fields
  const fnEl = document.getElementById('a-full-name');
  const dnEl = document.getElementById('a-display-name');
  if (fnEl) fnEl.value = _profile.full_name    || '';
  if (dnEl) dnEl.value = _profile.display_name || '';

  const {data:locs} = await supabase.from('locations').select('id,name,city,state,address,phone').order('name');
  locations = locs ?? [];

  const role = getTopRole(profile);
  applySettingsRoleNav(role);
  await loadSettings();

  if (role === 'employee') {
    const accountNav = document.querySelector('[data-section="account"]');
    if (accountNav) switchSection('account', accountNav);
  } else {
    await loadSection('users');
  }

  wireCheckboxes();
  wireButtons();
}


async function _run(profile) {

// Header — no avatar box, show name + location + role chip
const _rArr = _profile.locations.map(l => l.role);
const role = _rArr.includes('owner') ? 'owner' : _rArr.includes('manager') ? 'manager' : 'employee';
// Subtitle
const subEl = document.getElementById('page-subtitle');
if (subEl) subEl.textContent = "PANDORA'S BOX · SYSTEM CONFIGURATION";

// Account fields
document.getElementById('a-full-name').value    = _profile.full_name    ||'';
document.getElementById('a-display-name').value = _profile.display_name||'';

// Load locations
const {data:locs} = await supabase.from('locations').select('id,name,city,state,address,phone').order('name');
locations = locs??[];

// Apply role-based settings nav visibility
applySettingsRoleNav(role);

await loadSettings();

// Navigate employees directly to My Account (only section they can see)
if (role === 'employee') {
    const accountNav = document.querySelector('[data-section="account"]');
    if (accountNav) switchSection('account', accountNav);
} else {
    await loadSection('users');
}

wireCheckboxes();
wireButtons();
}

function applySettingsRoleNav(role) {
const roleOrder = { owner:3, manager:2, employee:1 };
document.querySelectorAll('.settings-nav-item[data-min-role]').forEach(el => {
    const minRole = el.dataset.minRole;
    if ((roleOrder[role]||0) < (roleOrder[minRole]||0)) {
      el.style.display = 'none';
    }
});
}

function wireButtons() {
// Nav items use data-section attribute
document.querySelectorAll('.settings-nav-item[data-section]').forEach(el =>
    el.addEventListener('click', () => switchSection(el.dataset.section, el)));

// Static buttons by ID
[['add-user-btn',openAddUser],['add-cat-btn',()=>openCategoryForm()],['add-brand-btn',()=>openBrandForm()],
   ['save-user-btn',saveUser],['save-cat-btn',saveCategory],['save-brand-btn',saveBrand],
   ['save-inv-btn',saveInventorySettings],['save-price-btn',savePricingSettings],
   ['save-notif-btn',saveNotificationSettings],['save-acc-btn',saveAccountSettings],
   ['sign-out-btn',handleSignOut],['close-confirm-btn',closeConfirm]
].forEach(([id,fn]) => { const el=document.getElementById(id); if(el) el.addEventListener('click',fn); });

// Modal close buttons
document.querySelectorAll('[data-close-modal]').forEach(el =>
    el.addEventListener('click', () => closeModal(el.dataset.closeModal)));

// Click outside modal to close
document.querySelectorAll('.modal-overlay').forEach(el =>
    el.addEventListener('click', e => { if(e.target===el) closeModal(el.id); }));
}

function switchSection(section, el) {
document.querySelectorAll('.settings-nav-item').forEach(i=>i.classList.remove('active'));
document.querySelectorAll('.settings-section').forEach(s=>s.classList.remove('active'));
el.classList.add('active');
document.getElementById('section-'+section).classList.add('active');
loadSection(section);
}

async function loadSection(s) {
if(s==='users')      return loadUsers();
if(s==='stores')     return loadStores();
if(s==='categories') return loadCategories();
if(s==='brands')     return loadBrands();
}

async function loadSettings() {
const keys=['default_reorder_point','default_reorder_qty','allow_negative_inventory','sku_format',
    'tax_wa','tax_or','tax_included_in_price','default_markup_pct','min_margin_pct',
    'notify_low_stock','notify_out_of_stock','notify_daily_summary'];
const {data} = await supabase.from('app_settings').select('key,value').in('key',keys);
const s={}; (data??[]).forEach(r=>{s[r.key]=r.value;});
sv('s-reorder-point',s.default_reorder_point??5); sv('s-reorder-qty',s.default_reorder_qty??20);
sc('s-negative-inv',s.allow_negative_inventory===true||s.allow_negative_inventory==='true');
sv('s-sku-format',s.sku_format??'manual'); sv('s-tax-wa',s.tax_wa??8.6); sv('s-tax-or',s.tax_or??0);
sc('s-tax-included',s.tax_included_in_price===true||s.tax_included_in_price==='true');
sv('s-markup',s.default_markup_pct??''); sv('s-min-margin',s.min_margin_pct??'');
sc('s-notify-low',s.notify_low_stock!==false&&s.notify_low_stock!=='false');
sc('s-notify-oos',s.notify_out_of_stock!==false&&s.notify_out_of_stock!=='false');
sc('s-notify-daily',s.notify_daily_summary!==false&&s.notify_daily_summary!=='false');
}
const sv=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??'';};
const sc=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=!!v;};

function wireCheckboxes() {
document.querySelectorAll('.setting-checkbox-label').forEach(l=>
    l.addEventListener('click',function(){const c=this.querySelector('.setting-checkbox');if(c)c.checked=!c.checked;}));
}

async function saveInventorySettings() {
await Promise.all([
    supabase.rpc('update_setting',{p_key:'default_reorder_point',p_value:parseInt(document.getElementById('s-reorder-point').value)||5}),
    supabase.rpc('update_setting',{p_key:'default_reorder_qty',p_value:parseInt(document.getElementById('s-reorder-qty').value)||20}),
    supabase.rpc('update_setting',{p_key:'allow_negative_inventory',p_value:document.getElementById('s-negative-inv').checked}),
    supabase.rpc('update_setting',{p_key:'sku_format',p_value:document.getElementById('s-sku-format').value}),
]);
showSaved('inv-saved'); showToast('Inventory settings saved.');
}
async function savePricingSettings() {
const mu=document.getElementById('s-markup').value, mm=document.getElementById('s-min-margin').value;
await Promise.all([
    supabase.rpc('update_setting',{p_key:'tax_wa',p_value:parseFloat(document.getElementById('s-tax-wa').value)||0}),
    supabase.rpc('update_setting',{p_key:'tax_or',p_value:parseFloat(document.getElementById('s-tax-or').value)||0}),
    supabase.rpc('update_setting',{p_key:'tax_included_in_price',p_value:document.getElementById('s-tax-included').checked}),
    supabase.rpc('update_setting',{p_key:'default_markup_pct',p_value:mu?parseFloat(mu):null}),
    supabase.rpc('update_setting',{p_key:'min_margin_pct',p_value:mm?parseFloat(mm):null}),
]);
showSaved('pricing-saved'); showToast('Pricing settings saved.');
}
async function saveNotificationSettings() {
await Promise.all([
    supabase.rpc('update_setting',{p_key:'notify_low_stock',p_value:document.getElementById('s-notify-low').checked}),
    supabase.rpc('update_setting',{p_key:'notify_out_of_stock',p_value:document.getElementById('s-notify-oos').checked}),
    supabase.rpc('update_setting',{p_key:'notify_daily_summary',p_value:document.getElementById('s-notify-daily').checked}),
]);
showSaved('notif-saved'); showToast('Notification preferences saved.');
}
async function saveAccountSettings() {
const fn=document.getElementById('a-full-name').value.trim(), dn=document.getElementById('a-display-name').value.trim();
if(!fn){showToast('Full name is required.');return;}
const {error}=await supabase.rpc('update_profile',{p_user_id:_profile.id,p_full_name:fn,p_display_name:dn||null});
if(error){showToast('Save failed: '+error.message);return;}
showSaved('account-saved'); showToast('Account updated.');
document.getElementById('user-avatar').textContent=(dn||fn).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
}
function showSaved(id){const e=document.getElementById(id);if(!e)return;e.classList.add('visible');setTimeout(()=>e.classList.remove('visible'),2500);}

async function loadUsers() {
const {data:users}=await supabase.from('profiles').select('id,full_name,display_name,is_active').order('full_name');
const {data:ul}=await supabase.from('user_locations').select('user_id,role,locations(name)');
const lm={}; (ul??[]).forEach(r=>{if(!lm[r.user_id])lm[r.user_id]=[];lm[r.user_id].push({role:r.role,location:r.locations?.name});});
const el=document.getElementById('users-list');
const isOwner=_profile.locations.some(l=>l.role==='owner');
if(!(users??[]).length){el.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;">No users yet.</div>';return;}
el.innerHTML=(users??[]).map(u=>{
    const ini=(u.display_name||u.full_name).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const chips=(lm[u.id]??[]).map(l=>`<span class="role-chip ${l.role}">${l.location} — ${l.role}</span>`).join('');
    const isSelf=u.id===_profile.id;
    return `<div class="user-card">
      <div class="user-card-avatar">${ini}</div>
      <div class="user-card-info">
        <div class="user-card-name">${u.full_name}${u.display_name?` <span style="color:var(--text-muted);font-size:0.75rem;">(${u.display_name})</span>`:''}</div>
        <div class="user-card-roles">${chips}${!u.is_active?'<span class="role-chip inactive">Inactive</span>':''}</div>
      </div>
      ${isOwner?`<div class="user-card-actions">
        <button class="btn btn-ghost btn-sm ue-btn" data-id="${u.id}">Edit</button>
        ${!isSelf?(u.is_active?`<button class="btn btn-ghost btn-sm ud-btn" style="color:var(--crimson);" data-id="${u.id}" data-name="${u.full_name}">Deactivate</button>`:`<button class="btn btn-ghost btn-sm ur-btn" style="color:var(--sage);" data-id="${u.id}">Reactivate</button>`):'<span style="font-size:0.72rem;color:var(--text-muted);">(you)</span>'}
      </div>`:''}
    </div>`;
}).join('');
el.querySelectorAll('.ue-btn').forEach(b=>b.addEventListener('click',()=>editUser(b.dataset.id)));
el.querySelectorAll('.ud-btn').forEach(b=>b.addEventListener('click',()=>deactivateUser(b.dataset.id,b.dataset.name)));
el.querySelectorAll('.ur-btn').forEach(b=>b.addEventListener('click',()=>reactivateUser(b.dataset.id)));
}

function openAddUser() {
document.getElementById('user-modal-title').textContent='Add User';
['u-full-name','u-display-name','u-email','u-uuid'].forEach(id=>{const e=document.getElementById(id);e.value='';e.disabled=false;});
renderLRS([]); document.getElementById('user-modal').classList.add('open');
}
async function editUser(id) {
const {data:u}=await supabase.from('profiles').select('*').eq('id',id).single();
const {data:ul}=await supabase.from('user_locations').select('location_id,role').eq('user_id',id);
document.getElementById('user-modal-title').textContent='Edit User';
document.getElementById('u-full-name').value=u?.full_name||'';
document.getElementById('u-display-name').value=u?.display_name||'';
document.getElementById('u-email').value='(already set)'; document.getElementById('u-email').disabled=true;
document.getElementById('u-uuid').value=id; document.getElementById('u-uuid').disabled=true;
renderLRS(ul??[]); document.getElementById('user-modal').classList.add('open');
}
function renderLRS(existing) {
const lm={}; (existing||[]).forEach(r=>{lm[r.location_id]=r.role;});
document.getElementById('u-location-roles').innerHTML=locations.map(loc=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:0.82rem;font-weight:500;">${loc.name}</span>
      <select class="setting-select" data-loc="${loc.id}" style="width:140px;">
        <option value="">No access</option>
        <option value="employee" ${lm[loc.id]==='employee'?'selected':''}>Employee</option>
        <option value="manager"  ${lm[loc.id]==='manager' ?'selected':''}>Manager</option>
        <option value="owner"    ${lm[loc.id]==='owner'   ?'selected':''}>Owner</option>
      </select>
    </div>`).join('');
}
async function saveUser() {
const fn=document.getElementById('u-full-name').value.trim(), dn=document.getElementById('u-display-name').value.trim(), uuid=document.getElementById('u-uuid').value.trim();
if(!fn||!uuid){showToast('Full name and UUID are required.');return;}
const {error}=await supabase.from('profiles').upsert({id:uuid,full_name:fn,display_name:dn||null},{onConflict:'id'});
if(error){showToast('Failed: '+error.message);return;}
for(const sel of document.querySelectorAll('[data-loc]')){
    if(sel.value) await supabase.rpc('set_user_role',{p_user_id:uuid,p_location_id:sel.dataset.loc,p_role:sel.value});
    else          await supabase.rpc('remove_user_location',{p_user_id:uuid,p_location_id:sel.dataset.loc});
}
['u-uuid','u-email'].forEach(id=>{document.getElementById(id).disabled=false;});
closeModal('user-modal'); showToast(fn+' saved.'); await loadUsers();
}
async function deactivateUser(id,name) {
showConfirm('Deactivate '+name+'?','They will lose access. Records are preserved.',async()=>{
    await supabase.rpc('deactivate_user',{p_user_id:id}); showToast(name+' deactivated.'); await loadUsers();});
}
async function reactivateUser(id) {
await supabase.from('profiles').update({is_active:true}).eq('id',id); showToast('User reactivated.'); await loadUsers();
}

async function loadStores() {
const {data:fl}=await supabase.from('locations').select('id,name,city,state,address,phone,is_active').order('name');
locations=fl??[];
renderLocationCards();
}

function renderLocationCards() {
const el=document.getElementById('locations-body');
const cards = locations.map(loc=>`
    <div class="location-card" id="loc-card-${loc.id}">
      <div class="location-card-header">
        <div class="location-card-name">${loc.name}</div>
        <div style="display:flex;gap:6px;">
          <span style="font-size:0.65rem;font-family:'DM Mono',monospace;color:var(--text-muted);padding:2px 8px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);">
            ${loc.state||'—'}
          </span>
        </div>
      </div>
      <div class="location-card-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label-sm">Location Name</label>
            <input class="form-control" type="text" data-loc="${loc.id}" data-field="name" value="${loc.name||''}">
          </div>
          <div class="form-group">
            <label class="form-label-sm">Phone</label>
            <input class="form-control" type="tel" data-loc="${loc.id}" data-field="phone" value="${loc.phone||''}" placeholder="(509) 555-0100">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label-sm">Address</label>
          <input class="form-control" type="text" data-loc="${loc.id}" data-field="address" value="${loc.address||''}" placeholder="Street address">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label-sm">City</label>
            <input class="form-control" type="text" data-loc="${loc.id}" data-field="city" value="${loc.city||''}">
          </div>
          <div class="form-group">
            <label class="form-label-sm">State</label>
            <input class="form-control" type="text" data-loc="${loc.id}" data-field="state" value="${loc.state||''}" maxlength="2" style="text-transform:uppercase;">
          </div>
        </div>
        <div class="location-card-actions">
          <button class="btn btn-primary btn-sm loc-save-btn" data-lid="${loc.id}">Save Changes</button>
          <button class="btn btn-ghost btn-sm loc-del-btn" data-lid="${loc.id}" data-lname="${loc.name}" style="color:var(--crimson);border-color:var(--crimson);margin-left:auto;">Delete Location</button>
        </div>
      </div>
    </div>`).join('');

el.innerHTML = cards + `
    <div class="add-location-wrap">
      <button class="btn btn-secondary" id="add-location-btn">+ Add Location</button>
    </div>`;

el.querySelectorAll('.loc-save-btn').forEach(b=>b.addEventListener('click',()=>saveLocation(b.dataset.lid)));
el.querySelectorAll('.loc-del-btn').forEach(b=>b.addEventListener('click',()=>deleteLocation(b.dataset.lid,b.dataset.lname)));
const addBtn = document.getElementById('add-location-btn');
if (addBtn) addBtn.addEventListener('click', openAddLocation);
}

async function saveLocation(id) {
const fields=['name','city','state','address','phone'];
const v={};
fields.forEach(f=>{
    const e=document.querySelector(`[data-loc="${id}"][data-field="${f}"]`);
    if(e) v[f]=e.value.trim();
});
const {error}=await supabase.rpc('update_location',{
    p_id:id, p_name:v.name||'', p_city:v.city||'',
    p_state:v.state||'', p_address:v.address||null, p_phone:v.phone||null
});
if(error){showToast('Save failed: '+error.message);return;}
showToast((v.name||'Location')+' updated.');
await loadStores();
}

async function deleteLocation(id, name) {
showConfirm('Delete "'+name+'"?',
    'This will permanently remove this location. All associated inventory and records will be affected.',
    async () => {
      const {error} = await supabase.from('locations').update({is_active:false}).eq('id',id);
      if(error){showToast('Delete failed: '+error.message);return;}
      showToast(name+' removed.');
      await loadStores();
    });
}

function openAddLocation() {
// Reuse the existing location modal pattern — open a simple inline form
const el = document.getElementById('locations-body');
if (document.getElementById('new-loc-form')) return; // already open

const form = document.createElement('div');
form.id = 'new-loc-form';
form.className = 'location-card';
form.style.border = '1px solid var(--gold)';
form.innerHTML = `
    <div class="location-card-header">
      <div class="location-card-name" style="color:var(--text);">New Location</div>
    </div>
    <div class="location-card-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label-sm">Location Name *</label>
          <input class="form-control" id="new-loc-name" type="text" placeholder="e.g. Tri-Cities WA">
        </div>
        <div class="form-group">
          <label class="form-label-sm">Phone</label>
          <input class="form-control" id="new-loc-phone" type="tel" placeholder="(509) 555-0100">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label-sm">Address</label>
        <input class="form-control" id="new-loc-address" type="text" placeholder="Street address">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label-sm">City</label>
          <input class="form-control" id="new-loc-city" type="text">
        </div>
        <div class="form-group">
          <label class="form-label-sm">State</label>
          <input class="form-control" id="new-loc-state" type="text" maxlength="2" style="text-transform:uppercase;">
        </div>
      </div>
      <div class="location-card-actions">
        <button class="btn btn-primary btn-sm" id="save-new-loc-btn">Add Location</button>
        <button class="btn btn-ghost btn-sm" id="cancel-new-loc-btn" style="margin-left:auto;">Cancel</button>
      </div>
    </div>`;

el.insertBefore(form, el.querySelector('.add-location-wrap'));

document.getElementById('save-new-loc-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-loc-name').value.trim();
    if (!name) { showToast('Location name is required.'); return; }
    const {error} = await supabase.from('locations').insert({
      name, city: document.getElementById('new-loc-city').value.trim()||null,
      state: document.getElementById('new-loc-state').value.trim()||null,
      address: document.getElementById('new-loc-address').value.trim()||null,
      phone: document.getElementById('new-loc-phone').value.trim()||null,
      is_active: true,
    });
    if(error){showToast('Failed: '+error.message);return;}
    showToast(name+' added.');
    await loadStores();
});
document.getElementById('cancel-new-loc-btn').addEventListener('click', ()=>{
    form.remove();
});
}

async function loadCategories() {
const {data}=await supabase.from('categories').select('id,category_number,name,description').is('deleted_at',null).order('category_number');
const el=document.getElementById('categories-body');
if(!(data??[]).length){el.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;">No categories yet.</div>';return;}
el.innerHTML=(data??[]).map(c=>`
    <div class="list-item">
      <div class="list-item-num">${c.category_number}</div>
      <div><div class="list-item-name">${c.name}</div>${c.description?`<div class="list-item-sub">${c.description}</div>`:''}</div>
      <div style="display:flex;gap:6px;margin-left:auto;">
        <button class="btn btn-ghost btn-sm ceb" data-id="${c.id}" data-num="${c.category_number}" data-name="${c.name}" data-desc="${c.description||''}">Edit</button>
        <button class="btn btn-ghost btn-sm cdb" style="color:var(--crimson);" data-id="${c.id}" data-name="${c.name}">Remove</button>
      </div>
    </div>`).join('');
el.querySelectorAll('.ceb').forEach(b=>b.addEventListener('click',()=>openCategoryForm(b.dataset.id,b.dataset.num,b.dataset.name,b.dataset.desc)));
el.querySelectorAll('.cdb').forEach(b=>b.addEventListener('click',()=>deleteCategory(b.dataset.id,b.dataset.name)));
}
function openCategoryForm(id,num,name,desc) {
editingCatId=id||null;
document.getElementById('cat-modal-title').textContent=id?'Edit Category':'Add Category';
document.getElementById('cat-num').value=num||''; document.getElementById('cat-name').value=name||''; document.getElementById('cat-desc').value=desc||'';
document.getElementById('cat-modal').classList.add('open');
}
async function saveCategory() {
const num=parseInt(document.getElementById('cat-num').value,10), name=document.getElementById('cat-name').value.trim(), desc=document.getElementById('cat-desc').value.trim();
if(!num||!name){showToast('Category number and name are required.');return;}
const {error}=await supabase.rpc('upsert_category',{p_id:editingCatId||null,p_category_number:num,p_name:name,p_description:desc||null});
if(error){showToast('Save failed: '+error.message);return;}
closeModal('cat-modal'); showToast(name+' saved.'); await loadCategories();
}
async function deleteCategory(id,name) {
showConfirm(`Remove "${name}"?`,'Category will be hidden. Products unaffected.',async()=>{
    await supabase.rpc('delete_category',{p_id:id}); showToast(name+' removed.'); await loadCategories();});
}

async function loadBrands() {
const {data}=await supabase.from('brands').select('id,name').is('deleted_at',null).order('name');
const el=document.getElementById('brands-body');
if(!(data??[]).length){el.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;">No brands yet.</div>';return;}
el.innerHTML=(data??[]).map(b=>`
    <div class="list-item">
      <div class="list-item-name">${b.name}</div>
      <div style="display:flex;gap:6px;margin-left:auto;">
        <button class="btn btn-ghost btn-sm beb" data-id="${b.id}" data-name="${b.name}">Edit</button>
        <button class="btn btn-ghost btn-sm bdb" style="color:var(--crimson);" data-id="${b.id}" data-name="${b.name}">Remove</button>
      </div>
    </div>`).join('');
el.querySelectorAll('.beb').forEach(b=>b.addEventListener('click',()=>openBrandForm(b.dataset.id,b.dataset.name)));
el.querySelectorAll('.bdb').forEach(b=>b.addEventListener('click',()=>deleteBrand(b.dataset.id,b.dataset.name)));
}
function openBrandForm(id,name) {
editingBrandId=id||null;
document.getElementById('brand-modal-title').textContent=id?'Edit Brand':'Add Brand';
document.getElementById('brand-name').value=name||'';
document.getElementById('brand-modal').classList.add('open');
}
async function saveBrand() {
const name=document.getElementById('brand-name').value.trim();
if(!name){showToast('Brand name is required.');return;}
const {error}=await supabase.rpc('upsert_brand',{p_id:editingBrandId||null,p_name:name});
if(error){showToast('Save failed: '+error.message);return;}
closeModal('brand-modal'); showToast(name+' saved.'); editingBrandId=null; await loadBrands();
}
async function deleteBrand(id,name) {
showConfirm(`Remove "${name}"?`,'Brand will be removed.',async()=>{
    await supabase.rpc('delete_brand',{p_id:id}); showToast(name+' removed.'); await loadBrands();});
}

function applyTheme(t){localStorage.setItem('pb_theme',t);showToast('Theme saved.');}
async function handleSignOut(){await signOut();}
function closeModal(id){const e=document.getElementById(id);if(e)e.classList.remove('open');}
function showConfirm(title,msg,cb){
document.getElementById('confirm-title').textContent=title;
document.getElementById('confirm-msg').textContent=msg;
document.getElementById('confirm-overlay').classList.add('open');
document.getElementById('confirm-ok-btn').onclick=()=>{closeConfirm();cb();};
}
function closeConfirm(){document.getElementById('confirm-overlay').classList.remove('open');}

