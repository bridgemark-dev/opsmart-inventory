-- ============================================================
-- MIGRATION 001 — Manual Adjustment Function
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Why this is needed:
-- The original schema blocks direct inserts into
-- inventory_transactions from app code (for safety).
-- Manual adjustments from the Inventory page need a
-- controlled escape hatch — this function validates the
-- input and writes the transaction on behalf of the user.
-- ============================================================


-- ── Function: apply_manual_adjustment ────────────────────────
-- Called by the Inventory page when a manager adjusts stock.
-- Validates the input, writes the transaction, and returns
-- the new quantity.
create or replace function apply_manual_adjustment(
  p_product_id   uuid,
  p_location_id  uuid,
  p_delta        integer,   -- positive = add, negative = remove
  p_new_qty      integer,   -- the expected resulting quantity
  p_notes        text
)
returns integer             -- returns actual new quantity
language plpgsql
security definer             -- runs as DB owner, bypasses RLS
as $$
declare
  v_current_qty  integer;
  v_actual_new   integer;
  v_user_id      uuid;
begin
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify the user has access to this location
  if not exists (
    select 1 from user_locations
    where user_id   = v_user_id
      and location_id = p_location_id
      and role in ('manager', 'owner')
  ) then
    raise exception 'Insufficient permissions for this location';
  end if;

  -- Get current quantity (0 if no row yet)
  select coalesce(quantity_on_hand, 0)
  into   v_current_qty
  from   inventory
  where  product_id  = p_product_id
    and  location_id = p_location_id;

  v_current_qty := coalesce(v_current_qty, 0);

  -- Calculate actual new qty (floor at 0)
  v_actual_new := greatest(0, v_current_qty + p_delta);

  -- Write the transaction (trigger will update inventory)
  insert into inventory_transactions (
    product_id,
    location_id,
    type,
    quantity_delta,
    quantity_before,
    quantity_after,
    reference_type,
    notes,
    performed_by
  ) values (
    p_product_id,
    p_location_id,
    'adjustment',
    p_delta,
    v_current_qty,
    v_actual_new,
    'adjustment',
    p_notes,
    v_user_id
  );

  return v_actual_new;
end;
$$;


-- ── Function: apply_initial_stock ────────────────────────────
-- Use this to set opening stock counts for each product/location.
-- Safe to run multiple times — it creates the inventory row
-- if it doesn't exist, or corrects it if it does.
--
-- Usage example:
--   select apply_initial_stock(
--     (select id from products where name = 'Elf Bar BC5000' limit 1),
--     (select id from locations where name = 'Richland'),
--     42,
--     'Opening stock count Mar 2026'
--   );
create or replace function apply_initial_stock(
  p_product_id   uuid,
  p_location_id  uuid,
  p_quantity     integer,
  p_notes        text default 'Opening stock entry'
)
returns integer
language plpgsql
security definer
as $$
declare
  v_current_qty integer;
  v_delta       integer;
  v_user_id     uuid;
begin
  v_user_id := auth.uid();

  -- Anyone with location access can set opening stock
  if not exists (
    select 1 from user_locations
    where user_id    = v_user_id
      and location_id = p_location_id
  ) then
    raise exception 'No access to this location';
  end if;

  select coalesce(quantity_on_hand, 0)
  into   v_current_qty
  from   inventory
  where  product_id  = p_product_id
    and  location_id = p_location_id;

  v_current_qty := coalesce(v_current_qty, 0);
  v_delta       := p_quantity - v_current_qty;

  -- Only write a transaction if something actually changes
  if v_delta <> 0 then
    insert into inventory_transactions (
      product_id, location_id, type,
      quantity_delta, quantity_before, quantity_after,
      reference_type, notes, performed_by
    ) values (
      p_product_id, p_location_id, 'initial',
      v_delta, v_current_qty, p_quantity,
      'initial', p_notes, v_user_id
    );
  end if;

  return p_quantity;
end;
$$;


-- ── Grant execute to authenticated users ──────────────────────
grant execute on function apply_manual_adjustment to authenticated;
grant execute on function apply_initial_stock     to authenticated;


-- ============================================================
-- IMPORTANT: Update the Inventory page JS after running this.
-- In pages/inventory.html, the submitAdjustment() function
-- should call this RPC instead of inserting directly:
--
--   const { data, error } = await supabase.rpc('apply_manual_adjustment', {
--     p_product_id:  adjProductId,
--     p_location_id: adjLocationId,
--     p_delta:       delta,
--     p_new_qty:     Math.max(0, newQty),
--     p_notes:       reason,
--   });
--
-- The inventory.html file already has this call pattern
-- stubbed in — just replace the direct insert block.
-- ============================================================
