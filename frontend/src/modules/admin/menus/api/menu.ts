import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract, defineVoidContract } from '@/lib/http/contract';
import { menuKeys } from './keys';
import {
  CreateMenuSchema,
  CreateSubsystemSchema,
  MenuRecordSchema,
  SetMenuVisibilitySchema,
  SubsystemSchema,
  UpdateMenuSchema,
  UpdateSubsystemSchema,
  type CreateMenuInput,
  type CreateSubsystemInput,
  type SetMenuVisibilityInput,
  type UpdateMenuInput,
  type UpdateSubsystemInput,
} from './schema';

const subsystemsContract = defineApiContract({ response: z.array(SubsystemSchema) });
const subsystemContract = defineApiContract({ response: SubsystemSchema });
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
  createSubsystem: (dto: CreateSubsystemInput) =>
    http.post('/api/subsystems', CreateSubsystemSchema.parse(dto), subsystemContract),
  updateSubsystem: (key: string, dto: UpdateSubsystemInput) =>
    http.put(`/api/subsystems/${key}`, UpdateSubsystemSchema.parse(dto), subsystemContract),
  createMenu: (dto: CreateMenuInput) => http.post('/api/menus', CreateMenuSchema.parse(dto), menuContract),
  updateMenu: (id: string, dto: UpdateMenuInput) =>
    http.put(`/api/menus/${id}`, UpdateMenuSchema.parse(dto), menuContract),
  deleteMenu: (id: string) => http.del(`/api/menus/${id}`, nullContract),
  setMenuVisibility: (id: string, dto: SetMenuVisibilityInput) =>
    http.patch(`/api/menus/${id}/visibility`, SetMenuVisibilitySchema.parse(dto), menuContract),
};
