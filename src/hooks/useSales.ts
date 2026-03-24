import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService } from '@/services/salesService';

export function useTodaySubmission(locationId: string) {
  return useQuery({
    queryKey: ['submission', locationId, 'today'],
    queryFn: () => salesService.getTodaySubmission(locationId),
    enabled: !!locationId,
  });
}

export function useSubmissionItems(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['submission-items', submissionId],
    queryFn: () => salesService.getSubmissionItems(submissionId!),
    enabled: !!submissionId,
  });
}

export function useUpsertItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, productId, qty, price }: {
      submissionId: string; productId: string; qty: number; price: number;
    }) => salesService.upsertItem(submissionId, productId, qty, price),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['submission-items', vars.submissionId] });
    },
  });
}

export function useRemoveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, productId }: { submissionId: string; productId: string }) =>
      salesService.removeItem(submissionId, productId),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['submission-items', vars.submissionId] });
    },
  });
}

export function useSubmitNightly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, salesTotal }: { submissionId: string; salesTotal: number }) =>
      salesService.submit(submissionId, salesTotal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submission'] });
    },
  });
}

export function useApproveNightly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (submissionId: string) => salesService.approve(submissionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submission'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useRejectNightly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      salesService.reject(submissionId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submission'] });
    },
  });
}

export function useNightlySummaries(locationId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['nightly-summaries', locationId, from, to],
    queryFn: () => salesService.getSummaries(locationId, from, to),
    staleTime: 60_000,
  });
}
