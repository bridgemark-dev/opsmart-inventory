-- ============================================================
-- MIGRATION 003 — Product & Inventory Write Functions
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Fixes the same RLS issue as suppliers by routing all
-- writes through security definer functions instead of
-- direct table access from the browser client.
-- ============================================================


-- ── Drop existing direct-access policies ─────────────────────
drop policy if exists "products_insert_manager" on products;
drop policy if exists "products_update_manager" on products;
drop policy if exists "inventory_update_manager" on inventory;


-- ── upsert_product ───────────────────────────────────────────
create or replace function upsert_product(
  p_id             uuid,
  p_category_id    uuid,
  p_product_number integer,
  p_name           text,
  p_brand          text,
  p_retail_price   numeric,
  p_cost_price     numeric,
  p_supplier_id    uuid,
  p_notes          text,
  p_attributes     jsonb,
  p_is_active      boolean
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_result_id uuid;
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid()
      and role in ('manager', 'owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  if p_id is not null then
    update products set
      category_id    = p_category_id,
      product_number = p_product_number,
      name           = p_name,
      brand          = p_brand,
      retail_price   = p_retail_price,
      cost_price     = p_cost_price,
      supplier_id    = p_supplier_id,
      notes          = p_notes,
      attributes     = p_attributes,
      is_active      = p_is_active
    where id = p_id
    returning id into v_result_id;
  else
    insert into products (
      category_id, product_number, name, brand,
      retail_price, cost_price, supplier_id,
      notes, attributes, is_active
    ) values (
      p_category_id, p_product_number, p_name, p_brand,
      p_retail_price, p_cost_price, p_supplier_id,
      p_notes, p_attributes, p_is_active
    )
    returning id into v_result_id;
  end if;

  return v_result_id;
end;
$$;

grant execute on function upsert_product to authenticated;


-- ── set_product_active ───────────────────────────────────────
create or replace function set_product_active(
  p_id        uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id = auth.uid()
      and role in ('manager', 'owner')
  ) then
    raise exception 'Insufficient permissions';
  end if;

  update products
  set is_active = p_is_active
  where id = p_id;
end;
$$;

grant execute on function set_product_active to authenticated;


-- ── upsert_reorder_point ─────────────────────────────────────
create or replace function upsert_reorder_point(
  p_product_id      uuid,
  p_location_id     uuid,
  p_reorder_point   integer,
  p_reorder_qty     integer
)
returns void
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from user_locations
    where user_id    = auth.uid()
      and location_id = p_location_id
      and role in ('manager', 'owner')
  ) then
    raise exception 'Insufficient permissions for this location';
  end if;

  insert into inventory (product_id, location_id, reorder_point, reorder_quantity)
  values (p_product_id, p_location_id, p_reorder_point, p_reorder_qty)
  on conflict (product_id, location_id)
  do update set
    reorder_point    = excluded.reorder_point,
    reorder_quantity = excluded.reorder_quantity;
end;
$$;

grant execute on function upsert_reorder_point to authenticated;
