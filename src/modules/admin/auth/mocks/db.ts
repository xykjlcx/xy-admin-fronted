import { createCollection } from '@/mocks/db';

export interface RegisteredAccount {
  id: string;
  name: string;
  email: string;
  password: string;
}

export const registeredAccounts = createCollection<RegisteredAccount, 'id'>(
  [{ id: 'registered-u1', name: '李长昕', email: 'leah@acme.com', password: 'password123' }],
  'id',
);
export const passwordResetRequests = createCollection<{ id: string; email: string; createdAt: string }, 'id'>(
  [],
  'id',
);
