import { createFileRoute } from '@tanstack/react-router';
import { CompanyPage } from '@/modules/admin/company';

export const Route = createFileRoute('/_auth/admin/company')({
  staticData: {
    labelKey: 'company.title',
    permission: 'sys:org:view',
    groupKey: 'company.breadcrumbGroup',
    actions: [{ key: 'org-edit', code: 'sys:org:edit', labelKey: 'company.actions.edit' }],
  },
  component: CompanyRoute,
});

function CompanyRoute() {
  const { me } = Route.useRouteContext();
  return <CompanyPage permissions={me.permissions} systemAdmin={me.systemAdmin} />;
}
