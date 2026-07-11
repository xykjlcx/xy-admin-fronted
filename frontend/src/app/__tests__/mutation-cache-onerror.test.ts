import { MutationObserver } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryClient } from '@/app/query';
import { AuthExpiredError, BizError } from '@/lib/http/errors';
import { i18nInit } from '@/lib/i18n';
import i18next from 'i18next';
import { http } from '@/lib/http/client';
import { blobContract, defineApiContract } from '@/lib/http/contract';
import { z } from 'zod';

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

function bizError(detail: string) {
  return new BizError({
    status: 409,
    code: 'role.name.conflict',
    detail,
    traceId: null,
    instance: null,
    retryAfter: null,
  });
}

test('BizError 失败 → 全局 toast 后端业务文案', async () => {
  await runMutation({ mutationFn: () => Promise.reject(bizError('角色名称已存在')) });

  expect(toast.error).toHaveBeenCalledWith('角色名称已存在');
});

test('局部定义了 onError 的 mutation，全局不再兜底（防双重 toast）', async () => {
  const localOnError = vi.fn();
  await runMutation({
    mutationFn: () => Promise.reject(bizError('角色名称已存在')),
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

test('QueryClient 不再叠加传输层自动重试', () => {
  expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
});

test('mutation defaults explicitly disable TanStack retry', () => {
  expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
});

test('current i18n resolved language drives JSON and blob Accept-Language headers', async () => {
  const previousHtmlLanguage = document.documentElement.lang;
  document.documentElement.lang = 'zh-CN';
  await i18next.changeLanguage('en-US');
  const languages: Array<string | null> = [];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    languages.push(new Headers(init?.headers).get('Accept-Language'));
    return languages.length === 1
      ? Response.json({ id: 1 })
      : new Response('file', { headers: { 'Content-Type': 'application/octet-stream' } });
  });

  try {
    await http.get(
      '/api/locale-json',
      undefined,
      defineApiContract({ response: z.object({ id: z.number() }) }),
    );
    await http.get('/api/locale-blob', undefined, blobContract);
    expect(languages).toEqual(['en-US', 'en-US']);
  } finally {
    fetchMock.mockRestore();
    document.documentElement.lang = previousHtmlLanguage;
    await i18next.changeLanguage('zh-CN');
  }
});
