import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { ApprovalActionSchema, MessageStatusSchema } from '../api';
import { messages } from './db';

export const messageHandlers = [
  http.get('/api/messages', ({ request }) => {
    const parsed = MessageStatusSchema.safeParse(new URL(request.url).searchParams.get('status') ?? 'all');
    if (!parsed.success) return biz(4001, '消息状态不合法');
    const all = messages.all();
    const list = all.filter((message) =>
      parsed.data === 'all' ? true : parsed.data === 'unread' ? message.unread : !message.unread,
    );
    return ok({ list, unreadCount: all.filter((message) => message.unread).length });
  }),
  http.patch('/api/messages/read-all', () => {
    for (const message of messages.all()) messages.update(message.id, { unread: false });
    return ok(null);
  }),
  http.patch('/api/messages/:id/read', ({ params }) => {
    const id = String(params.id);
    if (!messages.find(id)) return biz(4040, '消息不存在');
    return ok(messages.update(id, { unread: false }));
  }),
  http.patch('/api/messages/:id/approval', async ({ params, request }) => {
    const id = String(params.id);
    const message = messages.find(id);
    if (!message) return biz(4040, '消息不存在');
    if (message.category !== 'approval') return biz(4001, '当前消息不是审批消息');
    if (message.approvalStatus !== 'pending') return biz(4090, '当前审批已处理');
    const parsed = ApprovalActionSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4001, '审批操作不合法');
    return ok(
      messages.update(id, {
        unread: false,
        approvalStatus: parsed.data.action === 'approve' ? 'approved' : 'rejected',
      }),
    );
  }),
  http.delete('/api/messages/:id', ({ params }) => {
    const id = String(params.id);
    if (!messages.remove(id)) return biz(4040, '消息不存在');
    return ok(null);
  }),
];

export { messages } from './db';
