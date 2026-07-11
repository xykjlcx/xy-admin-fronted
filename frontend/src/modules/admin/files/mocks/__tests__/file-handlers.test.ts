import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { fileHandlers } from '@/modules/admin/files/mocks';
import type { FileEntryDto } from '@/modules/admin/files/api';

const server = setupServer(...fileHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetDb());
afterAll(() => server.close());

interface Env<T> {
  code: number;
  data: T;
}
async function readEnv<T>(response: Response) {
  return (await response.json()) as Env<T>;
}

test('文件列表支持目录浏览与全局搜索', async () => {
  const root = await readEnv<{ list: FileEntryDto[]; total: number }>(
    await fetch('/api/files?parentId=root&keyword='),
  );
  expect(root.data.list.map((item) => item.name)).toContain('财务报表');
  expect(root.data.list.map((item) => item.name)).not.toContain('Q2财报.pdf');

  const search = await readEnv<{ list: FileEntryDto[]; total: number }>(
    await fetch('/api/files?parentId=root&keyword=Q2'),
  );
  expect(search.data.list.map((item) => item.name)).toEqual(['Q2财报.pdf']);
});

test('文件可上传、重命名并删除', async () => {
  const created = await readEnv<FileEntryDto>(
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
  expect(created.data.name).toBe('供应商清单.xlsx');

  const renamed = await readEnv<FileEntryDto>(
    await fetch(`/api/files/${created.data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '核心供应商.xlsx' }),
    }),
  );
  expect(renamed.data.name).toBe('核心供应商.xlsx');

  const removed = await readEnv<null>(await fetch(`/api/files/${created.data.id}`, { method: 'DELETE' }));
  expect(removed.code).toBe(0);
});

test('新建文件夹后可进入并上传子文件', async () => {
  const folder = await readEnv<FileEntryDto>(
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
      parentId: folder.data.id,
    }),
  });

  const children = await readEnv<{ list: FileEntryDto[]; total: number }>(
    await fetch(`/api/files?parentId=${folder.data.id}&keyword=`),
  );
  expect(children.data.list.map((item) => item.name)).toEqual(['采购合同.pdf']);
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
  const result = await readEnv<null>(response);

  expect(result.code).not.toBe(0);
});
