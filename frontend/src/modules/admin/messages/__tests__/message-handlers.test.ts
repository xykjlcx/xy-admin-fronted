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

interface Env<T> {
  code: number;
  data: T;
  message: string;
}

async function readEnv<T>(response: Response) {
  return (await response.json()) as Env<T>;
}

test('消息列表返回原型种子和未读总数并支持未读筛选', async () => {
  const all = await readEnv<MessageResult>(await fetch('/api/messages?status=all'));
  expect(all.data.list).toHaveLength(7);
  expect(all.data.unreadCount).toBe(3);
  expect(all.data.list[0]).toMatchObject({ title: '新成员加入申请', unread: true });

  const unread = await readEnv<MessageResult>(await fetch('/api/messages?status=unread'));
  expect(unread.data.list).toHaveLength(3);
  expect(unread.data.list.every((message) => message.unread)).toBe(true);
});

test('打开单条消息可标记已读并更新未读总数', async () => {
  const updated = await readEnv<MessageRow>(await fetch('/api/messages/m1/read', { method: 'PATCH' }));
  expect(updated.code).toBe(0);
  expect(updated.data.unread).toBe(false);

  const list = await readEnv<MessageResult>(await fetch('/api/messages?status=all'));
  expect(list.data.unreadCount).toBe(2);
});

test('全部已读和删除消息均可回读', async () => {
  const readAll = await readEnv<null>(await fetch('/api/messages/read-all', { method: 'PATCH' }));
  expect(readAll.code).toBe(0);
  const readList = await readEnv<MessageResult>(await fetch('/api/messages?status=unread'));
  expect(readList.data.unreadCount).toBe(0);
  expect(readList.data.list).toHaveLength(0);

  const removed = await readEnv<null>(await fetch('/api/messages/m7', { method: 'DELETE' }));
  expect(removed.code).toBe(0);
  const list = await readEnv<MessageResult>(await fetch('/api/messages?status=all'));
  expect(list.data.list.some((message) => message.id === 'm7')).toBe(false);
});

test('待办审批支持同意和拒绝并持久化处理状态', async () => {
  const approved = await readEnv<MessageRow>(
    await fetch('/api/messages/m1/approval', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    }),
  );
  expect(approved.code).toBe(0);
  expect(approved.data).toMatchObject({ approvalStatus: 'approved', unread: false });

  const rejected = await readEnv<MessageRow>(
    await fetch('/api/messages/m6/approval', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    }),
  );
  expect(rejected.data.approvalStatus).toBe('rejected');

  const list = await readEnv<MessageResult>(await fetch('/api/messages?status=all'));
  expect(list.data.list.find((message) => message.id === 'm1')?.approvalStatus).toBe('approved');
  expect(list.data.list.find((message) => message.id === 'm6')?.approvalStatus).toBe('rejected');
});
