import { setupWorker } from 'msw/browser';
import { allHandlers } from '@/mocks/handlers';

export async function enableMocking() {
  const worker = setupWorker(...allHandlers);
  await worker.start({
    onUnhandledRequest(request, print) {
      // /api/ 开头但漏配 handler → 提前暴露，避免误以为已 mock；其余（静态资源等）静默放行
      if (new URL(request.url).pathname.startsWith('/api/')) {
        print.warning();
      }
    },
  });
}
