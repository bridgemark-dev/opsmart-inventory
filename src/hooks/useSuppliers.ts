import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersService, type SupplierInput } from '@/services/suppliersService';

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersService.getSuppliers,
    staleTime: 60_000,
  });
}

export function useUpsertSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: SupplierInput }) =>
      suppliersService.upsertSupplier(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suppliersService.deleteSupplier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
