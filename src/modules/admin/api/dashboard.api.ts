import { queryOptions } from '@tanstack/react-query';
import { http } from '@/lib/http/client';

export type DashboardMetricKey = 'newMembers' | 'activeUsers' | 'newRoles' | 'auditLogs';
export type DashboardTodoStatKey = 'pending' | 'done' | 'overdue';
export type DashboardTodoItemKey = 'phone' | 'onboard' | 'interview';

export interface DashboardOverviewDto {
  company: {
    mark: string;
    name: string;
    status: string;
    meta: string;
  };
  metrics: Record<DashboardMetricKey, { value: string; delta: string; negative: boolean }>;
  todo: {
    stats: Record<DashboardTodoStatKey, { value: string; label: string }>;
    items: Record<DashboardTodoItemKey, { title: string; time: string; status: string }>;
  };
}

export const dashboardOverviewQuery = queryOptions({
  queryKey: ['dashboard', 'overview'],
  staleTime: 60_000,
  queryFn: () => http.get<DashboardOverviewDto>('/api/dashboard/overview'),
});
