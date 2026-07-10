import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ChannelsPage } from '@/modules/lastmile/channels';
const searchSchema = z.object({
  keyword: z.string().catch(''),
  kind: z.enum(['all', 'express', 'line', 'postal', 'self']).catch('all'),
  status: z.enum(['all', 'enabled', 'disabled']).catch('all'),
});
export const Route = createFileRoute('/_auth/lastmile/channels/')({
  validateSearch: searchSchema,
  staticData: {
    labelKey: 'channels.title',
    permission: 'lastmile:channel:view',
    groupKey: 'common.subsystem',
    actions: [
      { code: 'lastmile:channel:create', labelKey: 'channels.create' },
      { code: 'lastmile:channel:update', labelKey: 'common.edit' },
      { code: 'lastmile:channel:toggle', labelKey: 'common.status' },
    ],
  },
  component: ChannelsRoute,
});
function ChannelsRoute() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ChannelsPage
      permissions={me.permissions}
      {...search}
      onFiltersChange={(next) => void navigate({ search: next })}
      onNavigate={(target, id) => {
        if (target === 'new') void navigate({ to: '/lastmile/channels/new' });
        else if (id)
          void navigate({
            to: target === 'detail' ? '/lastmile/channels/$channelId' : '/lastmile/channels/$channelId/edit',
            params: { channelId: id },
          });
      }}
    />
  );
}
