import { http } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import type { MenuRecord, Subsystem } from '@/modules/types';

export type ManagedMenuType = MenuRecord['type'];

export interface CreateMenuInput {
  subsystemKey: string;
  parentId: string | null;
  type: ManagedMenuType;
  label: MenuRecord['label'];
  icon?: string;
  shortLabel?: MenuRecord['shortLabel'];
  path?: MenuRecord['path'];
  permission?: string;
  visible: boolean;
  sort: number;
}

export type UpdateMenuInput = Omit<CreateMenuInput, 'subsystemKey'>;

export interface SetMenuVisibilityInput {
  visible: boolean;
}

export const subsystemsQuery = queryOptions({
  queryKey: ['nav', 'subsystems'],
  staleTime: Infinity,
  queryFn: () => http.get<Subsystem[]>('/api/subsystems'),
});

export const menusQuery = (subsystem: string) =>
  queryOptions({
    queryKey: ['nav', 'menus', subsystem],
    staleTime: Infinity,
    queryFn: () => http.get<MenuRecord[]>('/api/menus', { subsystem }),
  });

export const menuApi = {
  createMenu: (dto: CreateMenuInput) => http.post<MenuRecord>('/api/menus', dto),
  updateMenu: (id: string, dto: UpdateMenuInput) => http.put<MenuRecord>(`/api/menus/${id}`, dto),
  deleteMenu: (id: string) => http.del<null>(`/api/menus/${id}`),
  setMenuVisibility: (id: string, dto: SetMenuVisibilityInput) =>
    http.patch<MenuRecord>(`/api/menus/${id}/visibility`, dto),
};
