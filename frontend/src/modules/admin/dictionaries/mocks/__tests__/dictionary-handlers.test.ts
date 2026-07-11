import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { dictionaryHandlers } from '@/modules/admin/dictionaries/mocks';
import type { DictionaryDto, DictionaryItemDto } from '@/modules/admin/dictionaries/api';

const server = setupServer(...dictionaryHandlers);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());


async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

test('字典种子包含内置用户状态及其字典项', async () => {
  const dictionaries = await readJson<DictionaryDto[]>(await fetch('/api/dictionaries'));
  const status = dictionaries.find((dictionary) => dictionary.code === 'user_status');
  expect(status).toMatchObject({ name: '用户状态', builtin: true });

  const items = await readJson<DictionaryItemDto[]>(await fetch(`/api/dictionaries/${status?.id}/items`));
  expect(items.map((item) => item.value)).toEqual(['active', 'disabled', 'unactivated', 'left']);
});

test('自定义字典可创建并从列表读回', async () => {
  const created = await readJson<DictionaryDto>(
    await fetch('/api/dictionaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '运单状态',
        code: 'shipment_status',
        remark: '运单生命周期',
        builtin: false,
      }),
    }),
  );
  expect(created).toMatchObject({ name: '运单状态', code: 'shipment_status', builtin: false });

  const list = await readJson<DictionaryDto[]>(await fetch('/api/dictionaries'));
  expect(list.some((dictionary) => dictionary.id === created.id)).toBe(true);
});

test('字典编码必须唯一且内置字典不可删除', async () => {
  const duplicated = await readJson<{ code: string; detail: string }>(
    await fetch('/api/dictionaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '重复状态', code: 'user_status', remark: '', builtin: false }),
    }),
  );
  expect(duplicated.code).not.toBe(0);
  expect(duplicated.detail).toContain('编码');

  const removed = await readJson<{ code: string; detail: string }>(
    await fetch('/api/dictionaries/dict-user-status', { method: 'DELETE' }),
  );
  expect(removed.code).not.toBe(0);
  expect(removed.detail).toContain('内置');
});

test('字典项支持新增、编辑、启停和删除并能回读', async () => {
  const created = await readJson<DictionaryItemDto>(
    await fetch('/api/dictionaries/dict-user-status/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: '已锁定',
        value: 'locked',
        sort: 5,
        enabled: true,
        color: 'warning',
        remark: '',
      }),
    }),
  );

  const updated = await readJson<DictionaryItemDto>(
    await fetch(`/api/dictionaries/dict-user-status/items/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: '账号锁定',
        value: 'locked',
        sort: 5,
        enabled: true,
        color: 'danger',
        remark: '风控锁定',
      }),
    }),
  );
  expect(updated).toMatchObject({ label: '账号锁定', color: 'danger' });

  const toggled = await readJson<DictionaryItemDto>(
    await fetch(`/api/dictionaries/dict-user-status/items/${created.id}/enabled`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    }),
  );
  expect(toggled.enabled).toBe(false);

  const removed = await fetch(`/api/dictionaries/dict-user-status/items/${created.id}`, { method: 'DELETE' });
  expect(removed.status).toBe(204);

  const items = await readJson<DictionaryItemDto[]>(await fetch('/api/dictionaries/dict-user-status/items'));
  expect(items.some((item) => item.id === created.id)).toBe(false);
});

test('同一字典下字典项 value 必须唯一', async () => {
  const duplicated = await readJson<{ code: string; detail: string }>(
    await fetch('/api/dictionaries/dict-user-status/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: '重复启用',
        value: 'active',
        sort: 9,
        enabled: true,
        color: 'success',
        remark: '',
      }),
    }),
  );
  expect(duplicated.code).not.toBe(0);
  expect(duplicated.detail).toContain('字典值');
});
