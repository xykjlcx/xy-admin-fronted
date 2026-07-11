import { http } from 'msw';
import { biz, ok, noContent } from '@/mocks/http';
import { genId } from '@/mocks/db';
import {
  CreateUserSchema,
  MoveUsersSchema,
  UpdateUserSchema,
  UserIdsSchema,
  type PageResult,
  type UserDto,
} from '@/modules/admin/users/api';
import { parseUserFilters, userMatchesAdvancedFilters } from '../model';
import { collectDeptIds, toUserDetail, users } from './db';

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function includesKeyword(user: UserDto, keyword: string) {
  if (!keyword) return true;
  const normalized = keyword.toLowerCase();
  return [user.name, user.role, user.phone, user.email].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}

export const userHandlers = [
  http.get('/api/users', ({ request }) => {
    const search = new URL(request.url).searchParams;
    const page = parsePositiveInt(search.get('page'), 1);
    const pageSize = parsePositiveInt(search.get('pageSize'), 10);
    const status = search.get('status') ?? 'all';
    const deptId = search.get('deptId') ?? undefined;
    const directOnly = search.get('directOnly') === 'true';
    const keyword = search.get('keyword')?.trim() ?? '';
    const filters = parseUserFilters(search.get('filters') ?? undefined);

    const deptScope = deptId ? collectDeptIds(deptId) : null;
    const filtered = users
      .filter((user) => {
        if (!deptId || !deptScope) return true;
        return directOnly ? user.deptId === deptId : deptScope.has(user.deptId);
      })
      .filter((user) => (status === 'all' ? user.status !== 'left' : user.status === status))
      .filter((user) => includesKeyword(user, keyword))
      .filter((user) => userMatchesAdvancedFilters(user, filters));
    const start = (page - 1) * pageSize;
    const data: PageResult<UserDto> = {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
    };
    return ok(data);
  }),

  http.get('/api/users/:id', ({ params }) => {
    const user = users.find(String(params.id));
    return user ? ok(toUserDetail(user)) : biz({ status: 404, code: 'iam.user.not-found', detail: '成员不存在' });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = CreateUserSchema.parse(await request.json());
    const user = users.insert({
      id: genId('u'),
      name: body.name,
      deptId: body.deptId,
      role: body.role,
      phone: body.phone,
      email: body.email,
      status: 'active',
      joinedAt: '2026-07-03',
    });
    return ok(user);
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const patch = UpdateUserSchema.parse(await request.json());
    const updated = users.update(String(params.id), patch);
    return updated ? ok(updated) : biz({ status: 404, code: 'iam.user.not-found', detail: '成员不存在' });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const removed = users.remove(String(params.id));
    return removed ? noContent() : biz({ status: 404, code: 'iam.user.not-found', detail: '成员不存在' });
  }),

  http.post('/api/users/batch-disable', async ({ request }) => {
    const { ids } = UserIdsSchema.parse(await request.json());
    let updated = 0;
    for (const id of ids) {
      const user = users.update(id, { status: 'disabled' });
      if (user) updated += 1;
    }
    return ok({ updated });
  }),
  http.post('/api/users/batch-enable', async ({ request }) => {
    const { ids } = UserIdsSchema.parse(await request.json());
    let updated = 0;
    for (const id of ids) if (users.update(id, { status: 'active' })) updated += 1;
    return ok({ updated });
  }),
  http.post('/api/users/batch-move', async ({ request }) => {
    const { ids, deptId } = MoveUsersSchema.parse(await request.json());
    let updated = 0;
    for (const id of ids) if (users.update(id, { deptId })) updated += 1;
    return ok({ updated });
  }),
];
