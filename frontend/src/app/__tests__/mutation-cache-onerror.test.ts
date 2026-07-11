import { MutationObserver } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryClient } from '@/app/query';
import { AuthExpiredError, BizError } from '@/lib/http/errors';
import { i18nInit } from '@/lib/i18n';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

beforeAll(async () => {
  await i18nInit;
});

beforeEach(() => {
  vi.clearAllMocks();
});

// 全局 MutationCache onError 是「mutation 失败不再静默」的兜底策略点，
// 这里锁定四条行为：BizError 透传文案 / 局部 onError 去重 / 401 跳过 / 未知错误通用文案。
async function runMutation(options: ConstructorParameters<typeof MutationObserver>[1]) {
  const observer = new MutationObserver(queryClient, options);
  await observer.mutate(undefined).catch(() => undefined);
}

test('BizError 失败 → 全局 toast 后端业务文案', async () => {
  await runMutation({ mutationFn: () => Promise.reject(new BizError(4090, '角色名称已存在')) });

  expect(toast.error).toHaveBeenCalledWith('角色名称已存在');
});

test('局部定义了 onError 的 mutation，全局不再兜底（防双重 toast）', async () => {
  const localOnError = vi.fn();
  await runMutation({
    mutationFn: () => Promise.reject(new BizError(4090, '角色名称已存在')),
    onError: localOnError,
  });

  expect(localOnError).toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
});

test('AuthExpiredError 不 toast（401 走全局登出流程）', async () => {
  await runMutation({ mutationFn: () => Promise.reject(new AuthExpiredError('auth expired')) });

  expect(toast.error).not.toHaveBeenCalled();
});

test('未知错误 → 通用失败文案', async () => {
  await runMutation({ mutationFn: () => Promise.reject(new Error('boom')) });

  expect(toast.error).toHaveBeenCalledWith('操作失败，请重试');
});
