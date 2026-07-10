import { createFileRoute } from '@tanstack/react-router';
import { ShipmentDetailPage } from '@/modules/lastmile/shipments';
export const Route = createFileRoute('/_auth/lastmile/shipments/$shipmentId/')({
  staticData: {
    labelKey: 'shipments.detailTitle',
    permission: 'lastmile:shipment:view',
    groupKey: 'shipments.title',
  },
  component: ShipmentDetailRoute,
});
function ShipmentDetailRoute() {
  const { shipmentId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <ShipmentDetailPage
      id={shipmentId}
      onBack={() => void navigate({ to: '/lastmile/shipments', search: { keyword: '', status: 'all' } })}
      onPrint={() => void navigate({ to: '/lastmile/shipments/$shipmentId/print', params: { shipmentId } })}
      onTrack={() => void navigate({ to: '/lastmile/shipments/$shipmentId/track', params: { shipmentId } })}
    />
  );
}
