import { supabase } from '@/lib/supabase';

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  lead_time_days: number | null;
  notes: string | null;
}

export interface SupplierInput {
  name: string;
  contact?: string | null;
  phone?: string | null;
  lead_days?: number | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
}

export const suppliersService = {
  async getSuppliers(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return (data ?? []) as Supplier[];
  },

  async upsertSupplier(id: string | null, input: SupplierInput): Promise<string> {
    const { data, error } = await supabase.rpc('upsert_supplier', {
      p_id: id,
      p_name: input.name,
      p_contact: input.contact ?? null,
      p_phone: input.phone ?? null,
      p_lead_days: input.lead_days ?? null,
      p_email: input.email ?? null,
      p_website: input.website ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;
    return data as string;
  },

  async deleteSupplier(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_supplier', { p_id: id });
    if (error) throw error;
  },
};
