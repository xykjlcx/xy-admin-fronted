import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { BillingPage } from '@/modules/lastmile/billing';
const searchSchema = z.object({
  keyword: z.string().catch(''),
  status: z.enum(['all', 'pending', 'paid', 'overdue']).catch('all'),
});
export const Route = createFileRoute('/_auth/lastmile/billing')({
  validateSearch: searchSchema,
  staticData: {
    labelKey: 'billing.title',
    permission: 'lastmile:billing:view',
    groupKey: 'common.subsystem',
    actions: [{ key: 'billing-export', code: 'lastmile:billing:export', labelKey: 'billing.export' }],
  },
  component: BillingRoute,
});
function BillingRoute() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <BillingPage
      permissions={me.permissions}
      {...search}
      onFiltersChange={(next) => void navigate({ search: next })}
    />
  );
}
