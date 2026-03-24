-- ============================================================
-- MIGRATION 006 — Audit Log Extended Coverage
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Part A: Fixes missing changed_by in product/supplier triggers
-- Part B: Adds audit trigger for inventory_transactions
-- Part C: Adds audit trigger for purchase_orders (status changes)
-- Part D: Adds audit trigger for nightly_submissions (status changes)
-- ============================================================


-- ── Part A: Fix changed_by in existing triggers ───────────────

create or replace function log_product_change()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by, details)
    values ('product_created', 'product', NEW.id, NEW.name, auth.uid(),
      jsonb_build_object('brand', NEW.brand, 'retail_price', NEW.retail_price));

  elsif TG_OP = 'UPDATE' then
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by)
      values ('product_deleted', 'product', NEW.id, NEW.name, auth.uid());
    elsif OLD.is_active and not NEW.is_active then
      insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by)
      values ('product_deactivated', 'product', NEW.id, NEW.name, auth.uid());
    elsif not OLD.is_active and NEW.is_active then
      insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by)
      values ('product_reactivated', 'product', NEW.id, NEW.name, auth.uid());
    else
      insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by, details)
      values ('product_updated', 'product', NEW.id, NEW.name, auth.uid(),
        jsonb_build_object(
          'retail_price_changed', OLD.retail_price is distinct from NEW.retail_price,
          'cost_price_changed',   OLD.cost_price   is distinct from NEW.cost_price
        ));
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_product on products;
create trigger trg_log_product
  after insert or update on products
  for each row execute function log_product_change();

create or replace function log_supplier_change()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by)
    values ('supplier_created', 'supplier', NEW.id, NEW.name, auth.uid());

  elsif TG_OP = 'UPDATE' then
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by)
      values ('supplier_deleted', 'supplier', NEW.id, NEW.name, auth.uid());
    else
      insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by)
      values ('supplier_updated', 'supplier', NEW.id, NEW.name, auth.uid());
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_supplier on suppliers;
create trigger trg_log_supplier
  after insert or update on suppliers
  for each row execute function log_supplier_change();


-- ── Part B: Inventory adjustment trigger ─────────────────────

create or replace function log_inventory_transaction()
returns trigger language plpgsql security definer as $$
begin
  insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by, details)
  values (
    'inventory_' || NEW.type,
    'inventory_transaction', NEW.id,
    (select name from products where id = NEW.product_id),
    NEW.performed_by,
    jsonb_build_object(
      'location_id', NEW.location_id,
      'delta',       NEW.quantity_delta,
      'before',      NEW.quantity_before,
      'after',       NEW.quantity_after,
      'type',        NEW.type,
      'notes',       NEW.notes
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_log_inventory on inventory_transactions;
create trigger trg_log_inventory
  after insert on inventory_transactions
  for each row execute function log_inventory_transaction();


-- ── Part C: Purchase order status-change trigger ──────────────

create or replace function log_po_change()
returns trigger language plpgsql security definer as $$
begin
  if NEW.status is distinct from OLD.status then
    insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by, details)
    values (
      'po_status_changed', 'purchase_order', NEW.id, NEW.po_number,
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_po on purchase_orders;
create trigger trg_log_po
  after update on purchase_orders
  for each row execute function log_po_change();


-- ── Part D: Nightly submission approval trigger ───────────────

create or replace function log_nightly_change()
returns trigger language plpgsql security definer as $$
begin
  if NEW.status is distinct from OLD.status then
    insert into audit_log (event_type, entity_type, entity_id, entity_name, changed_by, details)
    values (
      'nightly_' || NEW.status,
      'nightly_submission', NEW.id,
      NEW.submission_date::text,
      coalesce(NEW.approved_by, NEW.submitted_by),
      jsonb_build_object(
        'location_id',  NEW.location_id,
        'date',         NEW.submission_date,
        'sales_total',  NEW.sales_total,
        'from_status',  OLD.status,
        'to_status',    NEW.status
      )
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_nightly on nightly_submissions;
create trigger trg_log_nightly
  after update on nightly_submissions
  for each row execute function log_nightly_change();
