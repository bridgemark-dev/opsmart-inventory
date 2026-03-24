-- Migration 009: Supplier RPC functions
-- upsert_supplier and delete_supplier (soft-delete)

create or replace function public.upsert_supplier(
  p_id        uuid    default null,
  p_name      text    default null,
  p_contact   text    default null,
  p_phone     text    default null,
  p_lead_days int     default null,
  p_email     text    default null,
  p_website   text    default null,
  p_notes     text    default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  if p_id is not null then
    update suppliers set
      name          = coalesce(p_name, name),
      contact_name  = p_contact,
      phone         = p_phone,
      lead_time_days = p_lead_days,
      email         = p_email,
      website       = p_website,
      notes         = p_notes,
      updated_at    = now()
    where id = p_id
    returning id into v_id;
  else
    insert into suppliers (name, contact_name, phone, lead_time_days, email, website, notes)
    values (p_name, p_contact, p_phone, p_lead_days, p_email, p_website, p_notes)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.delete_supplier(
  p_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update suppliers
  set deleted_at = now()
  where id = p_id;
end;
$$;
