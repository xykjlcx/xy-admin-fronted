import { queryOptions } from '@tanstack/react-query';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';
import { messageKeys } from './keys';
import {
  MessageResultSchema,
  MessageSchema,
  NullSchema,
  type ApprovalActionInput,
  type MessageStatus,
} from './schema';

const resultContract = defineApiContract({ response: MessageResultSchema });
const messageContract = defineApiContract({ response: MessageSchema });
const nullContract = defineApiContract({ response: NullSchema });

export const messagesQuery = (status: MessageStatus) =>
  queryOptions({
    queryKey: messageKeys.list(status),
    queryFn: ({ signal }) => http.get('/api/messages', { status }, resultContract, { signal }),
  });

export const messageApi = {
  markRead: (id: string) => http.patch(`/api/messages/${id}/read`, undefined, messageContract),
  markAllRead: () => http.patch('/api/messages/read-all', undefined, nullContract),
  handleApproval: (id: string, input: ApprovalActionInput) =>
    http.patch(`/api/messages/${id}/approval`, input, messageContract),
  deleteMessage: (id: string) => http.del(`/api/messages/${id}`, nullContract),
};
