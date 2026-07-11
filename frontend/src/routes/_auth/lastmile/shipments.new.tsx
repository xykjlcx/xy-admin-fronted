import { createFileRoute } from '@tanstack/react-router';
import { ShipmentNewPage } from '@/modules/lastmile/shipments';
export const Route = createFileRoute('/_auth/lastmile/shipments/new')({
  staticData: {
    labelKey: 'shipments.newTitle',
    permissionRef: 'lastmile:shipment:create',
    groupKey: 'shipments.title',
  },
  component: ShipmentNewRoute,
});
function ShipmentNewRoute() {
  const navigate = Route.useNavigate();
  return (
    <ShipmentNewPage
      onBack={() => void navigate({ to: '/lastmile/shipments', search: { keyword: '', status: 'all' } })}
      onCreated={(id, print) =>
        void navigate({
          to: print ? '/lastmile/shipments/$shipmentId/print' : '/lastmile/shipments/$shipmentId',
          params: { shipmentId: id },
        })
      }
    />
  );
}
