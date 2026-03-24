// ============================================================
// src/types/index.ts — Application type extensions
// Re-exports the generated Supabase schema types and adds
// app-specific shapes used across the codebase.
// ============================================================

export type { Database } from './supabase';
export type { Tables, TablesInsert, TablesUpdate, Enums } from './supabase';

// ── Auth / Profile ───────────────────────────────────────────

export interface UserLocation {
  location_id: string;
  location_name: string;
  role: UserRole;
}

export interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  locations: UserLocation[];
}

export type AppProfile = Profile;

export type UserRole = 'owner' | 'manager' | 'employee';

// ── Navigation ───────────────────────────────────────────────

export type AppRoute =
  | '/dashboard'
  | '/inventory'
  | '/products'
  | '/nightly'
  | '/suppliers'
  | '/purchase-orders'
  | '/reports'
  | '/activity'
  | '/settings'
  | '/login';
