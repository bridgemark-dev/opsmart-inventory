-- ============================================================
-- MIGRATION 004 — App Settings & Brand Management
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── App-wide settings (key/value store) ──────────────────────
-- One row per setting. Values stored as JSONB for flexibility.
create table if not exists app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id)
);

-- Seed defaults
insert into app_settings (key, value, description) values
  ('default_reorder_point',    '5',                          'Default low-stock threshold for new products'),
  ('default_reorder_qty',      '20',                         'Default reorder quantity for new products'),
  ('allow_negative_inventory', 'false',                      'Allow stock to go below zero'),
  ('default_markup_pct',       'null',                       'Default markup percentage (null = not enforced)'),
  ('min_margin_pct',           'null',                       'Minimum margin safeguard (null = not enforced)'),
  ('tax_wa',                   '8.6',                        'Washington state tax rate (%)'),
  ('tax_or',                   '0',                          'Oregon state tax rate (%)'),
  ('tax_included_in_price',    'false',                      'Whether retail prices include tax'),
  ('notify_low_stock',         'true',                       'Send low stock alerts'),
  ('notify_out_of_stock',      'true',                       'Send out-of-stock alerts'),
  ('notify_daily_summary',     'true',                       'Send daily sales summary'),
  ('sku_format',               '"manual"',                   'SKU generation: manual or auto'),
  ('inventory_mode',           '"per_location"',             'Shared or per-location inventory')
on conflict (key) do nothing;


-- ── Brands table ─────────────────────────────────────────────
create table if not exists brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table brands enable row level security;

create policy "brands_select" on brands
  for select using (auth.uid() is not null and deleted_at is null);


-- ── RLS for app_settings ──────────────────────────────────────
alter table app_settings enable row level security;

-- Everyone can read settings
create policy "settings_select" on app_settings
  for select using (auth.uid() is not null);


-- ── Functions ─────────────────────────────────────────────────

-- Read a setting value
create or replace function get_setting(p_key text)
returns jsonb
language sql security definer stable
as $$
  select value from app_settings where key = p_key;
$$;

-- Update a setting (managers/owners only)
create or replace function update_setting(p_key text, p_value jsonb)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role in ('manager','owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  insert into app_settings (key, value, updated_at, updated_by)
  values (p_key, p_value, now(), auth.uid())
  on conflict (key) do update
  set value = excluded.value,
      updated_at = now(),
      updated_by = auth.uid();
end;
$$;

grant execute on function get_setting    to authenticated;
grant execute on function update_setting to authenticated;


-- ── Location update function ──────────────────────────────────
create or replace function update_location(
  p_id      uuid,
  p_name    text,
  p_city    text,
  p_state   text,
  p_address text,
  p_phone   text
)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only owners can edit location details';
  end if;

  update locations set
    name    = p_name,
    city    = p_city,
    state   = p_state,
    address = p_address,
    phone   = p_phone
  where id = p_id;
end;
$$;

grant execute on function update_location to authenticated;


-- ── Category management functions ────────────────────────────
create or replace function upsert_category(
  p_id              uuid,
  p_category_number integer,
  p_name            text,
  p_description     text
)
returns uuid
language plpgsql security definer
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role in ('manager','owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if p_id is not null then
    update categories set
      category_number = p_category_number,
      name            = p_name,
      description     = p_description
    where id = p_id
    returning id into v_id;
  else
    insert into categories (category_number, name, description)
    values (p_category_number, p_name, p_description)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function delete_category(p_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role in ('manager','owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  update categories set deleted_at = now() where id = p_id;
end;
$$;

grant execute on function upsert_category to authenticated;
grant execute on function delete_category to authenticated;


-- ── User management functions ─────────────────────────────────

-- Update a user's profile
create or replace function update_profile(
  p_user_id     uuid,
  p_full_name   text,
  p_display_name text
)
returns void
language plpgsql security definer
as $$
begin
  -- Users can update their own profile; owners can update any
  if p_user_id != auth.uid() and not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Insufficient permissions';
  end if;

  update profiles set
    full_name    = p_full_name,
    display_name = p_display_name
  where id = p_user_id;
end;
$$;

-- Set a user's role at a location
create or replace function set_user_role(
  p_user_id   uuid,
  p_location_id uuid,
  p_role      user_role
)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only owners can change user roles';
  end if;

  insert into user_locations (user_id, location_id, role)
  values (p_user_id, p_location_id, p_role)
  on conflict (user_id, location_id)
  do update set role = excluded.role;
end;
$$;

-- Remove a user's access to a location
create or replace function remove_user_location(
  p_user_id   uuid,
  p_location_id uuid
)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only owners can remove user access';
  end if;

  delete from user_locations
  where user_id = p_user_id and location_id = p_location_id;
end;
$$;

-- Deactivate a user
create or replace function deactivate_user(p_user_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role = 'owner'
  ) then
    raise exception 'Only owners can deactivate users';
  end if;

  update profiles set is_active = false where id = p_user_id;
end;
$$;

grant execute on function update_profile       to authenticated;
grant execute on function set_user_role        to authenticated;
grant execute on function remove_user_location to authenticated;
grant execute on function deactivate_user      to authenticated;


-- ── Brand management functions ────────────────────────────────
create or replace function upsert_brand(p_id uuid, p_name text)
returns uuid
language plpgsql security definer
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role in ('manager','owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if p_id is not null then
    update brands set name = p_name where id = p_id returning id into v_id;
  else
    insert into brands (name) values (p_name) returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function delete_brand(p_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid() and role in ('manager','owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;
  update brands set deleted_at = now() where id = p_id;
end;
$$;

grant execute on function upsert_brand to authenticated;
grant execute on function delete_brand to authenticated;
