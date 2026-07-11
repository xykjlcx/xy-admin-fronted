import { createFileRoute } from '@tanstack/react-router';
import { ShipmentPrintPage } from '@/modules/lastmile/shipments';
export const Route = createFileRoute('/_auth/lastmile/shipments/$shipmentId/print')({
  staticData: {
    labelKey: 'shipments.printTitle',
    permissionRef: 'lastmile:shipment:print',
    groupKey: 'shipments.title',
  },
  component: ShipmentPrintRoute,
});
function ShipmentPrintRoute() {
  const { shipmentId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <ShipmentPrintPage
      id={shipmentId}
      onBack={() => void navigate({ to: '/lastmile/shipments', search: { keyword: '', status: 'all' } })}
    />
  );
}
