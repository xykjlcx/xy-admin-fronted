import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';

export type DashboardMetricKey = 'newMembers' | 'activeUsers' | 'newRoles' | 'auditLogs';
export type DashboardTodoStatKey = 'pending' | 'done' | 'overdue';
export type DashboardTodoItemKey = 'phone' | 'onboard' | 'interview';

// 工作台是展示型查询，但仍然走契约层。
// 这样 mock 指标和真实后端指标替换时，页面组件不用承担 shape 兼容判断。
const DashboardMetricSchema = z.object({ value: z.string(), delta: z.string(), negative: z.boolean() });
const DashboardTodoStatSchema = z.object({ value: z.string(), label: z.string() });
const DashboardTodoItemSchema = z.object({ title: z.string(), time: z.string(), status: z.string() });
const DashboardOverviewSchema = z.object({
  company: z.object({
    mark: z.string(),
    name: z.string(),
    status: z.string(),
    meta: z.string(),
  }),
  metrics: z.object({
    newMembers: DashboardMetricSchema,
    activeUsers: DashboardMetricSchema,
    newRoles: DashboardMetricSchema,
    auditLogs: DashboardMetricSchema,
  }),
  todo: z.object({
    stats: z.object({
      pending: DashboardTodoStatSchema,
      done: DashboardTodoStatSchema,
      overdue: DashboardTodoStatSchema,
    }),
    items: z.object({
      phone: DashboardTodoItemSchema,
      onboard: DashboardTodoItemSchema,
      interview: DashboardTodoItemSchema,
    }),
  }),
});
const dashboardOverviewContract = defineApiContract({ response: DashboardOverviewSchema });

export type DashboardOverviewDto = z.infer<typeof DashboardOverviewSchema>;

export const dashboardOverviewQuery = queryOptions({
  queryKey: ['dashboard', 'overview'],
  staleTime: 60_000,
  queryFn: () => http.get('/api/dashboard/overview', undefined, dashboardOverviewContract),
});
