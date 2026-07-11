import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { fileHandlers } from '@/modules/admin/files/mocks';
import type { FileEntryDto } from '@/modules/admin/files/api';

const server = setupServer(...fileHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetDb());
afterAll(() => server.close());

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

async function expectProblem(response: Response, expected: { status: number; code: string; detail: string }) {
  expect(response.status).toBe(expected.status);
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject(expected);
}

test('文件夹创建和文件重命名校验返回 400 ProblemDetail', async () => {
  await expectProblem(await fetch('/api/files/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '', parentId: null }) }), { status: 400, code: 'file.folder-name.invalid', detail: '文件夹名称不能为空' });
  await expectProblem(await fetch('/api/files/file-3', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '' }) }), { status: 400, code: 'file.name.invalid', detail: '文件名不能为空' });
});

test('文件列表支持目录浏览与全局搜索', async () => {
  const root = await readJson<{ list: FileEntryDto[]; total: number }>(
    await fetch('/api/files?parentId=root&keyword='),
  );
  expect(root.list.map((item) => item.name)).toContain('财务报表');
  expect(root.list.map((item) => item.name)).not.toContain('Q2财报.pdf');

  const search = await readJson<{ list: FileEntryDto[]; total: number }>(
    await fetch('/api/files?parentId=root&keyword=Q2'),
  );
  expect(search.list.map((item) => item.name)).toEqual(['Q2财报.pdf']);
});

test('文件可上传、重命名并删除', async () => {
  const created = await readJson<FileEntryDto>(
    await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '供应商清单.xlsx',
        mimeType: 'application/vnd.ms-excel',
        size: 2048,
        parentId: null,
      }),
    }),
  );
  expect(created.name).toBe('供应商清单.xlsx');

  const renamed = await readJson<FileEntryDto>(
    await fetch(`/api/files/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '核心供应商.xlsx' }),
    }),
  );
  expect(renamed.name).toBe('核心供应商.xlsx');

  const removed = await fetch(`/api/files/${created.id}`, { method: 'DELETE' });
  expect(removed.status).toBe(204);
});

test('新建文件夹后可进入并上传子文件', async () => {
  const folder = await readJson<FileEntryDto>(
    await fetch('/api/files/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '合同归档', parentId: null }),
    }),
  );
  await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '采购合同.pdf',
      mimeType: 'application/pdf',
      size: 4096,
      parentId: folder.id,
    }),
  });

  const children = await readJson<{ list: FileEntryDto[]; total: number }>(
    await fetch(`/api/files?parentId=${folder.id}&keyword=`),
  );
  expect(children.list.map((item) => item.name)).toEqual(['采购合同.pdf']);
});

test('拒绝超过 100MB 的文件', async () => {
  const response = await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'oversized.zip',
      mimeType: 'application/zip',
      size: 100 * 1024 * 1024 + 1,
      parentId: null,
    }),
  });
  const result = await readJson<{ code: string; detail: string }>(response);

  expect(result.code).not.toBe(0);
});
