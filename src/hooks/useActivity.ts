import { useQuery } from '@tanstack/react-query';
import { activityService, type ActivityFilters } from '@/services/activityService';

export function useActivityLogs(filters: ActivityFilters) {
  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: () => activityService.getLogs(filters),
  });
}

export function useActivityStats() {
  return useQuery({
    queryKey: ['activity-stats'],
    queryFn: activityService.getStats,
    staleTime: 120_000,
  });
}

export function useTopUsers() {
  return useQuery({
    queryKey: ['activity-top-users'],
    queryFn: activityService.getTopUsers,
    staleTime: 120_000,
  });
}

export function useFilterLocations() {
  return useQuery({
    queryKey: ['filter-locations'],
    queryFn: activityService.getLocations,
    staleTime: 300_000,
  });
}

export function useFilterUsers() {
  return useQuery({
    queryKey: ['filter-users'],
    queryFn: activityService.getUsers,
    staleTime: 300_000,
  });
}
