import { createFileRoute } from '@tanstack/react-router';
import { ShipmentTrackPage } from '@/modules/lastmile/shipments';
export const Route = createFileRoute('/_auth/lastmile/shipments/$shipmentId/track')({
  staticData: {
    labelKey: 'shipments.trackTitle',
    permissionRef: 'lastmile:shipment:view',
    groupKey: 'shipments.title',
  },
  component: ShipmentTrackRoute,
});
function ShipmentTrackRoute() {
  const { shipmentId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <ShipmentTrackPage
      id={shipmentId}
      onBack={() => void navigate({ to: '/lastmile/shipments', search: { keyword: '', status: 'all' } })}
    />
  );
}
