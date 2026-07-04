import { createFileRoute } from '@tanstack/react-router';
import { dashboardOverviewQuery } from '@/modules/admin/api/dashboard.api';
import { DashboardPage } from '@/modules/admin/pages/dashboard';

// 工作台是典型展示页：loader 预热首屏数据，组件只从 Query 缓存读取并渲染。
export const Route = createFileRoute('/_auth/admin/dashboard')({
  staticData: { labelKey: 'dashboard.navTitle', permission: 'dashboard:view', groupKey: 'dashboard.navGroup' },
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardOverviewQuery),
  component: DashboardPage,
});
