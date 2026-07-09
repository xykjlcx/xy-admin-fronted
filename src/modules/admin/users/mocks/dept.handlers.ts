import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { genId } from '@/mocks/db';
import { CreateDeptSchema, UpdateDeptSchema } from '@/modules/admin/users/api';
import { countDeptMembers, depts } from './db';

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
    const patch = UpdateDeptSchema.parse(await request.json());
    const updated = depts.update(String(params.id), patch);
    return updated ? ok({ ...updated, memberCount: countDeptMembers(updated.id) }) : biz(4040, '部门不存在');
  }),
];
