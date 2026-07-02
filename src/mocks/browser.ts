import { setupWorker } from 'msw/browser';
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';

export async function enableMocking() {
  const worker = setupWorker(...authHandlers);
  await worker.start({ onUnhandledRequest: 'bypass' });
}
