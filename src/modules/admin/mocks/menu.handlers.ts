import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { createCollection, genId } from '@/mocks/db';
import type { CreateMenuInput, CreateSubsystemInput, UpdateMenuInput, UpdateSubsystemInput } from '@/modules/admin/api/menu.api';
import { manifests } from '@/modules/registry';
import type { MenuRecord, Subsystem } from '@/modules/types';

// 种子灌入内存集合（menu/subsystem 是 collection 模式的第二、三个域，支持后续 CRUD）
const subsystems = createCollection<Subsystem, 'key'>(
  manifests.map((m) => m.subsystem),
  'key',
);
const menus = createCollection<MenuRecord, 'id'>(
  manifests.flatMap((m) => m.menuSeed),
  'id',
);

function labelText(label: MenuRecord['label'] | undefined) {
  return label?.['zh-CN']?.trim() || label?.['en-US']?.trim() || '';
}

function validateSubsystemInput(body: UpdateSubsystemInput): string | null {
  if (!labelText(body.label)) return '子系统名称不能为空';
  if (!labelText(body.desc)) return '子系统描述不能为空';
  if (!body.icon?.trim()) return '子系统图标不能为空';
  if (!body.home?.trim()) return '子系统首页不能为空';
  if (typeof body.enabled !== 'boolean') return '子系统启用状态不合法';
  return null;
}

function validateCreateSubsystemInput(body: CreateSubsystemInput): string | null {
  const key = body.key?.trim();
  if (!key) return '子系统标识不能为空';
  if (!/^[a-z][a-z0-9-]*$/.test(key)) return '子系统标识只能使用小写字母、数字和连字符';
  if (subsystems.find(key)) return '子系统标识已存在';
  if (typeof body.builtin !== 'boolean') return '子系统内置状态不合法';
  if (!Number.isFinite(body.sort)) return '子系统排序不合法';
  return validateSubsystemInput(body);
}

function normalizeSubsystemCreate(body: CreateSubsystemInput): Subsystem {
  return {
    key: body.key.trim(),
    label: body.label,
    desc: body.desc,
    icon: body.icon.trim(),
    color: body.color,
    home: body.home,
    builtin: body.builtin,
    enabled: body.enabled,
    sort: body.sort,
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

function hasChildren(id: string) {
  return menus.all().some((menu) => menu.parentId === id);
}

function isDescendant(candidateId: string, ancestorId: string): boolean {
  const candidate = menus.find(candidateId);
  if (!candidate?.parentId) return false;
  if (candidate.parentId === ancestorId) return true;
  return isDescendant(candidate.parentId, ancestorId);
}

function validateMenuInput(
  body: CreateMenuInput | UpdateMenuInput,
  subsystemKey: string,
  editingId?: string,
): string | null {
  if (!subsystems.find(subsystemKey)) return '子系统不存在';
  if (!['dir', 'menu', 'action'].includes(body.type)) return '菜单类型不合法';
  if (!labelText(body.label)) return '菜单名称不能为空';

  const parent = body.parentId ? menus.find(body.parentId) : undefined;
  if (body.parentId && !parent) return '父级菜单不存在';
  if (parent && parent.subsystemKey !== subsystemKey) return '父级菜单不属于当前子系统';
  if (parent?.type === 'action') return '动作节点不能作为父级';
  if (editingId && body.parentId === editingId) return '父级不能指向自身';
  if (editingId && body.parentId && isDescendant(body.parentId, editingId)) return '父级不能指向子节点';

  if (body.type === 'dir' && body.parentId) return '目录只能作为顶级节点';
  if (body.type === 'menu' && parent && parent.type !== 'dir') return '菜单只能放在目录下';
  if (body.type === 'menu' && !body.path) return '菜单节点必须配置路由';
  if (body.type === 'action' && parent?.type !== 'menu') return '动作节点必须挂在菜单下';
  if (body.type === 'action' && !body.permission?.trim()) return '动作节点必须配置权限标识';
  if (body.type === 'action' && body.path) return '动作节点不能配置路由';

  return null;
}

function normalizeCreate(body: CreateMenuInput): MenuRecord {
  return {
    id: genId('menu'),
    subsystemKey: body.subsystemKey,
    parentId: body.parentId ?? null,
    type: body.type,
    label: body.label,
    icon: body.icon?.trim() || undefined,
    shortLabel: body.shortLabel,
    path: body.type === 'menu' ? body.path : undefined,
    permission: body.permission?.trim() || undefined,
    visible: body.visible,
    sort: Number.isFinite(body.sort) ? body.sort : nextSort(body.subsystemKey, body.parentId ?? null),
  };
}

function normalizeUpdate(current: MenuRecord, body: UpdateMenuInput): Partial<MenuRecord> {
  return {
    parentId: body.parentId ?? null,
    type: body.type,
    label: body.label,
    icon: body.icon?.trim() || undefined,
    shortLabel: body.shortLabel,
    path: body.type === 'menu' ? body.path : undefined,
    permission: body.permission?.trim() || undefined,
    visible: body.visible,
    sort: Number.isFinite(body.sort) ? body.sort : nextSort(current.subsystemKey, body.parentId ?? null),
  };
}

export const menuHandlers = [
  http.get('/api/subsystems', () => ok(subsystems.all())),
  http.post('/api/subsystems', async ({ request }) => {
    const body = (await request.json()) as CreateSubsystemInput;
    const error = validateCreateSubsystemInput(body);
    if (error) return biz(4001, error);
    return ok(subsystems.insert(normalizeSubsystemCreate(body)));
  }),
  http.put('/api/subsystems/:key', async ({ params, request }) => {
    const key = String(params.key);
    if (!subsystems.find(key)) return biz(4040, '子系统不存在');

    const body = (await request.json()) as UpdateSubsystemInput;
    const error = validateSubsystemInput(body);
    if (error) return biz(4001, error);

    return ok(
      subsystems.update(key, {
        label: body.label,
        desc: body.desc,
        icon: body.icon.trim(),
        color: body.color,
        home: body.home,
        enabled: body.enabled,
      }) as Subsystem,
    );
  }),
  http.get('/api/menus', ({ request }) => {
    const sub = new URL(request.url).searchParams.get('subsystem');
    return ok(menus.filter((m) => !sub || m.subsystemKey === sub));
  }),

  http.post('/api/menus', async ({ request }) => {
    const body = (await request.json()) as CreateMenuInput;
    const error = validateMenuInput(body, body.subsystemKey);
    if (error) return biz(4001, error);
    return ok(menus.insert(normalizeCreate(body)));
  }),

  http.put('/api/menus/:id', async ({ params, request }) => {
    const id = String(params.id);
    const current = menus.find(id);
    if (!current) return biz(4040, '菜单不存在');

    const body = (await request.json()) as UpdateMenuInput;
    if (hasChildren(id) && current.type !== body.type) return biz(4004, '存在子菜单，不能修改节点类型');
    const error = validateMenuInput(body, current.subsystemKey, id);
    if (error) return biz(4001, error);

    const updated = menus.update(id, normalizeUpdate(current, body));
    return ok(updated as MenuRecord);
  }),

  http.patch('/api/menus/:id/visibility', async ({ params, request }) => {
    const id = String(params.id);
    if (!menus.find(id)) return biz(4040, '菜单不存在');
    const body = (await request.json()) as { visible?: boolean };
    if (typeof body.visible !== 'boolean') return biz(4001, '显示状态不合法');
    return ok(menus.update(id, { visible: body.visible }) as MenuRecord);
  }),

  http.delete('/api/menus/:id', ({ params }) => {
    const id = String(params.id);
    const current = menus.find(id);
    if (!current) return biz(4040, '菜单不存在');
    if (hasChildren(id)) return biz(4004, '存在子菜单，不能直接删除');
    menus.remove(id);
    return ok(null);
  }),
];
