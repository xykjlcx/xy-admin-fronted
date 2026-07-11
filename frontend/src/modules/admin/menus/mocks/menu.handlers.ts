import { http } from 'msw';
import type { ZodError } from 'zod';
import { biz, ok, noContent } from '@/mocks/http';
import {
  RuntimeMenuCreateSchema,
  CreateSubsystemSchema,
  SetMenuVisibilitySchema,
  MenuCustomizationSchema,
  UpdateSubsystemSchema,
} from '@/modules/admin/menus/api';
import { menus, subsystems } from './db';
import {
  hasMenuChildren,
  normalizeMenuCreate,
  normalizeMenuUpdate,
  normalizeSubsystemCreate,
  validateCreateSubsystemInput,
  validateMenuInput,
  validateSubsystemInput,
} from './menu-rules';
import type { MenuRecord } from '@/modules/types';

const catalogWire = (menu: MenuRecord): MenuRecord => ({
  ...menu,
  origin: menu.origin ?? 'catalog',
  runtimeManaged: menu.runtimeManaged ?? false,
});

function inputErrorMessage(error: ZodError) {
  return error.issues.some((issue) => issue.path[0] === 'permission')
    ? '动作节点必须配置权限标识'
    : '请求参数不合法';
}

export const menuHandlers = [
  http.get('/api/subsystems', () => ok(subsystems.all())),
  http.post('/api/subsystems', async ({ request }) => {
    const parsed = CreateSubsystemSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'menu.validation.invalid', detail: inputErrorMessage(parsed.error) });
    const body = parsed.data;
    const error = validateCreateSubsystemInput(body);
    if (error) return biz({ status: 400, code: 'menu.validation.invalid', detail: error });
    return ok(subsystems.insert(normalizeSubsystemCreate(body)));
  }),
  http.put('/api/subsystems/:key', async ({ params, request }) => {
    const key = String(params.key);
    if (!subsystems.find(key)) return biz({ status: 404, code: 'menu.subsystem.not-found', detail: '子系统不存在' });

    const parsed = UpdateSubsystemSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'menu.validation.invalid', detail: inputErrorMessage(parsed.error) });
    const body = parsed.data;
    const error = validateSubsystemInput(body);
    if (error) return biz({ status: 400, code: 'menu.validation.invalid', detail: error });

    const updated = subsystems.update(key, {
      label: body.label,
      desc: body.desc,
      icon: body.icon.trim(),
      color: body.color,
      home: body.home,
      enabled: body.enabled,
    });
    return updated ? ok(updated) : biz({ status: 404, code: 'menu.subsystem.not-found', detail: '子系统不存在' });
  }),
  http.get('/api/menus', ({ request }) => {
    const sub = new URL(request.url).searchParams.get('subsystem');
    return ok(menus.filter((m) => !sub || m.subsystemKey === sub).map(catalogWire));
  }),

  http.post('/api/menus', async ({ request }) => {
    const parsed = RuntimeMenuCreateSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'menu.validation.invalid', detail: inputErrorMessage(parsed.error) });
    const body = parsed.data;
    const error = validateMenuInput(body, body.subsystemKey);
    if (error) return biz({ status: 400, code: 'menu.validation.invalid', detail: error });
    return ok(menus.insert({ ...normalizeMenuCreate(body), origin: 'runtime', runtimeManaged: true }));
  }),

  http.put('/api/menus/:id', async ({ params, request }) => {
    const id = String(params.id);
    const current = menus.find(id);
    if (!current) return biz({ status: 404, code: 'menu.node.not-found', detail: '菜单不存在' });

    const parsed = MenuCustomizationSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'menu.validation.invalid', detail: inputErrorMessage(parsed.error) });
    const body = parsed.data;
    if (hasMenuChildren(id) && current.type !== body.type) return biz({ status: 409, code: 'menu.node.has-children', detail: '存在子菜单，不能修改节点类型' });
    const error = validateMenuInput(body, current.subsystemKey, id);
    if (error) return biz({ status: 400, code: 'menu.validation.invalid', detail: error });

    const updated = menus.update(id, normalizeMenuUpdate(current, body));
    return updated ? ok(updated) : biz({ status: 404, code: 'menu.node.not-found', detail: '菜单不存在' });
  }),

  http.patch('/api/menus/:id/visibility', async ({ params, request }) => {
    const id = String(params.id);
    if (!menus.find(id)) return biz({ status: 404, code: 'menu.node.not-found', detail: '菜单不存在' });
    const parsed = SetMenuVisibilitySchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'menu.validation.invalid', detail: '请求参数不合法' });
    const body = parsed.data;
    const updated = menus.update(id, { visible: body.visible });
    return updated ? ok(updated) : biz({ status: 404, code: 'menu.node.not-found', detail: '菜单不存在' });
  }),

  http.delete('/api/menus/:id', ({ params }) => {
    const id = String(params.id);
    const current = menus.find(id);
    if (!current) return biz({ status: 404, code: 'menu.node.not-found', detail: '菜单不存在' });
    if (!current.runtimeManaged) return biz({ status: 400, code: 'iam.menu.catalog-owned', detail: 'Catalog menus cannot be deleted' });
    if (hasMenuChildren(id)) return biz({ status: 409, code: 'menu.node.has-children', detail: '存在子菜单，不能直接删除' });
    menus.remove(id);
    return noContent();
  }),
];
