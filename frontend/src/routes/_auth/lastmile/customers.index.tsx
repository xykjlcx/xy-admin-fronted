import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CustomersPage } from '@/modules/lastmile/customers';
export const Route = createFileRoute('/_auth/lastmile/customers/')({
  validateSearch: z.object({ keyword: z.string().catch('') }),
  staticData: {
    labelKey: 'customers.title',
    permission: 'lastmile:customer:view',
    groupKey: 'common.subsystem',
    actions: [
      { key: 'customer-create', code: 'lastmile:customer:create', labelKey: 'customers.create' },
      { key: 'customer-authorize', code: 'lastmile:customer:authorize', labelKey: 'customers.tabs.authorization' },
    ],
  },
  component: CustomersRoute,
});
function CustomersRoute() {
  const { me } = Route.useRouteContext();
  const { keyword } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CustomersPage
      permissions={me.permissions}
      keyword={keyword}
      onKeywordChange={(next) => void navigate({ search: { keyword: next } })}
      onDetail={(id) => void navigate({ to: '/lastmile/customers/$customerId', params: { customerId: id } })}
    />
  );
}
