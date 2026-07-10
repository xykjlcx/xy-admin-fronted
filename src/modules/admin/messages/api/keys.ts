import type { MessageStatus } from './schema';

export const messageKeys = {
  all: ['notice', 'messages'] as const,
  list: (status: MessageStatus) => [...messageKeys.all, 'list', status] as const,
};
