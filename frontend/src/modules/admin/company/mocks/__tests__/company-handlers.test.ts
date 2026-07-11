import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { companyHandlers } from '@/modules/admin/company/mocks';
import type { CompanyDto } from '@/modules/admin/company/api';

const server = setupServer(...companyHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetDb());
afterAll(() => server.close());

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

test('企业信息可读取并完整更新', async () => {
  const initial = await readJson<CompanyDto>(await fetch('/api/company'));
  expect(initial).toMatchObject({ name: '小倪科技', code: 'FM4BG629BGE', contactName: '李长昕' });

  const updated = await readJson<CompanyDto>(
    await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...initial,
        name: '昕越科技',
        scale: '500-999 人',
        contactPhone: '+86 139 0000 0000',
      }),
    }),
  );
  expect(updated).toMatchObject({
    name: '昕越科技',
    scale: '500-999 人',
    contactPhone: '+86 139 0000 0000',
  });
});

test('企业名称与联系人邮箱为必填字段', async () => {
  const response = await readJson<{ code: string; detail: string }>(
    await fetch('/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', contactEmail: 'bad' }),
    }),
  );
  expect(response.code).not.toBe(0);
});
