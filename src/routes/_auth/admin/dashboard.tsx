import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { dashboardOverviewQuery } from '@/modules/admin/api/dashboard.api';
import { DashboardView } from '@/modules/admin/components/dashboard/DashboardView';

export const Route = createFileRoute('/_auth/admin/dashboard')({
  staticData: { labelKey: 'dashboard.navTitle', permission: 'dashboard:view', groupKey: 'dashboard.navGroup' },
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardOverviewQuery);

  return <DashboardView overview={data} />;
}
