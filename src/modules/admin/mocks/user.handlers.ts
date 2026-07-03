import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { createCollection, genId } from '@/mocks/db';
import type {
  CreateUserInput,
  DeptDto,
  PageResult,
  UpdateUserInput,
  UserDto,
} from '@/modules/admin/api/user.api';

const deptSeed: DeptDto[] = [
  { id: 'rd', parentId: null, name: '产品研发中心', sort: 1 },
  { id: 'rd_fe', parentId: 'rd', name: '前端组', sort: 2 },
  { id: 'rd_be', parentId: 'rd', name: '后端组', sort: 3 },
  { id: 'rd_qa', parentId: 'rd', name: '测试组', sort: 4 },
  { id: 'mkt', parentId: null, name: '市场营销部', sort: 5 },
  { id: 'hr', parentId: null, name: '人力资源部', sort: 6 },
  { id: 'fin', parentId: null, name: '财务部', sort: 7 },
  { id: 'admin', parentId: null, name: '行政部', sort: 8 },
];

const userSeed: UserDto[] = [
  { id: 'u1', name: '李长昕', email: 'lichangxin@xinyue.com', phone: '+86 158 0611 9676', deptId: 'rd', role: '超级管理员', status: 'active', joinedAt: '2021-03-01' },
  { id: 'u2', name: '王思远', email: 'wangsiyuan@xinyue.com', phone: '+86 139 2288 1043', deptId: 'rd_fe', role: '开发工程师', status: 'active', joinedAt: '2022-06-15' },
  { id: 'u3', name: '陈嘉怡', email: 'chenjiayi@xinyue.com', phone: '+86 137 5501 8829', deptId: 'rd_be', role: '开发工程师', status: 'active', joinedAt: '2022-09-02' },
  { id: 'u4', name: '赵敏杰', email: 'zhaominjie@xinyue.com', phone: '+86 186 7742 3310', deptId: 'rd_be', role: '开发工程师', status: 'active', joinedAt: '2023-01-10' },
  { id: 'u5', name: '刘婉婷', email: 'liuwanting@xinyue.com', phone: '+86 135 9908 4471', deptId: 'rd_qa', role: '测试工程师', status: 'unactivated', joinedAt: '2024-04-22' },
  { id: 'u6', name: '孙浩然', email: 'sunhaoran@xinyue.com', phone: '+86 182 3345 6672', deptId: 'mkt', role: '市场专员', status: 'active', joinedAt: '2023-03-18' },
  { id: 'u7', name: '周雅雯', email: 'zhouyawen@xinyue.com', phone: '+86 138 6620 9915', deptId: 'mkt', role: '市场经理', status: 'active', joinedAt: '2021-11-05' },
  { id: 'u8', name: '吴俊豪', email: 'wujunhao@xinyue.com', phone: '+86 159 4432 7788', deptId: 'hr', role: 'HRBP', status: 'active', joinedAt: '2022-02-14' },
  { id: 'u9', name: '郑晓琳', email: 'zhengxiaolin@xinyue.com', phone: '+86 133 7789 2204', deptId: 'hr', role: 'HR经理', status: 'disabled', joinedAt: '2020-08-30' },
  { id: 'u10', name: '黄志强', email: 'huangzhiqiang@xinyue.com', phone: '+86 187 2201 5563', deptId: 'fin', role: '财务专员', status: 'active', joinedAt: '2023-07-01' },
  { id: 'u11', name: '马晓东', email: 'maxiaodong@xinyue.com', phone: '+86 136 5540 1198', deptId: 'fin', role: '财务经理', status: 'active', joinedAt: '2021-05-20' },
  { id: 'u12', name: '林佳慧', email: 'linjiahui@xinyue.com', phone: '+86 189 3312 7745', deptId: 'admin', role: '行政专员', status: 'active', joinedAt: '2023-10-11' },
  { id: 'u13', name: '高天翔', email: 'gaotianxiang@xinyue.com', phone: '+86 132 8890 3324', deptId: 'rd_fe', role: '开发工程师', status: 'unactivated', joinedAt: '2024-05-30' },
  { id: 'u14', name: '董雨桐', email: 'dongyutong@xinyue.com', phone: '+86 130 6674 2201', deptId: 'admin', role: '行政经理', status: 'active', joinedAt: '2020-12-08' },
  { id: 'u15', name: '徐若琳', email: 'xuruolin@xinyue.com', phone: '+86 131 2245 8890', deptId: 'mkt', role: '市场专员', status: 'left', joinedAt: '2021-07-19' },
  { id: 'u16', name: '唐一鸣', email: 'tangyiming@xinyue.com', phone: '+86 134 9982 1176', deptId: 'rd_be', role: '开发工程师', status: 'left', joinedAt: '2022-03-08' },
];

const depts = createCollection<DeptDto, 'id'>(deptSeed, 'id');
const users = createCollection<UserDto, 'id'>(userSeed, 'id');

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

function collectDeptIds(rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const dept of depts.all()) {
      if (dept.parentId && ids.has(dept.parentId) && !ids.has(dept.id)) {
        ids.add(dept.id);
        changed = true;
      }
    }
  }
  return ids;
}

export const userHandlers = [
  http.get('/api/depts', () => ok(depts.all().sort((a, b) => a.sort - b.sort))),

  http.get('/api/users', ({ request }) => {
    const search = new URL(request.url).searchParams;
    const page = parsePositiveInt(search.get('page'), 1);
    const pageSize = parsePositiveInt(search.get('pageSize'), 10);
    const status = search.get('status') ?? 'all';
    const deptId = search.get('deptId') ?? undefined;
    const keyword = search.get('keyword')?.trim() ?? '';

    const deptScope = deptId ? collectDeptIds(deptId) : null;
    const filtered = users
      .filter((user) => !deptScope || deptScope.has(user.deptId))
      .filter((user) => (status === 'all' ? user.status !== 'left' : user.status === status))
      .filter((user) => includesKeyword(user, keyword));
    const start = (page - 1) * pageSize;
    const data: PageResult<UserDto> = {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
    };
    return ok(data);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = (await request.json()) as CreateUserInput;
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
    const id = String(params.id);
    const patch = (await request.json()) as UpdateUserInput;
    const updated = users.update(id, patch);
    return updated ? ok(updated) : biz(4040, '成员不存在');
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const removed = users.remove(String(params.id));
    return removed ? ok(null) : biz(4040, '成员不存在');
  }),

  http.post('/api/users/batch-disable', async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    let updated = 0;
    for (const id of ids) {
      const user = users.update(id, { status: 'disabled' });
      if (user) updated += 1;
    }
    return ok({ updated });
  }),
];
