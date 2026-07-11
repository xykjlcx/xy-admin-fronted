import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/modules/admin/profile';
import type { ProfileTab } from '@/modules/admin/profile/types';

function parseTab(value: unknown): ProfileTab {
  return value === 'security' || value === 'preferences' || value === 'devices' ? value : 'info';
}

function parseAction(value: unknown): 'password' | undefined {
  return value === 'password' ? 'password' : undefined;
}

export const Route = createFileRoute('/_auth/admin/profile')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseTab(search.tab),
    action: parseAction(search.action),
  }),
  staticData: { labelKey: 'profile.title', groupKey: 'profile.breadcrumbGroup' },
  component: ProfileRoute,
});

function ProfileRoute() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ProfilePage
      permissions={me.permissions}
      tab={search.tab}
      action={search.action}
      onTabChange={(tab) => void navigate({ search: { tab, action: undefined }, replace: true })}
      onOpenMessages={() => void navigate({ to: '/admin/messages' })}
    />
  );
}
