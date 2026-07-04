import { QueryClient } from '@tanstack/react-query';
import { AuthExpiredError } from '@/lib/http/errors';

// QueryClient 是服务端状态的统一策略点。
// 页面只声明 queryKey/queryFn，不在各页面重复写 retry、refetch 等全局规则。
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 等价原 retry:1，但 401(AuthExpiredError) 不重试——否则会二次触发 auth:expired
      retry: (failureCount, error) => failureCount < 1 && !(error instanceof AuthExpiredError),
      refetchOnWindowFocus: false,
    },
  },
});
