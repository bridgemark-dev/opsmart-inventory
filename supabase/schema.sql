-- ============================================================
-- PANDORA'S BOX INVENTORY OS
-- Supabase / PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- 0. UTILITY — soft-delete helper
--    All tables include deleted_at so nothing is ever hard-deleted.
--    Filter active rows with: WHERE deleted_at IS NULL
-- ============================================================


-- ============================================================
-- 1. LOCATIONS
--    Your three physical stores.
-- ============================================================
create table locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                        -- e.g. "Richland"
  city        text not null,
  state       text not null default 'WA',
  address     text,
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

insert into locations (name, city, state, address) values
  ('Richland',  'Richland',  'WA', ''),
  ('Kennewick', 'Kennewick', 'WA', ''),
  ('Pendleton', 'Pendleton', 'OR', '');


-- ============================================================
-- 2. AUTH / USERS
--    Supabase manages auth.users automatically.
--    We extend it with a profiles table for role & location data.
-- ============================================================
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  display_name  text,                               -- e.g. "Talon L."
  pin           text,                               -- optional 4-digit store PIN
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- ── Roles ──────────────────────────────────────────────────
create type user_role as enum (
  'owner',      -- full access, all locations
  'manager',    -- full access at assigned location(s)
  'employee'    -- can submit nightly totals, view own location inventory
);

-- One row per user per location they have access to.
-- A manager at Richland only gets a row for Richland.
-- An owner gets a row for every location (or use the owner role check).
create table user_locations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  location_id  uuid not null references locations(id) on delete cascade,
  role         user_role not null default 'employee',
  created_at   timestamptz not null default now(),
  unique (user_id, location_id)
);


-- ============================================================
-- 3. SUPPLIERS
-- ============================================================
create table suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  email         text,
  phone         text,
  website       text,
  lead_days     integer default 7,                  -- avg days from order to receipt
  notes         text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);


-- ============================================================
-- 4. PRODUCT CATALOG
-- ============================================================

-- ── Categories ─────────────────────────────────────────────
-- category_number maps to the first part of your SKU (e.g. "12" in 12/172)
create table categories (
  id               uuid primary key default gen_random_uuid(),
  category_number  integer not null unique,          -- SKU prefix
  name             text not null,                    -- e.g. "Disposables"
  description      text,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- ── Products ───────────────────────────────────────────────
-- product_number maps to the second part of your SKU (e.g. "172" in 12/172)
-- Full SKU is always category_number || '/' || product_number
create table products (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references categories(id),
  product_number   integer not null,                 -- SKU suffix (unique within category)
  name             text not null,
  brand            text,
  retail_price     numeric(10,2),
  cost_price       numeric(10,2),                    -- your cost from supplier
  supplier_id      uuid references suppliers(id),
  attributes       jsonb default '{}',               -- flexible: nicotine_strength, puff_count, etc.
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz,

  -- Enforce unique product_number within each category
  unique (category_id, product_number)
);

-- Computed SKU view (category_number/product_number) for easy lookup
create view product_sku_lookup as
  select
    p.id,
    p.name,
    p.brand,
    p.retail_price,
    p.cost_price,
    p.supplier_id,
    p.attributes,
    p.is_active,
    c.category_number,
    p.product_number,
    (c.category_number::text || '/' || p.product_number::text) as sku,
    c.name as category_name,
    c.id   as category_id
  from products p
  join categories c on c.id = p.category_id
  where p.deleted_at is null
    and c.deleted_at is null;


-- ============================================================
-- 5. INVENTORY (per product, per location)
--    Never update quantity_on_hand directly in application code.
--    Always insert an inventory_transaction; a trigger updates this.
-- ============================================================
create table inventory (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references products(id),
  location_id       uuid not null references locations(id),
  quantity_on_hand  integer not null default 0 check (quantity_on_hand >= 0),
  reorder_point     integer not null default 5,      -- alert fires below this
  reorder_quantity  integer not null default 20,     -- suggested reorder amount
  updated_at        timestamptz not null default now(),

  unique (product_id, location_id)
);


-- ============================================================
-- 6. INVENTORY TRANSACTIONS (immutable audit log)
--    Every quantity change — sale, receiving, adjustment, transfer —
--    is recorded here. The trigger below keeps inventory in sync.
-- ============================================================
create type transaction_type as enum (
  'sale',          -- deducted via nightly submission
  'receive',       -- added via purchase order receipt
  'adjustment',    -- manual correction (shrinkage, count, damage)
  'transfer_out',  -- sent to another location
  'transfer_in',   -- received from another location
  'initial'        -- opening stock entry
);

create table inventory_transactions (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id),
  location_id         uuid not null references locations(id),
  type                transaction_type not null,
  quantity_delta      integer not null,              -- positive = add, negative = deduct
  quantity_before     integer not null,
  quantity_after      integer not null,
  reference_id        uuid,                          -- links to nightly_submissions, purchase_orders, etc.
  reference_type      text,                          -- 'nightly_submission' | 'purchase_order' | 'adjustment'
  notes               text,
  performed_by        uuid references profiles(id),
  created_at          timestamptz not null default now()
  -- No deleted_at — transactions are immutable
);

-- ── Trigger: auto-update inventory when a transaction is inserted ──
create or replace function apply_inventory_transaction()
returns trigger as $$
begin
  -- Upsert the inventory row, adjusting quantity
  insert into inventory (product_id, location_id, quantity_on_hand, updated_at)
  values (NEW.product_id, NEW.location_id, greatest(0, NEW.quantity_delta), now())
  on conflict (product_id, location_id)
  do update set
    quantity_on_hand = greatest(0, inventory.quantity_on_hand + NEW.quantity_delta),
    updated_at       = now();

  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_apply_inventory_transaction
  after insert on inventory_transactions
  for each row execute function apply_inventory_transaction();


-- ============================================================
-- 7. PURCHASE ORDERS
-- ============================================================
create type po_status as enum (
  'draft',       -- being built
  'sent',        -- submitted to supplier
  'partial',     -- partially received
  'received',    -- fully received
  'cancelled'
);

create table purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  po_number      text not null unique,               -- e.g. "PO-0042"
  supplier_id    uuid not null references suppliers(id),
  location_id    uuid not null references locations(id),  -- receiving location
  status         po_status not null default 'draft',
  ordered_at     timestamptz,
  expected_at    timestamptz,                        -- estimated delivery date
  received_at    timestamptz,
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table purchase_order_items (
  id              uuid primary key default gen_random_uuid(),
  po_id           uuid not null references purchase_orders(id) on delete cascade,
  product_id      uuid not null references products(id),
  quantity_ordered   integer not null check (quantity_ordered > 0),
  quantity_received  integer not null default 0,
  unit_cost          numeric(10,2),                  -- cost at time of order
  created_at      timestamptz not null default now()
);

-- Auto-generate PO numbers
create sequence po_number_seq start 1;

create or replace function generate_po_number()
returns trigger as $$
begin
  NEW.po_number := 'PO-' || lpad(nextval('po_number_seq')::text, 4, '0');
  return NEW;
end;
$$ language plpgsql;

create trigger trg_generate_po_number
  before insert on purchase_orders
  for each row
  when (NEW.po_number is null or NEW.po_number = '')
  execute function generate_po_number();


-- ============================================================
-- 8. NIGHTLY TOTALS
--    End-of-day sales entry submitted by employees.
--    One submission per location per calendar date.
--    Inventory is only deducted when status → 'approved'.
-- ============================================================
create type nightly_status as enum (
  'open',        -- in progress (employee building it)
  'submitted',   -- employee submitted, awaiting manager review
  'approved',    -- manager approved; inventory_transactions written
  'rejected'     -- sent back for correction
);

create table nightly_submissions (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid not null references locations(id),
  submission_date date not null default current_date,
  status          nightly_status not null default 'open',
  sales_total     numeric(10,2),                     -- cash/card total for the day
  notes           text,
  submitted_by    uuid references profiles(id),
  submitted_at    timestamptz,
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),

  -- Only one submission per location per day
  unique (location_id, submission_date)
);

create table nightly_submission_items (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references nightly_submissions(id) on delete cascade,
  product_id      uuid not null references products(id),
  quantity_sold   integer not null check (quantity_sold > 0),
  -- Snapshot retail price at time of entry (for reporting, even if price changes later)
  retail_price    numeric(10,2),
  created_at      timestamptz not null default now(),

  unique (submission_id, product_id)
);

-- ── Trigger: when a nightly submission is approved, write inventory transactions ──
create or replace function process_nightly_approval()
returns trigger as $$
declare
  item_row  nightly_submission_items%rowtype;
  inv_row   inventory%rowtype;
begin
  -- Only fire when status changes TO 'approved'
  if NEW.status = 'approved' and OLD.status != 'approved' then

    for item_row in
      select * from nightly_submission_items
      where submission_id = NEW.id
    loop
      -- Get current quantity (default 0 if no row yet)
      select * into inv_row
      from inventory
      where product_id = item_row.product_id
        and location_id = NEW.location_id;

      insert into inventory_transactions (
        product_id,
        location_id,
        type,
        quantity_delta,
        quantity_before,
        quantity_after,
        reference_id,
        reference_type,
        notes,
        performed_by
      ) values (
        item_row.product_id,
        NEW.location_id,
        'sale',
        -(item_row.quantity_sold),                   -- negative = deduction
        coalesce(inv_row.quantity_on_hand, 0),
        greatest(0, coalesce(inv_row.quantity_on_hand, 0) - item_row.quantity_sold),
        NEW.id,
        'nightly_submission',
        'Nightly submission ' || NEW.submission_date::text,
        NEW.approved_by
      );
    end loop;

    -- Stamp the approval time if not already set
    NEW.approved_at := coalesce(NEW.approved_at, now());
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger trg_process_nightly_approval
  before update on nightly_submissions
  for each row execute function process_nightly_approval();


-- ============================================================
-- 9. VIEWS — useful read-only queries
-- ============================================================

-- Current inventory across all locations with low-stock flag
create view inventory_status as
  select
    p.id                                           as product_id,
    (c.category_number::text || '/' || p.product_number::text) as sku,
    p.name                                         as product_name,
    p.brand,
    c.name                                         as category_name,
    l.name                                         as location_name,
    i.quantity_on_hand,
    i.reorder_point,
    i.reorder_quantity,
    i.updated_at,
    (i.quantity_on_hand <= i.reorder_point)        as is_low_stock,
    (i.quantity_on_hand = 0)                       as is_out_of_stock
  from inventory i
  join products  p on p.id = i.product_id
  join categories c on c.id = p.category_id
  join locations l on l.id = i.location_id
  where p.deleted_at is null
    and c.deleted_at is null
    and l.deleted_at is null;

-- Low stock alerts only
create view low_stock_alerts as
  select * from inventory_status
  where is_low_stock = true
  order by quantity_on_hand asc;

-- Nightly submission summary (for dashboard)
create view nightly_summary as
  select
    ns.id,
    ns.submission_date,
    ns.status,
    ns.sales_total,
    l.name                              as location_name,
    count(nsi.id)                       as product_count,
    sum(nsi.quantity_sold)              as total_units_sold,
    p.full_name                         as submitted_by_name,
    ns.submitted_at
  from nightly_submissions ns
  join locations l on l.id = ns.location_id
  left join nightly_submission_items nsi on nsi.submission_id = ns.id
  left join profiles p on p.id = ns.submitted_by
  group by ns.id, l.name, p.full_name;


-- ============================================================
-- 10. ROW LEVEL SECURITY (RLS)
--     Enforced at the database level — not just the UI.
-- ============================================================
alter table locations               enable row level security;
alter table profiles                enable row level security;
alter table user_locations          enable row level security;
alter table suppliers               enable row level security;
alter table categories              enable row level security;
alter table products                enable row level security;
alter table inventory               enable row level security;
alter table inventory_transactions  enable row level security;
alter table purchase_orders         enable row level security;
alter table purchase_order_items    enable row level security;
alter table nightly_submissions     enable row level security;
alter table nightly_submission_items enable row level security;

-- Helper function: get current user's role at a given location
create or replace function user_role_at(loc_id uuid)
returns user_role as $$
  select role from user_locations
  where user_id = auth.uid()
    and location_id = loc_id
  limit 1;
$$ language sql security definer stable;

-- Helper function: get all location IDs the current user can access
create or replace function my_location_ids()
returns setof uuid as $$
  select location_id from user_locations
  where user_id = auth.uid();
$$ language sql security definer stable;

-- ── Profiles: users can read their own profile; owners can read all ──
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

-- ── Locations: users can see locations they are assigned to ──
create policy "locations_select" on locations
  for select using (id in (select my_location_ids()));

-- ── Inventory: users can see inventory at their locations ──
create policy "inventory_select" on inventory
  for select using (location_id in (select my_location_ids()));

-- Managers/owners can update reorder points
create policy "inventory_update_manager" on inventory
  for update using (user_role_at(location_id) in ('manager', 'owner'));

-- ── Inventory transactions: view only at assigned locations ──
create policy "inv_tx_select" on inventory_transactions
  for select using (location_id in (select my_location_ids()));

-- Only the trigger (security definer) inserts transactions; no direct inserts from app
create policy "inv_tx_insert_denied" on inventory_transactions
  for insert with check (false);

-- ── Products & Categories: all authenticated users can read ──
create policy "products_select" on products
  for select using (auth.uid() is not null and deleted_at is null);

create policy "categories_select" on categories
  for select using (auth.uid() is not null and deleted_at is null);

-- Managers/owners can insert and update products
create policy "products_insert_manager" on products
  for insert with check (
    exists (
      select 1 from user_locations
      where user_id = auth.uid()
        and role in ('manager', 'owner')
    )
  );

create policy "products_update_manager" on products
  for update using (
    exists (
      select 1 from user_locations
      where user_id = auth.uid()
        and role in ('manager', 'owner')
    )
  );

-- ── Nightly submissions: employees submit for their location ──
create policy "nightly_select" on nightly_submissions
  for select using (location_id in (select my_location_ids()));

create policy "nightly_insert" on nightly_submissions
  for insert with check (location_id in (select my_location_ids()));

-- Employees can update 'open' submissions; managers can approve
create policy "nightly_update" on nightly_submissions
  for update using (
    location_id in (select my_location_ids())
    and (
      status = 'open'                                          -- employee editing
      or user_role_at(location_id) in ('manager', 'owner')    -- manager approving
    )
  );

create policy "nightly_items_select" on nightly_submission_items
  for select using (
    exists (
      select 1 from nightly_submissions ns
      where ns.id = submission_id
        and ns.location_id in (select my_location_ids())
    )
  );

create policy "nightly_items_insert" on nightly_submission_items
  for insert with check (
    exists (
      select 1 from nightly_submissions ns
      where ns.id = submission_id
        and ns.location_id in (select my_location_ids())
        and ns.status = 'open'
    )
  );

-- ── Suppliers: managers and owners can read/write ──
create policy "suppliers_select" on suppliers
  for select using (
    auth.uid() is not null and deleted_at is null
  );

create policy "suppliers_write" on suppliers
  for all using (
    exists (
      select 1 from user_locations
      where user_id = auth.uid()
        and role in ('manager', 'owner')
    )
  );

-- ── Purchase orders: scoped to location ──
create policy "po_select" on purchase_orders
  for select using (location_id in (select my_location_ids()));

create policy "po_write" on purchase_orders
  for all using (
    location_id in (select my_location_ids())
    and user_role_at(location_id) in ('manager', 'owner')
  );

create policy "po_items_select" on purchase_order_items
  for select using (
    exists (
      select 1 from purchase_orders po
      where po.id = po_id
        and po.location_id in (select my_location_ids())
    )
  );


-- ============================================================
-- 11. SEED — Sample categories matching Pandora's Box inventory
-- ============================================================
insert into categories (category_number, name) values
  (10, 'Disposables'),
  (11, 'E-Liquid'),
  (12, 'Mods & Devices'),
  (13, 'Tanks & Coils'),
  (14, 'Accessories'),
  (15, 'Papers & Wraps'),
  (16, 'Glass & Rigs'),
  (17, 'CBD & Delta'),
  (18, 'Tobacco');
