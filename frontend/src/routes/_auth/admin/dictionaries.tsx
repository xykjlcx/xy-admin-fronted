import { createFileRoute } from '@tanstack/react-router';
import { DictionariesPage } from '@/modules/admin/dictionaries';

export const Route = createFileRoute('/_auth/admin/dictionaries')({
  staticData: {
    labelKey: 'dictionaries.title',
    permission: 'sys:dict:view',
    groupKey: 'dictionaries.breadcrumbGroup',
    actions: [
      { code: 'sys:dict:create', labelKey: 'dictionaries.actions.create' },
      { code: 'sys:dict:update', labelKey: 'dictionaries.actions.edit' },
      { code: 'sys:dict:delete', labelKey: 'dictionaries.actions.delete' },
    ],
  },
  component: DictionariesRoute,
});

function DictionariesRoute() {
  const { me } = Route.useRouteContext();
  return <DictionariesPage permissions={me.permissions} />;
}
