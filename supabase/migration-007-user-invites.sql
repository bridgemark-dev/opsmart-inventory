-- ============================================================
-- MIGRATION 007 — User Invitations (scaffold)
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Stub: future self-service owner invitation flow.
-- For now, owners use the Supabase Dashboard to invite users.
-- This table will back an Edge Function invitation email in Phase 3.
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id),
  role        user_role NOT NULL DEFAULT 'employee',
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '48 hours',
  accepted_at TIMESTAMPTZ,
  invited_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitations_owner ON invitations
  USING (EXISTS (
    SELECT 1 FROM user_locations
    WHERE user_id = auth.uid() AND role = 'owner'
  ));
