import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { SuppliersPage } from '@/modules/lastmile/suppliers';
export const Route = createFileRoute('/_auth/lastmile/suppliers/')({
  validateSearch: z.object({ keyword: z.string().catch('') }),
  staticData: {
    labelKey: 'suppliers.title',
    permission: 'lastmile:supplier:view',
    groupKey: 'channels.title',
    actions: [{ key: 'supplier-create', code: 'lastmile:supplier:create', labelKey: 'suppliers.create' }],
  },
  component: SuppliersRoute,
});
function SuppliersRoute() {
  const { me } = Route.useRouteContext();
  const { keyword } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <SuppliersPage
      permissions={me.permissions}
      systemAdmin={me.systemAdmin}
      keyword={keyword}
      onKeywordChange={(next) => void navigate({ search: { keyword: next } })}
      onDetail={(id) => void navigate({ to: '/lastmile/suppliers/$supplierId', params: { supplierId: id } })}
    />
  );
}
