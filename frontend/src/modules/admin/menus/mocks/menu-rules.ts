import { genId } from '@/mocks/db';
import type {
  CreateMenuInput,
  CreateSubsystemInput,
  UpdateMenuInput,
  MenuCustomizationInput,
  UpdateSubsystemInput,
} from '@/modules/admin/menus/api';
import type { MenuRecord, Subsystem } from '@/modules/types';
import { menus, subsystems } from './db';

function labelText(label: MenuRecord['label'] | undefined) {
  return label?.['zh-CN']?.trim() || label?.['en-US']?.trim() || '';
}

export function validateSubsystemInput(body: UpdateSubsystemInput): string | null {
  if (!labelText(body.label)) return '子系统名称不能为空';
  if (!labelText(body.desc)) return '子系统描述不能为空';
  if (!body.icon.trim()) return '子系统图标不能为空';
  return null;
}

export function validateCreateSubsystemInput(body: CreateSubsystemInput): string | null {
  if (subsystems.find(body.key)) return '子系统标识已存在';
  return validateSubsystemInput(body);
}

export function normalizeSubsystemCreate(body: CreateSubsystemInput): Subsystem {
  return {
    ...body,
    key: body.key.trim(),
    icon: body.icon.trim(),
  };
}

function nextSort(subsystemKey: string, parentId: string | null) {
  return (
    Math.max(
      0,
      ...menus
        .filter((menu) => menu.subsystemKey === subsystemKey && menu.parentId === parentId)
        .map((menu) => menu.sort),
    ) + 1
  );
}

export function hasMenuChildren(id: string) {
  return menus.all().some((menu) => menu.parentId === id);
}

function isDescendant(candidateId: string, ancestorId: string): boolean {
  const visited = new Set<string>();
  let currentId: string | null = candidateId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const parentId: string | null = menus.find(currentId)?.parentId ?? null;
    if (parentId === ancestorId) return true;
    currentId = parentId;
  }

  return false;
}

export function validateMenuInput(
  body: CreateMenuInput | UpdateMenuInput | MenuCustomizationInput,
  subsystemKey: string,
  editingId?: string,
): string | null {
  if (!subsystems.find(subsystemKey)) return '子系统不存在';
  if (!labelText(body.label)) return '菜单名称不能为空';

  const parent = body.parentId ? menus.find(body.parentId) : undefined;
  if (body.parentId && !parent) return '父级菜单不存在';
  if (parent && parent.subsystemKey !== subsystemKey) return '父级菜单不属于当前子系统';
  if (editingId && body.parentId === editingId) return '父级不能指向自身';
  if (editingId && body.parentId && isDescendant(body.parentId, editingId)) return '父级不能指向子节点';
  if (body.type === 'menu' && parent && parent.type !== 'dir') return '菜单只能放在目录下';
  if (body.type === 'action' && parent?.type !== 'menu') return '动作节点必须挂在菜单下';

  return null;
}

export function normalizeMenuCreate(body: CreateMenuInput): MenuRecord {
  return {
    id: genId('menu'),
    subsystemKey: body.subsystemKey,
    parentId: body.parentId,
    type: body.type,
    label: body.label,
    icon: body.icon?.trim() || undefined,
    visible: body.visible,
    sort: Number.isFinite(body.sort) ? body.sort : nextSort(body.subsystemKey, body.parentId),
    origin: 'runtime',
    runtimeManaged: true,
  };
}

export function normalizeMenuUpdate(current: MenuRecord, body: MenuCustomizationInput): Partial<MenuRecord> {
  return {
    parentId: body.parentId,
    type: body.type,
    label: body.label,
    icon: body.icon?.trim() || undefined,
    visible: body.visible,
    sort: Number.isFinite(body.sort) ? body.sort : nextSort(current.subsystemKey, body.parentId),
  };
}
