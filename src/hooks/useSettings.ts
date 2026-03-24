import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService, type AppSettings } from '@/services/settingsService';

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: settingsService.getSettings,
    staleTime: 120_000,
  });
}

export function useSaveInventorySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Pick<AppSettings, 'default_reorder_point' | 'default_reorder_qty' | 'allow_negative_inventory' | 'sku_format'>) =>
      settingsService.saveInventorySettings(s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); },
  });
}

export function useSavePricingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Pick<AppSettings, 'tax_wa' | 'tax_or' | 'tax_included_in_price' | 'default_markup_pct' | 'min_margin_pct'>) =>
      settingsService.savePricingSettings(s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); },
  });
}

export function useSaveNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: Pick<AppSettings, 'notify_low_stock' | 'notify_out_of_stock' | 'notify_daily_summary'>) =>
      settingsService.saveNotificationSettings(s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); },
  });
}

export function useSaveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, fullName, displayName }: { userId: string; fullName: string; displayName: string | null }) =>
      settingsService.saveAccount(userId, fullName, displayName),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); },
  });
}

/* ── Users ── */

export function useSettingsUsers() {
  return useQuery({
    queryKey: ['settings-users'],
    queryFn: async () => {
      const [users, userLocs] = await Promise.all([
        settingsService.getUsers(),
        settingsService.getUserLocations(),
      ]);
      return { users, userLocations: userLocs };
    },
    staleTime: 60_000,
  });
}

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, fullName, displayName, locationRoles }: {
      uuid: string; fullName: string; displayName: string | null;
      locationRoles: { locationId: string; role: string }[];
    }) => settingsService.saveUser(uuid, fullName, displayName, locationRoles),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-users'] }); },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => settingsService.deactivateUser(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-users'] }); },
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => settingsService.reactivateUser(userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-users'] }); },
  });
}

/* ── Locations ── */

export function useSettingsLocations() {
  return useQuery({
    queryKey: ['settings-locations'],
    queryFn: settingsService.getLocations,
    staleTime: 60_000,
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: { name: string; city: string; state: string; address: string | null; phone: string | null } }) =>
      settingsService.saveLocation(id, fields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-locations'] }); },
  });
}

export function useAddLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: { name: string; city?: string; state?: string; address?: string; phone?: string }) =>
      settingsService.addLocation(fields),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-locations'] }); },
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteLocation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-locations'] }); },
  });
}

/* ── Categories ── */

export function useCategories() {
  return useQuery({
    queryKey: ['settings-categories'],
    queryFn: settingsService.getCategories,
    staleTime: 60_000,
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryNumber, name, description }: {
      id: string | null; categoryNumber: number; name: string; description: string | null;
    }) => settingsService.saveCategory(id, categoryNumber, name, description),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-categories'] }); },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteCategory(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-categories'] }); },
  });
}

/* ── Brands ── */

export function useBrands() {
  return useQuery({
    queryKey: ['settings-brands'],
    queryFn: settingsService.getBrands,
    staleTime: 60_000,
  });
}

export function useSaveBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string | null; name: string }) =>
      settingsService.saveBrand(id, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-brands'] }); },
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsService.deleteBrand(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings-brands'] }); },
  });
}
