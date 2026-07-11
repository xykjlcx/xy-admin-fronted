import { createFileRoute } from '@tanstack/react-router';
import { ChannelDetailPage } from '@/modules/lastmile/channels';
export const Route = createFileRoute('/_auth/lastmile/channels/$channelId/')({
  staticData: {
    labelKey: 'channels.detailTitle',
    permission: 'lastmile:channel:view',
    groupKey: 'channels.title',
  },
  component: ChannelDetailRoute,
});
function ChannelDetailRoute() {
  const { me } = Route.useRouteContext();
  const { channelId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <ChannelDetailPage
      id={channelId}
      permissions={me.permissions}
      onBack={() =>
        void navigate({ to: '/lastmile/channels', search: { keyword: '', kind: 'all', status: 'all' } })
      }
      onEdit={() => void navigate({ to: '/lastmile/channels/$channelId/edit', params: { channelId } })}
    />
  );
}
