import { http } from 'msw';
import { ok } from '@/mocks/http';
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
];
