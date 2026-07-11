import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { messageHandlers } from '@/modules/admin/messages/mocks';

const server = setupServer(...messageHandlers);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());

interface MessageRow {
  id: string;
  title: string;
  unread: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | null;
}

interface MessageResult {
  list: MessageRow[];
  unreadCount: number;
}


async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

test('消息列表返回原型种子和未读总数并支持未读筛选', async () => {
  const all = await readJson<MessageResult>(await fetch('/api/messages?status=all'));
  expect(all.list).toHaveLength(7);
  expect(all.unreadCount).toBe(3);
  expect(all.list[0]).toMatchObject({ title: '新成员加入申请', unread: true });

  const unread = await readJson<MessageResult>(await fetch('/api/messages?status=unread'));
  expect(unread.list).toHaveLength(3);
  expect(unread.list.every((message) => message.unread)).toBe(true);
});

test('打开单条消息可标记已读并更新未读总数', async () => {
  const updated = await readJson<MessageRow>(await fetch('/api/messages/m1/read', { method: 'PATCH' }));
  expect(updated.unread).toBe(false);

  const list = await readJson<MessageResult>(await fetch('/api/messages?status=all'));
  expect(list.unreadCount).toBe(2);
});

test('全部已读和删除消息均可回读', async () => {
  const readAll = await fetch('/api/messages/read-all', { method: 'PATCH' });
  expect(readAll.status).toBe(204);
  const readList = await readJson<MessageResult>(await fetch('/api/messages?status=unread'));
  expect(readList.unreadCount).toBe(0);
  expect(readList.list).toHaveLength(0);

  const removed = await fetch('/api/messages/m7', { method: 'DELETE' });
  expect(removed.status).toBe(204);
  const list = await readJson<MessageResult>(await fetch('/api/messages?status=all'));
  expect(list.list.some((message) => message.id === 'm7')).toBe(false);
});

test('待办审批支持同意和拒绝并持久化处理状态', async () => {
  const approved = await readJson<MessageRow>(
    await fetch('/api/messages/m1/approval', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    }),
  );
  expect(approved).toMatchObject({ approvalStatus: 'approved', unread: false });

  const rejected = await readJson<MessageRow>(
    await fetch('/api/messages/m6/approval', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    }),
  );
  expect(rejected.approvalStatus).toBe('rejected');

  const list = await readJson<MessageResult>(await fetch('/api/messages?status=all'));
  expect(list.list.find((message) => message.id === 'm1')?.approvalStatus).toBe('approved');
  expect(list.list.find((message) => message.id === 'm6')?.approvalStatus).toBe('rejected');
});

test('非审批消息执行审批返回 409 ProblemDetail', async () => {
  const response = await fetch('/api/messages/m2/approval', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) });
  expect(response.status).toBe(409);
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 409, code: 'message.approval.invalid-state', detail: '当前消息不是审批消息' });
});
