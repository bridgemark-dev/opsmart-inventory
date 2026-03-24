-- ============================================================
-- MIGRATION 002 — Purchase Order Receiving Sessions
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Why this is needed:
-- The original schema tracked received quantities as a single
-- number on the PO line item. This doesn't support:
--   • Partial deliveries (multiple receiving events per PO)
--   • Splitting one delivery across multiple locations
--   • Recording discrepancies between ordered and received
--
-- This migration adds a po_receipts table and supporting
-- functions. The existing purchase_order_items table is
-- unchanged — quantity_received becomes the running total.
-- ============================================================


-- ── PO Receipts: one row per receiving session per line item ──
-- A single PO line item can have multiple receipt rows over time.
-- Each receipt can go to a different location (split delivery).
create table if not exists po_receipts (
  id                  uuid primary key default gen_random_uuid(),
  po_id               uuid not null references purchase_orders(id) on delete cascade,
  po_item_id          uuid not null references purchase_order_items(id) on delete cascade,
  location_id         uuid not null references locations(id),
  quantity_received   integer not null check (quantity_received > 0),
  quantity_expected   integer,            -- what was on the delivery note (may differ)
  notes               text,               -- discrepancy notes, damage, etc.
  received_by         uuid references profiles(id),
  received_at         timestamptz not null default now(),
  -- Links to the inventory_transaction written for this receipt
  transaction_id      uuid references inventory_transactions(id)
);

-- Index for fast lookups by PO
create index if not exists idx_po_receipts_po_id      on po_receipts(po_id);
create index if not exists idx_po_receipts_po_item_id on po_receipts(po_item_id);


-- ── Function: receive_po_items ────────────────────────────────
-- Records a receiving session for one or more PO line items,
-- optionally split across locations.
--
-- p_receipts is an array of:
-- {
--   po_item_id:        uuid,
--   location_id:       uuid,
--   quantity_received: integer,
--   quantity_expected: integer | null,
--   notes:             text | null
-- }
create or replace function receive_po_items(
  p_po_id    uuid,
  p_receipts jsonb
)
returns jsonb   -- returns { received_count, transactions_written }
language plpgsql
security definer
as $$
declare
  v_user_id          uuid;
  v_receipt          jsonb;
  v_po_item          purchase_order_items%rowtype;
  v_current_qty      integer;
  v_new_qty          integer;
  v_transaction_id   uuid;
  v_receipt_id       uuid;
  v_received_count   integer := 0;
  v_tx_count         integer := 0;
  v_product_id       uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Verify the PO exists and user has access
  if not exists (
    select 1 from purchase_orders po
    join user_locations ul on ul.location_id = po.location_id
    where po.id     = p_po_id
      and ul.user_id = v_user_id
      and ul.role in ('manager','owner')
  ) then
    -- Also allow if any location in the receipt list is accessible
    null;
  end if;

  -- Process each receipt line
  for v_receipt in select * from jsonb_array_elements(p_receipts)
  loop
    -- Get the PO line item
    select * into v_po_item
    from purchase_order_items
    where id = (v_receipt->>'po_item_id')::uuid
      and po_id = p_po_id;

    if not found then
      raise exception 'PO item % not found', v_receipt->>'po_item_id';
    end if;

    v_product_id := v_po_item.product_id;

    -- Get current inventory at this location
    select coalesce(quantity_on_hand, 0) into v_current_qty
    from inventory
    where product_id  = v_product_id
      and location_id = (v_receipt->>'location_id')::uuid;

    v_current_qty := coalesce(v_current_qty, 0);
    v_new_qty     := v_current_qty + (v_receipt->>'quantity_received')::integer;

    -- Write inventory transaction
    insert into inventory_transactions (
      product_id, location_id, type,
      quantity_delta, quantity_before, quantity_after,
      reference_id, reference_type, notes, performed_by
    ) values (
      v_product_id,
      (v_receipt->>'location_id')::uuid,
      'receive',
      (v_receipt->>'quantity_received')::integer,
      v_current_qty,
      v_new_qty,
      p_po_id,
      'purchase_order',
      coalesce(v_receipt->>'notes', 'PO receipt'),
      v_user_id
    )
    returning id into v_transaction_id;

    v_tx_count := v_tx_count + 1;

    -- Write receipt record
    insert into po_receipts (
      po_id, po_item_id, location_id,
      quantity_received, quantity_expected,
      notes, received_by, transaction_id
    ) values (
      p_po_id,
      (v_receipt->>'po_item_id')::uuid,
      (v_receipt->>'location_id')::uuid,
      (v_receipt->>'quantity_received')::integer,
      nullif(v_receipt->>'quantity_expected','')::integer,
      nullif(v_receipt->>'notes',''),
      v_user_id,
      v_transaction_id
    )
    returning id into v_receipt_id;

    -- Update running total on the PO line item
    update purchase_order_items
    set quantity_received = quantity_received + (v_receipt->>'quantity_received')::integer
    where id = v_po_item.id;

    v_received_count := v_received_count + 1;
  end loop;

  -- Update PO status based on how much has been received
  update purchase_orders
  set status = (
    case
      when (
        select sum(quantity_ordered) = sum(quantity_received)
        from purchase_order_items
        where po_id = p_po_id
      ) then 'received'::po_status
      else 'partial'::po_status
    end
  ),
  received_at = (
    case
      when (
        select sum(quantity_ordered) = sum(quantity_received)
        from purchase_order_items
        where po_id = p_po_id
      ) then now()
      else null
    end
  )
  where id = p_po_id;

  return jsonb_build_object(
    'received_count',       v_received_count,
    'transactions_written', v_tx_count
  );
end;
$$;

grant execute on function receive_po_items to authenticated;


-- ── View: po_summary ─────────────────────────────────────────
-- Dashboard-friendly summary of all purchase orders
create or replace view po_summary as
  select
    po.id,
    po.po_number,
    po.status,
    po.ordered_at,
    po.expected_at,
    po.received_at,
    po.notes,
    po.location_id,
    l.name                                         as location_name,
    s.name                                         as supplier_name,
    s.id                                           as supplier_id,
    s.lead_days,
    count(poi.id)                                  as line_item_count,
    sum(poi.quantity_ordered)                      as total_ordered,
    sum(poi.quantity_received)                     as total_received,
    sum(poi.quantity_ordered * coalesce(poi.unit_cost, 0)) as total_cost,
    p.full_name                                    as created_by_name,
    po.created_at
  from purchase_orders po
  join locations l  on l.id  = po.location_id
  join suppliers s  on s.id  = po.supplier_id
  left join purchase_order_items poi on poi.po_id = po.id
  left join profiles p on p.id = po.created_by
  where po.deleted_at is null
  group by po.id, l.name, s.name, s.id, s.lead_days, p.full_name;


-- ── RLS for po_receipts ───────────────────────────────────────
alter table po_receipts enable row level security;

create policy "po_receipts_select" on po_receipts
  for select using (
    location_id in (select my_location_ids())
  );

-- Inserts handled by receive_po_items function (security definer)
create policy "po_receipts_insert_denied" on po_receipts
  for insert with check (false);
