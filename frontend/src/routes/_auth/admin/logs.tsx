import { createFileRoute } from '@tanstack/react-router';
import { LogsPage } from '@/modules/admin/logs';

export const Route = createFileRoute('/_auth/admin/logs')({
  staticData: {
    labelKey: 'logs.title',
    permission: 'audit:oplog:view',
    groupKey: 'logs.breadcrumbGroup',
    actions: [
      { key: 'login-view', code: 'audit:login:view', labelKey: 'logs.tabs.login' },
      { key: 'oplog-export', code: 'audit:oplog:export', labelKey: 'logs.actions.export' },
      { key: 'login-export', code: 'audit:login:export', labelKey: 'logs.actions.export' },
    ],
  },
  component: LogsRoute,
});

function LogsRoute() {
  const { me } = Route.useRouteContext();
  return <LogsPage permissions={me.permissions} systemAdmin={me.systemAdmin} />;
}
