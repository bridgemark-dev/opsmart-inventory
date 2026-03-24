-- ============================================================
-- MIGRATION 008 — Tenant Scaffold (non-breaking)
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds a tenants table and tenant_id to locations so the app
-- can support multiple clients without cloning the project.
-- Existing data is assigned to the 'pandoras-box' tenant row.
-- All current RLS policies remain valid — they filter by
-- location_id, which is now tenant-scoped.
-- ============================================================

-- STEP 1: Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,        -- 'Pandora''s Box'
  slug       TEXT NOT NULL UNIQUE, -- 'pandoras-box'
  plan       TEXT NOT NULL DEFAULT 'standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Seed the existing client as the first tenant
INSERT INTO tenants (name, slug) VALUES ('Pandora''s Box', 'pandoras-box')
ON CONFLICT (slug) DO NOTHING;

-- STEP 3: Add tenant_id to locations (the only table needed for now)
-- locations → tenants is the bridge. All other tables scope via location.
ALTER TABLE locations ADD COLUMN IF NOT EXISTS
  tenant_id UUID REFERENCES tenants(id);

-- STEP 4: Assign existing locations to the Pandora's Box tenant
UPDATE locations
SET tenant_id = (SELECT id FROM tenants WHERE slug = 'pandoras-box')
WHERE tenant_id IS NULL;

-- STEP 5: Make tenant_id required going forward
ALTER TABLE locations ALTER COLUMN tenant_id SET NOT NULL;

-- STEP 6: Index it
CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);

-- STEP 7: Update my_location_ids() to accept an optional tenant filter
-- (backward-compatible — if no tenant_id passed, returns all user locations)
CREATE OR REPLACE FUNCTION my_location_ids()
RETURNS SETOF UUID AS $$
  SELECT location_id FROM user_locations WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- STEP 8: Add a helper for tenant-scoped location lookup (used in Phase 3)
CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID AS $$
  SELECT DISTINCT l.tenant_id
  FROM locations l
  JOIN user_locations ul ON ul.location_id = l.id
  WHERE ul.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
