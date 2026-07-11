import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  menuApi,
  menuKeys,
  menusQuery,
  subsystemsQuery,
  type CreateMenuInput,
  type UpdateMenuInput,
} from '../api';
import { MenusView } from './MenusView';

export interface MenusPageProps {
  permissions: string[];
  systemAdmin?: boolean;
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function MenusScene({ permissions, systemAdmin = false }: MenusPageProps) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const router = useRouter({ warn: false });
  const { data: subsystems } = useSuspenseQuery(subsystemsQuery);
  const [activeSubsystemKey, setActiveSubsystemKey] = useState(() => subsystems[0]?.key ?? 'admin');
  const fallbackSubsystemKey = subsystems[0]?.key ?? 'admin';
  const effectiveSubsystemKey = subsystems.some((subsystem) => subsystem.key === activeSubsystemKey)
    ? activeSubsystemKey
    : fallbackSubsystemKey;
  const { data: menus, isFetching } = useSuspenseQuery(menusQuery(effectiveSubsystemKey));

  const invalidateMenus = async () => {
    await queryClient.invalidateQueries({ queryKey: menuKeys.menuLists() });
    await router?.invalidate();
  };
  const mutationError = (error: unknown) =>
    toast.error(errorMessage(error, t('menus.toast.failed')));

  const createMenu = useMutation({
    mutationFn: menuApi.createMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.created'));
    },
    onError: mutationError,
  });
  const updateMenu = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMenuInput }) => menuApi.updateMenu(id, dto),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.updated'));
    },
    onError: mutationError,
  });
  const deleteMenu = useMutation({
    mutationFn: menuApi.deleteMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.deleted'));
    },
    onError: mutationError,
  });
  const setMenuVisibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      menuApi.setMenuVisibility(id, { visible }),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.visibilityUpdated'));
    },
    onError: mutationError,
  });
  return (
    <MenusView
      catalogManaged
      permissions={permissions}
      systemAdmin={systemAdmin}
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
