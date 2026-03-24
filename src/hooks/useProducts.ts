import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService, type ProductInput } from '@/services/productsService';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: productsService.getProducts,
    staleTime: 60_000,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: productsService.getCategories,
    staleTime: 300_000,
  });
}

export function useProductSuppliers() {
  return useQuery({
    queryKey: ['product-suppliers'],
    queryFn: productsService.getSuppliers,
    staleTime: 300_000,
  });
}

export function useProductLocations() {
  return useQuery({
    queryKey: ['product-locations'],
    queryFn: productsService.getLocations,
    staleTime: 300_000,
  });
}

export function useUpsertProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: ProductInput }) =>
      productsService.upsertProduct(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useSetProductActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      productsService.setProductActive(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProductReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, locationId, reorderPoint, reorderQty }: {
      productId: string; locationId: string; reorderPoint: number; reorderQty: number;
    }) => productsService.updateReorderPoint(productId, locationId, reorderPoint, reorderQty),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
