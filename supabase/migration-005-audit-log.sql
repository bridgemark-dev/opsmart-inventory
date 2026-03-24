-- ============================================================
-- MIGRATION 005 — Audit Log for Products & Suppliers
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Captures product and supplier create/update/delete events
-- so Activity Logs shows a complete picture of system changes.
-- ============================================================

-- ── Audit log table ──────────────────────────────────────────
create table if not exists audit_log (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null,        -- 'product_created' | 'product_updated' | 'product_deleted'
                                     -- 'supplier_created' | 'supplier_updated' | 'supplier_deleted'
  entity_type  text not null,        -- 'product' | 'supplier'
  entity_id    uuid,
  entity_name  text,
  changed_by   uuid references profiles(id),
  details      jsonb,
  created_at   timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "audit_log_select" on audit_log
  for select using (auth.uid() is not null);

grant select on audit_log to authenticated;

-- ── Trigger: products ─────────────────────────────────────────
create or replace function log_product_change()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_log (event_type, entity_type, entity_id, entity_name, details)
    values ('product_created', 'product', NEW.id, NEW.name,
      jsonb_build_object('brand', NEW.brand, 'retail_price', NEW.retail_price));

  elsif TG_OP = 'UPDATE' then
    -- Only log meaningful changes, not every auto-update
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      insert into audit_log (event_type, entity_type, entity_id, entity_name)
      values ('product_deleted', 'product', NEW.id, NEW.name);
    elsif OLD.is_active and not NEW.is_active then
      insert into audit_log (event_type, entity_type, entity_id, entity_name)
      values ('product_deactivated', 'product', NEW.id, NEW.name);
    elsif not OLD.is_active and NEW.is_active then
      insert into audit_log (event_type, entity_type, entity_id, entity_name)
      values ('product_reactivated', 'product', NEW.id, NEW.name);
    else
      insert into audit_log (event_type, entity_type, entity_id, entity_name, details)
      values ('product_updated', 'product', NEW.id, NEW.name,
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

-- ── Trigger: suppliers ────────────────────────────────────────
create or replace function log_supplier_change()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    insert into audit_log (event_type, entity_type, entity_id, entity_name)
    values ('supplier_created', 'supplier', NEW.id, NEW.name);

  elsif TG_OP = 'UPDATE' then
    if OLD.deleted_at is null and NEW.deleted_at is not null then
      insert into audit_log (event_type, entity_type, entity_id, entity_name)
      values ('supplier_deleted', 'supplier', NEW.id, NEW.name);
    else
      insert into audit_log (event_type, entity_type, entity_id, entity_name)
      values ('supplier_updated', 'supplier', NEW.id, NEW.name);
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_log_supplier on suppliers;
create trigger trg_log_supplier
  after insert or update on suppliers
  for each row execute function log_supplier_change();

-- ── Grant select on audit_log view ───────────────────────────
grant select on audit_log to authenticated;
