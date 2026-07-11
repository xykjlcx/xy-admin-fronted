import { createFileRoute } from '@tanstack/react-router';
import { MessagesPage } from '@/modules/admin/messages';

export const Route = createFileRoute('/_auth/admin/messages')({
  staticData: {
    labelKey: 'messages.title',
    permission: 'notice:msg:view',
    groupKey: 'messages.breadcrumbGroup',
    actions: [
      { key: 'msg-edit', code: 'notice:msg:edit', labelKey: 'messages.actions.approve' },
      { key: 'msg-del', code: 'notice:msg:del', labelKey: 'messages.actions.delete' },
    ],
  },
  component: MessagesRoute,
});

function MessagesRoute() {
  const { me } = Route.useRouteContext();
  return <MessagesPage permissions={me.permissions} systemAdmin={me.systemAdmin} />;
}
