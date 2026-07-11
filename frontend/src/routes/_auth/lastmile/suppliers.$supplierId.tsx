import { createFileRoute } from '@tanstack/react-router';
import { SupplierDetailPage } from '@/modules/lastmile/suppliers';
export const Route = createFileRoute('/_auth/lastmile/suppliers/$supplierId')({
  staticData: {
    labelKey: 'suppliers.detailTitle',
    permissionRef: 'lastmile:supplier:view',
    groupKey: 'channels.title',
  },
  component: SupplierDetailRoute,
});
function SupplierDetailRoute() {
  const { supplierId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <SupplierDetailPage
      id={supplierId}
      onBack={() => void navigate({ to: '/lastmile/suppliers', search: { keyword: '' } })}
    />
  );
}
