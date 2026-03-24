import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';

interface AdjustStockArgs {
  productId: string;
  locationId: string;
  delta: number;
  notes: string;
}

interface ReorderPointArgs {
  productId: string;
  locationId: string;
  point: number;
  qty: number;
}

export function useInventoryStatus(locationId?: string) {
  return useQuery({
    queryKey: ['inventory', locationId],
    queryFn: () => inventoryService.getInventoryStatus(locationId),
    staleTime: 60_000,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, locationId, delta, notes }: AdjustStockArgs) =>
      inventoryService.adjustStock(productId, locationId, delta, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['low-stock'] });
    },
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: inventoryService.getLowStockAlerts,
    staleTime: 120_000,
  });
}

export function useUpdateReorderPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, locationId, point, qty }: ReorderPointArgs) =>
      inventoryService.updateReorderPoint(productId, locationId, point, qty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
