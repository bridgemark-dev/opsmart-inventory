import { supabase } from '@/lib/supabase';

/* ── Types ── */

export interface AppSettings {
  default_reorder_point: number;
  default_reorder_qty: number;
  allow_negative_inventory: boolean;
  sku_format: 'manual' | 'auto';
  tax_wa: number;
  tax_or: number;
  tax_included_in_price: boolean;
  default_markup_pct: number | null;
  min_margin_pct: number | null;
  notify_low_stock: boolean;
  notify_out_of_stock: boolean;
  notify_daily_summary: boolean;
}

export interface LocationRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface UserRow {
  id: string;
  full_name: string;
  display_name: string | null;
  is_active: boolean;
}

export interface UserLocationRow {
  user_id: string;
  role: string;
  locations: { name: string } | null;
}

export interface CategoryRow {
  id: string;
  category_number: number;
  name: string;
  description: string | null;
}

export interface BrandRow {
  id: string;
  name: string;
}

/* ── Defaults ── */

const SETTING_DEFAULTS: AppSettings = {
  default_reorder_point: 5,
  default_reorder_qty: 20,
  allow_negative_inventory: false,
  sku_format: 'manual',
  tax_wa: 8.6,
  tax_or: 0,
  tax_included_in_price: false,
  default_markup_pct: null,
  min_margin_pct: null,
  notify_low_stock: true,
  notify_out_of_stock: true,
  notify_daily_summary: true,
};

const SETTING_KEYS = Object.keys(SETTING_DEFAULTS) as (keyof AppSettings)[];

function parseBool(v: unknown): boolean {
  return v === true || v === 'true';
}

/* ── Service ── */

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', SETTING_KEYS);

    const map: Record<string, unknown> = {};
    (data ?? []).forEach((r: { key: string; value: unknown }) => { map[r.key] = r.value; });

    return {
      default_reorder_point: Number(map.default_reorder_point ?? SETTING_DEFAULTS.default_reorder_point),
      default_reorder_qty: Number(map.default_reorder_qty ?? SETTING_DEFAULTS.default_reorder_qty),
      allow_negative_inventory: parseBool(map.allow_negative_inventory),
      sku_format: (map.sku_format as 'manual' | 'auto') ?? SETTING_DEFAULTS.sku_format,
      tax_wa: Number(map.tax_wa ?? SETTING_DEFAULTS.tax_wa),
      tax_or: Number(map.tax_or ?? SETTING_DEFAULTS.tax_or),
      tax_included_in_price: parseBool(map.tax_included_in_price),
      default_markup_pct: map.default_markup_pct != null ? Number(map.default_markup_pct) : null,
      min_margin_pct: map.min_margin_pct != null ? Number(map.min_margin_pct) : null,
      notify_low_stock: map.notify_low_stock !== false && map.notify_low_stock !== 'false',
      notify_out_of_stock: map.notify_out_of_stock !== false && map.notify_out_of_stock !== 'false',
      notify_daily_summary: map.notify_daily_summary !== false && map.notify_daily_summary !== 'false',
    };
  },

  async updateSetting(key: string, value: unknown): Promise<void> {
    const { error } = await supabase.rpc('update_setting', { p_key: key, p_value: value });
    if (error) throw error;
  },

  async saveInventorySettings(s: Pick<AppSettings, 'default_reorder_point' | 'default_reorder_qty' | 'allow_negative_inventory' | 'sku_format'>): Promise<void> {
    await Promise.all([
      supabase.rpc('update_setting', { p_key: 'default_reorder_point', p_value: s.default_reorder_point }),
      supabase.rpc('update_setting', { p_key: 'default_reorder_qty', p_value: s.default_reorder_qty }),
      supabase.rpc('update_setting', { p_key: 'allow_negative_inventory', p_value: s.allow_negative_inventory }),
      supabase.rpc('update_setting', { p_key: 'sku_format', p_value: s.sku_format }),
    ]);
  },

  async savePricingSettings(s: Pick<AppSettings, 'tax_wa' | 'tax_or' | 'tax_included_in_price' | 'default_markup_pct' | 'min_margin_pct'>): Promise<void> {
    await Promise.all([
      supabase.rpc('update_setting', { p_key: 'tax_wa', p_value: s.tax_wa }),
      supabase.rpc('update_setting', { p_key: 'tax_or', p_value: s.tax_or }),
      supabase.rpc('update_setting', { p_key: 'tax_included_in_price', p_value: s.tax_included_in_price }),
      supabase.rpc('update_setting', { p_key: 'default_markup_pct', p_value: s.default_markup_pct }),
      supabase.rpc('update_setting', { p_key: 'min_margin_pct', p_value: s.min_margin_pct }),
    ]);
  },

  async saveNotificationSettings(s: Pick<AppSettings, 'notify_low_stock' | 'notify_out_of_stock' | 'notify_daily_summary'>): Promise<void> {
    await Promise.all([
      supabase.rpc('update_setting', { p_key: 'notify_low_stock', p_value: s.notify_low_stock }),
      supabase.rpc('update_setting', { p_key: 'notify_out_of_stock', p_value: s.notify_out_of_stock }),
      supabase.rpc('update_setting', { p_key: 'notify_daily_summary', p_value: s.notify_daily_summary }),
    ]);
  },

  async saveAccount(userId: string, fullName: string, displayName: string | null): Promise<void> {
    const { error } = await supabase.rpc('update_profile', {
      p_user_id: userId, p_full_name: fullName, p_display_name: displayName,
    });
    if (error) throw error;
  },

  /* ── Users ── */

  async getUsers(): Promise<UserRow[]> {
    const { data } = await supabase.from('profiles').select('id, full_name, display_name, is_active').order('full_name');
    return (data ?? []) as UserRow[];
  },

  async getUserLocations(): Promise<UserLocationRow[]> {
    const { data } = await supabase.from('user_locations').select('user_id, role, locations(name)');
    return (data ?? []) as unknown as UserLocationRow[];
  },

  async getUserDetail(id: string) {
    const [{ data: profile }, { data: locs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('user_locations').select('location_id, role').eq('user_id', id),
    ]);
    return { profile, locations: locs ?? [] };
  },

  async saveUser(uuid: string, fullName: string, displayName: string | null, locationRoles: { locationId: string; role: string }[]): Promise<void> {
    const { error } = await supabase.from('profiles').upsert(
      { id: uuid, full_name: fullName, display_name: displayName || null },
      { onConflict: 'id' },
    );
    if (error) throw error;

    for (const lr of locationRoles) {
      if (lr.role) {
        await supabase.rpc('set_user_role', { p_user_id: uuid, p_location_id: lr.locationId, p_role: lr.role });
      } else {
        await supabase.rpc('remove_user_location', { p_user_id: uuid, p_location_id: lr.locationId });
      }
    }
  },

  async deactivateUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('deactivate_user', { p_user_id: userId });
    if (error) throw error;
  },

  async reactivateUser(userId: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', userId);
    if (error) throw error;
  },

  /* ── Locations ── */

  async getLocations(): Promise<LocationRow[]> {
    const { data } = await supabase.from('locations').select('id, name, city, state, address, phone, is_active').order('name');
    return (data ?? []) as LocationRow[];
  },

  async saveLocation(id: string, fields: { name: string; city: string; state: string; address: string | null; phone: string | null }): Promise<void> {
    const { error } = await supabase.rpc('update_location', {
      p_id: id, p_name: fields.name, p_city: fields.city,
      p_state: fields.state, p_address: fields.address, p_phone: fields.phone,
    });
    if (error) throw error;
  },

  async addLocation(fields: { name: string; city?: string; state?: string; address?: string; phone?: string }): Promise<void> {
    const { error } = await supabase.from('locations').insert({
      name: fields.name,
      city: fields.city || null,
      state: fields.state || null,
      address: fields.address || null,
      phone: fields.phone || null,
      is_active: true,
    });
    if (error) throw error;
  },

  async deleteLocation(id: string): Promise<void> {
    const { error } = await supabase.from('locations').update({ is_active: false }).eq('id', id);
    if (error) throw error;
  },

  /* ── Categories ── */

  async getCategories(): Promise<CategoryRow[]> {
    const { data } = await supabase.from('categories').select('id, category_number, name, description').is('deleted_at', null).order('category_number');
    return (data ?? []) as CategoryRow[];
  },

  async saveCategory(id: string | null, categoryNumber: number, name: string, description: string | null): Promise<void> {
    const { error } = await supabase.rpc('upsert_category', {
      p_id: id, p_category_number: categoryNumber, p_name: name, p_description: description,
    });
    if (error) throw error;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_category', { p_id: id });
    if (error) throw error;
  },

  /* ── Brands ── */

  async getBrands(): Promise<BrandRow[]> {
    const { data } = await supabase.from('brands').select('id, name').is('deleted_at', null).order('name');
    return (data ?? []) as BrandRow[];
  },

  async saveBrand(id: string | null, name: string): Promise<void> {
    const { error } = await supabase.rpc('upsert_brand', { p_id: id, p_name: name });
    if (error) throw error;
  },

  async deleteBrand(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_brand', { p_id: id });
    if (error) throw error;
  },
};
