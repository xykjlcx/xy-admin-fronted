import { createFileRoute } from '@tanstack/react-router';
import { CarrierDetailPage } from '@/modules/lastmile/carriers';
export const Route = createFileRoute('/_auth/lastmile/carriers/$carrierId')({
  staticData: {
    labelKey: 'carriers.detailTitle',
    permissionRef: 'lastmile:carrier:view',
    groupKey: 'channels.title',
  },
  component: CarrierDetailRoute,
});
function CarrierDetailRoute() {
  const { carrierId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <CarrierDetailPage
      id={carrierId}
      onBack={() => void navigate({ to: '/lastmile/carriers', search: { keyword: '' } })}
    />
  );
}
