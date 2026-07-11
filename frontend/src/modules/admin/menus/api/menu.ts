import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract, defineVoidContract } from '@/lib/http/contract';
import { menuKeys } from './keys';
import {
  MenuRecordSchema,
  MenuCustomizationSchema,
  RuntimeMenuCreateSchema,
  SetMenuVisibilitySchema,
  SubsystemSchema,
  type CreateMenuInput,
  type SetMenuVisibilityInput,
  type UpdateMenuInput,
} from './schema';

const subsystemsContract = defineApiContract({ response: z.array(SubsystemSchema) });
const menusContract = defineApiContract({ response: z.array(MenuRecordSchema) });
const menuContract = defineApiContract({ response: MenuRecordSchema });
const nullContract = defineVoidContract();

export const subsystemsQuery = queryOptions({
  queryKey: menuKeys.subsystems(),
  staleTime: Infinity,
  queryFn: ({ signal }) => http.get('/api/subsystems', undefined, subsystemsContract, { signal }),
});

export const menusQuery = (subsystem: string) =>
  queryOptions({
    queryKey: menuKeys.menus(subsystem),
    queryFn: ({ signal }) => http.get('/api/menus', { subsystem }, menusContract, { signal }),
  });

export const menuApi = {
  createMenu: (dto: CreateMenuInput) =>
    http.post('/api/menus', RuntimeMenuCreateSchema.parse(dto), menuContract),
  updateMenu: (id: string, dto: UpdateMenuInput) =>
    http.put(
      `/api/menus/${id}`,
      MenuCustomizationSchema.parse({
        type: dto.type,
        parentId: dto.parentId,
        label: dto.label,
        icon: dto.icon,
        visible: dto.visible,
        sort: dto.sort,
      }),
      menuContract,
    ),
  deleteMenu: (id: string) => http.del(`/api/menus/${id}`, nullContract),
  setMenuVisibility: (id: string, dto: SetMenuVisibilityInput) =>
    http.patch(`/api/menus/${id}/visibility`, SetMenuVisibilitySchema.parse(dto), menuContract),
};
