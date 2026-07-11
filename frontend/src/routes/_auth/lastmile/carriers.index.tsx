import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CarriersPage } from '@/modules/lastmile/carriers';
export const Route = createFileRoute('/_auth/lastmile/carriers/')({
  validateSearch: z.object({ keyword: z.string().catch('') }),
  staticData: {
    labelKey: 'carriers.title',
    permission: 'lastmile:carrier:view',
    groupKey: 'channels.title',
    actions: [{ key: 'carrier-create', code: 'lastmile:carrier:create', labelKey: 'carriers.create' }],
  },
  component: CarriersRoute,
});
function CarriersRoute() {
  const { me } = Route.useRouteContext();
  const { keyword } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CarriersPage
      permissions={me.permissions}
      keyword={keyword}
      onKeywordChange={(next) => void navigate({ search: { keyword: next } })}
      onDetail={(id) => void navigate({ to: '/lastmile/carriers/$carrierId', params: { carrierId: id } })}
    />
  );
}
