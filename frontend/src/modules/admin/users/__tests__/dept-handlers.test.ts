import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { deptApi } from '@/modules/admin/users/api';
import { deptHandlers } from '@/modules/admin/users/mocks';
import { resetDb } from '@/mocks/db';

const server = setupServer(...deptHandlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

test('PUT /api/depts rejects moving a department under itself', async () => {
  await expect(deptApi.updateDept('rd', { parentId: 'rd' })).rejects.toMatchObject({
    name: 'BizError',
    status: 409,
    code: 'iam.dept.parent-cycle',
  });
});

test('PUT /api/depts rejects moving a department under one of its descendants', async () => {
  // rd_fe 是 rd 的下级，把 rd 挂到 rd_fe 会造出环形父链
  await expect(deptApi.updateDept('rd', { parentId: 'rd_fe' })).rejects.toMatchObject({
    name: 'BizError',
    status: 409,
    code: 'iam.dept.parent-cycle',
  });
});

test('PUT /api/depts accepts moving a department under an unrelated parent', async () => {
  const updated = await deptApi.updateDept('rd_fe', { parentId: 'mkt' });
  expect(updated.parentId).toBe('mkt');
});
