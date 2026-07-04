import { http } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { defineApiContract } from '@/lib/http/contract';
import type { MenuRecord, Subsystem } from '@/modules/types';

export type ManagedMenuType = MenuRecord['type'];

// 菜单/子系统是 Shell 导航的数据源，契约漂移会直接影响全局框架。
// 所以这里用运行时 schema 校验 manifest/mock/后端三方结构是否一致。
const LocalizedStringSchema = z.record(z.string(), z.string());
const RoutePathSchema = z.custom<NonNullable<MenuRecord['path']>>((value) => typeof value === 'string');
const MenuTypeSchema = z.enum(['dir', 'menu', 'action']);
const SubsystemSchema: z.ZodType<Subsystem> = z.object({
  key: z.string(),
  label: LocalizedStringSchema,
  desc: LocalizedStringSchema,
  icon: z.string(),
  color: z.string(),
  home: RoutePathSchema,
  builtin: z.boolean(),
  enabled: z.boolean(),
  sort: z.number(),
});
const MenuRecordSchema: z.ZodType<MenuRecord> = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  subsystemKey: z.string(),
  type: MenuTypeSchema,
  label: LocalizedStringSchema,
  icon: z.string().optional(),
  shortLabel: LocalizedStringSchema.optional(),
  path: RoutePathSchema.optional(),
  permission: z.string().optional(),
  visible: z.boolean(),
  sort: z.number(),
});
const NullSchema = z.null();

const subsystemsContract = defineApiContract({ response: z.array(SubsystemSchema) });
const menusContract = defineApiContract({ response: z.array(MenuRecordSchema) });
const menuContract = defineApiContract({ response: MenuRecordSchema });
const nullContract = defineApiContract({ response: NullSchema });

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
  queryFn: () => http.get('/api/subsystems', undefined, subsystemsContract),
});

export const menusQuery = (subsystem: string) =>
  queryOptions({
    queryKey: ['nav', 'menus', subsystem],
    staleTime: Infinity,
    queryFn: () => http.get('/api/menus', { subsystem }, menusContract),
  });

export const menuApi = {
  createMenu: (dto: CreateMenuInput) => http.post('/api/menus', dto, menuContract),
  updateMenu: (id: string, dto: UpdateMenuInput) => http.put(`/api/menus/${id}`, dto, menuContract),
  deleteMenu: (id: string) => http.del(`/api/menus/${id}`, nullContract),
  setMenuVisibility: (id: string, dto: SetMenuVisibilityInput) =>
    http.patch(`/api/menus/${id}/visibility`, dto, menuContract),
};
