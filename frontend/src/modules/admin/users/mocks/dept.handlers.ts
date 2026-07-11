import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { genId } from '@/mocks/db';
import { CreateDeptSchema, UpdateDeptSchema } from '@/modules/admin/users/api';
import { collectDeptIds, countDeptMembers, depts } from './db';

export const deptHandlers = [
  http.get('/api/depts', () =>
    ok(
      depts
        .all()
        .sort((a, b) => a.sort - b.sort)
        .map((dept) => ({ ...dept, memberCount: countDeptMembers(dept.id) })),
    ),
  ),

  http.post('/api/depts', async ({ request }) => {
    const body = CreateDeptSchema.parse(await request.json());
    const nextSort = Math.max(0, ...depts.all().map((dept) => dept.sort)) + 1;
    const dept = depts.insert({
      id: genId('dept'),
      name: body.name,
      parentId: body.parentId ?? null,
      sort: nextSort,
      memberCount: 0,
    });

    return ok(dept);
  }),

  http.put('/api/depts/:id', async ({ params, request }) => {
    const id = String(params.id);
    const patch = UpdateDeptSchema.parse(await request.json());
    // 拒绝把部门挂到自身或其下级，避免造出环形父链
    if (patch.parentId != null && collectDeptIds(id).has(patch.parentId)) {
      return biz({ status: 409, code: 'iam.dept.parent-cycle', detail: '不能选择自身或下级部门作为上级' });
    }
    const updated = depts.update(id, patch);
    return updated ? ok({ ...updated, memberCount: countDeptMembers(updated.id) }) : biz({ status: 404, code: 'iam.dept.not-found', detail: '部门不存在' });
  }),
];
