import { createFileRoute } from '@tanstack/react-router';
import { ChannelFormPage } from '@/modules/lastmile/channels';
export const Route = createFileRoute('/_auth/lastmile/channels/new')({
  staticData: {
    labelKey: 'channels.newTitle',
    permission: 'lastmile:channel:create',
    groupKey: 'channels.title',
  },
  component: ChannelNewRoute,
});
function ChannelNewRoute() {
  const navigate = Route.useNavigate();
  return (
    <ChannelFormPage
      onBack={() =>
        void navigate({ to: '/lastmile/channels', search: { keyword: '', kind: 'all', status: 'all' } })
      }
      onSaved={(id) => void navigate({ to: '/lastmile/channels/$channelId', params: { channelId: id } })}
    />
  );
}
