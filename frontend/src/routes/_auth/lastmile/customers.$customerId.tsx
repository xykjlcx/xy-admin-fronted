import { createFileRoute } from '@tanstack/react-router';
import { CustomerDetailPage } from '@/modules/lastmile/customers';
export const Route = createFileRoute('/_auth/lastmile/customers/$customerId')({
  staticData: {
    labelKey: 'customers.detailTitle',
    permissionRef: 'lastmile:customer:view',
    groupKey: 'customers.title',
  },
  component: CustomerDetailRoute,
});
function CustomerDetailRoute() {
  const { me } = Route.useRouteContext();
  const { customerId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <CustomerDetailPage
      id={customerId}
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      onBack={() => void navigate({ to: '/lastmile/customers', search: { keyword: '' } })}
    />
  );
}
