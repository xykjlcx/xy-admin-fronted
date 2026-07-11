import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ErrorScreen } from '@/components/pro/ErrorScreen';
import { AuthExpiredError, BizError, ContractError, HttpError } from '@/lib/http/errors';
import { appConfig } from '@/config';

// 路由级错误兜底（router.defaultErrorComponent）：TanStack 据此给每个路由 match 装 CatchBoundary，
// 兜住 beforeLoad/loader 抛错与组件渲染期错误（含 Shell 的 useSuspenseQuery 失败）。
// 没有它时错误边界退化为 SafeFragment，渲染期错误冒泡到 React 根 → 整树卸载白屏（诊断 F2）。
export function RouteError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // 按错误性质给文案：契约漂移 / 登录过期 / 业务失败 / 网络失败 / 未知
  let title = t('errors.500');
  if (error instanceof ContractError) title = t('errors.contract');
  else if (error instanceof AuthExpiredError) title = t('errors.authExpired');
  else if (error instanceof BizError) title = error.message || t('errors.500');
  else if (error instanceof HttpError) title = t('errors.network');

  return (
    <ErrorScreen
      code="500"
      title={title}
      retryLabel={t('errors.retry')}
      onRetry={() => {
        reset();
        void router.invalidate();
      }}
      backHomeLabel={t('errors.backHome')}
      homeTo={appConfig.routes.home}
    />
  );
}
