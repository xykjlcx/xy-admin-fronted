import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  menuApi,
  menusQuery,
  subsystemsQuery,
  type CreateMenuInput,
  type UpdateMenuInput,
} from '@/modules/admin/api/menu.api';
import { MenusView } from '@/modules/admin/components/menus/MenusView';

export const Route = createFileRoute('/_auth/admin/menus')({
  staticData: {
    labelKey: 'menus.title',
    permission: 'iam:menu:view',
    groupKey: 'menus.breadcrumbGroup',
    actions: [
      { code: 'iam:menu:create', labelKey: 'menus.actions.create' },
      { code: 'iam:menu:update', labelKey: 'menus.actions.edit' },
      { code: 'iam:menu:del', labelKey: 'menus.actions.delete' },
      { code: 'iam:menu:toggle', labelKey: 'menus.actions.toggleVisible' },
    ],
  },
  component: MenusPage,
});

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function MenusPage() {
  const { t } = useTranslation('admin');
  const { me } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: subsystems } = useSuspenseQuery(subsystemsQuery);
  const [activeSubsystemKey, setActiveSubsystemKey] = useState(() => subsystems[0]?.key ?? 'admin');
  const fallbackSubsystemKey = subsystems[0]?.key ?? 'admin';
  const effectiveSubsystemKey = subsystems.some((subsystem) => subsystem.key === activeSubsystemKey)
    ? activeSubsystemKey
    : fallbackSubsystemKey;
  const { data: menus, isFetching } = useSuspenseQuery(menusQuery(effectiveSubsystemKey));

  const invalidateMenus = async () => {
    await queryClient.invalidateQueries({ queryKey: ['nav', 'menus'] });
  };
  const createMenu = useMutation({
    mutationFn: menuApi.createMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.created'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const updateMenu = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMenuInput }) => menuApi.updateMenu(id, dto),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.updated'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const deleteMenu = useMutation({
    mutationFn: menuApi.deleteMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.deleted'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const setMenuVisibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      menuApi.setMenuVisibility(id, { visible }),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.visibilityUpdated'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });

  return (
    <MenusView
      permissions={me.permissions}
      subsystems={subsystems}
      activeSubsystemKey={effectiveSubsystemKey}
      menus={menus}
      refreshing={isFetching}
      onActiveSubsystemChange={setActiveSubsystemKey}
      onCreateMenu={async (dto: CreateMenuInput) => {
        await createMenu.mutateAsync(dto);
      }}
      onUpdateMenu={async (id: string, dto: UpdateMenuInput) => {
        await updateMenu.mutateAsync({ id, dto });
      }}
      onDeleteMenu={async (id: string) => {
        await deleteMenu.mutateAsync(id);
      }}
      onSetMenuVisibility={async (id: string, visible: boolean) => {
        await setMenuVisibility.mutateAsync({ id, visible });
      }}
    />
  );
}
