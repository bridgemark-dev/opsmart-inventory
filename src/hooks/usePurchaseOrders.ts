import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderService, type POItemInput, type ReceiptInput, type POStatus } from '@/services/purchaseOrderService';

export function usePurchaseOrders(locationId?: string) {
  return useQuery({
    queryKey: ['purchase-orders', locationId],
    queryFn: () => purchaseOrderService.getPOs(locationId),
    staleTime: 60_000,
  });
}

export function usePurchaseOrder(poId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => purchaseOrderService.getPOWithItems(poId!),
    enabled: !!poId,
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, locationId, items }: {
      supplierId: string; locationId: string; items: POItemInput[];
    }) => purchaseOrderService.createPO(supplierId, locationId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, status }: { poId: string; status: POStatus }) =>
      purchaseOrderService.updateStatus(poId, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order', vars.poId] });
    },
  });
}

export function useReceiveItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, receipts }: { poId: string; receipts: ReceiptInput[] }) =>
      purchaseOrderService.receiveItems(poId, receipts),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order', vars.poId] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
