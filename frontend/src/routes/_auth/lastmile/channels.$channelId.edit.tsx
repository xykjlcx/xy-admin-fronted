import { createFileRoute } from '@tanstack/react-router';
import { ChannelFormPage } from '@/modules/lastmile/channels';
export const Route = createFileRoute('/_auth/lastmile/channels/$channelId/edit')({
  staticData: {
    labelKey: 'channels.editTitle',
    permissionRef: 'lastmile:channel:update',
    groupKey: 'channels.title',
  },
  component: ChannelEditRoute,
});
function ChannelEditRoute() {
  const { channelId } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <ChannelFormPage
      id={channelId}
      onBack={() => void navigate({ to: '/lastmile/channels/$channelId', params: { channelId } })}
      onSaved={(id) => void navigate({ to: '/lastmile/channels/$channelId', params: { channelId: id } })}
    />
  );
}
