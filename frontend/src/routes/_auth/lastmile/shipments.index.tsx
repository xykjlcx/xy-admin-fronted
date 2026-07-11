import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ShipmentsPage } from '@/modules/lastmile/shipments';
const searchSchema = z.object({
  keyword: z.string().catch(''),
  status: z.enum(['all', 'pending', 'printed', 'transit', 'delivered', 'exception', 'returned']).catch('all'),
});
export const Route = createFileRoute('/_auth/lastmile/shipments/')({
  validateSearch: searchSchema,
  staticData: {
    labelKey: 'shipments.title',
    permission: 'lastmile:shipment:view',
    groupKey: 'common.subsystem',
    actions: [
      { key: 'shipment-create', code: 'lastmile:shipment:create', labelKey: 'shipments.create' },
      { key: 'shipment-print', code: 'lastmile:shipment:print', labelKey: 'shipments.print' },
      { key: 'shipment-export', code: 'lastmile:shipment:export', labelKey: 'shipments.export' },
    ],
  },
  component: ShipmentListRoute,
});
function ShipmentListRoute() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ShipmentsPage
      permissions={me.permissions}
      search={search}
      onSearchChange={(next) => void navigate({ search: next })}
      onNavigate={(target, id) => {
        if (target === 'new') void navigate({ to: '/lastmile/shipments/new' });
        else if (id && target === 'detail')
          void navigate({ to: '/lastmile/shipments/$shipmentId', params: { shipmentId: id } });
        else if (id && target === 'print')
          void navigate({ to: '/lastmile/shipments/$shipmentId/print', params: { shipmentId: id } });
        else if (id && target === 'track')
          void navigate({ to: '/lastmile/shipments/$shipmentId/track', params: { shipmentId: id } });
      }}
    />
  );
}
