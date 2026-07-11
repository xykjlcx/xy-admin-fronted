import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18next from 'i18next';
import { AuthExpiredError, BizError } from '@/lib/http/errors';

// QueryClient 是服务端状态的统一策略点。
// 页面只声明 queryKey/queryFn，不在各页面重复写 retry、refetch 等全局规则。
export const queryClient = new QueryClient({
  // 首次加载失败交给路由 errorComponent 展示；这里只提示「已有数据的后台刷新失败」，
  // 避免与 errorComponent 重复报错，也让原本静默的 revalidate 失败对用户可见（诊断 F2）。
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof AuthExpiredError) return; // 401 由 authEvents 统一处理
      if (query.state.data === undefined) return; // 首次加载失败 → 交给 errorComponent
      toast.error(i18next.t('errors.refetchFailed'));
    },
  }),
  // 全局兜底：所有 mutation 失败都给用户反馈，不再静默。
  // 调用方仍可用 mutateAsync 的 rejection 决定是否关闭弹窗（onError 只做 toast，不吞异常）。
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.onError) return; // 局部已自带失败处理（如 menus 的 onError toast），全局不再兜底防双重提示
      if (error instanceof AuthExpiredError) return; // 401 走全局登出流程，不重复提示
      if (error instanceof BizError) {
        toast.error(error.message); // 后端/mock 给的业务文案
        return;
      }
      toast.error(i18next.t('errors.mutationFailed'));
    },
  }),
  defaultOptions: {
    queries: {
      // 等价原 retry:1，但 401(AuthExpiredError) 不重试——否则会二次触发 auth:expired
      retry: (failureCount, error) => failureCount < 1 && !(error instanceof AuthExpiredError),
      refetchOnWindowFocus: false,
    },
  },
});
